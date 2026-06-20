from __future__ import annotations

from dataclasses import dataclass
import ipaddress
import json
from typing import Protocol
from urllib.parse import quote
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.requests import Request
from ua_parser import user_agent_parser

from app.core.config import get_settings
from app.models.admin_system import AccessLog

_LOCATION_CACHE: dict[str, str] = {}
_UNKNOWN_LOCATION = "未知"
_UNKNOWN_UA = "Unknown"


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
    parsed = _parse_user_agent(user_agent)
    family = parsed.get("user_agent", {}).get("family")
    return _clean_ua_family(family)


def parse_os(user_agent: str) -> str:
    parsed = _parse_user_agent(user_agent)
    return _format_os(parsed.get("os", {}))


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

    location = get_ip_location_provider().resolve(normalized)
    _LOCATION_CACHE[normalized] = location
    return location


def get_ip_location_provider() -> IpLocationProvider:
    settings = get_settings()
    provider = settings.IP_LOCATION_PROVIDER.strip().lower()
    if provider == "ip2region":
        return Ip2RegionProvider(settings.IP2REGION_DB_PATH)
    if provider == "maxmind":
        return MaxMindProvider(settings.MAXMIND_GEOIP_DB_PATH)
    if provider == "ipinfo":
        return IpInfoProvider(settings.IPINFO_TOKEN, settings.IP_LOCATION_TIMEOUT_SECONDS)
    if provider == "ipapi":
        return IpApiCoProvider(settings.IP_LOCATION_TIMEOUT_SECONDS)
    return LocalOnlyProvider()


class IpLocationProvider(Protocol):
    def resolve(self, ip: str) -> str:
        ...


@dataclass(frozen=True)
class LocalOnlyProvider:
    def resolve(self, ip: str) -> str:
        return _UNKNOWN_LOCATION


@dataclass(frozen=True)
class IpApiCoProvider:
    timeout_seconds: float

    def resolve(self, ip: str) -> str:
        try:
            request = UrlRequest(
                f"https://ipapi.co/{quote(ip)}/json/",
                headers={"User-Agent": "personal-tech-blog/1.0"},
            )
            with urlopen(request, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
        except Exception:
            return _UNKNOWN_LOCATION
        if body.get("error"):
            return _UNKNOWN_LOCATION
        return _format_location(
            country=body.get("country_name"),
            region=body.get("region"),
            city=body.get("city"),
            isp=body.get("org"),
        )


@dataclass(frozen=True)
class IpInfoProvider:
    token: str
    timeout_seconds: float

    def resolve(self, ip: str) -> str:
        if not self.token:
            return _UNKNOWN_LOCATION
        try:
            request = UrlRequest(
                f"https://ipinfo.io/{quote(ip)}/json?token={quote(self.token)}",
                headers={"User-Agent": "personal-tech-blog/1.0"},
            )
            with urlopen(request, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
        except Exception:
            return _UNKNOWN_LOCATION
        region = body.get("region")
        city = body.get("city")
        country = body.get("country")
        org = body.get("org")
        return _format_location(country=country, region=region, city=city, isp=org)


@dataclass(frozen=True)
class MaxMindProvider:
    db_path: str

    def resolve(self, ip: str) -> str:
        if not self.db_path:
            return _UNKNOWN_LOCATION
        try:
            import geoip2.database  # type: ignore[import-not-found]

            with geoip2.database.Reader(self.db_path) as reader:
                response = reader.city(ip)
        except Exception:
            return _UNKNOWN_LOCATION
        country = response.country.names.get("zh-CN") or response.country.name
        region = response.subdivisions.most_specific.names.get("zh-CN") or response.subdivisions.most_specific.name
        city = response.city.names.get("zh-CN") or response.city.name
        return _format_location(country=country, region=region, city=city, isp=None)


@dataclass(frozen=True)
class Ip2RegionProvider:
    db_path: str

    def resolve(self, ip: str) -> str:
        if not self.db_path:
            return _UNKNOWN_LOCATION
        try:
            from ip2region.xdbSearcher import XdbSearcher  # type: ignore[import-not-found]

            content = XdbSearcher.loadContentFromFile(self.db_path)
            searcher = XdbSearcher(contentBuff=content)
            region = searcher.search(ip)
        except Exception:
            return _UNKNOWN_LOCATION
        return _format_ip2region(region)


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


def _parse_user_agent(user_agent: str) -> dict:
    if not user_agent.strip():
        return {}
    try:
        return user_agent_parser.Parse(user_agent)
    except Exception:
        return {}


def _clean_ua_family(family: object) -> str:
    value = str(family or "").strip()
    if not value or value == "Other":
        return _UNKNOWN_UA
    return value


def _format_os(os_info: object) -> str:
    if not isinstance(os_info, dict):
        return _UNKNOWN_UA
    family = _clean_ua_family(os_info.get("family"))
    if family == _UNKNOWN_UA:
        return family
    if family == "Mac OS X":
        return "Mac OS X"
    major = str(os_info.get("major") or "").strip()
    minor = str(os_info.get("minor") or "").strip()
    patch = str(os_info.get("patch") or "").strip()
    if family == "Windows" and major:
        return f"{family} {major}"
    if family in {"Android", "iOS"} and major:
        return f"{family} {major}"
    if family in {"Ubuntu", "Fedora"} and major:
        versions = ".".join(item for item in (major, minor, patch) if item)
        return f"{family} {versions}" if versions else family
    return family


def _format_location(
    country: object,
    region: object,
    city: object,
    isp: object,
) -> str:
    country_value = str(country or "").strip()
    region_value = str(region or "").strip()
    city_value = str(city or "").strip()
    isp_value = str(isp or "").strip()

    parts: list[str] = []
    for item in (country_value, region_value, city_value):
        if item and item not in parts:
            parts.append(item)
    if country_value in {"中国", "China"} and isp_value and isp_value not in parts:
        parts.append(isp_value)
    if country_value in {"中国", "China"}:
        return "".join(parts) or _UNKNOWN_LOCATION
    return " ".join(parts) or _UNKNOWN_LOCATION


def _format_ip2region(region: object) -> str:
    if not region:
        return _UNKNOWN_LOCATION
    parts = [item for item in str(region).replace("|0", "").split("|") if item and item != "0"]
    if not parts:
        return _UNKNOWN_LOCATION
    country = parts[0] if parts else ""
    province = parts[2] if len(parts) > 2 else ""
    city = parts[3] if len(parts) > 3 else ""
    isp = parts[4] if len(parts) > 4 else ""
    return _format_location(country=country, region=province, city=city, isp=isp)
