# Creating Windows EXE Installer for FTC DECODE Scorer

This guide explains how to create a single-file Windows EXE installer that users can download and run to install the FTC DECODE Scorer application.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Method 1: jpackage (Recommended)](#method-1-jpackage-recommended)
3. [Method 2: Launch4j + Inno Setup](#method-2-launch4j--inno-setup)
4. [Method 3: Native Image (Advanced)](#method-3-native-image-advanced)
5. [Distributing the Installer](#distributing-the-installer)

---

## Prerequisites

### Required Software
1. **JDK 17 or higher** (includes jpackage tool)
   - Download from: https://adoptium.net/
   - Verify: `java -version` should show 17+

2. **WiX Toolset** (for Windows .exe/.msi installers)
   - Download from: https://wixtoolset.org/releases/
   - Install WiX v3.11 or higher
   - Add to PATH: `C:\Program Files (x86)\WiX Toolset v3.11\bin`
   - Verify: `candle.exe -?` should work

3. **Maven** (for building)
   - Already installed if you can build the project
   - Verify: `mvn -version`

---

## Method 1: jpackage (Recommended)

This is the official Java tool for creating native installers. It bundles the JRE with your app.

### Step 1: Build the JAR

```bash
cd /path/to/FTCstreamScorer
mvn clean package
```

This creates `target/stream-scorer-1.0.0.jar`

### Step 2: Create the Installer

**Windows (PowerShell or CMD):**

```bash
jpackage ^
  --input target ^
  --name "FTC DECODE Scorer" ^
  --main-jar stream-scorer-1.0.0.jar ^
  --main-class org.ftc.scorer.Launcher ^
  --type exe ^
  --icon src/main/resources/images/app_icon.ico ^
  --app-version 1.0.0 ^
  --vendor "Hercules Robotics" ^
  --description "FTC DECODE 2025-2026 Scoring System" ^
  --win-dir-chooser ^
  --win-menu ^
  --win-shortcut
```

**Parameters Explained:**
- `--input target` - Where to find JAR files
- `--name` - Application name (shown to users)
- `--main-jar` - Your application JAR
- `--main-class` - Main class with main() method
- `--type exe` - Create Windows EXE installer (also supports `msi`)
- `--icon` - Path to .ico file (needs to be .ico format, not .png)
- `--win-dir-chooser` - Let user choose install directory
- `--win-menu` - Add to Start Menu
- `--win-shortcut` - Create desktop shortcut

### Step 3: Find Your Installer

The installer will be created in the current directory:
- `FTC DECODE Scorer-1.0.0.exe` (approximately 100-150 MB)

This EXE includes:
- Your application
- Java Runtime (JRE 17)
- All dependencies
- Installation wizard

### Optional: Customize Install Wizard

Create a file `installer-config.properties`:

```properties
app.name=FTC DECODE Scorer
app.version=1.0.0
app.vendor=Hercules Robotics
app.copyright=Copyright © 2025 Hercules Robotics
app.description=Official FTC DECODE 2025-2026 Season Scoring System
```

Then add to jpackage command:
```bash
--resource-dir installer-resources
```

---

## Method 2: Launch4j + Inno Setup

Creates a smaller installer by not bundling Java (users must install Java separately).

### Step 1: Install Tools

**Launch4j:**
- Download: http://launch4j.sourceforge.net/
- Install to `C:\Program Files\Launch4j`

**Inno Setup:**
- Download: https://jrsoftware.org/isdl.php
- Install Inno Setup 6 or higher

### Step 2: Create EXE Wrapper (Launch4j)

1. Open Launch4j
2. Configure:
   - **Output file:** `FTCScorer.exe`
   - **Jar:** `target/stream-scorer-1.0.0.jar`
   - **Icon:** `src/main/resources/images/app_icon.ico`
   - **JRE Min Version:** 11
   - **JRE Max Version:** (leave blank)
3. Click "Build wrapper"

### Step 3: Create Installer Script (Inno Setup)

Create `installer.iss`:

```iss
[Setup]
AppName=FTC DECODE Scorer
AppVersion=1.0.0
AppPublisher=Hercules Robotics
AppPublisherURL=https://github.com/23333Hercules-Robotics/FTCstreamScorer
DefaultDirName={autopf}\FTC DECODE Scorer
DefaultGroupName=FTC DECODE Scorer
OutputDir=installer
OutputBaseFilename=FTCScorer-Setup-1.0.0
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=src\main\resources\images\app_icon.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"

[Files]
Source: "FTCScorer.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "target\stream-scorer-1.0.0.jar"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\FTC DECODE Scorer"; Filename: "{app}\FTCScorer.exe"
Name: "{autodesktop}\FTC DECODE Scorer"; Filename: "{app}\FTCScorer.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\FTCScorer.exe"; Description: "Launch FTC DECODE Scorer"; Flags: nowait postinstall skipifsilent
```

### Step 4: Compile Installer

1. Open Inno Setup Compiler
2. Open `installer.iss`
3. Click "Compile"
4. Find installer in `installer/FTCScorer-Setup-1.0.0.exe`

**Pros:** Smaller file size (~55 MB)
**Cons:** Users need Java 11+ installed

---

## Method 3: Native Image (Advanced)

Creates a truly native Windows executable using GraalVM. Most complex but smallest size.

### Prerequisites

1. **GraalVM:**
   - Download: https://www.graalvm.org/downloads/
   - Install GraalVM for Java 17
   - Install native-image: `gu install native-image`

2. **Visual Studio Build Tools:**
   - Download: https://visualstudio.microsoft.com/downloads/
   - Install "Desktop development with C++"

### Build Native Image

```bash
# Build with GraalVM
mvn clean package -Pnative

# This creates a native .exe (no JRE needed)
```

**Note:** JavaFX with GraalVM Native Image is experimental and may require additional configuration.

---

## Creating the App Icon (.ico file)

jpackage and Launch4j require `.ico` format (not .png).

### Convert PNG to ICO

**Online Tools:**
- https://convertio.co/png-ico/
- https://favicon.io/favicon-converter/

**Using ImageMagick:**
```bash
magick convert app_icon.png -define icon:auto-resize=256,128,64,48,32,16 app_icon.ico
```

**Recommended Sizes in ICO:**
- 256x256 (High DPI)
- 128x128
- 64x64
- 48x48
- 32x32
- 16x16

Place the `.ico` file in `src/main/resources/images/app_icon.ico`

---

## Quick Start Script (Windows)

Create `build-installer.bat` in project root:

```batch
@echo off
echo Building FTC DECODE Scorer Installer...
echo.

REM Step 1: Build JAR
echo [1/2] Building JAR file...
call mvn clean package
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Maven build failed
    pause
    exit /b 1
)

REM Step 2: Create installer
echo.
echo [2/2] Creating Windows installer...
jpackage ^
  --input target ^
  --name "FTC DECODE Scorer" ^
  --main-jar stream-scorer-1.0.0.jar ^
  --main-class org.ftc.scorer.Launcher ^
  --type exe ^
  --icon src/main/resources/images/app_icon.ico ^
  --app-version 1.0.0 ^
  --vendor "Hercules Robotics" ^
  --description "FTC DECODE 2025-2026 Scoring System" ^
  --win-dir-chooser ^
  --win-menu ^
  --win-shortcut

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Installer created: FTC DECODE Scorer-1.0.0.exe
    echo File size: ~100-150 MB
    echo.
    echo You can now distribute this file to users.
) else (
    echo ERROR: jpackage failed
    echo Make sure JDK 17+ and WiX Toolset are installed
)

pause
```

**Run it:**
```bash
build-installer.bat
```

---

## Automation with Maven Plugin

Add to `pom.xml` for automated builds:

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.panteleyev</groupId>
            <artifactId>jpackage-maven-plugin</artifactId>
            <version>1.6.0</version>
            <configuration>
                <name>FTC DECODE Scorer</name>
                <appVersion>1.0.0</appVersion>
                <vendor>Hercules Robotics</vendor>
                <destination>target/installer</destination>
                <module>org.ftc.scorer/org.ftc.scorer.Launcher</module>
                <runtimeImage>target/runtime-image</runtimeImage>
                <javaOptions>
                    <option>-Dfile.encoding=UTF-8</option>
                </javaOptions>
                <winDirChooser>true</winDirChooser>
                <winMenu>true</winMenu>
                <winShortcut>true</winShortcut>
                <icon>src/main/resources/images/app_icon.ico</icon>
            </configuration>
        </plugin>
    </plugins>
</build>
```

Then run:
```bash
mvn clean package jpackage:jpackage
```

---

## Distributing the Installer

### Option 1: GitHub Releases

1. Go to your repository: `https://github.com/23333Hercules-Robotics/FTCstreamScorer`
2. Click "Releases" → "Draft a new release"
3. Create tag: `v1.0.0`
4. Upload your EXE: `FTC DECODE Scorer-1.0.0.exe`
5. Add release notes
6. Publish

**Download URL will be:**
```
https://github.com/23333Hercules-Robotics/FTCstreamScorer/releases/download/v1.0.0/FTC-DECODE-Scorer-1.0.0.exe
```

### Option 2: Website Download

Update `website/app/page.tsx`:

```typescript
// Change this line:
window.location.href = 'https://github.com/.../releases/latest/download/FTC-DECODE-Scorer-1.0.0.exe';
```

### Option 3: Google Drive / OneDrive

1. Upload EXE to cloud storage
2. Get shareable link
3. Share with users

---

## Testing the Installer

### Before Distribution:

1. **Clean Install Test:**
   - Use a fresh Windows VM or test PC
   - Run the installer
   - Verify it installs correctly
   - Test application launches
   - Test all features work

2. **Uninstall Test:**
   - Go to Windows Settings → Apps
   - Find "FTC DECODE Scorer"
   - Uninstall
   - Verify all files removed

3. **Upgrade Test:**
   - Install version 1.0.0
   - Install version 1.0.1
   - Verify upgrade works smoothly

### Antivirus Testing:

New EXE files may trigger Windows Defender or antivirus warnings.

**Solutions:**
1. **Code Signing Certificate** (Recommended for professional distribution)
   - Purchase from DigiCert, Sectigo, etc. (~$200/year)
   - Sign your EXE with: `signtool sign /f certificate.pfx /p password FTCScorer.exe`
   - Eliminates warnings

2. **Submit to Microsoft:**
   - Submit to: https://www.microsoft.com/en-us/wdsi/filesubmission
   - After review, won't trigger SmartScreen

3. **Document in README:**
   - Tell users to click "More Info" → "Run Anyway" if warned

---

## Troubleshooting

### "jpackage: command not found"
- Install JDK 17+ (not just JRE)
- Make sure JAVA_HOME is set
- Add `%JAVA_HOME%\bin` to PATH

### "WiX Toolset not found"
- Install WiX: https://wixtoolset.org/releases/
- Add to PATH: `C:\Program Files (x86)\WiX Toolset v3.11\bin`
- Restart terminal

### Installer is too large (200+ MB)
- This is normal - includes full Java runtime
- Alternative: Use Method 2 (Launch4j) for smaller size
- Users will need Java installed separately

### Application won't start after install
- Check main class name is correct: `org.ftc.scorer.Launcher`
- Verify JAR runs manually: `java -jar stream-scorer-1.0.0.jar`
- Check for JavaFX dependencies in manifest

### Icon doesn't show
- Must be `.ico` format (not .png)
- Must include multiple sizes (16x16 to 256x256)
- Path must be correct in jpackage command

---

## Version Updates

When releasing a new version:

1. Update version in `pom.xml`:
   ```xml
   <version>1.1.0</version>
   ```

2. Update in build script:
   ```bash
   --app-version 1.1.0
   ```

3. Rebuild installer:
   ```bash
   build-installer.bat
   ```

4. Upload to GitHub Releases with new tag: `v1.1.0`

---

## Summary

**Easiest Method (Recommended):**
1. Install JDK 17+ and WiX Toolset
2. Run: `build-installer.bat`
3. Get: `FTC DECODE Scorer-1.0.0.exe` (~100-150 MB)
4. Upload to GitHub Releases
5. Users download and double-click to install

**Pros:**
- One file for users
- Includes Java (no manual Java install)
- Professional installer wizard
- Automatic Start Menu + Desktop shortcuts
- Easy uninstall

**Cons:**
- Large file size
- Requires WiX Toolset to build
- Windows-only (need separate process for Mac/Linux)

---

## Additional Resources

- **jpackage docs:** https://docs.oracle.com/en/java/javase/17/jpackage/
- **WiX Toolset:** https://wixtoolset.org/documentation/
- **Launch4j:** http://launch4j.sourceforge.net/docs.html
- **Code Signing:** https://docs.microsoft.com/en-us/windows/win32/seccrypto/signtool

---

**Questions?**
- Check GitHub Issues
- Review jpackage logs in current directory
- Test on clean Windows installation first

**Happy Distributing! 📦✨**
