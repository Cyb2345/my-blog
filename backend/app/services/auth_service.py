from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.user import User


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    login = username.strip()
    user = db.scalar(select(User).where(or_(User.username == login, User.email == login)))
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
