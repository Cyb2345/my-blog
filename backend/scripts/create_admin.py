import argparse
import getpass
import os

from sqlalchemy import select

from app.core.security import get_password_hash, validate_password_complexity
from app.db.session import SessionLocal
from app.models.user import User


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update an admin user.")
    parser.add_argument("--username", default=os.getenv("ADMIN_USERNAME", "admin"))
    parser.add_argument("--nickname", default=os.getenv("ADMIN_NICKNAME", "Admin"))
    parser.add_argument("--email", default=os.getenv("ADMIN_EMAIL"))
    parser.add_argument("--password", default=os.getenv("ADMIN_PASSWORD"))
    args = parser.parse_args()

    password = args.password or getpass.getpass("Password: ")
    try:
        validate_password_complexity(password)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.username == args.username))
        if user:
            user.password_hash = get_password_hash(password)
            user.nickname = args.nickname
            user.email = args.email
            user.is_active = True
            user.role = "admin"
            print(f"Updated admin user: {args.username}")
        else:
            user = User(
                username=args.username,
                email=args.email,
                password_hash=get_password_hash(password),
                nickname=args.nickname,
                role="admin",
                is_active=True,
            )
            db.add(user)
            print(f"Created admin user: {args.username}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
