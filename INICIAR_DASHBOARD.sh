#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/mi_dashboard"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: hace falta Node.js 20.19.x o posterior de la rama 20, o Node.js 22.12.0 o superior."
  echo "Descarga: https://nodejs.org/"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Instalando dependencias del dashboard..."
  npm install
fi

npm run dev
