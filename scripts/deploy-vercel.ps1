param(
  [string]$AppUrl = ""
)

$ErrorActionPreference = "Stop"

function Read-Required($Name, $Secret = $false) {
  if ($Secret) {
    $secure = Read-Host "$Name" -AsSecureString
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
      [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
  } else {
    $plain = Read-Host "$Name"
  }

  if ([string]::IsNullOrWhiteSpace($plain)) {
    throw "$Name is required"
  }

  return $plain.Trim()
}

function Set-VercelEnv($Name, $Value) {
  $Value | npx vercel env add $Name production
}

Write-Host "Checking Vercel login..."
npx vercel whoami | Out-Host

$env:TELEGRAM_BOT_TOKEN = Read-Required "TELEGRAM_BOT_TOKEN" $true
$env:TELEGRAM_WEBHOOK_SECRET = Read-Required "TELEGRAM_WEBHOOK_SECRET" $true
$env:ADMIN_TELEGRAM_IDS = Read-Required "ADMIN_TELEGRAM_IDS"
$env:DATABASE_URL = Read-Required "DATABASE_URL" $true
$env:SHOP_BANK_NAME = Read-Required "SHOP_BANK_NAME"
$env:SHOP_BANK_ACCOUNT = Read-Required "SHOP_BANK_ACCOUNT"
$env:SHOP_BANK_OWNER = Read-Required "SHOP_BANK_OWNER"

Write-Host "Installing dependencies..."
npm install

Write-Host "Initializing database..."
npm run init-db

Write-Host "Configuring Vercel environment variables..."
Set-VercelEnv "TELEGRAM_BOT_TOKEN" $env:TELEGRAM_BOT_TOKEN
Set-VercelEnv "TELEGRAM_WEBHOOK_SECRET" $env:TELEGRAM_WEBHOOK_SECRET
Set-VercelEnv "ADMIN_TELEGRAM_IDS" $env:ADMIN_TELEGRAM_IDS
Set-VercelEnv "DATABASE_URL" $env:DATABASE_URL
Set-VercelEnv "SHOP_BANK_NAME" $env:SHOP_BANK_NAME
Set-VercelEnv "SHOP_BANK_ACCOUNT" $env:SHOP_BANK_ACCOUNT
Set-VercelEnv "SHOP_BANK_OWNER" $env:SHOP_BANK_OWNER

Write-Host "Deploying to production..."
$deployOutput = npx vercel --prod --yes
$deployOutput | Out-Host

if ([string]::IsNullOrWhiteSpace($AppUrl)) {
  $AppUrl = ($deployOutput | Select-String -Pattern "https://[^\s]+" | Select-Object -Last 1).Matches.Value
}

if ([string]::IsNullOrWhiteSpace($AppUrl)) {
  $AppUrl = Read-Required "Production URL, for example https://your-project.vercel.app"
}

$env:APP_URL = $AppUrl
Write-Host "Setting Telegram webhook to $AppUrl/api/telegram ..."
npm run set-webhook

Write-Host "Done. Health check: $AppUrl/api/health"
