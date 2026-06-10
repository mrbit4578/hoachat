param(
  [string]$Version = "0.0.1"
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$ReleaseDir = Join-Path $Root "release"
$RuntimeDir = Join-Path $Root "node_modules\electron\dist"
$AppDir = Join-Path $ReleaseDir "HoaChat-win32-x64"
$ResourcesDir = Join-Path $AppDir "resources"
$EmbeddedAppDir = Join-Path $ResourcesDir "app"
$InstallerWorkDir = Join-Path $env:TEMP "hoachat-installer-work"
$ZipPath = Join-Path $InstallerWorkDir "hoachat-app.zip"
$InstallScript = Join-Path $InstallerWorkDir "install.ps1"
$SedPath = Join-Path $InstallerWorkDir "hoachat-setup.sed"
$SetupPath = Join-Path $ReleaseDir "HoaChat-Setup-$Version.exe"
$TempSetupPath = Join-Path $InstallerWorkDir "HoaChat-Setup-$Version.exe"

if (!(Test-Path $RuntimeDir)) {
  throw "Electron runtime not found: $RuntimeDir"
}

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
Remove-Item -LiteralPath $AppDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $InstallerWorkDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $EmbeddedAppDir | Out-Null
New-Item -ItemType Directory -Force -Path $InstallerWorkDir | Out-Null

Copy-Item -Path (Join-Path $RuntimeDir "*") -Destination $AppDir -Recurse -Force
Remove-Item -LiteralPath (Join-Path $ResourcesDir "default_app.asar") -Force -ErrorAction SilentlyContinue

Move-Item -LiteralPath (Join-Path $AppDir "electron.exe") -Destination (Join-Path $AppDir "HoaChat.exe") -Force
Copy-Item -LiteralPath (Join-Path $Root "dist") -Destination (Join-Path $EmbeddedAppDir "dist") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Root "electron") -Destination (Join-Path $EmbeddedAppDir "electron") -Recurse -Force

@"
{
  "name": "hoachat-desktop",
  "version": "$Version",
  "main": "electron/main.cjs"
}
"@ | Set-Content -LiteralPath (Join-Path $EmbeddedAppDir "package.json") -Encoding UTF8

Compress-Archive -Path (Join-Path $AppDir "*") -DestinationPath $ZipPath -Force

@'
$ErrorActionPreference = "Stop"

$appName = "HoaChat"
$displayName = "He thong kiem soat hoa chat"
$targetDir = Join-Path $env:LOCALAPPDATA $appName
$sourceZip = Join-Path $PSScriptRoot "hoachat-app.zip"

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Get-ChildItem -LiteralPath $targetDir -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Expand-Archive -LiteralPath $sourceZip -DestinationPath $targetDir -Force

$exePath = Join-Path $targetDir "HoaChat.exe"
$shell = New-Object -ComObject WScript.Shell

$desktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "$displayName.lnk"
$shortcut = $shell.CreateShortcut($desktopShortcut)
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = $targetDir
$shortcut.Description = $displayName
$shortcut.Save()

$programsDir = [Environment]::GetFolderPath("Programs")
$startMenuDir = Join-Path $programsDir $displayName
New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null
$startShortcut = Join-Path $startMenuDir "$displayName.lnk"
$shortcut = $shell.CreateShortcut($startShortcut)
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = $targetDir
$shortcut.Description = $displayName
$shortcut.Save()

Start-Process -FilePath $exePath
'@ | Set-Content -LiteralPath $InstallScript -Encoding UTF8

@"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=Da cai dat xong He thong kiem soat hoa chat.
TargetName=$TempSetupPath
FriendlyName=He thong kiem soat hoa chat
AppLaunched=powershell.exe -NoProfile -ExecutionPolicy Bypass -File install.ps1
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$InstallerWorkDir
[SourceFiles0]
hoachat-app.zip=
install.ps1=
"@ | Set-Content -LiteralPath $SedPath -Encoding ASCII

Remove-Item -LiteralPath $SetupPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $TempSetupPath -Force -ErrorAction SilentlyContinue
& "$env:WINDIR\System32\iexpress.exe" /N /Q $SedPath

$deadline = (Get-Date).AddMinutes(10)
while (!(Test-Path $TempSetupPath) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 2
}

if (!(Test-Path $TempSetupPath)) {
  throw "Installer was not created: $TempSetupPath"
}

for ($i = 0; $i -lt 30; $i++) {
  $first = (Get-Item -LiteralPath $TempSetupPath).Length
  Start-Sleep -Seconds 2
  $second = (Get-Item -LiteralPath $TempSetupPath).Length
  if ($first -eq $second -and $second -gt 0) {
    break
  }
}

$moved = $false
for ($i = 0; $i -lt 20; $i++) {
  try {
    Move-Item -LiteralPath $TempSetupPath -Destination $SetupPath -Force
    $moved = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (!$moved) {
  throw "Installer was created but could not be moved to: $SetupPath"
}

Write-Host "Created installer: $SetupPath"
