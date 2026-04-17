# Zippy Desktop Overlay

Iteration 2: natives Fenster + globaler Hotkey **Ctrl+Alt+Z** zum Ein-/Ausblenden. Lädt die bestehende Zippy-Web-App (http://REDACTED_HOST:7860) — zweite Stufe Richtung „AI teacher living as a buddy next to your cursor".

## Hotkey

- **Ctrl+Alt+Z** — Zippy zeigen & fokussieren; nochmal drücken = verstecken.
- Funktioniert systemweit, egal welche App gerade vorne ist.
- Fenster bleibt im Hintergrund geladen, deshalb ist das Einblenden instant.

**Primary target: Windows 10/11.** Linux- und Mac-Anleitungen am Ende.

---

## Windows Setup

### 1) Rust installieren

Download: https://rustup.rs → `rustup-init.exe` laufen lassen, Defaults akzeptieren (stable toolchain, MSVC).

Neues PowerShell-Fenster öffnen:

```powershell
rustc --version
cargo --version
```

### 2) Visual Studio Build Tools

Rustup fragt beim Install, ob die MSVC-Build-Tools mitinstalliert werden sollen — mit **Ja** antworten. Falls nein: https://visualstudio.microsoft.com/visual-cpp-build-tools/ → „Desktop development with C++" anhaken, installieren, Rechner neu starten.

### 3) WebView2

Auf Windows 10/11 seit Jahren vorinstalliert. Prüfen in PowerShell:

```powershell
Get-AppxPackage *Microsoft.WebView2*
```

Falls leer: https://developer.microsoft.com/microsoft-edge/webview2/ → Evergreen Runtime installieren.

### 4) Tauri CLI

```powershell
cargo install tauri-cli --version "^2.0"
```

~3-5 Minuten Kompilieren. Einmalig.

### 5) Repo holen

```powershell
cd C:\dev     # oder wo auch immer
git clone <repo-url>
cd Zippy\desktop
cargo tauri dev
```

Das Fenster öffnet ~380×620 px, ohne Titel-Leiste, always-on-top, lädt `http://REDACTED_HOST:7860`. Backend muss auf ZimaOS laufen (tut es — der Zippy-Container ist dauerhaft oben).

---

## Was diese Iteration kann

- Natives Fenster, kein Browser-Tab
- Always-on-top, skipTaskbar
- Skalierbar, aber ohne Fenster-Chrome
- **Globaler Hotkey Ctrl+Alt+Z zum Ein-/Ausblenden**
- Gesamte Zippy-Funktionalität (Chat, Screen-Capture via File-Upload, Voice via Piper/Whisper)

## Was fehlt (Iterationen 3+)

- Positionierung nah am Cursor (statt zuletzt verwendeter Position)
- Transparente Kanten / abgerundetes Fenster
- System-Tray-Icon + Klick zum Ein-/Ausblenden
- Autostart bei Login
- Native Screen-Capture via Tauri-Plugin (ohne File-Upload-Umweg)
- Native Pointing-Overlay (Zippy zeigt direkt auf Screen-Elemente)
- Release-Build: `cargo tauri build` → `.msi` Installer

---

## Linux (Dev-VM)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
sudo apt install -y libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf libxdo-dev libssl-dev libglib2.0-dev libgtk-3-dev
cargo install tauri-cli --version "^2.0"
cd desktop && cargo tauri dev
```

Nur sinnvoll für Build/Test der Tauri-Config. Das Overlay selbst lebt auf Windows.

## Mac

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
xcode-select --install     # falls Xcode-CLT nicht da
cargo install tauri-cli --version "^2.0"
cd desktop && cargo tauri dev
```

## Troubleshooting

- **Fenster bleibt weiß:** Backend nicht erreichbar, prüfe `curl http://REDACTED_HOST:7860/api/status`.
- **„cargo tauri" nicht gefunden:** `cargo install tauri-cli --version "^2.0"` erneut.
- **Windows: „MSVC linker not found":** Visual Studio Build Tools mit Desktop-C++-Workload nachinstallieren.
- **Always-on-top funktioniert nicht:** einige Linux-Desktops ignorieren das Flag; auf Windows/Mac zuverlässig.
- **Ctrl+Alt+Z macht nichts:** eine andere App hat den Hotkey gegrabbt. Tauri registriert global, First-come-first-served. Temporär andere App mit dem Binding schließen; Rebind-UI kommt später.
