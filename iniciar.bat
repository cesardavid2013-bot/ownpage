@echo off
rem Lumi en local (Windows). Requiere Docker Desktop abierto.
cd /d "%~dp0"
docker info >nul 2>&1
if errorlevel 1 (
  echo Abre Docker Desktop y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
docker compose up -d --build
if errorlevel 1 ( pause & exit /b 1 )
if not exist .lumi-seeded (
  echo Creando perfiles de demostracion...
  docker compose --profile seed run --rm seed && echo ok> .lumi-seeded
)
echo.
echo Lumi esta lista:  http://localhost:4000
echo Cuenta de prueba: demo@lumi.app / password123
echo Panel de moderacion: http://localhost:4000/admin  (clave: local-admin-token-0123456789abcdef)
echo Para apagarla: docker compose down
start http://localhost:4000
pause
