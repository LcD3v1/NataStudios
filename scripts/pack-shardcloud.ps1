# ─────────────────────────────────────────────────────────────
#  Gera o ZIP pronto para upload no ShardCloud.
#  Uso (na pasta do projeto):
#     powershell -ExecutionPolicy Bypass -File scripts\pack-shardcloud.ps1
#  Saida: dist\nata-studios-shardcloud.zip
# ─────────────────────────────────────────────────────────────
$ErrorActionPreference = 'Stop'

$proj = Split-Path -Parent $PSScriptRoot
Set-Location $proj

$node = "C:\Program Files\nodejs"
if (Test-Path $node) { $env:Path = "$node;$env:Path" }

Write-Host "==> 1/4  Build de producao" -ForegroundColor Cyan
# Build limpo: evita EBUSY/EINVAL causados pelo OneDrive segurando arquivos
# antigos em .next e garante um pacote reproduzivel.
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
cmd /c "rmdir /s /q .next" 2>&1 | Out-Null
cmd /c "rmdir /s /q dist" 2>&1 | Out-Null

npm run build
if ($LASTEXITCODE -ne 0) { throw "build falhou" }

Write-Host "==> 2/4  Montando pacote" -ForegroundColor Cyan
$stage = Join-Path $proj "dist\stage"
$distDir = Join-Path $proj "dist"
if (Test-Path $stage) { cmd /c "rmdir /s /q `"$stage`"" 2>&1 | Out-Null }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

# Arquivos e pastas necessarios em runtime
$items = @(
  'index.js', '.shardcloud', 'package.json', 'next.config.mjs',
  '.next', 'public', 'prisma', 'scripts', 'messages', 'src'
)
foreach ($item in $items) {
  $src = Join-Path $proj $item
  if (Test-Path $src) {
    Copy-Item $src -Destination $stage -Recurse -Force
  } else {
    Write-Host "   (aviso) nao encontrado: $item" -ForegroundColor Yellow
  }
}

# .env com os segredos (NAO vai para o git, mas precisa ir no ZIP)
$envSrc = Join-Path $proj ".env.production"
if (Test-Path $envSrc) {
  Copy-Item $envSrc -Destination (Join-Path $stage ".env") -Force
  Write-Host "   .env incluido (a partir de .env.production)" -ForegroundColor Green
} else {
  Write-Host "   (ATENCAO) .env.production nao encontrado — o app nao vai subir sem AUTH_SECRET" -ForegroundColor Red
}

# Limpezas: cache de build e banco local nao vao para producao
$cache = Join-Path $stage ".next\cache"
if (Test-Path $cache) { cmd /c "rmdir /s /q `"$cache`"" 2>&1 | Out-Null }
Get-ChildItem -Path $stage -Include *.db, *.db-journal -Recurse -File -ErrorAction SilentlyContinue |
  ForEach-Object { [System.IO.File]::Delete($_.FullName) }

Write-Host "==> 3/4  Compactando" -ForegroundColor Cyan
$zip = Join-Path $distDir "nata-studios-shardcloud.zip"
if (Test-Path $zip) { [System.IO.File]::Delete($zip) }
# Monta o ZIP entrada por entrada normalizando os separadores para "/".
# (CreateFromDirectory no .NET Framework grava "\", o que quebra as pastas
#  ao descompactar em Linux; Compress-Archive ignora arquivos ocultos.)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$srcRoot = (Resolve-Path $stage).Path.TrimEnd('\')
$zipStream = [System.IO.File]::Open($zip, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)
$fileCount = 0
Get-ChildItem -Path $srcRoot -Recurse -File -Force | ForEach-Object {
  $rel = $_.FullName.Substring($srcRoot.Length + 1).Replace('\', '/')
  $entry = $archive.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
  $es = $entry.Open()
  $fs = [System.IO.File]::OpenRead($_.FullName)
  $fs.CopyTo($es)
  $fs.Dispose(); $es.Dispose()
  $fileCount++
}
$archive.Dispose(); $zipStream.Dispose()
if (-not (Test-Path $zip)) { throw "falha ao gerar o ZIP" }
Write-Host "   $fileCount arquivos empacotados" -ForegroundColor Green

Write-Host "==> 4/4  Pronto" -ForegroundColor Cyan
$sizeMb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host ""
Write-Host "  ZIP: $zip" -ForegroundColor Green
Write-Host "  Tamanho: $sizeMb MB  (limite do ShardCloud: 100 MB)" -ForegroundColor Green
if ($sizeMb -gt 100) { Write-Host "  !! Acima do limite — remova assets pesados de public/" -ForegroundColor Red }
Write-Host ""
Write-Host "  Faca upload desse arquivo no painel do ShardCloud." -ForegroundColor Green
