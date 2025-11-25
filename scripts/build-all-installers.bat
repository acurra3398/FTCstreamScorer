@echo off
REM Build All Platform Installers from Windows
REM This is a convenience script to create installers for all platforms

echo ============================================================
echo           FTC Stream Scorer - Build All Installers
echo ============================================================
echo.
echo This will build installers for:
echo   [1] Windows (native build)
echo   [2] Linux (via WSL)
echo   [3] macOS (information only - requires a Mac)
echo.
echo ============================================================
echo.

:menu
echo Choose an option:
echo   [1] Build Windows installer only
echo   [2] Build Linux installer (via WSL)
echo   [3] Build all available installers
echo   [4] macOS build information
echo   [5] Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto windows
if "%choice%"=="2" goto linux
if "%choice%"=="3" goto all
if "%choice%"=="4" goto macos
if "%choice%"=="5" exit /b 0

echo Invalid choice. Please try again.
echo.
goto menu

:windows
echo.
echo Building Windows installer...
call "%~dp0build-windows-installer.bat"
goto end

:linux
echo.
echo Building Linux installer via WSL...
call "%~dp0build-linux-installer.bat"
goto end

:macos
echo.
call "%~dp0build-macos-installer.bat"
goto menu

:all
echo.
echo Building Windows installer...
call "%~dp0build-windows-installer.bat"
if errorlevel 1 (
    echo Windows build failed, but continuing...
)

echo.
echo Building Linux installer via WSL...
call "%~dp0build-linux-installer.bat"
if errorlevel 1 (
    echo Linux build failed.
)

echo.
echo ============================================================
echo                      Build Summary
echo ============================================================
echo.
echo Installers created in: target\installer\
echo.
dir "%~dp0..\target\installer\*" 2>nul
echo.
echo Note: macOS installers can only be built on a Mac.
echo       See scripts\build-macos-installer.bat for more info.
echo.

:end
pause
