"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-10

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # users (no FK deps)
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(200), nullable=False),
        sa.Column('password_hash', sa.String(256), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('organization', sa.String(200)),
        sa.Column('role', sa.String(20)),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # systems (no FK deps)
    op.create_table(
        'systems',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('system_id', sa.String(20), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('location', sa.String(300)),
        sa.Column('client', sa.String(200)),
        sa.Column('status', sa.String(20)),
        sa.Column('qualified', sa.Boolean(), default=False),
        sa.Column('last_qualified', sa.Date()),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_systems_system_id', 'systems', ['system_id'], unique=True)

    # instruments (FK to systems and users)
    op.create_table(
        'instruments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sierratrac_id', sa.String(20), nullable=False),
        sa.Column('serial_number', sa.String(100), nullable=False),
        sa.Column('model_number', sa.String(100)),
        sa.Column('manufacturer', sa.String(200)),
        sa.Column('instrument_type', sa.String(300)),
        sa.Column('category', sa.String(50)),
        sa.Column('status', sa.String(20)),
        sa.Column('qr_tagged', sa.Boolean(), default=False),
        sa.Column('verified', sa.Boolean(), default=False),
        sa.Column('system_id', sa.Integer(), sa.ForeignKey('systems.id'), nullable=True),
        sa.Column('slot_position', sa.String(50)),
        sa.Column('on_consignment', sa.Boolean(), default=False),
        sa.Column('consignment_location', sa.String(300)),
        sa.Column('seller_name', sa.String(200)),
        sa.Column('asking_price', sa.Numeric(10, 2)),
        sa.Column('specs', sa.JSON()),
        sa.Column('registered_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_instruments_sierratrac_id', 'instruments', ['sierratrac_id'], unique=True)
    op.create_index('ix_instruments_serial_number', 'instruments', ['serial_number'], unique=True)
    op.create_index('ix_instruments_model_number', 'instruments', ['model_number'])

    # service_records (FK to instruments and users)
    op.create_table(
        'service_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('instrument_id', sa.Integer(), sa.ForeignKey('instruments.id'), nullable=False),
        sa.Column('record_type', sa.String(30), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('summary', sa.Text()),
        sa.Column('service_date', sa.Date(), nullable=False),
        sa.Column('engineer_name', sa.String(200)),
        sa.Column('organization', sa.String(200)),
        sa.Column('findings', sa.JSON()),
        sa.Column('designation', sa.String(20)),
        sa.Column('notes', sa.Text()),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_service_records_instrument_id', 'service_records', ['instrument_id'])

    # photos (FK to instruments, service_records, users)
    op.create_table(
        'photos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('instrument_id', sa.Integer(), sa.ForeignKey('instruments.id'), nullable=False),
        sa.Column('service_record_id', sa.Integer(), sa.ForeignKey('service_records.id'), nullable=True),
        sa.Column('filename', sa.String(300), nullable=False),
        sa.Column('storage_url', sa.String(500), nullable=False),
        sa.Column('caption', sa.String(500)),
        sa.Column('file_size', sa.Integer()),
        sa.Column('content_type', sa.String(50)),
        sa.Column('uploaded_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_photos_instrument_id', 'photos', ['instrument_id'])

    # system_swaps (FK to systems and instruments x2)
    op.create_table(
        'system_swaps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('system_id_fk', sa.Integer(), sa.ForeignKey('systems.id'), nullable=False),
        sa.Column('swap_date', sa.Date(), nullable=False),
        sa.Column('slot_position', sa.String(50), nullable=False),
        sa.Column('removed_instrument_id', sa.Integer(), sa.ForeignKey('instruments.id'), nullable=True),
        sa.Column('removed_reason', sa.Text()),
        sa.Column('installed_instrument_id', sa.Integer(), sa.ForeignKey('instruments.id'), nullable=True),
        sa.Column('engineer_name', sa.String(200)),
        sa.Column('organization', sa.String(200)),
        sa.Column('notes', sa.Text()),
        sa.Column('requalified', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_system_swaps_system_id_fk', 'system_swaps', ['system_id_fk'])

    # service_requests (FK to instruments, systems, users, service_records)
    op.create_table(
        'service_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('request_id', sa.String(20), nullable=False),
        sa.Column('instrument_id', sa.Integer(), sa.ForeignKey('instruments.id'), nullable=False),
        sa.Column('system_id_fk', sa.Integer(), sa.ForeignKey('systems.id'), nullable=True),
        sa.Column('urgency', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('error_codes', sa.JSON()),
        sa.Column('custom_error', sa.String(300)),
        sa.Column('impact', sa.String(200)),
        sa.Column('submitted_by', sa.String(200)),
        sa.Column('status', sa.String(20)),
        sa.Column('resolved_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('resolved_at', sa.DateTime()),
        sa.Column('resolution_action', sa.String(20)),
        sa.Column('glp_explanation', sa.Text()),
        sa.Column('service_record_id', sa.Integer(), sa.ForeignKey('service_records.id'), nullable=True),
        sa.Column('created_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_service_requests_request_id', 'service_requests', ['request_id'], unique=True)
    op.create_index('ix_service_requests_instrument_id', 'service_requests', ['instrument_id'])
    op.create_index('ix_service_requests_status', 'service_requests', ['status'])


def downgrade():
    op.drop_table('service_requests')
    op.drop_table('system_swaps')
    op.drop_table('photos')
    op.drop_table('service_records')
    op.drop_table('instruments')
    op.drop_table('systems')
    op.drop_table('users')
