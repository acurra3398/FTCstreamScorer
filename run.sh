#!/bin/bash
# Simple launcher script for FTC Stream Scorer

JAR_FILE="target/stream-scorer-1.0.0.jar"

if [ ! -f "$JAR_FILE" ]; then
    echo "JAR file not found: $JAR_FILE"
    echo "Building application..."
    mvn clean package -DskipTests
fi

echo "Starting FTC Stream Scorer..."
java -jar "$JAR_FILE"
