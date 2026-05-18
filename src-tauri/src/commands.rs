use crate::startup::{StartupContext, StartupContextState};
use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use std::{fs, path::{Path, PathBuf}, process::Command};
use tauri::State;

const MAX_INITIAL_VIEWER_LOAD_BYTES: u64 = 250 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    app_name: String,
    version: String,
    target: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfFilePayload {
    path: String,
    file_name: String,
    size_bytes: u64,
    base64_data: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalToolStatus {
    name: String,
    display_name: String,
    available: bool,
    path: Option<String>,
    version: Option<String>,
    required_for: Vec<String>,
}

#[tauri::command]
pub fn app_info() -> AppInfo {
    AppInfo {
        app_name: "LocalPDF Studio".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        target: format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH),
    }
}

#[tauri::command]
pub fn get_startup_context(state: State<'_, StartupContextState>) -> Result<StartupContext, String> {
    state
        .0
        .lock()
        .map(|value| value.clone())
        .map_err(|_| "startup context lock poisoned".to_string())
}

#[tauri::command]
pub fn load_pdf_base64(path: String) -> Result<PdfFilePayload, String> {
    let pdf_path = validate_pdf_path(&path)?;
    let metadata = fs::metadata(&pdf_path).map_err(|error| format!("파일 정보를 읽을 수 없습니다: {error}"))?;

    if !metadata.is_file() {
        return Err("PDF 파일이 아닙니다.".to_string());
    }

    if metadata.len() > MAX_INITIAL_VIEWER_LOAD_BYTES {
        return Err(format!(
            "현재 초기 뷰어는 최대 {}MB PDF까지만 직접 로드합니다. 대용량 스트리밍 뷰어는 후속 작업으로 구현하세요.",
            MAX_INITIAL_VIEWER_LOAD_BYTES / 1024 / 1024
        ));
    }

    let bytes = fs::read(&pdf_path).map_err(|error| format!("PDF 파일을 읽을 수 없습니다: {error}"))?;
    let base64_data = general_purpose::STANDARD.encode(bytes);
    let file_name = pdf_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("document.pdf")
        .to_string();

    Ok(PdfFilePayload {
        path: pdf_path.to_string_lossy().to_string(),
        file_name,
        size_bytes: metadata.len(),
        base64_data,
    })
}

#[tauri::command]
pub fn check_external_tools() -> Vec<ExternalToolStatus> {
    vec![
        tool_status("qpdf", "qpdf", &["병합", "분할", "암호화", "최적화"]),
        tool_status("tesseract", "Tesseract OCR", &["OCR", "스캔 PDF 텍스트화"]),
    ]
}

#[tauri::command]
pub fn run_pdf_operation(operation: String, files: Vec<String>) -> Result<String, String> {
    if files.is_empty() {
        return Err("작업할 PDF 파일이 없습니다.".to_string());
    }

    for file in &files {
        validate_pdf_path(file)?;
    }

    match operation.as_str() {
        "split" | "compress" | "encrypt" | "metadata" => {
            Err(format!("'{operation}' 작업은 command 진입점만 준비되어 있습니다. qpdf wrapper 구현 작업을 진행하세요."))
        }
        "ocr" => Err("OCR 작업은 Tesseract wrapper 구현 작업을 진행하세요.".to_string()),
        _ => Err(format!("지원하지 않는 PDF 작업입니다: {operation}")),
    }
}

fn validate_pdf_path(path: &str) -> Result<PathBuf, String> {
    let pdf_path = PathBuf::from(path);
    let extension = pdf_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();

    if extension != "pdf" {
        return Err("PDF 파일만 열 수 있습니다.".to_string());
    }

    Ok(pdf_path)
}

fn tool_status(command_name: &str, display_name: &str, required_for: &[&str]) -> ExternalToolStatus {
    let path = which::which(command_name).ok();
    let version = path.as_ref().and_then(|tool_path| read_tool_version(tool_path));

    ExternalToolStatus {
        name: command_name.to_string(),
        display_name: display_name.to_string(),
        available: path.is_some(),
        path: path.map(|value| value.to_string_lossy().to_string()),
        version,
        required_for: required_for.iter().map(|value| value.to_string()).collect(),
    }
}

fn read_tool_version(path: &Path) -> Option<String> {
    let output = Command::new(path).arg("--version").output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let first_line = stdout
        .lines()
        .chain(stderr.lines())
        .find(|line| !line.trim().is_empty())?;
    Some(first_line.trim().to_string())
}
