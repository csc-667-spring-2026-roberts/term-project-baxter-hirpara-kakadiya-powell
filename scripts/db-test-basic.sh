#!/usr/bin/env bash

# POST testuser
curl -X POST http://localhost:3000/users -H "Content-Type: application/json" \
	-d '{"username":"testuser"}'

# GET testuser
curl http://localhost:3000/users/testuser
