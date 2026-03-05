$exclude = @("node_modules", ".next", ".git", ".env.local", ".vscode", "zip-project.ps1", "*.zip")
$source = Get-Location
$destination = "ExecutiveDashboard_Pkg.zip"

If (Test-Path $destination) { Remove-Item $destination }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$compressionLevel = [System.IO.Compression.CompressionLevel]::Optimal

echo "Zipping project to $destination..."
echo "Excluding: $exclude"

$files = Get-ChildItem -Path $source -Recurse | Where-Object {
    $path = $_.FullName
    $skip = $false
    foreach ($pattern in $exclude) {
        if ($path -like "*\$pattern*" -or $path -like "*\$pattern") {
            $skip = $true
            break
        }
    }
    -not $skip
}

# This is a simple zip method. For complex exclusion logic in native PS without 7zip, 
# it's often easier to copy to a temp dir first.

$tempDir = Join-Path $env:TEMP "ExecutiveDashboard_Temp_$(Get-Random)"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

echo "Staging files to temporary directory..."
Copy-Item -Path . -Destination $tempDir -Recurse -Exclude $exclude

echo "Compressing..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, "$source\$destination", $compressionLevel, $false)

echo "Cleaning up..."
Remove-Item $tempDir -Recurse -Force

echo "Done! Zip file created: $destination"
