"""auditoria, doble factor y cifrado

- `eventos_auditoria`: registro de seguridad que solo admite INSERT (un disparador rechaza
  UPDATE y DELETE, también desde la propia aplicación).
- Doble factor TOTP en `usuarios` y `desafios_segundo_factor` (paso entre contraseña y código).
- `analisis.descripcion` y `analisis.resultado` pasan a guardarse cifrados con AES-GCM. Los
  análisis existentes se cifran aquí mismo: requiere FRAUDE_CLAVES_CIFRADO si hay alguno.

Revisión: 6f203d66b7e8
Anterior: eae64f73f09e
Fecha: 2026-10-12 03:21:14.360127+00:00
"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import context, op
from sqlalchemy.dialects import postgresql

from api_fraude_detection.core.cifrado import (
    CONTEXTO_ANALISIS_DESCRIPCION,
    CONTEXTO_ANALISIS_RESULTADO,
    Cifrador,
)
from api_fraude_detection.core.config import obtener_settings

revision: str = "6f203d66b7e8"
down_revision: str | None = "eae64f73f09e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _cifrador() -> Cifrador:
    # Las de la app si migra al arrancar; las del entorno si se usa la CLI de Alembic.
    claves = context.config.attributes.get("claves_cifrado") or obtener_settings().claves_cifrado
    if claves is None:
        raise RuntimeError(
            "Hay análisis guardados: defina FRAUDE_CLAVES_CIFRADO para cifrarlos "
            "(uv run python -m api_fraude_detection.core.cifrado genera una clave)."
        )
    return Cifrador.desde_texto(claves.get_secret_value())


def upgrade() -> None:
    # ------------------------------------------------------------ doble factor
    op.add_column("usuarios", sa.Column("totp_secreto", sa.LargeBinary(), nullable=True))
    op.add_column(
        "usuarios", sa.Column("totp_activo", sa.Boolean(), server_default=sa.text("false"), nullable=False)
    )
    op.add_column("usuarios", sa.Column("totp_ultimo_paso", sa.BigInteger(), nullable=True))
    op.add_column(
        "usuarios",
        sa.Column(
            "codigos_recuperacion",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.create_table(
        "desafios_segundo_factor",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("hash_token", sa.String(length=64), nullable=False),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name=op.f("fk_desafios_segundo_factor_usuario_id_usuarios"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_desafios_segundo_factor")),
        sa.UniqueConstraint("hash_token", name=op.f("uq_desafios_segundo_factor_hash_token")),
    )
    op.create_index(
        op.f("ix_desafios_segundo_factor_expira_en"), "desafios_segundo_factor", ["expira_en"], unique=False
    )
    op.create_index(
        op.f("ix_desafios_segundo_factor_usuario_id"), "desafios_segundo_factor", ["usuario_id"], unique=False
    )

    # ------------------------------------------------------------ auditoría inmutable
    op.create_table(
        "eventos_auditoria",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("momento", sa.DateTime(timezone=True), nullable=False),
        sa.Column("tipo", sa.String(length=60), nullable=False),
        sa.Column("severidad", sa.String(length=12), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column("nombre_usuario", sa.String(length=64), nullable=True),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column(
            "detalle",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "severidad IN ('info', 'advertencia', 'critica')",
            name=op.f("ck_eventos_auditoria_severidad_valida"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_eventos_auditoria")),
    )
    op.create_index(
        "ix_eventos_auditoria_momento", "eventos_auditoria", [sa.literal_column("momento DESC")], unique=False
    )
    op.create_index(
        "ix_eventos_auditoria_severidad_momento",
        "eventos_auditoria",
        ["severidad", sa.literal_column("momento DESC")],
        unique=False,
    )
    op.create_index(op.f("ix_eventos_auditoria_tipo"), "eventos_auditoria", ["tipo"], unique=False)
    op.execute(
        """
        CREATE FUNCTION auditoria_solo_insercion() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'El registro de auditoría es inmutable: no admite %', TG_OP
                USING ERRCODE = 'insufficient_privilege';
        END
        $$
        """
    )
    op.execute(
        "CREATE TRIGGER eventos_auditoria_inmutables BEFORE UPDATE OR DELETE ON eventos_auditoria "
        "FOR EACH ROW EXECUTE FUNCTION auditoria_solo_insercion()"
    )

    # ------------------------------------------------------------ análisis cifrados
    op.add_column("analisis", sa.Column("descripcion_cifrada", sa.LargeBinary(), nullable=True))
    op.add_column("analisis", sa.Column("resultado_cifrado", sa.LargeBinary(), nullable=True))
    conexion = op.get_bind()
    filas = conexion.execute(sa.text("SELECT id, descripcion, resultado FROM analisis")).all()
    if filas:
        cifrador = _cifrador()
        for analisis_id, descripcion, resultado in filas:
            conexion.execute(
                sa.text(
                    "UPDATE analisis SET descripcion_cifrada = :d, resultado_cifrado = :r WHERE id = :id"
                ),
                {
                    "d": cifrador.cifrar_texto(descripcion or "", CONTEXTO_ANALISIS_DESCRIPCION),
                    "r": cifrador.cifrar_json(resultado, CONTEXTO_ANALISIS_RESULTADO),
                    "id": analisis_id,
                },
            )
    op.drop_column("analisis", "descripcion")
    op.drop_column("analisis", "resultado")
    op.alter_column("analisis", "descripcion_cifrada", new_column_name="descripcion", nullable=False)
    op.alter_column("analisis", "resultado_cifrado", new_column_name="resultado", nullable=False)


def downgrade() -> None:
    # ------------------------------------------------------------ análisis en claro
    op.add_column("analisis", sa.Column("descripcion_clara", sa.String(length=255), nullable=True))
    op.add_column(
        "analisis", sa.Column("resultado_claro", postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )
    conexion = op.get_bind()
    filas = conexion.execute(sa.text("SELECT id, descripcion, resultado FROM analisis")).all()
    if filas:
        cifrador = _cifrador()
        for analisis_id, descripcion, resultado in filas:
            conexion.execute(
                sa.text("UPDATE analisis SET descripcion_clara = :d, resultado_claro = :r WHERE id = :id"),
                {
                    "d": cifrador.descifrar_texto(descripcion, CONTEXTO_ANALISIS_DESCRIPCION),
                    "r": json.dumps(cifrador.descifrar_json(resultado, CONTEXTO_ANALISIS_RESULTADO)),
                    "id": analisis_id,
                },
            )
    op.drop_column("analisis", "descripcion")
    op.drop_column("analisis", "resultado")
    op.alter_column(
        "analisis", "descripcion_clara", new_column_name="descripcion", nullable=False, server_default=""
    )
    op.alter_column("analisis", "resultado_claro", new_column_name="resultado", nullable=False)

    # ------------------------------------------------------------ auditoría y doble factor
    op.execute("DROP TRIGGER eventos_auditoria_inmutables ON eventos_auditoria")
    op.execute("DROP FUNCTION auditoria_solo_insercion()")
    op.drop_table("eventos_auditoria")
    op.drop_table("desafios_segundo_factor")
    op.drop_column("usuarios", "codigos_recuperacion")
    op.drop_column("usuarios", "totp_ultimo_paso")
    op.drop_column("usuarios", "totp_activo")
    op.drop_column("usuarios", "totp_secreto")
