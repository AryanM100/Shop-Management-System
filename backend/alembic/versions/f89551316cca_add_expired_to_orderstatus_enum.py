"""add expired to orderstatus enum

Revision ID: f89551316cca
Revises: f84ca343d376
Create Date: 2026-07-19 22:23:15.056305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'f89551316cca'
down_revision: Union[str, Sequence[str], None] = 'f84ca343d376'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE orderstatus ADD VALUE 'EXPIRED'")
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
