; ============================================================================
; Inno Setup Script for FTC Stream Scorer
; ============================================================================
; 
; INSTRUCTIONS:
; 1. Download and install Inno Setup from https://jrsoftware.org/isinfo.php
; 2. Place StreamScorer.exe in the same folder as this script
; 3. Open this file in Inno Setup Compiler
; 4. Click Build > Compile (or press Ctrl+F9)
; 5. The installer will be created in the Output/ folder
;
; To customize for your own project:
; - Change MyAppName, MyAppVersion, MyAppPublisher, MyAppURL below
; - Generate a new unique AppId (Tools > Generate GUID in Inno Setup)
; - Update MyAppExeName to match your executable filename
; ============================================================================

#define MyAppName "FTC Stream Scorer"
#define MyAppVersion "1.1"
#define MyAppPublisher "Hercules Robotics"
#define MyAppURL "https://herculesrobotics.engineer"
#define MyAppExeName "StreamScorer.exe"
#define MyAppAssocName MyAppName + ""
#define MyAppAssocExt ".myp"
#define MyAppAssocKey StringChange(MyAppAssocName, " ", "") + MyAppAssocExt

[Setup]
; Unique ID for your app (generate a new one for your own project)
; Use Tools > Generate GUID in Inno Setup to create a new one
AppId={{35292DA2-CF8B-4DF4-AF6D-0DF0CBA6849F}

AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Install location (Program Files\FTC Stream Scorer)
DefaultDirName={autopf}\{#MyAppName}

; Icon shown in Programs & Features
UninstallDisplayIcon={app}\{#MyAppExeName}

; Enable file association support
ChangesAssociations=yes

; Don’t ask about Start Menu folder
DisableProgramGroupPage=yes

; Allow per-user install (no admin required by default)
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; Output directory and filename for the built installer
OutputDir=Output
OutputBaseFilename=FTCStreamScorer-Setup

; Better compression and modern wizard UI
SolidCompression=yes
WizardStyle=modern polar

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
; Optional desktop icon checkbox
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; IMPORTANT: This expects StreamScorer.exe to be next to script.iss
Source: "{#SourcePath}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
; Optional file association for .myp (you can keep or remove this)
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocExt}\OpenWithProgids"; ValueType: string; ValueName: "{#MyAppAssocKey}"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocKey}"; ValueType: string; ValueName: ""; ValueData: "{#MyAppAssocName}"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocKey}\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocKey}\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""

[Icons]
; Start Menu shortcut
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
; Optional desktop shortcut
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Offer to run the app after install
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent