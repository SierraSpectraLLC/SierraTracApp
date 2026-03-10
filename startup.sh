#!/bin/bash
set -e

echo "Running database migrations..."
flask db upgrade

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 4 "app:create_app('production')"
