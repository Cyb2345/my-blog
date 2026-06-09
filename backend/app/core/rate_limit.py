from collections import defaultdict, deque
from threading import RLock
from time import time

from fastapi import HTTPException, Request


class MemoryRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = RLock()

    def check(self, *, key: str, limit: int, window_seconds: int, message: str) -> None:
        if limit <= 0:
            return
        now = time()
        start = now - window_seconds
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= start:
                hits.popleft()
            if len(hits) >= limit:
                raise HTTPException(status_code=429, detail=message)
            hits.append(now)


rate_limiter = MemoryRateLimiter()


def get_client_ip(request: Request) -> str:
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"
