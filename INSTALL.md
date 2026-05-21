# Install LocalPDF Studio

Cross-platform installation guide. Built artifacts are published per release at
[GitHub Releases](https://github.com/jeiel85/localpdf-studio/releases).

> 한국어 사용자: 영문 문서 + 각 OS별 안내가 포함되어 있습니다.

---

## Windows

### Option 1 — Installer (recommended)

Download from [latest release](https://github.com/jeiel85/localpdf-studio/releases/latest):

- `LocalPDF.Studio_X.Y.Z_x64-setup.exe` — NSIS installer (auto-update enabled)
- `LocalPDF.Studio_X.Y.Z_x64_ko-KR.msi` / `_en-US.msi` — MSI installer

> **SmartScreen** may show "Windows protected your PC" because the build is not
> code-signed (EV certificate is $300/year, planned later).
> Click "More info" → "Run anyway" to proceed.

### Option 2 — Portable ZIP

`LocalPDF-Studio-Portable.zip` — extract anywhere, no install required.

### Option 3 — winget (after manifest is accepted)

```powershell
winget install jeiel85.LocalPDFStudio
winget upgrade jeiel85.LocalPDFStudio
```

### Option 4 — Chocolatey (after package is accepted)

```powershell
choco install localpdf-studio
choco upgrade localpdf-studio
```

---

## macOS

### Option 1 — DMG (Universal: Apple Silicon + Intel)

Download `LocalPDF.Studio_X.Y.Z_universal.dmg` from
[latest release](https://github.com/jeiel85/localpdf-studio/releases/latest).

> ⚠️ **Currently unsigned and not notarized.**
> The first launch will show "**LocalPDF Studio.app cannot be opened because
> the developer cannot be verified.**"
>
> Apple Developer signing/notarization costs **$99/year** and is planned once
> the project sustains the cost.

#### Bypass once (recommended for users)

1. Open **Finder → Applications**
2. **Right-click** "LocalPDF Studio" → **Open**
3. In the dialog, click **Open** again
4. macOS remembers this choice — future launches work normally

#### Or via Terminal

```bash
xattr -cr "/Applications/LocalPDF Studio.app"
```

This removes all extended attributes (including quarantine flags) set by macOS Gatekeeper.

### Option 2 — Homebrew Cask (tap, after publishing)

```bash
brew tap jeiel85/tap
brew install --cask localpdf-studio
```

---

## Linux

### Option 1 — AppImage (most distros)

Download `LocalPDF.Studio_X.Y.Z_amd64.AppImage`, make it executable, and run:

```bash
chmod +x LocalPDF.Studio_*.AppImage
./LocalPDF.Studio_*.AppImage
```

Optionally integrate into the application menu with
[AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher).

### Option 2 — Debian / Ubuntu (.deb)

```bash
sudo apt install ./localpdf-studio_X.Y.Z_amd64.deb
# OR
sudo dpkg -i localpdf-studio_X.Y.Z_amd64.deb
sudo apt-get install -f   # resolve missing deps if needed
```

### Option 3 — Fedora / RHEL (.rpm)

```bash
sudo dnf install ./localpdf-studio-X.Y.Z-1.x86_64.rpm
# OR
sudo rpm -i localpdf-studio-X.Y.Z-1.x86_64.rpm
```

### Option 4 — Arch / Manjaro (AUR, after publishing)

```bash
yay -S localpdf-studio-bin
# or
paru -S localpdf-studio-bin
```

### Option 5 — Snap (after publishing)

```bash
sudo snap install localpdf-studio
```

### Linux dependencies

If running directly (.deb/.rpm typically installs these automatically):

```
libwebkit2gtk-4.1-0  libgtk-3-0  libayatana-appindicator3-1  librsvg2-2
```

---

## External tools (auto-installed on Windows)

LocalPDF Studio uses two external CLI tools for some features:

- **qpdf** — PDF merge/split/encryption/compression. Used by Tools panel.
- **Tesseract OCR** — OCR text extraction, searchable PDF. Used by Advanced panel.

On Windows, the app offers an in-app **automatic installer** for both, with
**SHA-256 integrity verification** before execution. Tesseract install requires
UAC elevation (administrator). qpdf installs to user-local app data without
elevation.

On macOS / Linux, install manually:

```bash
# macOS (Homebrew)
brew install qpdf tesseract

# Debian / Ubuntu
sudo apt install qpdf tesseract-ocr tesseract-ocr-kor tesseract-ocr-eng

# Fedora
sudo dnf install qpdf tesseract tesseract-langpack-kor tesseract-langpack-eng

# Arch
sudo pacman -S qpdf tesseract tesseract-data-kor tesseract-data-eng
```

Then point the app to each binary via **Settings → External tools** (overrides
the auto-detected PATH).

---

## Verifying download integrity

Each release publishes the following checksum hashes alongside binaries
(planned in v0.10.0+):

```
# Windows / Linux
sha256sum LocalPDF.Studio_*.exe
sha256sum localpdf-studio_*_amd64.deb

# macOS
shasum -a 256 LocalPDF.Studio_*.dmg
```

The auto-installer for qpdf/Tesseract performs the equivalent verification
internally — but for the main app installer, verify manually if you obtained
the file from a mirror.
