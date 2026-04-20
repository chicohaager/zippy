# Zippy Desktop Overlay

Iteration 2: natives Fenster + globaler Hotkey **Ctrl+Alt+Z** zum Ein-/Ausblenden. Lädt die bestehende Zippy-Web-App (http://localhost:7860) — zweite Stufe Richtung „AI teacher living as a buddy next to your cursor".

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
npm install -g @tauri-apps/cli@^2
```

Installiert die `tauri`-Binary global auf den PATH. Node.js muss vorhanden sein.
Aufrufen danach als `tauri dev` (ohne `cargo` davor).

### 5) Repo holen

**PowerShell benutzen, nicht `cmd.exe`.** `cmd` wechselt mit einem nackten `cd`
**das Laufwerk nicht** — aus `C:\>` bleibst du mit `cd F:\…` stumm auf `C:\`,
und der Tauri-Build läuft dann in einem falschen Ordner ins Nirgendwo.

```powershell
cd F:\dev     # oder wo auch immer
git clone <repo-url>
cd zippy\desktop\src-tauri
tauri dev
```

> **Zwei typische Fallen:**
> 1. **`cd desktop` allein reicht nicht** — die Tauri-v2-CLI walkt aufwärts
>    durch Parent-Verzeichnisse auf der Suche nach `tauri.conf.json`, nicht
>    nach unten. Immer bis `src-tauri` wechseln. Sonst:
>    `Couldn't recognize the current folder as a Tauri project`.
> 2. **CMD statt PowerShell:** Wenn du trotzdem `cmd.exe` benutzt, nimm
>    `cd /d F:\dev\zippy\desktop\src-tauri` — sonst bleibt das Working
>    Directory auf dem alten Laufwerk.

Das Fenster öffnet ~380×620 px, ohne Titel-Leiste, always-on-top, lädt die in `tauri.conf.json` eingetragene `devUrl` (Default: `http://localhost:7860`). Das Backend muss erreichbar sein, bevor das Overlay startet.

### Lokale Backend-URL überschreiben (ohne die IP zu committen)

Wenn dein Backend woanders läuft als auf `localhost:7860` (typisch: ein Home-Server im LAN), lege eine **lokale, gitignorierte Override-Config** an und starte Tauri mit `--config`:

```powershell
cd desktop\src-tauri
Copy-Item tauri.conf.local.json.example tauri.conf.local.json
# Öffne tauri.conf.local.json und ersetze YOUR-BACKEND-HOST mit deiner IP/dem Hostnamen,
# z. B. 192.168.1.XXX — an allen drei Stellen (devUrl, window url, additionalBrowserArgs)
tauri dev --config tauri.conf.local.json
```

Die `tauri.conf.local.json` wird automatisch über die checked-in `tauri.conf.json` gemerged und ist durch `.gitignore` vor dem versehentlichen Committen geschützt.

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
- Release-Build: `tauri build` → `.msi` Installer

---

## Linux (Dev-VM)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
sudo apt install -y libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf libxdo-dev libssl-dev libglib2.0-dev libgtk-3-dev
npm install -g @tauri-apps/cli@^2
cd desktop/src-tauri && tauri dev
```

Nur sinnvoll für Build/Test der Tauri-Config. Das Overlay selbst lebt auf Windows.

## Mac

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
xcode-select --install     # falls Xcode-CLT nicht da
npm install -g @tauri-apps/cli@^2
cd desktop/src-tauri && tauri dev
```

## Troubleshooting

- **Fenster bleibt weiß:** Backend nicht erreichbar, prüfe `curl http://localhost:7860/api/status`.
- **„tauri" nicht gefunden:** `npm install -g @tauri-apps/cli@^2` erneut. Sicherstellen, dass das npm-global-bin-Verzeichnis im PATH liegt (`npm config get prefix`).
- **Windows: „MSVC linker not found":** Visual Studio Build Tools mit Desktop-C++-Workload nachinstallieren.
- **Always-on-top funktioniert nicht:** einige Linux-Desktops ignorieren das Flag; auf Windows/Mac zuverlässig.
- **Ctrl+Alt+Z macht nichts:** eine andere App hat den Hotkey gegrabbt. Tauri registriert global, First-come-first-served. Temporär andere App mit dem Binding schließen; Rebind-UI kommt später.
