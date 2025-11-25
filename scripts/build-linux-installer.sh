#!/bin/bash

# Build script for creating Linux installer (.deb)
# Run this on a Linux system or via WSL on Windows
# Requires JDK 14+ for jpackage support

set -e

echo "=== FTC Stream Scorer - Linux Installer Builder ==="
echo ""

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Check if JAVA_HOME is set, try to auto-detect if not
if [ -z "$JAVA_HOME" ]; then
    # Try to find Java
    if command -v java &> /dev/null; then
        JAVA_PATH=$(which java)
        JAVA_HOME=$(dirname $(dirname $(readlink -f $JAVA_PATH)))
        echo "Auto-detected JAVA_HOME: $JAVA_HOME"
    else
        echo "Error: JAVA_HOME is not set and Java is not in PATH"
        echo "Install Java with: sudo apt install openjdk-17-jdk"
        echo "Then set: export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
        exit 1
    fi
fi

# Check Java version (handles both old "1.8.x" format and new "17.x" format)
JAVA_VERSION_STRING=$(java -version 2>&1 | head -1 | cut -d'"' -f2)
# Extract major version: for "1.8.x" use second number, for "17.x" use first number
if [[ "$JAVA_VERSION_STRING" == 1.* ]]; then
    JAVA_VERSION=$(echo "$JAVA_VERSION_STRING" | cut -d'.' -f2)
else
    JAVA_VERSION=$(echo "$JAVA_VERSION_STRING" | cut -d'.' -f1)
fi
if [ "$JAVA_VERSION" -lt 14 ]; then
    echo "Error: Java 14 or higher required for jpackage"
    echo "Current Java version: $JAVA_VERSION_STRING"
    echo "Install newer Java with: sudo apt install openjdk-17-jdk"
    exit 1
fi

echo "Using Java version: $JAVA_VERSION_STRING"
echo ""

# Step 1: Clean and build JAR
echo "Step 1: Building application JAR..."
mvn clean package -DskipTests

# Clean previous runtime image if exists
if [ -d "target/runtime-image" ]; then
    echo "Cleaning previous runtime image..."
    rm -rf target/runtime-image
fi

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
echo "Step 3: Creating Linux installer (deb)..."

mkdir -p target/installer

$JAVA_HOME/bin/jpackage \
    --type deb \
    --input target \
    --name "FTCStreamScorer" \
    --main-jar stream-scorer-1.0.0.jar \
    --main-class org.ftc.scorer.Launcher \
    --runtime-image target/runtime-image \
    --dest target/installer \
    --app-version "1.0.0" \
    --vendor "Hercules Robotics" \
    --description "Local FTC DECODE match scorer with webcam support" \
    --linux-shortcut \
    --linux-menu-group "Games" \
    --java-options "-Xmx512m" \
    --java-options "-Dfile.encoding=UTF-8"

echo ""
echo "=== Build Complete ==="
echo "Linux installer created in: target/installer/"
ls -lh target/installer/*.deb 2>/dev/null || echo "No .deb files found"
