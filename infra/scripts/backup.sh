#!/usr/bin/env bash
# Backup criptografado do banco "mercado" (achado 19 — docs/11 §7 Fase 4).
#
# Uso:
#   BACKUP_PASSPHRASE="segredo-forte" ./backup.sh [diretorio-destino]
#
# Gera <destino>/mercado_<timestamp>.sql.gz.enc — dump comprimido e cifrado
# com AES-256-CBC (OpenSSL). Sem a passphrase, o arquivo é inútil mesmo que
# vazado (ex.: backup em nuvem mal configurado).
set -euo pipefail

DESTINO="${1:-./backups}"
CONTAINER="mercado_postgres"
DB_USER="mercado"
DB_NAME="mercado"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARQUIVO="${DESTINO}/mercado_${TIMESTAMP}.sql.gz.enc"

if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "Erro: defina BACKUP_PASSPHRASE (a mesma senha será exigida para restaurar)." >&2
  exit 1
fi

mkdir -p "$DESTINO"

echo "Gerando dump de '$DB_NAME'..."
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=plain \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE \
  > "$ARQUIVO"

echo "Backup criptografado salvo em: $ARQUIVO"
echo "Guarde a passphrase separada do arquivo — sem ela o backup não serve para nada."
