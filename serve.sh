#!/usr/bin/env bash
# Local dev server for Neil AI Hub. ES modules require HTTP (not file://).
cd "$(dirname "$0")" || exit 1
PORT="${1:-5173}"
echo "Neil AI Hub → http://localhost:$PORT  (Ctrl+C to stop)"
python3 -m http.server "$PORT"
