from __future__ import annotations

import base64
import html
import secrets
import string
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


CAPTCHA_TTL = timedelta(minutes=5)
_captcha_store: dict[str, "CaptchaEntry"] = {}


@dataclass
class CaptchaEntry:
    code: str
    expires_at: datetime


def _cleanup() -> None:
    now = datetime.now(timezone.utc)
    expired = [captcha_id for captcha_id, item in _captcha_store.items() if item.expires_at < now]
    for captcha_id in expired:
        _captcha_store.pop(captcha_id, None)


def _render_svg(code: str) -> str:
    escaped = html.escape(code)
    noise = "\n".join(
        f'<line x1="{secrets.randbelow(160)}" y1="{secrets.randbelow(54)}" '
        f'x2="{secrets.randbelow(160)}" y2="{secrets.randbelow(54)}" '
        'stroke="#94a3b8" stroke-opacity="0.35" stroke-width="1" />'
        for _ in range(7)
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="160" height="54" viewBox="0 0 160 54">
  <rect width="160" height="54" rx="8" fill="#f8fafc"/>
  {noise}
  <text x="50%" y="35" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="26" font-weight="800" letter-spacing="6" fill="#0f172a">{escaped}</text>
</svg>"""


def create_captcha() -> dict[str, str]:
    _cleanup()
    alphabet = string.ascii_uppercase + string.digits
    code = "".join(secrets.choice(alphabet) for _ in range(5))
    captcha_id = secrets.token_urlsafe(18)
    _captcha_store[captcha_id] = CaptchaEntry(
        code=code,
        expires_at=datetime.now(timezone.utc) + CAPTCHA_TTL,
    )
    image = base64.b64encode(_render_svg(code).encode("utf-8")).decode("ascii")
    return {"captcha_id": captcha_id, "image": f"data:image/svg+xml;base64,{image}"}


def validate_captcha(captcha_id: str | None, code: str | None) -> bool:
    _cleanup()
    if not captcha_id or not code:
        return False
    item = _captcha_store.pop(captcha_id, None)
    if not item or item.expires_at < datetime.now(timezone.utc):
        return False
    return secrets.compare_digest(item.code.upper(), code.strip().upper())
