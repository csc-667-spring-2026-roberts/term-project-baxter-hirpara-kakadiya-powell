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

# only format tracked files
SRC_DIR="$APP_ROOT"

FMT_FAILED=0
LINT_FAILED=0

# BEGIN:
trap popd EXIT
pushd "$SRC_DIR"
NODE_BIN="$APP_ROOT/node_modules/.bin"
mapfile -t FRONTEND_FILES < <(git ls-files "*.js" "*.ts" "*.jsx" "*.tsx")

ilog "validating node binaries: $SRC_DIR"
if [[ ! -f "$NODE_BIN/eslint" ]] ||
	[[ ! -f "$NODE_BIN/prettier" ]]; then
	ilog "node binaries not found: $SRC_DIR"
	npm install --save-dev --quiet eslint prettier
fi

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

# END:
popd
trap - EXIT

if [[ $FMT_FAILED -gt 0 || $LINT_FAILED -gt 0 ]]; then
	elog "FAIL: formatting failures: $FMT_FAILED, linting failures: $LINT_FAILED"
	exit 1
fi

ilog "PASSED"
