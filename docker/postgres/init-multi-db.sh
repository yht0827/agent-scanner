#!/bin/bash
set -e

# PostgreSQL 다중 데이터베이스 자동 생성 스크립트 (scannerdb + targetdb)
echo "[Init] Initializing targetdb database..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE targetdb'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'targetdb')\gexec
    GRANT ALL PRIVILEGES ON DATABASE targetdb TO $POSTGRES_USER;
EOSQL
echo "[Init] targetdb initialization complete."
