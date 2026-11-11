#!/usr/bin/env bash
# Run CUE-PRO full app
cd "$(dirname "$0")"
pip install -q -r requirements.txt
echo "Starting CUE-PRO on http://localhost:8000"
uvicorn cuepro.api.main:app --host 0.0.0.0 --port 8000 --reload
