"""separate local storage fields and extend managed resources

Revision ID: 0007_storage_and_link_fields
Revises: 0006_mfa_secret_length
Create Date: 2026-06-24 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_storage_and_link_fields"
down_revision = "0006_mfa_secret_length"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("file_storage_configs", sa.Column("region", sa.String(length=128), nullable=True))
    op.add_column("file_storage_configs", sa.Column("local_path", sa.String(length=500), nullable=True))
    op.add_column("file_storage_configs", sa.Column("access_path", sa.String(length=500), nullable=True))
    op.add_column("file_storage_configs", sa.Column("base_path", sa.String(length=255), nullable=True))
    op.add_column("media_assets", sa.Column("storage_config_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_media_assets_storage_config_id",
        "media_assets",
        "file_storage_configs",
        ["storage_config_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_media_assets_storage_config_id"),
        "media_assets",
        ["storage_config_id"],
        unique=False,
    )
    op.add_column("links", sa.Column("email", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("links", "email")
    op.drop_index(op.f("ix_media_assets_storage_config_id"), table_name="media_assets")
    op.drop_constraint("fk_media_assets_storage_config_id", "media_assets", type_="foreignkey")
    op.drop_column("media_assets", "storage_config_id")
    op.drop_column("file_storage_configs", "base_path")
    op.drop_column("file_storage_configs", "access_path")
    op.drop_column("file_storage_configs", "local_path")
    op.drop_column("file_storage_configs", "region")
