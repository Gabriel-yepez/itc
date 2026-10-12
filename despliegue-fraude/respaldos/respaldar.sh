#!/bin/sh
# Respaldo cifrado de PostgreSQL: pg_dump | age (clave pública) -> /respaldos/fraude-<fecha>.dump.age
#
#   respaldar            bucle: un respaldo cada RESPALDO_INTERVALO_SEGUNDOS (por defecto 24 h)
#   respaldar --una-vez  un respaldo y termina (para probar o lanzarlo a mano)
#
# Conexión: PGHOST, PGUSER, PGPASSWORD, PGDATABASE (variables estándar de libpq).
set -eu
set -o pipefail

: "${RESPALDO_CLAVE_PUBLICA:?Defina RESPALDO_CLAVE_PUBLICA (age1...): solo la pública vive en el servidor}"
INTERVALO="${RESPALDO_INTERVALO_SEGUNDOS:-86400}"
RETENCION_DIAS="${RESPALDO_RETENCION_DIAS:-14}"
DESTINO="${RESPALDO_DIRECTORIO:-/respaldos}"

respaldar() {
    archivo="$DESTINO/fraude-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
    # Se escribe con otro nombre y se renombra al terminar: nunca queda un respaldo a medias
    # con apariencia de completo.
    if ! pg_dump --format=custom --no-owner --no-privileges \
        | age --encrypt --recipient "$RESPALDO_CLAVE_PUBLICA" > "$archivo.parcial"; then
        rm -f "$archivo.parcial"
        echo "ERROR: falló el respaldo de $PGDATABASE" >&2
        return 1
    fi
    mv "$archivo.parcial" "$archivo"
    echo "respaldo creado: $(basename "$archivo") ($(wc -c < "$archivo" | tr -d ' ') bytes)"

    # Retención: se borran los respaldos de más de RESPALDO_RETENCION_DIAS días.
    find "$DESTINO" -maxdepth 1 -name 'fraude-*.dump.age' -mtime +"$RETENCION_DIAS" -print -delete \
        | sed 's/^/respaldo vencido borrado: /'
    date -u +%s > "$DESTINO/.ultimo-respaldo"  # lo vigila el healthcheck
}

if [ "${1:-}" = "--una-vez" ]; then
    respaldar
    exit
fi

while true; do
    respaldar || true  # un fallo se registra y se reintenta en el próximo ciclo
    sleep "$INTERVALO"
done
