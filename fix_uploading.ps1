$file = 'frontend\src\Profile.jsx'
$content = Get-Content $file -Raw
$content = $content -replace 'setUploading\(true\)', 'setIdUploading(true)'
$content = $content -replace 'setUploading\(false\)', 'setIdUploading(false)'
Set-Content $file $content
Write-Host "Done."
