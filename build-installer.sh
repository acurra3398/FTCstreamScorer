#!/bin/bash

# Build script for creating platform-specific installers
# Requires JDK 14+ for jpackage support

set -e

echo "=== FTC Stream Scorer Installer Builder ==="
echo ""

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 14 ]; then
    echo "Error: Java 14 or higher required for jpackage"
    echo "Current Java version: $JAVA_VERSION"
    exit 1
fi

# Step 1: Clean and build JAR
echo "Step 1: Building application JAR..."
mvn clean package -DskipTests

# Step 2: Create custom runtime image with jlink
echo "Step 2: Creating custom runtime image..."
$JAVA_HOME/bin/jlink \
    --module-path "$JAVA_HOME/jmods" \
    --add-modules java.base,java.desktop,java.logging,java.sql,java.naming,java.management,jdk.unsupported \
    --output target/runtime-image \
    --strip-debug \
    --no-header-files \
    --no-man-pages \
    --compress=2

# Step 3: Create installer with jpackage
echo "Step 3: Creating installer package..."

# Detect platform
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    INSTALLER_TYPE="deb"
    echo "Building for Linux (deb package)..."
elif [[ "$OSTYPE" == "darwin"* ]]; then
    INSTALLER_TYPE="dmg"
    echo "Building for macOS (dmg image)..."
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    INSTALLER_TYPE="msi"
    echo "Building for Windows (msi installer)..."
else
    echo "Unknown platform: $OSTYPE"
    exit 1
fi

# Create installer directory
mkdir -p target/installer

# Run jpackage
$JAVA_HOME/bin/jpackage \
    --type $INSTALLER_TYPE \
    --input target \
    --name "FTCStreamScorer" \
    --main-jar stream-scorer-1.0.0.jar \
    --main-class org.ftc.scorer.Launcher \
    --runtime-image target/runtime-image \
    --dest target/installer \
    --app-version "1.0.0" \
    --vendor "FTC Robotics" \
    --description "Local FTC DECODE match scorer with webcam support" \
    --icon src/main/resources/images/decode_logo.svg \
    --java-options "-Xmx512m" \
    --java-options "-Dfile.encoding=UTF-8"

echo ""
echo "=== Build Complete ==="
echo "Installer created in: target/installer/"
ls -lh target/installer/
