#!/bin/sh
# Restaura un respaldo cifrado en una base NUEVA (por defecto) o reemplaza una existente.
#
#   restaurar ARCHIVO.dump.age BASE_DESTINO [--reemplazar]
#
# Necesita la clave PRIVADA de age, que no vive en el servidor: móntela solo para restaurar,
# de solo lectura, en RESPALDO_CLAVE_PRIVADA (por defecto /run/secrets/clave-respaldos.txt).
set -eu
set -o pipefail

if [ $# -lt 2 ]; then
    echo "uso: restaurar ARCHIVO.dump.age BASE_DESTINO [--reemplazar]" >&2
    exit 2
fi
archivo="$1"
base="$2"
reemplazar="${3:-}"
clave="${RESPALDO_CLAVE_PRIVADA:-/run/secrets/clave-respaldos.txt}"

[ -r "$archivo" ] || { echo "No se puede leer $archivo" >&2; exit 1; }
[ -r "$clave" ] || { echo "No se encontró la clave privada en $clave" >&2; exit 1; }

existe=$(psql --dbname=postgres --tuples-only --no-align \
    --command="SELECT 1 FROM pg_database WHERE datname = '$(printf '%s' "$base" | sed "s/'/''/g")'")
if [ "$existe" = "1" ] && [ "$reemplazar" != "--reemplazar" ]; then
    echo "La base '$base' ya existe. Restaure en otra o agregue --reemplazar (borra su contenido)." >&2
    exit 1
fi

# Antes de tocar ninguna base se comprueba que la clave abre el respaldo y que está íntegro
# (age autentica el contenido: un archivo alterado no se descifra).
if ! age --decrypt --identity "$clave" --output /dev/null "$archivo"; then
    echo "La clave privada no corresponde a este respaldo o el archivo está dañado." >&2
    exit 1
fi

creada=""
if [ "$existe" != "1" ]; then
    createdb "$base"
    creada="si"
fi
if ! age --decrypt --identity "$clave" < "$archivo" \
    | pg_restore --dbname="$base" --clean --if-exists --no-owner --no-privileges --exit-on-error; then
    # No deja una base a medio restaurar que parezca buena.
    [ -n "$creada" ] && dropdb "$base"
    echo "Falló la restauración en '$base'." >&2
    exit 1
fi
echo "restaurado $(basename "$archivo") en la base '$base'"
