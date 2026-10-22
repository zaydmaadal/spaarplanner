#!/usr/bin/env bash
# Vercel buildCommand (vercel.json). Only a production build migrates: a failed migration fails the
# build, so the previous deployment stays live. Previews never touch the database schema.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  npx supabase db push --db-url "$SUPABASE_DB_URL"
fi

npx next build
