$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $rootDir

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is not installed or not in PATH. Please install Docker Desktop first."
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env. Please fill in your API key values."
}

$envContent = Get-Content ".env" -Raw

if ($envContent -match "SESSION_SECRET=replace-with-a-long-random-secret") {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $sessionSecret = [Convert]::ToBase64String($bytes)
  $envContent = $envContent -replace "SESSION_SECRET=replace-with-a-long-random-secret", "SESSION_SECRET=$sessionSecret"
}

if ($envContent -match "ENCRYPTION_KEY=replace-with-64-char-hex-string") {
  $keyBytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($keyBytes)
  $encryptionKey = ($keyBytes | ForEach-Object { $_.ToString("x2") }) -join ""
  $envContent = $envContent -replace "ENCRYPTION_KEY=replace-with-64-char-hex-string", "ENCRYPTION_KEY=$encryptionKey"
}

Set-Content ".env" $envContent -Encoding UTF8

if ($envContent -match "DEEPSEEK_API_KEY=\s*$") {
  Write-Host "Reminder: set DEEPSEEK_API_KEY in .env before using AI features."
}

Write-Host "Starting database container..."
docker compose up -d db

Write-Host "Running database migrations..."
docker compose run --rm migrate

Write-Host "Starting application container..."
docker compose up -d --build app

Write-Host ""
docker compose ps
Write-Host ""
Write-Host "Initialization complete. Open http://localhost:3000"
