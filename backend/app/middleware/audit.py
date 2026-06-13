from __future__ import annotations

import time

from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.admin_system import AccessLog, OperationLog
from app.models.user import User


WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else None


def _browser(user_agent: str) -> str:
    ua = user_agent.lower()
    if "edg/" in ua:
        return "Edge"
    if "chrome" in ua or "chromium" in ua:
        return "Chrome"
    if "firefox" in ua:
        return "Firefox"
    if "safari" in ua:
        return "Safari"
    if "curl" in ua:
        return "curl"
    return "Unknown"


def _os(user_agent: str) -> str:
    ua = user_agent.lower()
    if "android" in ua:
        return "Android"
    if "iphone" in ua or "ipad" in ua:
        return "iOS"
    if "mac os" in ua or "macintosh" in ua:
        return "Mac OS"
    if "windows" in ua:
        return "Windows"
    if "linux" in ua:
        return "Linux"
    return "Unknown"


def _api_name(path: str, method: str) -> str:
    rules = [
        ("/auth/login", "登录"),
        ("/auth/logout", "退出登录"),
        ("/auth/mfa/verify", "MFA 登录验证"),
        ("/admin/posts", "文章管理"),
        ("/admin/categories", "分类管理"),
        ("/admin/tags", "标签管理"),
        ("/admin/comments", "留言管理"),
        ("/admin/links", "友链管理"),
        ("/admin/uploads/image", "上传文件"),
        ("/admin/users", "用户管理"),
        ("/admin/system/params", "参数管理"),
        ("/admin/files", "文件管理"),
        ("/admin/logs", "日志管理"),
        ("/admin/menus", "菜单管理"),
        ("/admin/site", "站点配置"),
        ("/admin/navigation", "导航配置"),
    ]
    for fragment, name in rules:
        if fragment in path:
            return name
    return f"{method} {path}"


def _operator_from_token(request: Request) -> tuple[int | None, str | None]:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None, None
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None, None
    try:
        payload = decode_access_token(token)
    except Exception:
        return None, None
    username = payload.get("sub")
    if not username:
        return None, None
    try:
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.username == username))
            return (user.id if user else None), username
    except Exception:
        return None, username


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = int((time.perf_counter() - start) * 1000)
        self._write_logs(request, response.status_code, duration_ms)
        return response

    def _write_logs(self, request: Request, status_code: int, duration_ms: int) -> None:
        settings = get_settings()
        prefix = settings.API_V1_PREFIX.rstrip("/")
        path = request.url.path
        if not path.startswith(prefix):
            return

        try:
            if self._should_log_operation(path, request.method, prefix):
                self._write_operation_log(request, status_code, duration_ms)
            elif self._should_log_access(path, request.method, prefix):
                self._write_access_log(request)
        except Exception:
            return

    def _should_log_operation(self, path: str, method: str, prefix: str) -> bool:
        auth_paths = {
            f"{prefix}/auth/login",
            f"{prefix}/auth/logout",
            f"{prefix}/auth/mfa/verify",
        }
        return (path.startswith(f"{prefix}/admin") and method.upper() in WRITE_METHODS) or path in auth_paths

    def _should_log_access(self, path: str, method: str, prefix: str) -> bool:
        if method.upper() != "GET":
            return False
        excluded = (
            f"{prefix}/admin",
            f"{prefix}/auth",
            f"{prefix}/health",
            f"{prefix}/monitor",
        )
        return not path.startswith(excluded)

    def _write_operation_log(self, request: Request, status_code: int, duration_ms: int) -> None:
        operator_id, username = _operator_from_token(request)
        path = request.url.path
        with SessionLocal() as db:
            db.add(
                OperationLog(
                    operator_id=operator_id,
                    operator_username=username,
                    request_path=path,
                    request_method=request.method.upper(),
                    api_name=_api_name(path, request.method.upper()),
                    ip=_client_ip(request),
                    ip_location=None,
                    duration_ms=duration_ms,
                    request_body=None,
                    response_code=status_code,
                )
            )
            db.commit()

    def _write_access_log(self, request: Request) -> None:
        user_agent = request.headers.get("user-agent", "")
        with SessionLocal() as db:
            db.add(
                AccessLog(
                    ip=_client_ip(request),
                    ip_location=None,
                    browser=_browser(user_agent),
                    os=_os(user_agent),
                    path=request.url.path,
                    referer=request.headers.get("referer"),
                    user_agent=user_agent[:1000],
                )
            )
            db.commit()
