# THE GLOBAL ICON — pre-deployment readiness checks (Windows PowerShell)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== Node ==" -ForegroundColor Cyan
. .\scripts\use-node.ps1

Write-Host "== Install (if needed) ==" -ForegroundColor Cyan
npm install --silent

Write-Host "== API unit tests ==" -ForegroundColor Cyan
npm run test -w @tgi/api -- --forceExit

Write-Host "== Build API ==" -ForegroundColor Cyan
npm run build -w @tgi/api

Write-Host "== Build public web ==" -ForegroundColor Cyan
npm run build -w @tgi/public-web

Write-Host "== Build admin ==" -ForegroundColor Cyan
npm run build -w @tgi/admin-dashboard

Write-Host "== Env example present ==" -ForegroundColor Cyan
if (-not (Test-Path 'apps\api\.env.example')) { throw 'Missing apps/api/.env.example' }
if (Test-Path 'apps\api\.env') {
  $envText = Get-Content 'apps\api\.env' -Raw
  if ($envText -match 'change-me-access' -or $envText -match 'change-me-refresh') {
    Write-Host "WARN: apps/api/.env still has placeholder JWT secrets — replace before production." -ForegroundColor Yellow
  } else {
    Write-Host "OK: local .env does not use change-me JWT placeholders." -ForegroundColor Green
  }
} else {
  Write-Host "WARN: apps/api/.env missing — create from .env.example before deploy." -ForegroundColor Yellow
}

Write-Host "`nPredeploy checks finished. Review docs/DEPLOYMENT.md + docs/CONTENT_PROTECTION.md." -ForegroundColor Green
