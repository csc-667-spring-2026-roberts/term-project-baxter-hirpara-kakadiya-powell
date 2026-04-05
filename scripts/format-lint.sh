#!/usr/bin/env bash
#
# @file format-lint.sh
# @author Tyler Baxter (reused from CSC648)
# @date 2026-03-15
#
# script to js format/lint
#

set -eou pipefail

if [[ $(dirname "$0") != "scripts" ]]; then
	echo "must be ran as scripts/$(basename "$0")" 2>&1
	exit 1
fi

APP_ROOT="$(git rev-parse --show-toplevel)"
source "$APP_ROOT/scripts/env.sh"

usage() {
	echo "Usage: $(basename "$0") {-f | -l | -f -l} [-h]"
	echo "  -h	give this help list"
	echo "  -f	apply formatting"
	echo "  -l	apply linting"
}

# parse args:
FMT=false
LINT=false
while getopts "hfl" opt; do
	case $opt in
	f) FMT=true ;;
	l) LINT=true ;;
	h)
		usage
		exit 0
		;;
	*)
		usage
		exit 1
		;;
	esac
done

if [[ $FMT == false && $LINT == false ]]; then
	usage
	exit 0
fi

NODE_BIN="$APP_ROOT/node_modules/.bin"

FMT_FAILED=0
LINT_FAILED=0

# only format tracked files
SRC_DIR="$APP_ROOT"
DB_DIR="$APP_ROOT/database"
EJS_DIR="$APP_ROOT/views"

ilog "validating node binaries..."
if [[ ! -f "$NODE_BIN/eslint" ]] ||
	[[ ! -f "$NODE_BIN/prettier" ]] ||
	[[ ! -f "$NODE_BIN/js-beautify" ]]; then
	ilog "node binaries not found, installing..."
	npm install --save-dev --quiet eslint prettier js-beautify
fi

# BEGIN: frontend
trap popd EXIT
pushd "$SRC_DIR"
mapfile -t FRONTEND_FILES < <(git ls-files "*.js" "*.ts" "*.jsx" "*.tsx" "*.css")

ilog "formatting and linting frontend: $SRC_DIR"
if [[ ${#FRONTEND_FILES[@]} -gt 0 ]]; then
	for f in "${FRONTEND_FILES[@]}"; do
		if [[ $FMT == true ]]; then
			ilog "applying node formatter (prettier): $f"
			if ! "$NODE_BIN/prettier" --write "$f"; then
				elog "FAIL: please correct formatting issues: $f"
				FMT_FAILED=$((FMT_FAILED + 1))
			fi
		fi

		if [[ $LINT == true ]]; then
			ilog "applying node linter (eslint): $f"
			if ! "$NODE_BIN/eslint" "$f"; then
				elog "FAIL: please correct linting issues: $f"
				LINT_FAILED=$((LINT_FAILED + 1))
			fi
		fi
	done
fi

# END: frontend
popd
trap - EXIT

# BEGIN: ejs views
EJS_FMT=(--type html --templating erb --indent-with-tabs)
trap popd EXIT
pushd "$EJS_DIR"
mapfile -t EJS_FILES < <(git ls-files "*.ejs")

ilog "formatting and linting ejs views: $EJS_DIR"
if [[ ${#EJS_FILES[@]} -gt 0 ]]; then
	for f in "${EJS_FILES[@]}"; do
		if [[ $FMT == true ]]; then
			ilog "applying node formatter (js-beautify): $f"
			if ! "$NODE_BIN/js-beautify" "${EJS_FMT[@]}" --replace "$f"; then
				elog "FAIL: please correct formatting issues: $f"
				FMT_FAILED=$((FMT_FAILED + 1))
			fi
		fi
	done
fi

# END: ejs views
popd
trap - EXIT

# BEGIN: database
PG_FMT_IMG="darold.net/pgformatter"
DB_FMT=(-T -u 2 -U 2 -f 1 -t -k -L -B --no-space-function)

trap popd EXIT
pushd "$DB_DIR"
mapfile -t DB_FILES < <(git ls-files "*.sql")

ilog "validating docker"
if ! command -v docker &>/dev/null; then
	elog "docker not found"
	exit 1
fi

if ! docker image inspect "$PG_FMT_IMG" &>/dev/null; then
	ilog "pg_format image not found, building..."
	(
		TMP_DIR=$(mktemp -d)
		trap 'rm -rvf "$TMP_DIR"' EXIT
		git clone --depth 1 https://github.com/darold/pgFormatter.git "$TMP_DIR"
		docker build -t "$PG_FMT_IMG" "$TMP_DIR"
	)
fi

ilog "formatting and linting DB: $DB_DIR"
if [[ ${#DB_FILES[@]} -gt 0 ]]; then
	for f in "${DB_FILES[@]}"; do
		if [[ $FMT == true ]]; then
			ilog "applying sql formatter (pg_format): $f"
			tmpf=$(mktemp)
			if docker run --rm -a stdin -a stdout -i "$PG_FMT_IMG" "${DB_FMT[@]}" - <"$f" >"$tmpf"; then
				mv "$tmpf" "$f"
			else
				rm -vf "$tmpf"
				elog "FAIL: please correct formatting issues: $f"
				FMT_FAILED=$((FMT_FAILED + 1))
			fi
		fi
	done
fi

# END: database
popd
trap - EXIT

if [[ $FMT_FAILED -gt 0 || $LINT_FAILED -gt 0 ]]; then
	elog "FAIL: formatting failures: $FMT_FAILED, linting failures: $LINT_FAILED"
	exit 1
fi

ilog "PASSED"
