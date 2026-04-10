#!/usr/bin/env bash

docker rm -f poker-db 2>/dev/null || true
docker volume rm poker_pgdata 2>/dev/null || true
