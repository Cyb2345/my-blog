from random import choice

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.media import MediaAsset
from app.models.site import NavigationItem, SiteConfig
from app.models.user import User
from app.schemas.site import (
    HomeBackgroundUpdate,
    LoginBackgroundUpdate,
    MediaAssetRead,
    NavigationItemCreate,
    NavigationItemRead,
    NavigationItemUpdate,
    SiteConfigUpdate,
)
from app.services.system_param_service import (
    get_cached_bool_param,
    get_cached_int_param,
    get_cached_param,
    reload_params_cache,
)
from app.utils.response import ok

router = APIRouter(tags=["site"])

DEFAULT_CONFIG: dict[str, str] = {
    "site_name": "技术札记",
    "site_subtitle": "Ops, DevOps, Python",
    "site_description": "记录 Linux、Docker、网络、数据库、云服务器和自动化运维中的真实问题。",
    "hero_badge": "个人技术博客",
    "hero_title": "把运维现场、DevOps 实践和 Python 学习写成自己的知识库",
    "hero_description": "这里记录 Linux、Docker、网络、数据库、云服务器和自动化运维中的真实问题，也记录一点慢慢学会后端开发的过程。",
    "hero_primary_text": "开始阅读",
    "hero_primary_href": "/posts",
    "hero_secondary_text": "进入知识库",
    "hero_secondary_href": "/docs",
    "hero_image": "/images/blog-hero.png",
    "hero_image_display": "cover",
    "home_notice_text": "欢迎来到技术札记。这里把排障现场、部署经验、自动化脚本和后端学习沉淀成可复用的个人知识库。",
    "home_show_scroll_indicator": "true",
    "home_background_mode": "fixed",
    "home_background_fixed_id": "",
    "home_background_round_robin_index": "0",
    "home_defaults_version": "2",
    "login_background_mode": "random",
    "login_background_fixed_id": "",
    "login_background_round_robin_index": "0",
    "login_background_display": "cover",
    "login_background_position": "center center",
    "login_background_overlay_enabled": "true",
    "login_background_overlay_opacity": "0.35",
    "site_logo_url": "",
    "favicon_url": "",
    "admin_logo_url": "",
    "frontend_nav_logo_url": "",
}

DEFAULT_NAVIGATION = [
    ("首页", "/", 0),
    ("文章", "/posts", 10),
    ("分类", "/categories", 20),
    ("标签", "/tags", 30),
    ("时间线", "/timeline", 40),
    ("知识库", "/docs", 50),
    ("友链", "/links", 60),
    ("留言", "/message", 70),
    ("关于", "/about", 80),
]

DEFAULT_CONFIG_RENAMES: tuple[tuple[str, str, str], ...] = (
    ("hero_secondary_text", "时间线", "进入知识库"),
    ("hero_secondary_href", "/timeline", "/docs"),
)

PUBLIC_CONFIG_EXCLUDED_KEYS = {"home_defaults_version"}


def _ensure_defaults(db: Session) -> None:
    changed = False
    existing_keys = set(db.scalars(select(SiteConfig.key)).all())
    should_migrate_home_defaults = "home_defaults_version" not in existing_keys
    for key, value in DEFAULT_CONFIG.items():
        if key not in existing_keys:
            db.add(SiteConfig(key=key, value=value))
            changed = True

    if should_migrate_home_defaults:
        existing_items = {item.key: item for item in db.scalars(select(SiteConfig)).all()}
        for key, old_value, new_value in DEFAULT_CONFIG_RENAMES:
            item = existing_items.get(key)
            if item and item.value == old_value:
                item.value = new_value
                changed = True

    if db.scalar(select(NavigationItem.id).limit(1)) is None:
        for label, href, sort_order in DEFAULT_NAVIGATION:
            db.add(
                NavigationItem(
                    label=label,
                    href=href,
                    sort_order=sort_order,
                    target="self",
                    is_visible=True,
                )
            )
        changed = True

    if changed:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()


def _config_map(db: Session) -> dict[str, str]:
    _ensure_defaults(db)
    data = DEFAULT_CONFIG.copy()
    for item in db.scalars(select(SiteConfig)).all():
        data[item.key] = item.value
    return data


def _set_config(db: Session, key: str, value: str) -> None:
    item = db.scalar(select(SiteConfig).where(SiteConfig.key == key))
    if item:
        item.value = value
    else:
        db.add(SiteConfig(key=key, value=value))


def _float_config(value: str | None, default: float) -> float:
    try:
        return float(value or default)
    except (TypeError, ValueError):
        return default


def _read_nav(item: NavigationItem) -> NavigationItemRead:
    return NavigationItemRead.model_validate(item)


def _select_media_background(
    db: Session,
    *,
    usage_type: str,
    mode: str,
    fixed_id: str | None,
    round_robin_key: str,
) -> MediaAsset | None:
    assets = db.scalars(
        select(MediaAsset)
        .where(
            MediaAsset.usage_type == usage_type,
            MediaAsset.is_active.is_(True),
        )
        .order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc())
    ).all()
    if not assets:
        return None
    if mode == "fixed":
        if fixed_id:
            try:
                media_id = int(fixed_id)
            except ValueError:
                media_id = -1
            return next((item for item in assets if item.id == media_id), assets[0])
        return assets[0]
    if mode == "round_robin":
        try:
            index = int(_config_map(db).get(round_robin_key) or 0) % len(assets)
        except ValueError:
            index = 0
        selected = assets[index]
        _set_config(db, round_robin_key, str(index + 1))
        db.commit()
        return selected
    return choice(assets)


@router.get("/site/config")
def public_site_config(db: Session = Depends(get_db)):
    config = _config_map(db)
    return ok({key: value for key, value in config.items() if key not in PUBLIC_CONFIG_EXCLUDED_KEYS})


@router.get("/site/runtime-options")
def public_runtime_options(db: Session = Depends(get_db)):
    reload_params_cache(db)
    theme = (get_cached_param("default_theme", "system") or "system").strip().lower()
    if theme not in {"light", "dark", "system"}:
        theme = "system"
    return ok(
        {
            "default_theme": theme,
            "open_message": get_cached_bool_param("open_message", True),
            "open_comment": get_cached_bool_param("open_comment", True),
            "max_upload_image_size_mb": max(
                1,
                get_cached_int_param("max_upload_image_size_mb", 5),
            ),
        }
    )


@router.get("/site/navigation")
def public_navigation(db: Session = Depends(get_db)):
    _ensure_defaults(db)
    items = db.scalars(
        select(NavigationItem)
        .where(NavigationItem.is_visible.is_(True))
        .order_by(NavigationItem.sort_order.asc(), NavigationItem.id.asc())
    ).all()
    return ok([_read_nav(item) for item in items])


@router.get("/site/login-background")
def public_login_background(db: Session = Depends(get_db)):
    config = _config_map(db)
    mode = config.get("login_background_mode", "random")
    selected = _select_media_background(
        db,
        usage_type="login_background",
        mode=mode,
        fixed_id=config.get("login_background_fixed_id"),
        round_robin_key="login_background_round_robin_index",
    )
    return ok(
        {
            "mode": mode,
            "image_url": selected.url if selected else "",
            "media": MediaAssetRead.model_validate(selected) if selected else None,
            "display": config.get("login_background_display", "cover"),
            "position": config.get("login_background_position", "center center"),
            "overlay_enabled": config.get("login_background_overlay_enabled", "true") == "true",
            "overlay_opacity": min(
                max(_float_config(config.get("login_background_overlay_opacity"), 0.35), 0),
                0.8,
            ),
        }
    )


@router.get("/site/home-background")
def public_home_background(db: Session = Depends(get_db)):
    config = _config_map(db)
    mode = config.get("home_background_mode", "fixed")
    selected = _select_media_background(
        db,
        usage_type="site_hero",
        mode=mode,
        fixed_id=config.get("home_background_fixed_id"),
        round_robin_key="home_background_round_robin_index",
    )
    return ok(
        {
            "mode": mode,
            "image_url": selected.url if selected else config.get("hero_image", "/images/blog-hero.png"),
            "media": MediaAssetRead.model_validate(selected) if selected else None,
        }
    )


@router.get("/admin/site/config")
def admin_site_config(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return ok(_config_map(db))


@router.put("/admin/site/config")
def update_site_config(
    payload: SiteConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    _ensure_defaults(db)
    for key, value in payload.values.items():
        _set_config(db, key, value)
    db.commit()
    return ok(_config_map(db))


@router.get("/admin/navigation")
def admin_navigation(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    _ensure_defaults(db)
    items = db.scalars(
        select(NavigationItem).order_by(NavigationItem.sort_order.asc(), NavigationItem.id.asc())
    ).all()
    return ok([_read_nav(item) for item in items])


@router.post("/admin/navigation")
def create_navigation_item(
    payload: NavigationItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    item = NavigationItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(_read_nav(item))


@router.put("/admin/navigation/{item_id}")
def update_navigation_item(
    item_id: int,
    payload: NavigationItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    item = db.get(NavigationItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Navigation item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return ok(_read_nav(item))


@router.delete("/admin/navigation/{item_id}")
def delete_navigation_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    item = db.get(NavigationItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Navigation item not found")
    db.delete(item)
    db.commit()
    return ok(True)


@router.get("/admin/site/login-backgrounds")
def admin_login_backgrounds(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    assets = db.scalars(
        select(MediaAsset)
        .where(MediaAsset.usage_type == "login_background")
        .order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc())
    ).all()
    return ok([MediaAssetRead.model_validate(item) for item in assets])


@router.get("/admin/site/home-backgrounds")
def admin_home_backgrounds(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    assets = db.scalars(
        select(MediaAsset)
        .where(MediaAsset.usage_type == "site_hero")
        .order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc())
    ).all()
    return ok([MediaAssetRead.model_validate(item) for item in assets])


@router.put("/admin/site/login-background")
def update_login_background_settings(
    payload: LoginBackgroundUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if payload.fixed_media_id:
        media = db.get(MediaAsset, payload.fixed_media_id)
        if not media or media.usage_type != "login_background":
            raise HTTPException(status_code=400, detail="登录背景图片不存在")
    _set_config(db, "login_background_mode", payload.display_mode)
    _set_config(db, "login_background_fixed_id", str(payload.fixed_media_id or ""))
    db.commit()
    return ok(_config_map(db))


@router.put("/admin/site/home-background")
def update_home_background_settings(
    payload: HomeBackgroundUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if payload.fixed_media_id:
        media = db.get(MediaAsset, payload.fixed_media_id)
        if not media or media.usage_type != "site_hero":
            raise HTTPException(status_code=400, detail="首页背景图片不存在")
    _set_config(db, "home_background_mode", payload.display_mode)
    _set_config(db, "home_background_fixed_id", str(payload.fixed_media_id or ""))
    db.commit()
    return ok(_config_map(db))
