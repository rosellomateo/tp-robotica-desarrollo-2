@echo off
cd /d "%~dp0mi_dashboard"

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: hace falta Node.js 20 o superior.
  echo Descarga: https://nodejs.org/
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias del dashboard...
  call npm install
  if errorlevel 1 exit /b 1
)

call npm run dev
