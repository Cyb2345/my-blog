"""admin system modules

Revision ID: 0004_admin_system_modules
Revises: 0003_r2_media_metadata
Create Date: 2026-06-13 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_admin_system_modules"
down_revision = "0003_r2_media_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_params",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=96), nullable=False),
        sa.Column("key", sa.String(length=96), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False),
        sa.Column("remark", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index(op.f("ix_system_params_id"), "system_params", ["id"], unique=False)
    op.create_index(op.f("ix_system_params_key"), "system_params", ["key"], unique=False)

    op.create_table(
        "file_storage_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=96), nullable=False),
        sa.Column("storage_type", sa.String(length=32), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("bucket", sa.String(length=255), nullable=True),
        sa.Column("endpoint", sa.String(length=500), nullable=True),
        sa.Column("public_base_url", sa.String(length=500), nullable=True),
        sa.Column("object_prefix", sa.String(length=255), nullable=True),
        sa.Column("access_key_id", sa.String(length=255), nullable=True),
        sa.Column("secret_access_key_encrypted", sa.Text(), nullable=True),
        sa.Column("max_upload_size_mb", sa.Integer(), nullable=False),
        sa.Column("allowed_file_types", sa.String(length=255), nullable=False),
        sa.Column("remark", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_file_storage_configs_id"), "file_storage_configs", ["id"], unique=False)

    op.create_table(
        "operation_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("operator_id", sa.Integer(), nullable=True),
        sa.Column("operator_username", sa.String(length=64), nullable=True),
        sa.Column("request_path", sa.String(length=500), nullable=False),
        sa.Column("request_method", sa.String(length=16), nullable=False),
        sa.Column("api_name", sa.String(length=128), nullable=True),
        sa.Column("ip", sa.String(length=64), nullable=True),
        sa.Column("ip_location", sa.String(length=128), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("request_body", sa.Text(), nullable=True),
        sa.Column("response_code", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["operator_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_operation_logs_api_name"), "operation_logs", ["api_name"], unique=False)
    op.create_index(op.f("ix_operation_logs_id"), "operation_logs", ["id"], unique=False)
    op.create_index(op.f("ix_operation_logs_ip"), "operation_logs", ["ip"], unique=False)
    op.create_index(
        op.f("ix_operation_logs_operator_username"),
        "operation_logs",
        ["operator_username"],
        unique=False,
    )

    op.create_table(
        "access_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ip", sa.String(length=64), nullable=True),
        sa.Column("ip_location", sa.String(length=128), nullable=True),
        sa.Column("browser", sa.String(length=96), nullable=True),
        sa.Column("os", sa.String(length=96), nullable=True),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("referer", sa.String(length=500), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_access_logs_browser"), "access_logs", ["browser"], unique=False)
    op.create_index(op.f("ix_access_logs_id"), "access_logs", ["id"], unique=False)
    op.create_index(op.f("ix_access_logs_ip"), "access_logs", ["ip"], unique=False)
    op.create_index(op.f("ix_access_logs_os"), "access_logs", ["os"], unique=False)
    op.create_index(op.f("ix_access_logs_path"), "access_logs", ["path"], unique=False)

    op.create_table(
        "menus",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=96), nullable=False),
        sa.Column("icon", sa.String(length=64), nullable=True),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("route", sa.String(length=255), nullable=True),
        sa.Column("component", sa.String(length=255), nullable=True),
        sa.Column("permission", sa.String(length=128), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["menus.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_menus_id"), "menus", ["id"], unique=False)
    op.create_index(op.f("ix_menus_route"), "menus", ["route"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_menus_route"), table_name="menus")
    op.drop_index(op.f("ix_menus_id"), table_name="menus")
    op.drop_table("menus")
    op.drop_index(op.f("ix_access_logs_path"), table_name="access_logs")
    op.drop_index(op.f("ix_access_logs_os"), table_name="access_logs")
    op.drop_index(op.f("ix_access_logs_ip"), table_name="access_logs")
    op.drop_index(op.f("ix_access_logs_id"), table_name="access_logs")
    op.drop_index(op.f("ix_access_logs_browser"), table_name="access_logs")
    op.drop_table("access_logs")
    op.drop_index(op.f("ix_operation_logs_operator_username"), table_name="operation_logs")
    op.drop_index(op.f("ix_operation_logs_ip"), table_name="operation_logs")
    op.drop_index(op.f("ix_operation_logs_id"), table_name="operation_logs")
    op.drop_index(op.f("ix_operation_logs_api_name"), table_name="operation_logs")
    op.drop_table("operation_logs")
    op.drop_index(op.f("ix_file_storage_configs_id"), table_name="file_storage_configs")
    op.drop_table("file_storage_configs")
    op.drop_index(op.f("ix_system_params_key"), table_name="system_params")
    op.drop_index(op.f("ix_system_params_id"), table_name="system_params")
    op.drop_table("system_params")
