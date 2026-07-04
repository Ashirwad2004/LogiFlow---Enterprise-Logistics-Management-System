"""add_eway_bills

Revision ID: baaf773bdf02
Revises: 54d4775a2b81
Create Date: 2026-07-04 15:14:39.204638

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'baaf773bdf02'
down_revision: Union[str, Sequence[str], None] = '54d4775a2b81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'eway_bills',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column('invoice_id', sa.UUID(as_uuid=True), sa.ForeignKey('invoices.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('ewb_number', sa.String(length=12), unique=True, nullable=True, index=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('consignor_gstin', sa.String(length=15), nullable=False),
        sa.Column('consignee_gstin', sa.String(length=15), nullable=False),
        sa.Column('hsn_code', sa.String(length=8), nullable=False),
        sa.Column('transporter_id', sa.String(length=50), nullable=True),
        sa.Column('vehicle_number', sa.String(length=20), nullable=True),
        sa.Column('distance_km', sa.Integer(), nullable=False),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('qr_code_data', sa.Text(), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('eway_bills')
