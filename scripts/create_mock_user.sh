#!/usr/bin/env bash
# Seed a mock user with a bcrypt-hashed password into the DB.
# Automatically updates src/mock.ts -- no manual copy-paste needed.
set -euo pipefail

usage() {
  echo "Usage: $(basename "$0") <username> <password>"
}

if [[ $# -ne 2 || -z "${1:-}" || -z "${2:-}" ]]; then
  usage
  exit 1
fi

APP_ROOT="$(git rev-parse --show-toplevel)"
source "$APP_ROOT/.env"
source "$APP_ROOT/scripts/env.sh"

if [[ -z "${DATABASE_URL:-}" ]]; then
  elog "DATABASE_URL undefined"
  exit 1
fi

if ! docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
  elog "PostgreSQL not ready (is the container running?)"
  exit 1
fi

USERNAME="${1}"
HASHED_PASSWORD=$(node -e "
  import('bcrypt').then(b => b.default.hash(process.argv[1], 10).then(h => process.stdout.write(h)));
" -- "${2}")

docker exec -i "$CONTAINER_NAME" psql -q -U "$DB_USER" -d "$DB_NAME" \
  -v username="$USERNAME" \
  -v email="${USERNAME}@sfsu.edu" \
  -v hashed="$HASHED_PASSWORD" \
  <<'EOF'
INSERT INTO users (id, username, email, password, balance, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  :'username',
  :'email',
  :'hashed',
  1000,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password;
EOF

MOCK_FILE="$APP_ROOT/src/mock.ts"

cat > "$MOCK_FILE" <<EOF
import { User } from "./models/types.js";

export const MOCK_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "$USERNAME",
  email: "${USERNAME}@sfsu.edu",
  password: "$HASHED_PASSWORD",
  balance: 1000,
  created_at: new Date(),
};
EOF

echo "Mock user seeded and src/mock.ts updated."
