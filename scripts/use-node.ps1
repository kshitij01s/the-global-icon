# THE GLOBAL ICON — add Node.js to this PowerShell session (Windows)
$node = "C:\Program Files\nodejs"
if (Test-Path "$node\npm.cmd") {
  $env:Path = "$node;" + $env:Path
  Write-Host "Node ready:" (node -v) "npm" (npm -v)
} else {
  Write-Host "Node.js not found at $node. Install LTS from https://nodejs.org then reopen the terminal."
}
