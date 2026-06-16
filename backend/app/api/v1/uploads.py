from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.media import MediaAsset
from app.models.user import User
from app.schemas.site import MediaAssetRead
from app.services.storage_service import upload_image_to_storage
from app.utils.response import ok

router = APIRouter(prefix="/admin", tags=["admin-media"])


@router.post("/uploads/image")
def upload_image(
    file: UploadFile = File(...),
    usage_type: str = Form("general"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    data = upload_image_to_storage(file, usage_type, db)
    asset = MediaAsset(**data, is_active=True, created_by_id=current_user.id)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return ok(MediaAssetRead.model_validate(asset))


@router.get("/media")
def list_media(
    usage_type: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    statement = select(MediaAsset).order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc())
    if usage_type:
        statement = statement.where(MediaAsset.usage_type == usage_type)
    return ok([MediaAssetRead.model_validate(item) for item in db.scalars(statement).all()])


@router.delete("/media/{media_id}")
def disable_media(media_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    asset = db.get(MediaAsset, media_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")
    asset.is_active = False
    db.commit()
    db.refresh(asset)
    return ok(MediaAssetRead.model_validate(asset))
