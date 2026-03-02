param(
  [string]$PgRoot = "C:\Program Files\PostgreSQL\16",
  [string]$VectorRoot = "D:\Tools\vector.v0.8.1-pg16",
  [string]$DbName = "devos",
  [string]$PgUser = "postgres",
  [string]$ProjectRoot = "D:\work\develop_os",
  [switch]$SkipMigrate = $false
)

$ErrorActionPreference = "Stop"

function Test-Admin {
  $current = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($current)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Assert-Path([string]$PathValue, [string]$Label) {
  if (-not (Test-Path -LiteralPath $PathValue)) {
    throw "$Label not found: $PathValue"
  }
}

if (-not (Test-Admin)) {
  throw "Please run this script in an Administrator PowerShell window."
}

$vectorDll = Join-Path $VectorRoot "lib\vector.dll"
$vectorControl = Join-Path $VectorRoot "share\extension\vector.control"
$vectorSqlDir = Join-Path $VectorRoot "share\extension"
$pgLibDir = Join-Path $PgRoot "lib"
$pgExtDir = Join-Path $PgRoot "share\extension"
$psqlExe = Join-Path $PgRoot "bin\psql.exe"

Assert-Path $VectorRoot "VectorRoot"
Assert-Path $PgRoot "PgRoot"
Assert-Path $vectorDll "pgvector dll"
Assert-Path $vectorControl "pgvector control file"
Assert-Path $vectorSqlDir "pgvector extension sql directory"
Assert-Path $pgLibDir "PostgreSQL lib directory"
Assert-Path $pgExtDir "PostgreSQL extension directory"
Assert-Path $psqlExe "psql executable"

Write-Host "[1/6] Copy pgvector files..." -ForegroundColor Cyan
Copy-Item -LiteralPath $vectorDll -Destination $pgLibDir -Force
Copy-Item -LiteralPath $vectorControl -Destination $pgExtDir -Force
Copy-Item -Path (Join-Path $vectorSqlDir "vector--*.sql") -Destination $pgExtDir -Force

Write-Host "[2/6] Restart PostgreSQL service..." -ForegroundColor Cyan
$service = Get-Service | Where-Object { $_.Name -match "^postgresql.*16" } | Select-Object -First 1
if (-not $service) {
  throw "Cannot find PostgreSQL 16 service. Run: Get-Service *postgres* and set it manually."
}
Restart-Service -Name $service.Name -Force
Start-Sleep -Seconds 2

Write-Host "[3/6] Create/verify vector extension..." -ForegroundColor Cyan
& $psqlExe -U $PgUser -d $DbName -c "CREATE EXTENSION IF NOT EXISTS vector;"
if ($LASTEXITCODE -ne 0) { throw "Failed to create extension 'vector'." }

& $psqlExe -U $PgUser -d $DbName -c "SELECT extname, extversion FROM pg_extension WHERE extname='vector';"
if ($LASTEXITCODE -ne 0) { throw "Failed to verify extension 'vector'." }

if ($SkipMigrate) {
  Write-Host "[4/6] Skip Prisma migration steps (SkipMigrate=true)." -ForegroundColor Yellow
  Write-Host "Done." -ForegroundColor Green
  exit 0
}

Assert-Path $ProjectRoot "ProjectRoot"
Push-Location $ProjectRoot
try {
  Write-Host "[4/6] Prisma migrate resolve..." -ForegroundColor Cyan
  npx.cmd prisma migrate resolve --rolled-back "20260302_add_knowledge_base"
  if ($LASTEXITCODE -ne 0) { throw "prisma migrate resolve failed." }

  Write-Host "[5/6] Prisma migrate deploy..." -ForegroundColor Cyan
  npx.cmd prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy failed." }

  Write-Host "[6/6] Prisma generate..." -ForegroundColor Cyan
  npx.cmd prisma generate
  if ($LASTEXITCODE -ne 0) { throw "prisma generate failed." }
}
finally {
  Pop-Location
}

Write-Host "All steps completed successfully." -ForegroundColor Green
