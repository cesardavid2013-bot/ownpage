#!/usr/bin/env bash
# Lumi en local (Mac / Linux). Requiere Docker Desktop abierto.
set -e
cd "$(dirname "$0")"
if ! docker info >/dev/null 2>&1; then echo "Abre Docker Desktop y vuelve a ejecutar este archivo."; exit 1; fi
docker compose up -d --build
if [ ! -f .lumi-seeded ]; then
  echo "Creando perfiles de demostración..."
  docker compose --profile seed run --rm seed && touch .lumi-seeded
fi
echo
echo "Lumi está lista:  http://localhost:4000"
echo "Cuenta de prueba: demo@lumi.app / password123"
echo "Panel de moderación: http://localhost:4000/admin  (clave: local-admin-token-0123456789abcdef)"
echo "Para apagarla: docker compose down"
(command -v open >/dev/null && open http://localhost:4000) || (command -v xdg-open >/dev/null && xdg-open http://localhost:4000) || true
