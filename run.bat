@echo off
REM Simple launcher script for FTC Stream Scorer

set JAR_FILE=target\stream-scorer-1.0.0.jar

if not exist "%JAR_FILE%" (
    echo JAR file not found: %JAR_FILE%
    echo Building application...
    call mvn clean package -DskipTests
)

echo Starting FTC Stream Scorer...
java -jar "%JAR_FILE%"
pause
