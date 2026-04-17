// Zippy desktop overlay.
// Iteration 3: globaler Hotkey Ctrl+Alt+Z ruft Zippy an die Mausposition / versteckt ihn.
// Window-Grundkonfig (Groesse, always-on-top, decorations) lebt in tauri.conf.json.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{Manager, PhysicalPosition, WebviewWindow};
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

fn main() {
    let toggle = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyZ);
    let toggle_for_handler = toggle;

    tauri::Builder::default()
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
