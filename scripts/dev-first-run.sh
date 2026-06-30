#!/usr/bin/env sh
set -eu

pnpm install
pnpm run db:generate

if grep -q "__SUPABASE_DATABASE_PASSWORD__" apps/server/.env 2>/dev/null; then
  printf "\nRefusing to run db:push while apps/server/.env still has the Supabase password placeholder.\n"
  printf "Replace __SUPABASE_DATABASE_PASSWORD__ first, then rerun pnpm run dev:first-run.\n"
  exit 1
fi

pnpm run db:push

pnpm run dev
