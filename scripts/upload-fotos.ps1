# upload-fotos.ps1
# Comprime y sube fotos de Z:\DJ\Fotos 2026\Pinchando al repo GitHub
# Uso: .\scripts\upload-fotos.ps1
# Ejecutar desde la carpeta web-davizgarzia o desde cualquier sitio

# PAT leído desde variable de entorno (más seguro que hardcodearlo)
# Para configurarlo una sola vez en tu máquina:
#   $env:DAVIZ_GITHUB_PAT = "tu_token_aqui"
$PAT  = $env:DAVIZ_GITHUB_PAT
if (-not $PAT) { Write-Host "ERROR: Define la variable de entorno DAVIZ_GITHUB_PAT con tu GitHub token." -ForegroundColor Red; exit 1 }
$REPO = "davidgonzalezgarcia2002-dotcom/davizgarzia-web"
$BRANCH    = "main"
$DEST_PATH = "photos/live"
$SOURCE    = "Z:\DJ\Fotos 2026\Pinchando"
$MAX_W     = 1200   # px máximo ancho
$QUALITY   = 82     # calidad JPEG

# Mapeo subcarpeta → prefijo de nombre de archivo
$PREFIX_MAP = @{
  "(Roxel) Con Labrador Carcel de los gemelos" = "roxel-labrador"
  "Feria De Abril (Roxel)"                     = "feria-roxel"
  "Plan B"                                     = "planb-live"
}

Add-Type -AssemblyName System.Drawing

$headers = @{
  Authorization  = "Bearer $PAT"
  Accept         = "application/vnd.github.v3+json"
  "Content-Type" = "application/json"
}

# Obtener lista de archivos ya subidos
Write-Host "Consultando archivos ya subidos en $DEST_PATH..." -ForegroundColor Cyan
try {
  $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/contents/$DEST_PATH" -Headers $headers -ErrorAction Stop
  $existingNames = $existing | ForEach-Object { $_.name }
} catch {
  $existingNames = @()
}
Write-Host "Archivos ya en repo: $($existingNames.Count)" -ForegroundColor Gray

$uploaded = 0
$skipped  = 0
$errors   = 0

foreach ($subfolder in $PREFIX_MAP.Keys) {
  $subPath = Join-Path $SOURCE $subfolder
  if (-not (Test-Path $subPath)) { Write-Host "Carpeta no encontrada: $subfolder" -ForegroundColor Yellow; continue }

  $photos = Get-ChildItem $subPath -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png)$' } | Sort-Object Name
  $prefix = $PREFIX_MAP[$subfolder]
  $counter = 1

  foreach ($photo in $photos) {
    $destName = "$prefix-$counter.jpg"
    $counter++

    if ($existingNames -contains $destName) {
      Write-Host "  SKIP  $destName (ya existe)" -ForegroundColor Gray
      $skipped++
      continue
    }

    Write-Host "  COMPRIMIR $($photo.Name) → $destName" -ForegroundColor White
    try {
      # Comprimir con System.Drawing
      $img     = [System.Drawing.Image]::FromFile($photo.FullName)
      $ratio   = [Math]::Min(1.0, $MAX_W / $img.Width)
      $newW    = [int]($img.Width  * $ratio)
      $newH    = [int]($img.Height * $ratio)
      $bmp     = New-Object System.Drawing.Bitmap($newW, $newH)
      $g       = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($img, 0, 0, $newW, $newH)

      $tmpFile = [System.IO.Path]::GetTempFileName() + ".jpg"
      $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq "image/jpeg"
      $params  = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$QUALITY)
      $bmp.Save($tmpFile, $encoder, $params)
      $g.Dispose(); $bmp.Dispose(); $img.Dispose()

      $originalKB   = [int]($photo.Length / 1024)
      $compressedKB = [int]((Get-Item $tmpFile).Length / 1024)
      Write-Host "    ${originalKB}KB → ${compressedKB}KB" -ForegroundColor Gray

      # Subir a GitHub
      $b64  = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($tmpFile))
      $body = @{ message = "photos: add $destName"; content = $b64; branch = $BRANCH } | ConvertTo-Json -Depth 3
      Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/contents/$DEST_PATH/$destName" -Method Put -Headers $headers -Body $body | Out-Null
      Remove-Item $tmpFile -Force

      Write-Host "    SUBIDO ✓ $destName" -ForegroundColor Green
      $uploaded++
      Start-Sleep -Milliseconds 300  # evitar rate limit
    } catch {
      Write-Host "    ERROR: $_" -ForegroundColor Red
      $errors++
    }
  }
}

Write-Host ""
Write-Host "────────────────────────────────" -ForegroundColor DarkGray
Write-Host "Subidos:  $uploaded fotos" -ForegroundColor Green
Write-Host "Saltados: $skipped (ya existían)" -ForegroundColor Gray
Write-Host "Errores:  $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Gray" })
Write-Host ""
Write-Host "Las fotos están en photos/live/ del repo." -ForegroundColor Cyan
Write-Host "La galería se actualizará automáticamente el próximo lunes." -ForegroundColor Cyan
