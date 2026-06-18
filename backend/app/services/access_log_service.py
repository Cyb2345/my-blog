from __future__ import annotations

import ipaddress
import json
from urllib.parse import quote
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.models.admin_system import AccessLog

_LOCATION_CACHE: dict[str, str] = {}
_UNKNOWN_LOCATION = "未知"


def get_client_ip(request: Request) -> str:
    candidates = [
        request.headers.get("cf-connecting-ip"),
        request.headers.get("x-forwarded-for"),
        request.headers.get("x-real-ip"),
        request.client.host if request.client else None,
    ]
    for value in candidates:
        ip = _normalize_ip(value)
        if ip:
            return ip
    return "unknown"


def parse_browser(user_agent: str) -> str:
    ua = user_agent.lower()
    if "edg/" in ua or "edge/" in ua:
        return "Edge"
    if "opr/" in ua or "opera" in ua:
        return "Opera"
    if "firefox" in ua:
        return "Firefox"
    if "chrome" in ua or "chromium" in ua:
        return "Chrome"
    if "safari" in ua:
        return "Safari"
    if "curl" in ua:
        return "curl"
    return "Unknown"


def parse_os(user_agent: str) -> str:
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


def resolve_ip_location(db: Session, ip: str | None) -> str:
    normalized = _normalize_ip(ip)
    if not normalized:
        return _UNKNOWN_LOCATION
    if normalized in _LOCATION_CACHE:
        return _LOCATION_CACHE[normalized]

    local_location = _local_ip_location(normalized)
    if local_location:
        _LOCATION_CACHE[normalized] = local_location
        return local_location

    cached = db.scalar(
        select(AccessLog.ip_location)
        .where(
            AccessLog.ip == normalized,
            AccessLog.ip_location.is_not(None),
            AccessLog.ip_location != "",
            AccessLog.ip_location != _UNKNOWN_LOCATION,
        )
        .order_by(AccessLog.id.desc())
        .limit(1)
    )
    if cached:
        _LOCATION_CACHE[normalized] = cached
        return cached

    location = _resolve_with_public_api(normalized)
    _LOCATION_CACHE[normalized] = location
    return location


def _normalize_ip(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value.split(",", 1)[0].strip()
    if not candidate:
        return None
    if candidate.startswith("[") and "]" in candidate:
        candidate = candidate[1:candidate.index("]")]
    if candidate.count(":") == 1 and "." in candidate:
        candidate = candidate.rsplit(":", 1)[0]
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return candidate if candidate.lower() != "unknown" else None


def _local_ip_location(ip: str) -> str | None:
    try:
        parsed = ipaddress.ip_address(ip)
    except ValueError:
        return None
    if parsed.is_loopback:
        return "本机"
    if parsed.is_private:
        return "内网"
    if parsed.is_link_local:
        return "链路本地"
    return None


def _resolve_with_public_api(ip: str) -> str:
    try:
        url = (
            "http://ip-api.com/json/"
            f"{quote(ip)}?lang=zh-CN&fields=status,country,regionName,city,isp,query"
        )
        request = UrlRequest(url, headers={"User-Agent": "personal-tech-blog/1.0"})
        with urlopen(request, timeout=0.8) as response:
            body = json.loads(response.read().decode("utf-8"))
    except Exception:
        return _UNKNOWN_LOCATION

    if body.get("status") != "success":
        return _UNKNOWN_LOCATION
    return _format_location(body)


def _format_location(body: dict) -> str:
    country = str(body.get("country") or "").strip()
    region = str(body.get("regionName") or "").strip()
    city = str(body.get("city") or "").strip()
    isp = str(body.get("isp") or "").strip()

    parts: list[str] = []
    for item in (country, region, city):
        if item and item not in parts:
            parts.append(item)
    if country == "中国" and isp and isp not in parts:
        parts.append(isp)
    return "".join(parts) if country == "中国" else " ".join(parts) or _UNKNOWN_LOCATION
