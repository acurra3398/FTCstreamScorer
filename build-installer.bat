@echo off
REM Build script for creating Windows installers
REM Requires JDK 14+ for jpackage support

echo === FTC Stream Scorer Installer Builder ===
echo.

REM Check if JAVA_HOME is set
if "%JAVA_HOME%"=="" (
    echo Error: JAVA_HOME is not set
    echo Please set JAVA_HOME to your JDK installation directory
    exit /b 1
)

REM Step 1: Clean and build JAR
echo Step 1: Building application JAR...
call mvn clean package -DskipTests
if errorlevel 1 (
    echo Error: Maven build failed
    exit /b 1
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
    --vendor "FTC Robotics" ^
    --description "Local FTC DECODE match scorer with webcam support" ^
    --win-menu ^
    --win-shortcut ^
    --java-options "-Xmx512m" ^
    --java-options "-Dfile.encoding=UTF-8"

if errorlevel 1 (
    echo Error: jpackage failed
    exit /b 1
)

echo.
echo === Build Complete ===
echo Installer created in: target\installer\
dir target\installer\
