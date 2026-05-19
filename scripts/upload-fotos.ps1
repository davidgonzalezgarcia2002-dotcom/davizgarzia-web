# upload-fotos.ps1 — Sube y comprime TODAS las fotos de Z:\DJ\Fotos 2026\Pinchando
# Completamente automatico: detecta subcarpetas solas, sin configuracion manual.
# Uso: .\scripts\upload-fotos.ps1
# Requiere: $env:DAVIZ_GITHUB_PAT configurado con tu GitHub token

$PAT = $env:DAVIZ_GITHUB_PAT
if (-not $PAT) {
  Write-Host "ERROR: Falta el token de GitHub." -ForegroundColor Red
  Write-Host "Ejecuta primero:  dollar-sign-env:DAVIZ_GITHUB_PAT = 'tu_token'" -ForegroundColor Yellow
  exit 1
}

$REPO      = "davidgonzalezgarcia2002-dotcom/davizgarzia-web"
$DEST_PATH = "photos/live"
$SOURCE    = "Z:\DJ\Fotos 2026\Pinchando"
$MAX_W     = 1200
$QUALITY   = 82

Add-Type -AssemblyName System.Drawing

$headers = @{
  Authorization  = "Bearer $PAT"
  Accept         = "application/vnd.github.v3+json"
  "Content-Type" = "application/json"
}

# Convierte el nombre de una carpeta a slug corto legible
function MakePrefix([string]$folderName) {
  # Quitar contenido entre parentesis
  $s = $folderName -replace '\([^)]*\)', ''
  # Separar por espacios, guiones o guiones bajos
  $parts = ($s -split '[\s\-_]+') | Where-Object { $_ -match '^[a-zA-Z]' }
  if ($parts.Count -eq 0) { $parts = ($s -split '\s+') }
  $first3 = (@($parts))[0..2] | Where-Object { $_ }
  $slug   = ($first3 -join '-').ToLower()
  return ($slug -replace '[^a-z0-9-]', '') -replace '-+', '-'
}

# Obtener archivos ya subidos al repo
Write-Host "Consultando fotos ya subidas..." -ForegroundColor Cyan
try {
  $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/contents/$DEST_PATH" -Headers $headers -ErrorAction Stop
  $existingNames = @($existing | ForEach-Object { $_.name })
} catch { $existingNames = @() }
Write-Host "En repo: $($existingNames.Count) fotos" -ForegroundColor Gray

$uploaded = 0; $skipped = 0; $errors = 0

# Buscar todas las subcarpetas automaticamente
$subfolders = Get-ChildItem $SOURCE -Directory | Sort-Object Name
Write-Host "Subcarpetas encontradas: $($subfolders.Count)" -ForegroundColor Cyan

foreach ($folder in $subfolders) {
  $prefix  = MakePrefix $folder.Name
  $photos  = Get-ChildItem $folder.FullName -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png)$' } | Sort-Object Name
  $counter = 1

  Write-Host ""
  Write-Host "[$($folder.Name)] -> prefijo: $prefix ($($photos.Count) fotos)" -ForegroundColor White

  foreach ($photo in $photos) {
    $destName = "$prefix-$counter.jpg"
    $counter++

    if ($existingNames -contains $destName) {
      Write-Host "  SKIP  $destName" -ForegroundColor DarkGray
      $skipped++
      continue
    }

    Write-Host "  COMP  $($photo.Name) -> $destName" -NoNewline -ForegroundColor Gray
    try {
      $img   = [System.Drawing.Image]::FromFile($photo.FullName)
      $ratio = [Math]::Min(1.0, $MAX_W / $img.Width)
      $newW  = [int]($img.Width * $ratio)
      $newH  = [int]($img.Height * $ratio)
      $bmp   = New-Object System.Drawing.Bitmap($newW, $newH)
      $g     = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($img, 0, 0, $newW, $newH)

      $tmpFile = [System.IO.Path]::GetTempFileName() + ".jpg"
      $enc     = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq "image/jpeg"
      $prms    = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $prms.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$QUALITY)
      $bmp.Save($tmpFile, $enc, $prms)
      $g.Dispose(); $bmp.Dispose(); $img.Dispose()

      $origKB = [int]($photo.Length / 1024)
      $compKB = [int]((Get-Item $tmpFile).Length / 1024)

      $b64  = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($tmpFile))
      $body = @{ message = "photos: add $destName from $($folder.Name)"; content = $b64 } | ConvertTo-Json -Depth 3
      Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/contents/$DEST_PATH/$destName" -Method Put -Headers $headers -Body $body | Out-Null
      Remove-Item $tmpFile -Force

      Write-Host "  ${origKB}KB -> ${compKB}KB  OK" -ForegroundColor Green
      $uploaded++
      Start-Sleep -Milliseconds 350
    } catch {
      Write-Host "  ERROR: $_" -ForegroundColor Red
      $errors++
    }
  }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor DarkGray
Write-Host "Subidas: $uploaded  |  Saltadas: $skipped  |  Errores: $errors" -ForegroundColor Cyan
Write-Host "La galeria se actualiza sola el proximo lunes." -ForegroundColor Cyan
