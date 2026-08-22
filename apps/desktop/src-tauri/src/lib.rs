use chrono::Utc;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, LogicalSize, Manager, State, WebviewWindow, WindowEvent};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use vocabsprite_learning_core::{schedule_review, FsrsCardState, ProductFeedback, ScheduleResult};
use vocabsprite_platform::{fit_window_to_work_area, ClipboardGate, Size as PlatformSize};
use vocabsprite_storage::Database;

const LOCAL_USER_ID: &str = "local-user";
const MAX_STATE_BYTES: usize = 5 * 1024 * 1024;
const EXPANDED_PREFERRED_WIDTH: u32 = 1080;
const EXPANDED_PREFERRED_HEIGHT: u32 = 680;
const EXPANDED_MIN_WIDTH: u32 = 640;
const EXPANDED_MIN_HEIGHT: u32 = 420;
const EXPANDED_WORK_AREA_INSET: u32 = 24;
const COMPACT_DEFAULT_WIDTH: f64 = 360.0;
const COMPACT_MIN_WIDTH: f64 = 328.0;
const COMPACT_INITIAL_HEIGHT: f64 = 320.0;
const COMPACT_MIN_HEIGHT: f64 = 220.0;
const COMPACT_WORK_AREA_INSET: f64 = 24.0;
const COMPACT_FALLBACK_WORK_AREA_WIDTH: f64 = 1_600.0;
const COMPACT_FALLBACK_WORK_AREA_HEIGHT: f64 = 900.0;

#[derive(Default)]
struct NativeState {
    database: Mutex<Option<Database>>,
    clipboard_gate: ClipboardGate,
}

fn with_database<T>(
    state: &State<'_, NativeState>,
    operation: impl FnOnce(&mut Database) -> anyhow::Result<T>,
) -> Result<T, String> {
    let mut guard = state
        .database
        .lock()
        .map_err(|_| "local database lock is unavailable".to_owned())?;
    let database = guard
        .as_mut()
        .ok_or_else(|| "local database is not initialized".to_owned())?;
    operation(database).map_err(|error| format!("local storage operation failed: {error:#}"))
}

fn expanded_window_size(window: &WebviewWindow) -> LogicalSize<f64> {
    let preferred = PlatformSize {
        width: EXPANDED_PREFERRED_WIDTH,
        height: EXPANDED_PREFERRED_HEIGHT,
    };
    let Some(monitor) = window.current_monitor().ok().flatten() else {
        return LogicalSize::new(f64::from(preferred.width), f64::from(preferred.height));
    };
    let work_area = monitor
        .work_area()
        .size
        .to_logical::<f64>(monitor.scale_factor());
    let fitted = fit_window_to_work_area(
        preferred,
        PlatformSize {
            width: work_area.width.floor().max(1.0) as u32,
            height: work_area.height.floor().max(1.0) as u32,
        },
        EXPANDED_WORK_AREA_INSET,
    );
    LogicalSize::new(f64::from(fitted.width), f64::from(fitted.height))
}

fn fitted_compact_height(requested: f64, work_area_height: f64) -> f64 {
    if !requested.is_finite() {
        return COMPACT_INITIAL_HEIGHT;
    }
    let maximum = (work_area_height - COMPACT_WORK_AREA_INSET).max(COMPACT_MIN_HEIGHT);
    requested.ceil().clamp(COMPACT_MIN_HEIGHT, maximum)
}

fn fitted_compact_width(requested: f64, work_area_width: f64) -> f64 {
    if !requested.is_finite() {
        return COMPACT_DEFAULT_WIDTH;
    }
    let maximum = (work_area_width - COMPACT_WORK_AREA_INSET).max(COMPACT_MIN_WIDTH);
    requested.ceil().clamp(COMPACT_MIN_WIDTH, maximum)
}

fn resize(window: &WebviewWindow, mode: &str, focus_when_expanded: bool) -> Result<(), String> {
    let (size, resizable, skip_taskbar, decorated) = match mode {
        "dot" => (LogicalSize::new(72.0, 72.0), false, true, false),
        "compact" => (
            LogicalSize::new(COMPACT_DEFAULT_WIDTH, COMPACT_INITIAL_HEIGHT),
            false,
            true,
            false,
        ),
        "expanded" => (expanded_window_size(window), true, false, true),
        _ => return Err("unknown window mode".to_owned()),
    };
    window.unmaximize().map_err(|error| error.to_string())?;
    window
        .set_min_size(None::<LogicalSize<f64>>)
        .map_err(|error| error.to_string())?;
    window
        .set_max_size(None::<LogicalSize<f64>>)
        .map_err(|error| error.to_string())?;
    window
        .set_decorations(decorated)
        .map_err(|error| error.to_string())?;
    // On Windows, enabling a shadow on an undecorated window adds a visible white
    // rectangle. The card supplies its own CSS shadow; decorated expanded windows
    // retain their normal operating-system shadow.
    let _ = window.set_shadow(decorated);
    window
        .set_resizable(resizable)
        .map_err(|error| error.to_string())?;
    window
        .set_skip_taskbar(skip_taskbar)
        .map_err(|error| error.to_string())?;
    if mode == "expanded" {
        window
            .set_min_size(Some(LogicalSize::new(
                f64::from(EXPANDED_MIN_WIDTH.min(size.width.floor().max(1.0) as u32)),
                f64::from(EXPANDED_MIN_HEIGHT.min(size.height.floor().max(1.0) as u32)),
            )))
            .map_err(|error| error.to_string())?;
    }
    window.set_size(size).map_err(|error| error.to_string())?;
    if mode == "expanded" && focus_when_expanded {
        window.center().map_err(|error| error.to_string())?;
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
    } else {
        window
            .set_focusable(false)
            .map_err(|error| error.to_string())?;
        window.show().map_err(|error| error.to_string())?;
        window
            .set_focusable(true)
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn open_expanded(app: &tauri::AppHandle) {
    let _ = app.emit("tray-open", ());
    if let Some(window) = app.get_webview_window("main") {
        let _ = resize(&window, "expanded", true);
    }
}

#[tauri::command]
fn resize_window(window: WebviewWindow, mode: String) -> Result<(), String> {
    resize(&window, &mode, true)
}

#[tauri::command]
fn resize_compact_window(window: WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    if !width.is_finite() || !height.is_finite() {
        return Err("compact window dimensions must be finite".to_owned());
    }
    if window.is_decorated().map_err(|error| error.to_string())? {
        return Ok(());
    }
    let scale_factor = window.scale_factor().map_err(|error| error.to_string())?;
    let current_size = window
        .inner_size()
        .map_err(|error| error.to_string())?
        .to_logical::<f64>(scale_factor);
    // Ignore a late compact-card measurement after the app has already switched
    // to the 72 px dot window.
    if !(300.0..=520.0).contains(&current_size.width) {
        return Ok(());
    }
    let work_area = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .map(|monitor| {
            monitor
                .work_area()
                .size
                .to_logical::<f64>(monitor.scale_factor())
        });
    let work_area_width = work_area
        .map(|size| size.width)
        .unwrap_or(COMPACT_FALLBACK_WORK_AREA_WIDTH);
    let work_area_height = work_area
        .map(|size| size.height)
        .unwrap_or(COMPACT_FALLBACK_WORK_AREA_HEIGHT);
    let fitted_width = fitted_compact_width(width, work_area_width);
    let fitted_height = fitted_compact_height(height, work_area_height);
    window
        .set_size(LogicalSize::new(fitted_width, fitted_height))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_topmost(window: WebviewWindow, topmost: bool) -> Result<(), String> {
    window
        .set_always_on_top(topmost)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_window_opacity(opacity: f64) -> Result<(), String> {
    if (0.72..=1.0).contains(&opacity) {
        Ok(())
    } else {
        Err("opacity must be between 0.72 and 1.0".to_owned())
    }
}

#[tauri::command]
fn snooze_card(state: State<'_, NativeState>, until_utc: String) -> Result<(), String> {
    with_database(&state, |database| {
        database.record_snooze(LOCAL_USER_ID, &until_utc, "card-close")
    })
}

#[tauri::command]
fn pause_cards(state: State<'_, NativeState>, until_utc: String) -> Result<(), String> {
    with_database(&state, |database| {
        database.record_snooze(LOCAL_USER_ID, &until_utc, "manual-pause")
    })
}

#[tauri::command]
fn save_window_position(
    state: State<'_, NativeState>,
    display_key: String,
    x: i32,
    y: i32,
) -> Result<(), String> {
    if display_key.len() > 120 {
        return Err("display key is too long".to_owned());
    }
    with_database(&state, |database| {
        database.save_window_position(LOCAL_USER_ID, &display_key, x, y)
    })
}

#[tauri::command]
fn load_state_json(state: State<'_, NativeState>) -> Result<Option<String>, String> {
    with_database(&state, |database| database.load_app_state(LOCAL_USER_ID))
}

#[tauri::command]
fn save_state_json(state: State<'_, NativeState>, state_json: String) -> Result<(), String> {
    if state_json.len() > MAX_STATE_BYTES {
        return Err("application state exceeds the 5 MiB limit".to_owned());
    }
    with_database(&state, |database| {
        database.save_app_state(LOCAL_USER_ID, &state_json)
    })
}

#[tauri::command]
fn delete_all_personal_data(state: State<'_, NativeState>) -> Result<(), String> {
    with_database(&state, |database| {
        database.delete_all_user_data(LOCAL_USER_ID)
    })
}

#[tauri::command]
fn read_clipboard_after_shortcut(state: State<'_, NativeState>) -> Result<String, String> {
    let now = Utc::now().timestamp_millis();
    if !state.clipboard_gate.consume(now) {
        return Ok(String::new());
    }
    let mut clipboard = arboard::Clipboard::new()
        .map_err(|_| "clipboard is unavailable after the explicit shortcut".to_owned())?;
    let value = clipboard
        .get_text()
        .map_err(|_| "clipboard has no readable text".to_owned())?;
    Ok(value.chars().take(10_000).collect())
}

#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|error| error.to_string())
    } else {
        manager.disable().map_err(|error| error.to_string())
    }
}

#[tauri::command]
fn schedule_fsrs_review(
    previous: FsrsCardState,
    reviewed_at: chrono::DateTime<Utc>,
    feedback: ProductFeedback,
) -> Result<ScheduleResult, String> {
    schedule_review(&previous, reviewed_at, feedback).map_err(|error| error.to_string())
}

#[tauri::command]
fn exit_application(app: tauri::AppHandle) {
    app.exit(0);
}

fn create_tray(app: &tauri::App) -> tauri::Result<()> {
    let pause = MenuItem::with_id(app, "pause-15", "暂停 15 分钟", true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next", "下一个词", true, None::<&str>)?;
    let open = MenuItem::with_id(app, "open", "打开主页", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&pause, &next, &open, &quit])?;
    let mut builder = TrayIconBuilder::new()
        .tooltip("VocabSprite · 桌角单词精灵")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "pause-15" => {
                let _ = app.emit("tray-pause", 15_u32);
            }
            "next" => {
                let _ = app.emit("tray-next", ());
            }
            "open" => {
                open_expanded(app);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                open_expanded(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyV);
    let shortcut_for_handler = shortcut;
    tauri::Builder::default()
        .manage(NativeState::default())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, received, event| {
                    if received == &shortcut_for_handler && event.state() == ShortcutState::Pressed
                    {
                        let state = app.state::<NativeState>();
                        state
                            .clipboard_gate
                            .authorize_until(Utc::now().timestamp_millis() + 3_000);
                        let _ = app.emit("clipboard-shortcut", ());
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            resize_window,
            resize_compact_window,
            set_topmost,
            set_window_opacity,
            snooze_card,
            pause_cards,
            save_window_position,
            load_state_json,
            save_state_json,
            delete_all_personal_data,
            read_clipboard_after_shortcut,
            set_autostart,
            schedule_fsrs_review,
            exit_application
        ])
        .setup(move |app| {
            let data_directory = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_directory)?;
            let database = Database::open(&data_directory.join("vocabsprite.db"))?;
            database.ensure_default_user()?;
            *app.state::<NativeState>()
                .database
                .lock()
                .map_err(|_| anyhow::anyhow!("database lock is unavailable during setup"))? =
                Some(database);
            app.global_shortcut().register(shortcut)?;
            create_tray(app)?;
            if let Some(window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(main) = app_handle.get_webview_window("main") {
                            let _ = main.hide();
                        }
                        let _ = app_handle.emit("native-close-snooze", 15_u32);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("VocabSprite failed to start");
}

#[cfg(test)]
mod tests {
    use super::{
        fitted_compact_height, fitted_compact_width, COMPACT_DEFAULT_WIDTH, COMPACT_INITIAL_HEIGHT,
    };

    #[test]
    fn compact_height_tracks_content_without_exceeding_the_work_area() {
        assert_eq!(fitted_compact_height(278.2, 720.0), 279.0);
        assert_eq!(fitted_compact_height(1_200.0, 720.0), 696.0);
        assert_eq!(fitted_compact_height(20.0, 720.0), 220.0);
    }

    #[test]
    fn compact_height_rejects_non_finite_measurements_safely() {
        assert_eq!(
            fitted_compact_height(f64::NAN, 720.0),
            COMPACT_INITIAL_HEIGHT
        );
    }

    #[test]
    fn compact_width_tracks_the_selected_card_size_and_fits_the_work_area() {
        assert_eq!(fitted_compact_width(328.0, 1_280.0), 328.0);
        assert_eq!(fitted_compact_width(360.0, 1_280.0), 360.0);
        assert_eq!(fitted_compact_width(424.0, 1_280.0), 424.0);
        assert_eq!(fitted_compact_width(800.0, 420.0), 396.0);
        assert_eq!(fitted_compact_width(200.0, 1_280.0), 328.0);
    }

    #[test]
    fn compact_width_rejects_non_finite_measurements_safely() {
        assert_eq!(
            fitted_compact_width(f64::INFINITY, 1_280.0),
            COMPACT_DEFAULT_WIDTH
        );
    }
}
