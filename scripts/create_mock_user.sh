#!/usr/bin/env bash
# Generate a mock user with a real bcrypt hash for testing, then paste the
# output into src/mock.ts as MOCK_USER.

set -euo pipefail

usage() {
	echo "Usage: $(basename "$0") <username> <password>"
}

if [[ $# -ne 2 || -z "${1:-}" || -z "${2-}" ]]; then
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

USERNAME="${1:-}"
PASSWORD="${2:-}"

HASHED_PASSWORD=$(node -e "
  import('bcrypt').then(b => b.default.hash(\"$PASSWORD\", 10).then(h => process.stdout.write(h)));
")

docker exec -i "$CONTAINER_NAME" psql -q -U "$DB_USER" -d "$DB_NAME" <<EOF
INSERT INTO users (id, username, email, password, balance, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '$USERNAME',
  '$USERNAME@sfsu.edu',
  '$HASHED_PASSWORD',
  1000,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password;
EOF

cat <<EOF
export const MOCK_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "$USERNAME",
  email: "$USERNAME@sfsu.edu",
  password: "$HASHED_PASSWORD",
  balance: 1000,
  created_at: new Date(),
};
// login: email: $USERNAME@sfsu.edu, password: $PASSWORD
EOF
