from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time
from io import BytesIO
from urllib.parse import quote

import qrcode
import qrcode.image.svg
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


ENCRYPTED_PREFIX = "enc:"


def _fernet() -> Fernet:
    digest = hashlib.sha256(get_settings().SECRET_KEY.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def generate_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def _normalize_secret(secret: str) -> bytes:
    padding = "=" * (-len(secret) % 8)
    return base64.b32decode((secret + padding).upper())


def generate_totp_code(secret: str, counter: int | None = None) -> str:
    if counter is None:
        counter = int(time.time() // 30)
    digest = hmac.new(_normalize_secret(secret), struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    number = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{number % 1_000_000:06d}"


def verify_totp(secret: str, code: str, window: int = 1) -> bool:
    normalized = code.strip().replace(" ", "")
    if len(normalized) != 6 or not normalized.isdigit():
        return False
    counter = int(time.time() // 30)
    return any(
        hmac.compare_digest(generate_totp_code(secret, counter + offset), normalized)
        for offset in range(-window, window + 1)
    )


def provisioning_uri(secret: str, username: str, issuer: str = "Personal Blog") -> str:
    label = quote(f"{issuer}:{username}")
    return (
        f"otpauth://totp/{label}?secret={secret}&issuer={quote(issuer)}"
        "&algorithm=SHA1&digits=6&period=30"
    )


def encrypt_totp_secret(secret: str) -> str:
    token = _fernet().encrypt(secret.encode("utf-8")).decode("ascii")
    return f"{ENCRYPTED_PREFIX}{token}"


def decrypt_totp_secret(stored_secret: str) -> str:
    if not stored_secret.startswith(ENCRYPTED_PREFIX):
        return stored_secret
    token = stored_secret.removeprefix(ENCRYPTED_PREFIX).encode("ascii")
    try:
        return _fernet().decrypt(token).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Invalid MFA secret") from exc


def qr_code_data_url(uri: str) -> str:
    image = qrcode.make(uri, image_factory=qrcode.image.svg.SvgPathImage)
    buffer = BytesIO()
    image.save(buffer)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"
