mod commands;
mod startup;

use startup::{parse_startup_context, StartupContextState};
use std::sync::Mutex;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(StartupContextState(Mutex::new(parse_startup_context())))
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::load_pdf_base64,
            commands::get_startup_context,
            commands::check_external_tools,
            commands::run_pdf_operation,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run LocalPDF Studio");
}
