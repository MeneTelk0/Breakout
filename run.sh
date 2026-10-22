#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$PWD/.venv/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
export PGDATA="${TMPDIR:-/tmp}/breakout-postgres-$UID"
export PGHOST=localhost PGPORT=5432 PGUSER=mitla PGPASSWORD=root12

if [[ ! -x .venv/bin/python ]]; then
    echo 'Create .venv with Python 3.9–3.12 and install requirements.txt first.' >&2
    exit 1
fi
python -c 'import cgi, psycopg2'
if [[ ! -f "$PGDATA/PG_VERSION" ]]; then
    mkdir -p "$PGDATA"
    chmod 700 "$PGDATA"
    password_file=$(mktemp)
    chmod 600 "$password_file"
    printf '%s\n' "$PGPASSWORD" > "$password_file"
    trap 'rm -f "$password_file"' EXIT
    initdb -D "$PGDATA" -U mitla -E UTF8 --locale=en_US.UTF-8 --auth=scram-sha-256 --pwfile="$password_file"
    rm -f "$password_file"
    trap - EXIT
fi
if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
    pg_ctl -D "$PGDATA" -l "$PGDATA/server.log" -o "-h localhost -k $PGDATA" start
fi
python - <<'PY'
import psycopg2
from psycopg2 import sql

conn = psycopg2.connect(dbname='postgres')
conn.autocommit = True
try:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'mitla'")
        if cur.fetchone() is None:
            cur.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier('mitla')))
finally:
    conn.close()
with psycopg2.connect(dbname='mitla') as conn:
    with conn.cursor() as cur:
        cur.execute('''CREATE TABLE IF NOT EXISTS rating (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            score VARCHAR(20) NOT NULL,
            date DATE NOT NULL
        )''')
PY
echo 'Breakout: http://localhost:8000'
echo 'LAN: http://<this-computer-IP>:8000'
exec python -m http.server --cgi 8000 --bind 0.0.0.0
