# syntax=docker/dockerfile:1
# Respaldos cifrados de PostgreSQL. Misma imagen (y digest) que el servicio postgres: así
# pg_dump/pg_restore tienen exactamente la versión del servidor.
FROM postgres:18-alpine@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873

# age: cifrado con clave pública (https://age-encryption.org). El servidor solo tiene la clave
# pública: puede cifrar respaldos pero no leerlos.
RUN apk add --no-cache age \
 && mkdir -p /respaldos \
 && chown postgres:postgres /respaldos

COPY --chmod=0755 respaldar.sh /usr/local/bin/respaldar
COPY --chmod=0755 restaurar.sh /usr/local/bin/restaurar

USER postgres
WORKDIR /respaldos
ENTRYPOINT ["respaldar"]
