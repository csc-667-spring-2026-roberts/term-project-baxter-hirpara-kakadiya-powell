#!/usr/bin/env bash
# update seed data's bcrypt hashed password with specified username, password
# (defaults to generated username, password). store pre-hash credentials in
# credentials.csv for test login.

set -euo pipefail

usage() {
	echo "Usage: $(basename "$0") [-u] [-p] [-h]"
	echo "  -u	username - variadic, for each password (must match password count)"
	echo "  -p	password - variadic, for each username (must match username count)"
	echo "  -h	give this help list"
}

gen_account() {
	local username=""
	local password=""

	while [[ -z "$username" || -v USERNAMES_SET["$username"] ]]; do
		username="user$((0x$(openssl rand -hex 1) % 10))"
	done

	while [[ -z "$password" || -v PASSWORDS_SET["$password"] ]]; do
		password=$(openssl rand -base64 12 | tr -d ',') # don't break csv
	done

	# store in sets, so we can conflict check to generate unique accounts
	USERNAMES_SET["$username"]=1
	PASSWORDS_SET["$password"]=1

	USERNAMES+=("$username")
	PASSWORDS+=("$password")
}

APP_ROOT="$(git rev-parse --show-toplevel)"
source "$APP_ROOT/.env"
source "$APP_ROOT/scripts/env.sh"

DB_DIR="$APP_ROOT/database"
SEED_JSON="$DB_DIR/seed.json"
CREDENTIALS="$DB_DIR/credentials.csv"

declare -A USERNAMES_SET=()
declare -A PASSWORDS_SET=()
USERNAMES=()
PASSWORDS=()

while getopts "u:p:h" opt; do
	case $opt in
	u) USERNAMES+=("$OPTARG") ;;
	p) PASSWORDS+=("$OPTARG") ;;
	h)
		usage
		exit 0
		;;
	*)
		usage
		exit 0
		;;
	esac
done

if [[ ${#USERNAMES[@]} -ne ${#PASSWORDS[@]} ]]; then
	elog "username count must match password count"
	exit 1
fi

COUNT=$(jq '.users | length' "$SEED_JSON")
if [[ $COUNT -le 0 ]]; then
	wlog "no count: $COUNT. nothing to do"
	exit 0
fi

echo "email,password" >"$CREDENTIALS"

for ((i = 0; i < COUNT; i++)); do
	if [[ ${#USERNAMES[@]} -le $i ]]; then
		gen_account
	fi

	USERNAME="${USERNAMES[$i]}"
	PASSWORD="${PASSWORDS[$i]}"

	HASHED_PASSWORD=$(node -e "
	  import('bcrypt').then(b => b.default.hash(\"$PASSWORD\", 10).then(h => process.stdout.write(h)));
	")

	# let jq escape with arg list
	SEED_JSON_CONTENT=$(jq \
		--argjson idx "$i" \
		--arg username "$USERNAME" \
		--arg email "$USERNAME@sfsu.edu" \
		--arg password "$HASHED_PASSWORD" \
		'.users[$idx].username = $username | .users[$idx].email = $email | .users[$idx].password = $password' \
		"$SEED_JSON")

	echo "$SEED_JSON_CONTENT" >"$SEED_JSON"
	echo "$USERNAME@sfsu.edu,$PASSWORD" >>"$CREDENTIALS"
	echo "updated: $USERNAME@sfsu.edu,$PASSWORD"
done
