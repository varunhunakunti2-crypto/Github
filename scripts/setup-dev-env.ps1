# GitForge Development Setup Script
Write-Host "Setting up GitForge local development environment..." -ForegroundColor Cyan

# 1. Setup local environment variables
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Green
} else {
    Write-Host ".env file already exists, skipping." -ForegroundColor Yellow
}

# 2. Check Docker dependency
Write-Host "Checking for Docker installation..."
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Docker found." -ForegroundColor Green
} else {
    Write-Host "WARNING: Docker command not found. Docker is required to run local services (Postgres, Redis, MinIO)." -ForegroundColor Red
}

# 3. Generate development SSH host keys
$keyDir = "apps/git-daemon/keys"
if (-not (Test-Path $keyDir)) {
    New-Item -ItemType Directory -Force -Path $keyDir | Out-Null
}

$keyFile = "$keyDir/id_rsa"
if (-not (Test-Path $keyFile)) {
    Write-Host "Generating development SSH host keys..." -ForegroundColor Cyan
    # Generate RSA key for mock Git daemon without passphrase prompt
    ssh-keygen -t rsa -b 2048 -f $keyFile -N '""'
    Write-Host "Generated development SSH host key at $keyFile" -ForegroundColor Green
} else {
    Write-Host "SSH host keys already present, skipping." -ForegroundColor Yellow
}

Write-Host "Development setup complete. Run 'npm install' then start Docker Compose using docker/docker-compose.yml." -ForegroundColor Green
