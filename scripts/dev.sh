#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="$(git rev-parse --show-toplevel)"
source "$APP_ROOT/scripts/env.sh"

# Start container if not already running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
	docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

	docker run -d \
		--name "$CONTAINER_NAME" \
		-e POSTGRES_USER="$DB_USER" \
		-e POSTGRES_PASSWORD="$DB_PASS" \
		-e POSTGRES_DB="$DB_NAME" \
		-p "$DB_PORT":5432 \
		-v poker_pgdata:/var/lib/postgresql/data \
		-v "$(pwd)/database":/docker-entrypoint-initdb.d \
		postgres:16

	echo "Started PostgreSQL container"
else
	echo "PostgreSQL container already running"
fi

echo "Waiting for PostgreSQL..."
until
	docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" \
		-d "$DB_NAME" >/dev/null 2>&1
do
	sleep 1
done

echo "PostgreSQL is ready"

exec npx tsx watch src/index.ts
