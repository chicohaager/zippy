// Zippy desktop overlay.
// Iteration 3: globaler Hotkey Ctrl+Alt+Z ruft Zippy an die Mausposition / versteckt ihn.
// Window-Grundkonfig (Groesse, always-on-top, decorations) lebt in tauri.conf.json.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use base64::Engine;
use serde::Serialize;
use tauri::{Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

// Explicit toggle state. We used to branch on `window.is_visible()`, but after
// a show() that also does set_position + set_always_on_top + set_focus, the
// Windows WebView2 visibility-mirror sometimes reported stale/false values
// on the next hotkey press, so hide() became unreachable. Tracking the state
// ourselves is bulletproof.
static SHOWN: AtomicBool = AtomicBool::new(true);

#[cfg(windows)]
fn cursor_position() -> Option<(i32, i32)> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut p = POINT { x: 0, y: 0 };
    unsafe { GetCursorPos(&mut p).ok()? };
    Some((p.x, p.y))
}

#[cfg(not(windows))]
fn cursor_position() -> Option<(i32, i32)> {
    None
}

// Position the overlay near the mouse pointer so Zippy "pops up next to
// the cursor" instead of stuck at its last spot. Offset is +16/+16 px
// into the south-east quadrant from the cursor; if that would clip the
// monitor edge, we flip to the opposite side on that axis. No-op on
// platforms where the cursor position isn't available.
fn position_near_cursor(window: &WebviewWindow) {
    let Some((cx, cy)) = cursor_position() else {
        return;
    };
    let Ok(size) = window.outer_size() else {
        return;
    };
    let w = size.width as i32;
    let h = size.height as i32;
    let offset = 16;
    let mut target_x = cx + offset;
    let mut target_y = cy + offset;

    if let Ok(monitors) = window.available_monitors() {
        let monitor = monitors.into_iter().find(|m| {
            let pos = m.position();
            let sz = m.size();
            cx >= pos.x
                && cx < pos.x + sz.width as i32
                && cy >= pos.y
                && cy < pos.y + sz.height as i32
        });
        if let Some(m) = monitor {
            let mpos = m.position();
            let msize = m.size();
            let max_x = mpos.x + msize.width as i32 - w;
            let max_y = mpos.y + msize.height as i32 - h;
            if target_x > max_x {
                target_x = (cx - w - offset).max(mpos.x);
            }
            if target_y > max_y {
                target_y = (cy - h - offset).max(mpos.y);
            }
            target_x = target_x.max(mpos.x).min(max_x);
            target_y = target_y.max(mpos.y).min(max_y);
        }
    }

    let _ = window.set_position(PhysicalPosition::new(target_x, target_y));
}

// Native screen capture. WebView2's `getDisplayMedia` is effectively dead on
// Windows even with the `unsafely-treat-insecure-origin-as-secure` flag, so
// we grab the primary monitor ourselves via xcap, encode PNG, return a data
// URL. The overlay window is hidden around the capture so Zippy himself
// doesn't end up in the shot.
#[tauri::command]
async fn capture_screen(window: WebviewWindow) -> Result<String, String> {
    use xcap::Monitor;

    let was_visible = window.is_visible().unwrap_or(false);
    if was_visible {
        let _ = window.hide();
        // Give the compositor a beat to actually remove the window before
        // the screen grab; otherwise it can still appear in the shot.
        thread::sleep(Duration::from_millis(120));
    }

    let capture_result = (|| -> Result<String, String> {
        let monitors = Monitor::all().map_err(|e| format!("monitors: {e}"))?;
        let primary = monitors
            .into_iter()
            .find(|m| m.is_primary().unwrap_or(false))
            .ok_or_else(|| "no primary monitor".to_string())?;
        let img = primary
            .capture_image()
            .map_err(|e| format!("capture: {e}"))?;

        let mut buf = Vec::new();
        img.write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png)
            .map_err(|e| format!("encode: {e}"))?;

        let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
        Ok(format!("data:image/png;base64,{b64}"))
    })();

    if was_visible {
        let _ = window.show();
        let _ = window.set_focus();
    }

    capture_result
}

// Phase (d)-2: point at something on the screen. x/y are normalized (0..1)
// over the primary monitor (same coordinate space the screenshot used), so
// claude's point_at tool output can be passed through unchanged. The overlay
// window is a separate, transparent, click-through full-monitor window
// declared in tauri.conf.json (label="point-overlay"); we resize it to the
// monitor, tell it to draw, and auto-hide after ~3.5 s.
#[derive(Serialize, Clone)]
struct PointPayload {
    x: f64,
    y: f64,
    label: Option<String>,
    monitor_width: u32,
    monitor_height: u32,
}

#[tauri::command]
async fn show_point(
    app: tauri::AppHandle,
    x: f64,
    y: f64,
    label: Option<String>,
) -> Result<(), String> {
    let overlay = app
        .get_webview_window("point-overlay")
        .ok_or_else(|| "point-overlay window missing".to_string())?;
    let main = app.get_webview_window("main");

    // Resolve which monitor the main zippy window is on; fall back to any
    // monitor / primary. We want the ring to land on the same screen the
    // user sees zippy on.
    let monitor = main
        .as_ref()
        .and_then(|w| w.current_monitor().ok().flatten())
        .or_else(|| overlay.primary_monitor().ok().flatten())
        .or_else(|| overlay.available_monitors().ok().and_then(|m| m.into_iter().next()))
        .ok_or_else(|| "no monitor".to_string())?;

    let mpos = monitor.position();
    let msize = monitor.size();

    // Click-through + sizing + position, then show.
    let _ = overlay.set_ignore_cursor_events(true);
    let _ = overlay.set_size(PhysicalSize::new(msize.width, msize.height));
    let _ = overlay.set_position(PhysicalPosition::new(mpos.x, mpos.y));
    let _ = overlay.set_always_on_top(true);
    let _ = overlay.show();

    let _ = overlay.emit(
        "draw-point",
        PointPayload {
            x,
            y,
            label,
            monitor_width: msize.width,
            monitor_height: msize.height,
        },
    );

    // Auto-hide fallback so a stuck overlay doesn't block the screen forever.
    // The frontend does its own fade-out animation before this kicks in.
    let overlay_for_timer = overlay.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(3500));
        let _ = overlay_for_timer.hide();
    });

    Ok(())
}

#[tauri::command]
async fn hide_point(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("point-overlay") {
        let _ = w.hide();
    }
    Ok(())
}

fn main() {
    let toggle = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyZ);
    let toggle_for_handler = toggle;

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![capture_screen, show_point, hide_point])
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, triggered, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    if triggered != &toggle_for_handler {
                        return;
                    }
                    let Some(window) = app.get_webview_window("main") else {
                        return;
                    };
                    if SHOWN.load(Ordering::SeqCst) {
                        let _ = window.hide();
                        SHOWN.store(false, Ordering::SeqCst);
                    } else {
                        position_near_cursor(&window);
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_always_on_top(true);
                        let _ = window.set_focus();
                        SHOWN.store(true, Ordering::SeqCst);
                    }
                })
                .build(),
        )
        .setup(move |app| {
            app.global_shortcut().register(toggle)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Zippy overlay");
}
