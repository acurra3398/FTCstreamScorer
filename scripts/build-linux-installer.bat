@echo off
REM Build script for creating Linux installer (.deb) from Windows using WSL
REM This script requires Windows Subsystem for Linux (WSL) with Ubuntu installed
REM Run this on your Windows device to create a Linux installer

echo === FTC Stream Scorer - Linux Installer Builder (via WSL) ===
echo.
echo This script uses WSL (Windows Subsystem for Linux) to build Linux installers.
echo Requirements:
echo   - WSL installed with Ubuntu (run: wsl --install -d Ubuntu)
echo   - JDK 14+ installed in WSL (sudo apt install openjdk-17-jdk)
echo   - Maven installed in WSL (sudo apt install maven)
echo.

REM Check if WSL is available
wsl --status >nul 2>&1
if errorlevel 1 (
    echo Error: WSL is not installed or not available.
    echo.
    echo To install WSL, open PowerShell as Administrator and run:
    echo   wsl --install -d Ubuntu
    echo.
    echo After installation, restart your computer and run this script again.
    pause
    exit /b 1
)

echo WSL detected. Starting Linux build...
echo.

REM Navigate to project root
cd /d "%~dp0.."

REM Get the Windows path and convert to WSL path
set WIN_PATH=%CD%
for /f "usebackq tokens=*" %%i in (`wsl wslpath -a "%WIN_PATH%"`) do set WSL_PATH=%%i

echo Building in WSL path: %WSL_PATH%
echo.

REM Run the build script inside WSL
wsl bash -c "cd '%WSL_PATH%' && ./scripts/build-linux-installer.sh"

if errorlevel 1 (
    echo.
    echo Error: Linux build failed
    echo.
    echo Troubleshooting:
    echo   1. Make sure JDK 14+ is installed in WSL: sudo apt install openjdk-17-jdk
    echo   2. Make sure Maven is installed in WSL: sudo apt install maven
    echo   3. Set JAVA_HOME in WSL: export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
    pause
    exit /b 1
)

echo.
echo === Build Complete ===
echo Linux installer (.deb) created in: target\installer\
dir target\installer\*.deb 2>nul
echo.
pause
