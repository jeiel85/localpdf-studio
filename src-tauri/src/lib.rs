mod commands;
mod installer_service;
mod job_queue;
mod ocr_service;
mod protocol;
mod qpdf_service;
mod settings;
mod startup;
mod watermark_service;

use job_queue::new_job_manager;
use settings::{load_from_dir, SettingsState};
use startup::{parse_startup_context, StartupContextState};
use std::sync::Mutex;

/// Windows에서 자식 프로세스의 콘솔 창을 숨기기 위한 Command 생성 헬퍼.
/// CREATE_NO_WINDOW (0x08000000) 플래그를 설정한다.
pub fn hidden_cmd(program: &str) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
    cmd
}

pub fn run() {
    let initial_settings = std::env::var("APPDATA")
        .ok()
        .map(|appdata| {
            let app_dir = std::path::PathBuf::from(appdata).join("LocalPDF Studio");
            load_from_dir(&app_dir)
        })
        .unwrap_or_default();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(StartupContextState(Mutex::new(parse_startup_context())))
        .manage(SettingsState(Mutex::new(initial_settings)))
        .manage(new_job_manager())
        .register_uri_scheme_protocol("pdf-local", |_app, request| {
            protocol::pdf_local_protocol(request)
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::load_pdf_base64,
            commands::load_pdf_url,
            commands::load_pdf_outline,
            commands::get_startup_context,
            commands::check_external_tools,
            commands::check_tesseract_available,
            commands::run_pdf_operation,
            commands::merge_pdfs,
            commands::split_pdf,
            commands::encrypt_pdf,
            commands::decrypt_pdf,
            commands::extract_pages,
            commands::rotate_pages,
            commands::compress_pdf,
            commands::read_pdf_metadata,
            commands::run_ocr,
            commands::apply_watermark,
            commands::apply_stamp,
            commands::save_text_file,
            commands::get_recent_files,
            commands::add_recent_file,
            commands::check_qpdf_available,
            commands::get_job_status,
            commands::get_active_jobs,
            commands::get_settings,
            commands::update_settings,
            commands::reset_settings,
            commands::clear_recent_files,
            commands::get_app_data_path,
            commands::get_tab_state,
            commands::save_tab_state,
            commands::install_qpdf_auto,
            commands::install_tesseract_auto,
            commands::check_elevation,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run LocalPDF Studio");
}
