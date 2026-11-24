"""Create the catalogs and patient admissions."""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    for table in ("wards", "departments"):
        op.create_table(table,
                        sa.Column("id", sa.String(40), primary_key=True),
                        sa.Column("name", sa.String(100), nullable=False))
    op.create_table("doctors",
                    sa.Column("id", sa.String(40), primary_key=True),
                    sa.Column("name", sa.String(100), nullable=False),
                    sa.Column("department_id", sa.String(40), sa.ForeignKey("departments.id"), nullable=False),
                    sa.UniqueConstraint("id", "department_id"))
    op.create_table(
        "patients",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("search_name", sa.String(360), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("gender", sa.String(20), nullable=False),
        sa.Column("ward_id", sa.String(40), sa.ForeignKey("wards.id"), nullable=False),
        sa.Column("department_id", sa.String(40), sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("doctor_id", sa.String(40), nullable=False),
        sa.Column("admission_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("discharged_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("age BETWEEN 0 AND 120"),
        sa.CheckConstraint("gender IN ('Male', 'Female', 'Other', 'Prefer not to say')"),
        sa.CheckConstraint("(status = 'Admitted' AND discharged_at IS NULL) OR (status = 'Discharged' AND discharged_at IS NOT NULL)"),
        sa.ForeignKeyConstraint(["doctor_id", "department_id"], ["doctors.id", "doctors.department_id"]),
    )
    for column in ("name", "search_name", "ward_id", "department_id", "doctor_id", "status", "admission_date"):
        op.create_index(f"ix_patients_{column}", "patients", [column])


def downgrade():
    for table in ("patients", "doctors", "departments", "wards"):
        op.drop_table(table)
