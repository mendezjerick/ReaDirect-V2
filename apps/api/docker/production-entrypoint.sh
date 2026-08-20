#!/bin/sh

set -eu

database_schema="${DB_SCHEMA:-readirect_production}"
case "$database_schema" in
    *[!A-Za-z0-9_]*)
        echo "DB_SCHEMA may contain only letters, numbers, and underscores." >&2
        exit 1
        ;;
esac

echo "Ensuring the private ReaDirect production database schema exists..."
PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}" \
PGSSLMODE="${DB_SSLMODE:-require}" \
psql \
    --host="${DB_HOST:?DB_HOST is required}" \
    --port="${DB_PORT:-5432}" \
    --username="${DB_USERNAME:?DB_USERNAME is required}" \
    --dbname="${DB_DATABASE:-postgres}" \
    --no-password \
    --set=ON_ERROR_STOP=1 \
    --command="CREATE SCHEMA IF NOT EXISTS \"$database_schema\""

echo "Preparing the ReaDirect production database..."
php artisan package:discover --ansi
php artisan migrate --force
php artisan db:seed --class='Database\Seeders\ProductionDeploymentSeeder' --force
php artisan config:cache

echo "Starting the ReaDirect production API on port ${PORT:-10000}..."
exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
