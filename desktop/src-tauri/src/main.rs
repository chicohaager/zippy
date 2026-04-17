// Zippy desktop overlay.
// Iteration 2: globaler Hotkey Ctrl+Alt+Z ruft Zippy an den Cursor / versteckt ihn.
// Window-Grundkonfig (Groesse, always-on-top, decorations) lebt in tauri.conf.json.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

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
                    // Toggle purely on visibility. The earlier `visible && focused`
                    // branch left the else-path unreachable when Zippy was visible
                    // but backgrounded — and re-show after hide silently lost Z-order
                    // for alwaysOnTop + skipTaskbar windows on Windows, so the
                    // hotkey "stopped working" after the first hide. Re-assert
                    // always-on-top after show to recover the Z-order.
                    let visible = window.is_visible().unwrap_or(false);
                    if visible {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_always_on_top(true);
                        let _ = window.set_focus();
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
