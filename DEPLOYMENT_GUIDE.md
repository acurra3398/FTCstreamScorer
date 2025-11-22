# FTC Stream Scorer - Deployment Guide for End Users

This guide explains how to prepare the FTC Stream Scorer application for distribution to end users who don't have development tools installed.

## Table of Contents

1. [Prerequisites for Building](#prerequisites-for-building)
2. [Building the Application](#building-the-application)
3. [Distribution Methods](#distribution-methods)
4. [End User Requirements](#end-user-requirements)
5. [Installation Instructions for End Users](#installation-instructions-for-end-users)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites for Building

Before you can build the application for distribution, you need:

### Required Software

1. **Java Development Kit (JDK) 11 or higher**
   - Download from: [https://adoptium.net/](https://adoptium.net/)
   - Version 17 is recommended for best compatibility
   - Verify installation: `java -version`

2. **Apache Maven 3.6+**
   - Download from: [https://maven.apache.org/download.cgi](https://maven.apache.org/download.cgi)
   - Or install via package manager:
     - **Ubuntu/Debian**: `sudo apt install maven`
     - **macOS**: `brew install maven`
     - **Windows**: Use [Chocolatey](https://chocolatey.org/) - `choco install maven`
   - Verify installation: `mvn -version`

3. **Git** (for cloning the repository)
   - Download from: [https://git-scm.com/downloads](https://git-scm.com/downloads)
   - Verify installation: `git --version`

---

## Building the Application

### Step 1: Clone the Repository

```bash
git clone https://github.com/23333Hercules-Robotics/FTCstreamScorer.git
cd FTCstreamScorer
```

### Step 2: Build the JAR File

The simplest distribution method is to build a single executable JAR file that contains all dependencies:

```bash
mvn clean package
```

This command will:
- Clean any previous build artifacts
- Compile the source code
- Download all required dependencies
- Create a single "fat JAR" (uber JAR) with everything bundled
- Place the JAR in the `target/` directory

**Build time**: Approximately 15-30 seconds on first run (longer if dependencies need to be downloaded)

**Output**: `target/stream-scorer-1.0.0.jar` (approximately 53 MB)

### Step 3: Verify the Build

Check that the JAR was created successfully:

```bash
ls -lh target/stream-scorer-1.0.0.jar
```

You should see a file around 50-55 MB in size.

---

## Distribution Methods

### Method 1: Simple JAR Distribution (Recommended)

**Best for**: Quick deployment, cross-platform distribution, minimal setup

**Pros**:
- Single file to distribute
- Works on all platforms (Windows, macOS, Linux)
- Easy to update (just replace the JAR file)
- No installation required

**Cons**:
- Users must have Java installed
- Requires command-line or double-click execution

**What to distribute**:
1. `target/stream-scorer-1.0.0.jar` - The application
2. `run.sh` - Linux/macOS launcher script (optional)
3. `run.bat` - Windows launcher script (optional)
4. `QUICK_START.md` - User guide (recommended)

**Distribution package structure**:
```
FTCStreamScorer/
├── stream-scorer-1.0.0.jar
├── run.sh              (optional, for Linux/macOS)
├── run.bat             (optional, for Windows)
└── QUICK_START.md      (recommended)
```

### Method 2: Native Installers (Advanced)

**Best for**: Professional distribution, app store deployment, non-technical users

**Pros**:
- Creates platform-specific installers (.exe, .pkg, .deb)
- Can bundle Java runtime (users don't need Java installed)
- Creates desktop shortcuts and menu entries
- Professional appearance

**Cons**:
- Requires JDK 14+ with jpackage support
- Must build separately for each platform
- Larger file size (includes Java runtime)
- More complex build process

**How to build**:

On **Linux**:
```bash
./build-installer.sh
```

On **Windows**:
```batch
build-installer.bat
```

**Output location**: `target/installer/`

**File sizes**:
- Linux: ~60-80 MB (.deb or .rpm)
- Windows: ~100-120 MB (.exe or .msi)
- macOS: ~80-100 MB (.pkg or .dmg)

---

## End User Requirements

### Minimum System Requirements

- **Operating System**: 
  - Windows 10 or later
  - macOS 10.14 (Mojave) or later
  - Linux (any modern distribution with X11 or Wayland)
  
- **Memory**: 2 GB RAM minimum, 4 GB recommended

- **Processor**: Any modern 64-bit processor (Intel, AMD, Apple Silicon)

- **Disk Space**: 
  - 100 MB for application
  - 200 MB for Java runtime (if not already installed)

- **Java Runtime**: 
  - Java 11 or higher (if using JAR distribution)
  - Not required if using native installer with bundled runtime

- **Webcam**: Optional but recommended for full functionality

- **Screen Resolution**: 1280x720 minimum, 1920x1080 recommended

### Software Requirements (JAR Method Only)

End users must have **Java 11 or higher** installed.

**Download links**:
- Recommended: [Eclipse Adoptium](https://adoptium.net/) (formerly AdoptOpenJDK)
- Alternative: [Oracle Java](https://www.oracle.com/java/technologies/downloads/)
- Alternative: [Amazon Corretto](https://aws.amazon.com/corretto/)

**How users can check if Java is installed**:

Open a terminal/command prompt and run:
```bash
java -version
```

If Java is installed, they'll see output like:
```
openjdk version "17.0.8" 2023-07-18
OpenJDK Runtime Environment (build 17.0.8+7)
OpenJDK 64-Bit Server VM (build 17.0.8+7, mixed mode)
```

---

## Installation Instructions for End Users

### Option A: Using the JAR File

#### Windows

**Method 1: Double-click (if Java is properly configured)**
1. Download `stream-scorer-1.0.0.jar`
2. Double-click the JAR file
3. If it doesn't open, use Method 2

**Method 2: Using the launcher script**
1. Download both `stream-scorer-1.0.0.jar` and `run.bat`
2. Place them in the same folder
3. Double-click `run.bat`

**Method 3: Command line**
1. Open Command Prompt
2. Navigate to the folder containing the JAR:
   ```cmd
   cd C:\path\to\folder
   ```
3. Run:
   ```cmd
   java -jar stream-scorer-1.0.0.jar
   ```

#### macOS

**Method 1: Using the launcher script**
1. Download both `stream-scorer-1.0.0.jar` and `run.sh`
2. Place them in the same folder
3. Open Terminal
4. Navigate to the folder:
   ```bash
   cd ~/Downloads/FTCStreamScorer
   ```
5. Make the script executable (first time only):
   ```bash
   chmod +x run.sh
   ```
6. Run the script:
   ```bash
   ./run.sh
   ```

**Method 2: Command line**
1. Open Terminal
2. Navigate to the folder containing the JAR
3. Run:
   ```bash
   java -jar stream-scorer-1.0.0.jar
   ```

#### Linux

**Method 1: Using the launcher script**
1. Download both `stream-scorer-1.0.0.jar` and `run.sh`
2. Place them in the same folder
3. Open Terminal
4. Navigate to the folder:
   ```bash
   cd ~/Downloads/FTCStreamScorer
   ```
5. Make the script executable (first time only):
   ```bash
   chmod +x run.sh
   ```
6. Run the script:
   ```bash
   ./run.sh
   ```

**Method 2: Command line**
1. Open Terminal
2. Navigate to the folder containing the JAR
3. Run:
   ```bash
   java -jar stream-scorer-1.0.0.jar
   ```

### Option B: Using Native Installers

#### Windows (.exe or .msi)
1. Download the installer from the releases page
2. Double-click the installer
3. Follow the installation wizard
4. Launch from Start Menu or desktop shortcut

#### macOS (.pkg or .dmg)
1. Download the installer from the releases page
2. Double-click to mount/open
3. Follow the installation instructions
4. Launch from Applications folder or Launchpad

#### Linux (.deb or .rpm)

**Debian/Ubuntu (.deb)**:
```bash
sudo dpkg -i FTCStreamScorer-1.0.0.deb
```

**Fedora/RHEL (.rpm)**:
```bash
sudo rpm -i FTCStreamScorer-1.0.0.rpm
```

Launch from application menu or run `ftcstreamscorer` from terminal.

---

## Creating a Release Package

When preparing to distribute to end users, create a ZIP file with the following contents:

### For JAR Distribution

```
FTCStreamScorer-v1.0.0.zip
├── stream-scorer-1.0.0.jar
├── run.sh
├── run.bat
├── README.txt
└── QUICK_START.md
```

**README.txt** should contain:
```
FTC Stream Scorer v1.0.0

REQUIREMENTS:
- Java 11 or higher (download from https://adoptium.net/)
- Webcam (optional but recommended)

QUICK START:
Windows: Double-click run.bat or stream-scorer-1.0.0.jar
macOS/Linux: Run ./run.sh in terminal (make executable first with: chmod +x run.sh)

For detailed instructions, see QUICK_START.md

Support: https://github.com/23333Hercules-Robotics/FTCstreamScorer/issues
```

### Creating the ZIP file

**Linux/macOS**:
```bash
cd target
mkdir FTCStreamScorer-v1.0.0
cp stream-scorer-1.0.0.jar FTCStreamScorer-v1.0.0/
cp ../run.sh ../run.bat FTCStreamScorer-v1.0.0/
cp ../QUICK_START.md FTCStreamScorer-v1.0.0/
echo "See instructions above" > FTCStreamScorer-v1.0.0/README.txt
zip -r FTCStreamScorer-v1.0.0.zip FTCStreamScorer-v1.0.0
```

**Windows** (PowerShell):
```powershell
cd target
New-Item -ItemType Directory -Name "FTCStreamScorer-v1.0.0"
Copy-Item "stream-scorer-1.0.0.jar" "FTCStreamScorer-v1.0.0/"
Copy-Item "../run.sh", "../run.bat" "FTCStreamScorer-v1.0.0/"
Copy-Item "../QUICK_START.md" "FTCStreamScorer-v1.0.0/"
Compress-Archive -Path "FTCStreamScorer-v1.0.0" -DestinationPath "FTCStreamScorer-v1.0.0.zip"
```

---

## Uploading to GitHub Releases

1. **Go to your repository** on GitHub
   - Navigate to: `https://github.com/23333Hercules-Robotics/FTCstreamScorer`

2. **Click "Releases"** in the right sidebar

3. **Click "Draft a new release"**

4. **Fill in release information**:
   - **Tag version**: `v1.0.0`
   - **Release title**: `FTC Stream Scorer v1.0.0`
   - **Description**: 
     ```markdown
     ## FTC Stream Scorer v1.0.0
     
     A local-only scoring system for FTC DECODE (2025-2026) with dual-window output and webcam integration.
     
     ### Downloads
     - `FTCStreamScorer-v1.0.0.zip` - Cross-platform JAR with launch scripts
     - `stream-scorer-1.0.0.jar` - Standalone JAR (requires Java 11+)
     
     ### Requirements
     - Java 11 or higher ([Download here](https://adoptium.net/))
     - Webcam (optional but recommended)
     
     ### Quick Start
     1. Download the ZIP file
     2. Extract to a folder
     3. Run the launcher script for your OS
     4. See [Quick Start Guide](https://github.com/23333Hercules-Robotics/FTCstreamScorer/blob/main/QUICK_START.md)
     
     ### What's New
     - Initial release
     - Full DECODE 2025-2026 scoring support
     - Dual-window output for OBS streaming
     - Webcam integration
     - Authentic FTC match timing and sounds
     ```

5. **Upload files**:
   - Drag and drop `FTCStreamScorer-v1.0.0.zip` to the release
   - Optionally add platform-specific installers if you built them

6. **Publish release**

---

## Troubleshooting

### Build Issues

**Problem**: `mvn: command not found`
- **Solution**: Install Maven or add it to your PATH

**Problem**: `JAVA_HOME is not set`
- **Solution**: Set JAVA_HOME environment variable:
  - **Linux/macOS**: Add to `~/.bashrc` or `~/.zshrc`:
    ```bash
    export JAVA_HOME=/path/to/jdk
    export PATH=$JAVA_HOME/bin:$PATH
    ```
  - **Windows**: Set in System Environment Variables

**Problem**: JavaFX dependencies not found
- **Solution**: This is fixed in the updated pom.xml with platform profiles. Run:
  ```bash
  mvn clean package -U
  ```
  The `-U` flag forces update of dependencies.

**Problem**: Build fails with "dependencies could not be resolved"
- **Solution**: Clear Maven cache and rebuild:
  ```bash
  rm -rf ~/.m2/repository/org/openjfx
  mvn clean package
  ```

### End User Issues

**Problem**: Double-clicking JAR doesn't work on Windows
- **Solution**: File association may not be set up. Use `run.bat` instead or run from command line.

**Problem**: "Java not found" error
- **Solution**: Install Java from [https://adoptium.net/](https://adoptium.net/)

**Problem**: Application won't start
- **Solution**: Check Java version with `java -version`. Must be Java 11 or higher.

**Problem**: No webcam detected
- **Solution**: 
  - Check if webcam is connected
  - Check if another application is using the webcam
  - Try restarting the application
  - Update webcam drivers

**Problem**: Windows Defender/antivirus blocks the application
- **Solution**: Add exception for the JAR file or the installation directory

---

## Best Practices for Distribution

### Version Control
- Always tag releases in Git
- Use semantic versioning (e.g., v1.0.0, v1.1.0, v2.0.0)
- Include version in filename

### Documentation
- Include QUICK_START.md with every distribution
- Keep README.txt simple and concise
- Link to online documentation for detailed guides

### Testing
Before distributing, test on:
- [ ] Windows 10/11
- [ ] macOS (Intel and Apple Silicon if possible)
- [ ] Linux (Ubuntu/Debian at minimum)
- [ ] Different Java versions (11, 17, 21)
- [ ] With and without webcam
- [ ] First-time user scenario (clean Java install)

### Communication
- Clearly state Java requirement
- Provide direct download link for Java
- Include screenshots in documentation
- Create video tutorial if possible

### Support
- Set up GitHub Issues for bug reports
- Create a FAQ document
- Monitor user feedback
- Consider creating a Discord/Slack for community support

---

## Advanced: Continuous Integration

For automated builds on every commit, set up GitHub Actions:

Create `.github/workflows/build.yml`:

```yaml
name: Build FTC Stream Scorer

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        java: [11, 17]

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK ${{ matrix.java }}
      uses: actions/setup-java@v3
      with:
        java-version: ${{ matrix.java }}
        distribution: 'temurin'
        
    - name: Build with Maven
      run: mvn clean package
      
    - name: Upload JAR
      uses: actions/upload-artifact@v3
      with:
        name: stream-scorer-${{ matrix.os }}-java${{ matrix.java }}
        path: target/stream-scorer-*.jar
```

This will automatically build and test on multiple platforms and Java versions.

---

## Summary

### For Quick Distribution (Recommended):
1. Run `mvn clean package`
2. Get `target/stream-scorer-1.0.0.jar`
3. Package with `run.sh`, `run.bat`, and `QUICK_START.md`
4. Create ZIP file
5. Upload to GitHub Releases

### For Professional Distribution:
1. Build native installers with `./build-installer.sh` or `build-installer.bat`
2. Test on target platform
3. Sign the installer (optional but recommended)
4. Upload to GitHub Releases or distribution platform

### End User Instructions:
- Install Java 11+ from [https://adoptium.net/](https://adoptium.net/)
- Download and extract ZIP
- Run launcher script or JAR file
- See QUICK_START.md for usage

---

**Questions or Issues?**

- GitHub Issues: https://github.com/23333Hercules-Robotics/FTCstreamScorer/issues
- Email: [Your contact email]
- Discord: [Your Discord server if applicable]

**Happy Scoring! 🤖🎯**
