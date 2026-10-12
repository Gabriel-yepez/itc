"""cambio de contrasena obligatorio

Los usuarios con una contraseña asignada por otra persona (administrador inicial o alta hecha
por un administrador) deben reemplazarla en su primer ingreso. Las cuentas existentes quedan
sin la marca: no se puede saber quién eligió su propia contraseña.

Revisión: eae64f73f09e
Anterior: 9785c12c406c
Fecha: 2026-10-10 20:20:18.828074+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "eae64f73f09e"
down_revision: str | None = "9785c12c406c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("debe_cambiar_contrasena", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("usuarios", "debe_cambiar_contrasena")
