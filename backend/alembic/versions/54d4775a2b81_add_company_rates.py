"""add_company_rates

Revision ID: 54d4775a2b81
Revises: 9b73ee35cd74
Create Date: 2026-07-04 14:45:19.919692

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '54d4775a2b81'
down_revision: Union[str, Sequence[str], None] = '9b73ee35cd74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('companies', sa.Column('base_rate', sa.Numeric(precision=10, scale=2), server_default='50.00', nullable=False))
    op.add_column('companies', sa.Column('rate_per_kg', sa.Numeric(precision=10, scale=2), server_default='0.50', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('companies', 'rate_per_kg')
    op.drop_column('companies', 'base_rate')
