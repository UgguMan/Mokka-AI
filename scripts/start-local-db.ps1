$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$databaseDir = Join-Path $projectRoot '.local\mongodb'
$databaseLog = Join-Path $projectRoot '.local\mongodb.log'
$candidate = Get-Command mongod -ErrorAction SilentlyContinue
if ($candidate) { $mongoBinary = $candidate.Source }
else {
  $candidate = Get-ChildItem -Path 'C:\Program Files\MongoDB\Server\*\bin\mongod.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $candidate) { throw 'Install MongoDB Community Server, or set MONGODB_URI to your existing local database.' }
  $mongoBinary = $candidate.FullName
}
$probe = New-Object System.Net.Sockets.TcpClient
try { $probe.Connect('127.0.0.1', 27017); Write-Host 'Port 27017 is already in use. Keeping the existing service.'; exit 0 } catch {} finally { $probe.Dispose() }
New-Item -ItemType Directory -Path $databaseDir -Force | Out-Null
$mongoArgs = @('--dbpath', ('"' + $databaseDir + '"'), '--logpath', ('"' + $databaseLog + '"'), '--logappend', '--bind_ip', '127.0.0.1', '--port', '27017')
$databaseProcess = Start-Process -FilePath $mongoBinary -ArgumentList $mongoArgs -WindowStyle Hidden -PassThru
Set-Content -LiteralPath (Join-Path $projectRoot '.local\mongodb.pid') -Value $databaseProcess.Id
Write-Host "Local MongoDB started. Process ID: $($databaseProcess.Id). Data stays in .local/mongodb."
