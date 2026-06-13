from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.admin_system import AdminMenu
from app.schemas.admin_system import AdminMenuCreate, AdminMenuUpdate
from app.utils.response import ok

router = APIRouter(
    prefix="/admin/menus",
    tags=["admin-menus"],
    dependencies=[Depends(require_admin)],
)

DEFAULT_MENUS = [
    {
        "name": "仪表盘",
        "icon": "BarChart3",
        "type": "menu",
        "route": "/admin/dashboard",
        "component": "app/admin/dashboard/page.tsx",
        "permission": "dashboard:view",
        "sort_order": 1,
        "children": [],
    },
    {
        "name": "内容管理",
        "icon": "FileText",
        "type": "directory",
        "route": "/admin/content",
        "component": None,
        "permission": "content:view",
        "sort_order": 2,
        "children": [
            ("文章管理", "FileText", "/admin/content/posts", "app/admin/content/posts/page.tsx", "posts:view", 1),
            ("分类管理", "Folder", "/admin/content/categories", "app/admin/content/categories/page.tsx", "categories:view", 2),
            ("标签管理", "Tags", "/admin/content/tags", "app/admin/content/tags/page.tsx", "tags:view", 3),
        ],
    },
    {
        "name": "网站管理",
        "icon": "Cloud",
        "type": "directory",
        "route": "/admin/site",
        "component": None,
        "permission": "site:view",
        "sort_order": 3,
        "children": [
            ("站点配置", "Settings", "/admin/site/config", "app/admin/site/config/page.tsx", "site:config", 1),
            ("首页配置", "Home", "/admin/site/home", "app/admin/site/home/page.tsx", "site:home", 2),
            ("登录页配置", "LogIn", "/admin/site/login", "app/admin/site/login/page.tsx", "site:login", 3),
            ("导航配置", "Navigation", "/admin/site/navigation", "app/admin/site/navigation/page.tsx", "site:navigation", 4),
            ("友链管理", "Link", "/admin/site/links", "app/admin/site/links/page.tsx", "links:view", 5),
            ("留言管理", "MessageSquare", "/admin/site/messages", "app/admin/site/messages/page.tsx", "comments:view", 6),
            ("关于页面", "Info", "/admin/site/about", "app/admin/site/about/page.tsx", "site:about", 7),
        ],
    },
    {
        "name": "系统管理",
        "icon": "LayoutGrid",
        "type": "directory",
        "route": "/admin/system",
        "component": None,
        "permission": "system:view",
        "sort_order": 4,
        "children": [
            ("用户管理", "User", "/admin/system/users", "app/admin/system/users/page.tsx", "users:view", 1),
            ("角色管理", "Users", "/admin/system/roles", "app/admin/system/roles/page.tsx", "roles:view", 2),
            ("参数管理", "Hexagon", "/admin/system/params", "app/admin/system/params/page.tsx", "params:view", 3),
        ],
    },
    {
        "name": "文件管理",
        "icon": "Files",
        "type": "directory",
        "route": "/admin/files",
        "component": None,
        "permission": "files:view",
        "sort_order": 5,
        "children": [
            ("文件配置", "Settings2", "/admin/files/config", "app/admin/files/config/page.tsx", "files:config", 1),
            ("文件列表", "FolderOpen", "/admin/files/list", "app/admin/files/list/page.tsx", "files:list", 2),
        ],
    },
    {
        "name": "日志管理",
        "icon": "BookOpen",
        "type": "directory",
        "route": "/admin/logs",
        "component": None,
        "permission": "logs:view",
        "sort_order": 6,
        "children": [
            ("操作日志", "Ticket", "/admin/logs/operation", "app/admin/logs/operation/page.tsx", "logs:operation", 1),
            ("访问日志", "Eye", "/admin/logs/access", "app/admin/logs/access/page.tsx", "logs:access", 2),
        ],
    },
    {
        "name": "菜单管理",
        "icon": "Users",
        "type": "menu",
        "route": "/admin/menus",
        "component": "app/admin/menus/page.tsx",
        "permission": "menus:view",
        "sort_order": 7,
        "children": [],
    },
    {
        "name": "监控中心",
        "icon": "Monitor",
        "type": "directory",
        "route": "/admin/monitor",
        "component": None,
        "permission": "monitor:view",
        "sort_order": 8,
        "children": [
            ("服务监控", "MonitorCog", "/admin/monitor/service", "app/admin/monitor/service/page.tsx", "monitor:service", 1),
        ],
    },
]


def _ensure_default_menus(db: Session) -> None:
    if db.scalar(select(AdminMenu.id).limit(1)):
        return
    for item in DEFAULT_MENUS:
        parent = AdminMenu(
            name=item["name"],
            icon=item["icon"],
            type=item["type"],
            route=item["route"],
            component=item["component"],
            permission=item["permission"],
            sort_order=item["sort_order"],
            is_active=True,
            is_system=True,
        )
        db.add(parent)
        db.flush()
        for child_name, icon, route, component, permission, sort_order in item["children"]:
            db.add(
                AdminMenu(
                    parent_id=parent.id,
                    name=child_name,
                    icon=icon,
                    type="menu",
                    route=route,
                    component=component,
                    permission=permission,
                    sort_order=sort_order,
                    is_active=True,
                    is_system=True,
                )
            )
    db.commit()


def _menu_dict(menu: AdminMenu) -> dict:
    return {
        "id": menu.id,
        "parent_id": menu.parent_id,
        "name": menu.name,
        "icon": menu.icon,
        "type": menu.type,
        "route": menu.route,
        "component": menu.component,
        "permission": menu.permission,
        "sort_order": menu.sort_order,
        "is_active": menu.is_active,
        "is_system": menu.is_system,
        "created_at": menu.created_at,
        "updated_at": menu.updated_at,
        "children": [],
    }


def _build_tree(rows: list[AdminMenu]) -> list[dict]:
    nodes = {row.id: _menu_dict(row) for row in rows}
    roots: list[dict] = []
    for row in rows:
        node = nodes[row.id]
        if row.parent_id and row.parent_id in nodes:
            nodes[row.parent_id]["children"].append(node)
        else:
            roots.append(node)
    return roots


@router.get("")
def list_menus(db: Session = Depends(get_db)):
    _ensure_default_menus(db)
    rows = db.scalars(
        select(AdminMenu).order_by(AdminMenu.parent_id.nullsfirst(), AdminMenu.sort_order.asc(), AdminMenu.id.asc())
    ).all()
    return ok(_build_tree(list(rows)))


@router.post("")
def create_menu(payload: AdminMenuCreate, db: Session = Depends(get_db)):
    if payload.parent_id and not db.get(AdminMenu, payload.parent_id):
        raise HTTPException(status_code=400, detail="父级菜单不存在")
    menu = AdminMenu(**payload.model_dump())
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return ok(_menu_dict(menu))


@router.get("/{menu_id}")
def get_menu(menu_id: int, db: Session = Depends(get_db)):
    menu = db.get(AdminMenu, menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="菜单不存在")
    return ok(_menu_dict(menu))


@router.put("/{menu_id}")
def update_menu(menu_id: int, payload: AdminMenuUpdate, db: Session = Depends(get_db)):
    menu = db.get(AdminMenu, menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="菜单不存在")
    data = payload.model_dump(exclude_unset=True)
    parent_id = data.get("parent_id")
    if parent_id == menu.id:
        raise HTTPException(status_code=400, detail="父级菜单不能选择自己")
    if parent_id and not db.get(AdminMenu, parent_id):
        raise HTTPException(status_code=400, detail="父级菜单不存在")
    for field, value in data.items():
        setattr(menu, field, value)
    db.commit()
    db.refresh(menu)
    return ok(_menu_dict(menu))


@router.delete("/{menu_id}")
def delete_menu(menu_id: int, db: Session = Depends(get_db)):
    menu = db.get(AdminMenu, menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="菜单不存在")
    child = db.scalar(select(AdminMenu.id).where(AdminMenu.parent_id == menu.id).limit(1))
    if child:
        raise HTTPException(status_code=400, detail="存在子菜单，不能直接删除")
    db.delete(menu)
    db.commit()
    return ok(True)


@router.post("/{menu_id}/enable")
def enable_menu(menu_id: int, db: Session = Depends(get_db)):
    menu = db.get(AdminMenu, menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="菜单不存在")
    menu.is_active = True
    db.commit()
    db.refresh(menu)
    return ok(_menu_dict(menu))


@router.post("/{menu_id}/disable")
def disable_menu(menu_id: int, db: Session = Depends(get_db)):
    menu = db.get(AdminMenu, menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="菜单不存在")
    menu.is_active = False
    db.commit()
    db.refresh(menu)
    return ok(_menu_dict(menu))
