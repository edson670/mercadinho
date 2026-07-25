#!/usr/bin/env bash
# Restaura um backup gerado por backup.sh — para um banco de TESTE por
# padrão, nunca sobrescrevendo "mercado" sem confirmação explícita.
#
# Uso:
#   BACKUP_PASSPHRASE="segredo-forte" ./restore.sh <arquivo.sql.gz.enc> [nome-do-banco]
#
# Sem o segundo argumento, restaura em "mercado_restore_test" — é assim que
# se testa a restauração (achado 20: "backup sem teste de restauração não é
# backup, é esperança") sem arriscar o banco em uso.
set -euo pipefail

ARQUIVO="${1:?Uso: restore.sh <arquivo.sql.gz.enc> [nome-do-banco]}"
DB_DESTINO="${2:-mercado_restore_test}"
CONTAINER="mercado_postgres"
DB_USER="mercado"

if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "Erro: defina BACKUP_PASSPHRASE (a mesma usada no backup.sh)." >&2
  exit 1
fi

if [ "$DB_DESTINO" = "mercado" ]; then
  read -r -p "Isto vai SOBRESCREVER o banco 'mercado' em uso. Digite 'confirmo' para continuar: " resposta
  [ "$resposta" = "confirmo" ] || { echo "Cancelado."; exit 1; }
fi

echo "Criando banco de destino '$DB_DESTINO' (se não existir)..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = '$DB_DESTINO'" | grep -q 1 || \
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_DESTINO;"

echo "Restaurando '$ARQUIVO' em '$DB_DESTINO'..."
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$ARQUIVO" \
  | gunzip \
  | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_DESTINO"

echo "Restauração concluída em '$DB_DESTINO'."
echo "Valide os dados (ex.: SELECT count(*) FROM usuarios;) antes de considerar o backup confiável."
