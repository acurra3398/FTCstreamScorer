#!/bin/bash

# Build script for creating macOS installer (.dmg)
# This script must be run on macOS
# Requires JDK 14+ for jpackage support

set -e

echo "=== FTC Stream Scorer - macOS Installer Builder ==="
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Error: This script must be run on macOS"
    echo "macOS installers can only be built on a Mac due to code signing requirements."
    exit 1
fi

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Check if JAVA_HOME is set
if [ -z "$JAVA_HOME" ]; then
    # Try to find Java on macOS
    if /usr/libexec/java_home &> /dev/null; then
        JAVA_HOME=$(/usr/libexec/java_home)
        echo "Auto-detected JAVA_HOME: $JAVA_HOME"
    else
        echo "Error: JAVA_HOME is not set and Java is not installed"
        echo "Install Java from: https://adoptium.net/"
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
echo "Step 3: Creating macOS installer (dmg)..."

mkdir -p target/installer

$JAVA_HOME/bin/jpackage \
    --type dmg \
    --input target \
    --name "FTCStreamScorer" \
    --main-jar stream-scorer-1.0.0.jar \
    --main-class org.ftc.scorer.Launcher \
    --runtime-image target/runtime-image \
    --dest target/installer \
    --app-version "1.0.0" \
    --vendor "Hercules Robotics" \
    --description "Local FTC DECODE match scorer with webcam support" \
    --mac-package-name "FTC Stream Scorer" \
    --java-options "-Xmx512m" \
    --java-options "-Dfile.encoding=UTF-8"

echo ""
echo "=== Build Complete ==="
echo "macOS installer created in: target/installer/"
ls -lh target/installer/*.dmg 2>/dev/null || echo "No .dmg files found"
