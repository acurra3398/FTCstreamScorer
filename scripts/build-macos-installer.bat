@echo off
REM Information script for building macOS installer
REM macOS installers can ONLY be built on a Mac due to Apple's code signing requirements

echo === FTC Stream Scorer - macOS Installer Information ===
echo.
echo Unfortunately, macOS installers (.dmg/.pkg) can ONLY be built on a Mac computer.
echo This is due to Apple's code signing and notarization requirements.
echo.
echo Options for building macOS installers:
echo.
echo 1. USE A MAC COMPUTER:
echo    - Copy this project to a Mac
echo    - Run: ./scripts/build-macos-installer.sh
echo.
echo 2. USE GITHUB ACTIONS (Recommended):
echo    - Push your code to GitHub
echo    - Set up a GitHub Actions workflow that builds on macOS
echo    - The workflow can automatically create macOS installers
echo.
echo 3. USE A CLOUD MAC SERVICE:
echo    - Services like MacStadium, AWS EC2 Mac, or GitHub Codespaces
echo    - Rent a Mac instance to run the build script
echo.
echo 4. DISTRIBUTE AS JAR:
echo    - Mac users can run the JAR directly with: java -jar stream-scorer-1.0.0.jar
echo    - Requires Java to be installed on the Mac
echo.
echo For GitHub Actions setup, see the example workflow in:
echo   scripts/github-actions-example.yml
echo.
pause
