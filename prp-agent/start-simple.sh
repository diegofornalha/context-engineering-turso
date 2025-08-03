#!/bin/bash
# Simple startup script for PRP Agent

cd "$(dirname "$0")"
source ../venv/bin/activate
# Use main_simple.py if main.py has dependency issues
if ! python -c "import sentry_sdk" 2>/dev/null; then
    echo "Using main_simple.py (no Sentry)"
    uvicorn main_simple:app --host 0.0.0.0 --port 5678 --reload
else
    uvicorn main:app --host 0.0.0.0 --port 5678 --reload
fi