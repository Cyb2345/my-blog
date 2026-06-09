"""site settings, users, and media

Revision ID: 0002_site_users_media
Revises: 0001_initial
Create Date: 2026-06-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_site_users_media"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("avatar", sa.String(length=500), nullable=True))
    op.add_column(
        "users",
        sa.Column("mfa_enabled", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column("users", sa.Column("mfa_secret", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("object_key", sa.String(length=500), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("usage_type", sa.String(length=48), nullable=False),
        sa.Column("display_mode", sa.String(length=32), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "usage_type in ('general', 'post_cover', 'login_background', 'avatar', 'site_asset')",
            name="ck_media_assets_usage_type",
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_media_assets_id"), "media_assets", ["id"], unique=False)
    op.create_index(op.f("ix_media_assets_object_key"), "media_assets", ["object_key"], unique=True)
    op.create_index(op.f("ix_media_assets_usage_type"), "media_assets", ["usage_type"], unique=False)

    op.create_table(
        "site_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=96), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_site_configs_id"), "site_configs", ["id"], unique=False)
    op.create_index(op.f("ix_site_configs_key"), "site_configs", ["key"], unique=True)

    op.create_table(
        "navigation_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.Column("href", sa.String(length=500), nullable=False),
        sa.Column("icon", sa.String(length=64), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("target", sa.String(length=16), nullable=False),
        sa.Column("is_visible", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("target in ('self', 'blank')", name="ck_navigation_items_target"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_navigation_items_id"), "navigation_items", ["id"], unique=False)

    op.alter_column("users", "mfa_enabled", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_navigation_items_id"), table_name="navigation_items")
    op.drop_table("navigation_items")
    op.drop_index(op.f("ix_site_configs_key"), table_name="site_configs")
    op.drop_index(op.f("ix_site_configs_id"), table_name="site_configs")
    op.drop_table("site_configs")
    op.drop_index(op.f("ix_media_assets_usage_type"), table_name="media_assets")
    op.drop_index(op.f("ix_media_assets_object_key"), table_name="media_assets")
    op.drop_index(op.f("ix_media_assets_id"), table_name="media_assets")
    op.drop_table("media_assets")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "mfa_secret")
    op.drop_column("users", "mfa_enabled")
    op.drop_column("users", "avatar")
    op.drop_column("users", "email")
