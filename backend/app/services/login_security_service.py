from dataclasses import dataclass
from threading import RLock
from time import time

from fastapi import HTTPException

from app.core.config import get_settings

MFA_LOCK_DETAIL = "MFA 验证请求过于频繁，请稍后再试"


@dataclass
class FailureRecord:
    count: int = 0
    locked_until: float = 0


class LoginSecurityService:
    def __init__(self) -> None:
        self._ip_failures: dict[str, FailureRecord] = {}
        self._username_failures: dict[str, FailureRecord] = {}
        self._mfa_token_failures: dict[str, FailureRecord] = {}
        self._lock = RLock()

    def _lock_seconds(self) -> int:
        return get_settings().LOGIN_FAILURE_LOCK_MINUTES * 60

    def _login_lock_detail(self) -> str:
        return f"登录失败次数过多，请 {get_settings().LOGIN_FAILURE_LOCK_MINUTES} 分钟后再试"

    def _threshold(self) -> int:
        return get_settings().LOGIN_FAILURE_LOCK_THRESHOLD

    def _normalize_username(self, username: str) -> str:
        return username.strip().lower()

    def _get_record(self, store: dict[str, FailureRecord], key: str) -> FailureRecord:
        record = store.get(key)
        if not record:
            record = FailureRecord()
            store[key] = record
        return record

    def _ensure_record_unlocked(self, record: FailureRecord, message: str) -> None:
        now = time()
        if record.locked_until > now:
            raise HTTPException(status_code=429, detail=message)
        if record.locked_until and record.locked_until <= now:
            record.count = 0
            record.locked_until = 0

    def ensure_login_allowed(self, ip: str, username: str) -> None:
        username_key = self._normalize_username(username)
        with self._lock:
            self._ensure_record_unlocked(self._get_record(self._ip_failures, ip), self._login_lock_detail())
            self._ensure_record_unlocked(
                self._get_record(self._username_failures, username_key),
                self._login_lock_detail(),
            )

    def record_login_failure(self, ip: str, username: str) -> None:
        username_key = self._normalize_username(username)
        now = time()
        with self._lock:
            for store, key in ((self._ip_failures, ip), (self._username_failures, username_key)):
                record = self._get_record(store, key)
                if record.locked_until > now:
                    continue
                record.count += 1
                if record.count >= self._threshold():
                    record.locked_until = now + self._lock_seconds()

    def record_login_success(self, ip: str, username: str) -> None:
        username_key = self._normalize_username(username)
        with self._lock:
            self._ip_failures.pop(ip, None)
            self._username_failures.pop(username_key, None)

    def ensure_mfa_token_allowed(self, token: str) -> None:
        with self._lock:
            self._ensure_record_unlocked(self._get_record(self._mfa_token_failures, token), MFA_LOCK_DETAIL)

    def record_mfa_token_failure(self, token: str) -> None:
        now = time()
        with self._lock:
            record = self._get_record(self._mfa_token_failures, token)
            if record.locked_until > now:
                return
            record.count += 1
            if record.count >= 5:
                record.locked_until = now + 5 * 60


login_security = LoginSecurityService()
