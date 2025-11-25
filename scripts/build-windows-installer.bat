@echo off
REM Build script for creating Windows installer (.msi)
REM Run this on your Windows device to create a Windows installer
REM Requires JDK 14+ for jpackage support

echo === FTC Stream Scorer - Windows Installer Builder ===
echo.

REM Check if JAVA_HOME is set
if "%JAVA_HOME%"=="" (
    echo Error: JAVA_HOME is not set
    echo Please set JAVA_HOME to your JDK installation directory ^(JDK 14+^)
    echo.
    echo Example: set JAVA_HOME=C:\Program Files\Java\jdk-17
    exit /b 1
)

REM Check Java version (handles both old "1.8.x" format and new "17.x" format)
for /f "tokens=3" %%g in ('java -version 2^>^&1 ^| findstr /i "version"') do (
    set JAVA_VERSION_STRING=%%g
)
set JAVA_VERSION_STRING=%JAVA_VERSION_STRING:"=%

REM Parse major version: for "1.8.x" use second number, for "17.x" use first number
set FIRST_PART=
for /f "delims=. tokens=1,2" %%a in ("%JAVA_VERSION_STRING%") do (
    if "%%a"=="1" (
        set JAVA_MAJOR=%%b
    ) else (
        set JAVA_MAJOR=%%a
    )
)
if %JAVA_MAJOR% LSS 14 (
    echo Error: Java 14 or higher required for jpackage
    echo Current Java version: %JAVA_VERSION_STRING%
    exit /b 1
)

echo Using Java: %JAVA_VERSION_STRING%
echo.

REM Navigate to project root
cd /d "%~dp0.."

REM Step 1: Clean and build JAR
echo Step 1: Building application JAR...
call mvn clean package -DskipTests
if errorlevel 1 (
    echo Error: Maven build failed
    exit /b 1
)

REM Clean previous runtime image if exists
if exist target\runtime-image (
    echo Cleaning previous runtime image...
    rmdir /s /q target\runtime-image
)

REM Step 2: Create custom runtime image with jlink
echo Step 2: Creating custom runtime image...
"%JAVA_HOME%\bin\jlink.exe" ^
    --module-path "%JAVA_HOME%\jmods" ^
    --add-modules java.base,java.desktop,java.logging,java.sql,java.naming,java.management,jdk.unsupported ^
    --output target\runtime-image ^
    --strip-debug ^
    --no-header-files ^
    --no-man-pages ^
    --compress=2

if errorlevel 1 (
    echo Error: jlink failed
    exit /b 1
)

REM Step 3: Create installer with jpackage
echo Step 3: Creating Windows installer (MSI)...

if not exist target\installer mkdir target\installer

"%JAVA_HOME%\bin\jpackage.exe" ^
    --type msi ^
    --input target ^
    --name "FTCStreamScorer" ^
    --main-jar stream-scorer-1.0.0.jar ^
    --main-class org.ftc.scorer.Launcher ^
    --runtime-image target\runtime-image ^
    --dest target\installer ^
    --app-version "1.0.0" ^
    --vendor "Hercules Robotics" ^
    --description "Local FTC DECODE match scorer with webcam support" ^
    --win-menu ^
    --win-shortcut ^
    --win-dir-chooser ^
    --java-options "-Xmx512m" ^
    --java-options "-Dfile.encoding=UTF-8"

if errorlevel 1 (
    echo Error: jpackage failed
    exit /b 1
)

echo.
echo === Build Complete ===
echo Windows installer created in: target\installer\
dir target\installer\*.msi
echo.
pause
