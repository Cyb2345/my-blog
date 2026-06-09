"""r2 media metadata

Revision ID: 0003_r2_media_metadata
Revises: 0002_site_users_media
Create Date: 2026-06-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_r2_media_metadata"
down_revision = "0002_site_users_media"
branch_labels = None
depends_on = None


NEW_USAGE_CHECK = (
    "usage_type in ('general', 'post_cover', 'article_image', "
    "'login_background', 'site_hero', 'avatar', 'link_avatar')"
)

OLD_USAGE_CHECK = "usage_type in ('general', 'post_cover', 'login_background', 'avatar', 'site_asset')"


def upgrade() -> None:
    op.add_column(
        "media_assets",
        sa.Column("storage_type", sa.String(length=32), server_default="local", nullable=False),
    )
    op.add_column("media_assets", sa.Column("bucket", sa.String(length=255), nullable=True))
    op.drop_constraint("ck_media_assets_usage_type", "media_assets", type_="check")
    op.execute("UPDATE media_assets SET usage_type = 'site_hero' WHERE usage_type = 'site_asset'")
    op.create_check_constraint("ck_media_assets_usage_type", "media_assets", NEW_USAGE_CHECK)
    op.alter_column("media_assets", "storage_type", server_default=None)


def downgrade() -> None:
    op.drop_constraint("ck_media_assets_usage_type", "media_assets", type_="check")
    op.execute("UPDATE media_assets SET usage_type = 'site_asset' WHERE usage_type = 'site_hero'")
    op.create_check_constraint("ck_media_assets_usage_type", "media_assets", OLD_USAGE_CHECK)
    op.drop_column("media_assets", "bucket")
    op.drop_column("media_assets", "storage_type")
