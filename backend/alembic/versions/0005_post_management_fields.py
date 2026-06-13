"""post management fields

Revision ID: 0005_post_management_fields
Revises: 0004_admin_system_modules
Create Date: 2026-06-13 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_post_management_fields"
down_revision = "0004_admin_system_modules"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "posts",
        sa.Column("is_recommended", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column("posts", sa.Column("is_top", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("posts", sa.Column("created_by_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_posts_created_by_id"), "posts", ["created_by_id"], unique=False)
    op.create_foreign_key(
        "fk_posts_created_by_id_users",
        "posts",
        "users",
        ["created_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.alter_column("posts", "is_recommended", server_default=None)
    op.alter_column("posts", "is_top", server_default=None)


def downgrade() -> None:
    op.drop_constraint("fk_posts_created_by_id_users", "posts", type_="foreignkey")
    op.drop_index(op.f("ix_posts_created_by_id"), table_name="posts")
    op.drop_column("posts", "created_by_id")
    op.drop_column("posts", "is_top")
    op.drop_column("posts", "is_recommended")
