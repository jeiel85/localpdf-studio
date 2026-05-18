use crate::job_queue::{JobManagerState, JobStatus};
use crate::ocr_service;
use crate::qpdf_service;
use crate::settings::{self, AppSettings, SettingsState};
use crate::startup::{StartupContext, StartupContextState};
use crate::watermark_service;
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::State;

fn settings_snapshot(state: &State<'_, SettingsState>) -> AppSettings {
    state.0.lock().map(|guard| guard.clone()).unwrap_or_default()
}

fn resolve_qpdf(state: &State<'_, SettingsState>) -> Result<qpdf_service::QpdfTool, String> {
    let override_path = settings_snapshot(state).external_tools.qpdf_path;
    qpdf_service::find_qpdf_with(override_path.as_deref()).map_err(|e| e.to_string())
}

fn resolve_tesseract(state: &State<'_, SettingsState>) -> Result<ocr_service::TesseractTool, String> {
    let override_path = settings_snapshot(state).external_tools.tesseract_path;
    ocr_service::find_tesseract_with(override_path.as_deref()).map_err(|e| e.to_string())
}

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
    url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfUrlPayload {
    path: String,
    file_name: String,
    size_bytes: u64,
    url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlineItem {
    title: String,
    dest: Option<String>,
    page_number: Option<u32>,
    children: Vec<OutlineItem>,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecentFileEntry {
    path: String,
    file_name: String,
    opened_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PersistedTab {
    pub path: String,
    pub current_page: u32,
    pub scale: f64,
    pub rotation: u32,
    pub layout: String,
    pub fit_mode: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct TabState {
    pub tabs: Vec<PersistedTab>,
    pub active_index: Option<usize>,
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
pub fn load_pdf_base64(
    path: String,
    settings: State<'_, SettingsState>,
) -> Result<PdfFilePayload, String> {
    let pdf_path = validate_pdf_path(&path)?;
    let metadata =
        fs::metadata(&pdf_path).map_err(|error| format!("파일 정보를 읽을 수 없습니다: {error}"))?;

    if !metadata.is_file() {
        return Err("PDF 파일이 아닙니다.".to_string());
    }

    let file_name = pdf_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("document.pdf")
        .to_string();

    let threshold_mb = settings_snapshot(&settings).performance.streaming_threshold_mb.max(1);
    let threshold_bytes = threshold_mb.saturating_mul(1024 * 1024);

    if metadata.len() > threshold_bytes {
        let url = format!(
            "pdf-local://localhost/{}",
            pdf_path.to_string_lossy().replace('\\', "/")
        );
        return Ok(PdfFilePayload {
            path: pdf_path.to_string_lossy().to_string(),
            file_name,
            size_bytes: metadata.len(),
            base64_data: String::new(),
            url: Some(url),
        });
    }

    let bytes =
        fs::read(&pdf_path).map_err(|error| format!("PDF 파일을 읽을 수 없습니다: {error}"))?;
    let base64_data = general_purpose::STANDARD.encode(bytes);

    Ok(PdfFilePayload {
        path: pdf_path.to_string_lossy().to_string(),
        file_name,
        size_bytes: metadata.len(),
        base64_data,
        url: None,
    })
}

#[tauri::command]
pub fn load_pdf_url(path: String) -> Result<PdfUrlPayload, String> {
    let pdf_path = validate_pdf_path(&path)?;
    let metadata =
        fs::metadata(&pdf_path).map_err(|error| format!("파일 정보를 읽을 수 없습니다: {error}"))?;

    if !metadata.is_file() {
        return Err("PDF 파일이 아닙니다.".to_string());
    }

    let file_name = pdf_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("document.pdf")
        .to_string();

    let url = format!(
        "pdf-local://localhost/{}",
        pdf_path.to_string_lossy().replace('\\', "/")
    );

    Ok(PdfUrlPayload {
        path: pdf_path.to_string_lossy().to_string(),
        file_name,
        size_bytes: metadata.len(),
        url,
    })
}

#[tauri::command]
pub fn load_pdf_outline(path: String) -> Result<Vec<OutlineItem>, String> {
    let _pdf_path = validate_pdf_path(&path)?;
    Err("목차 정보는 PDF.js 프론트엔드에서 추출합니다.".to_string())
}

#[tauri::command]
pub fn check_external_tools(settings: State<'_, SettingsState>) -> Vec<ExternalToolStatus> {
    let snap = settings_snapshot(&settings);
    vec![
        tool_status(
            "qpdf",
            "qpdf",
            &["병합", "분할", "암호화", "최적화"],
            snap.external_tools.qpdf_path.as_deref(),
        ),
        tool_status(
            "tesseract",
            "Tesseract OCR",
            &["OCR", "스캔 PDF 텍스트화"],
            snap.external_tools.tesseract_path.as_deref(),
        ),
    ]
}

#[tauri::command]
pub fn run_pdf_operation(
    operation: String,
    files: Vec<String>,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    if files.is_empty() {
        return Err("작업할 PDF 파일이 없습니다.".to_string());
    }

    for file in &files {
        validate_pdf_path(file)?;
    }

    match operation.as_str() {
        "merge" => {
            if files.len() < 2 {
                return Err("병합할 PDF 파일이 2개 이상 필요합니다. 사이드바의 병합 패널을 사용하세요.".to_string());
            }
            let tool = resolve_qpdf(&settings)?;
            let input_paths: Vec<PathBuf> = files.iter().map(PathBuf::from).collect();
            let stem = input_paths[0]
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("merged");
            let parent = input_paths[0]
                .parent()
                .unwrap_or(Path::new("."));
            let output = parent.join(format!("{stem}_merged.pdf"));
            let result = qpdf_service::merge_pdfs(&input_paths, &output, &tool)
                .map_err(|e| e.to_string())?;
            Ok(format!(
                "{}개 파일 병합 완료: {}",
                result.input_count,
                result.output_path.to_string_lossy()
            ))
        }
        "split" | "compress" | "encrypt" | "metadata" => Err(format!(
            "'{operation}' 작업은 전용 명령을 사용하세요."
        )),
        "ocr" => Err("OCR 작업은 Tesseract wrapper 구현 작업을 진행하세요.".to_string()),
        _ => Err(format!("지원하지 않는 PDF 작업입니다: {operation}")),
    }
}

#[tauri::command]
pub fn get_recent_files() -> Result<Vec<RecentFileEntry>, String> {
    let app_dir = get_app_data_dir()?;
    let recent_path = app_dir.join("recent_files.json");

    if !recent_path.exists() {
        return Ok(Vec::new());
    }

    let content =
        fs::read_to_string(&recent_path).map_err(|e| format!("최근 파일 목록을 읽을 수 없습니다: {e}"))?;
    let entries: Vec<RecentFileEntry> =
        serde_json::from_str(&content).unwrap_or_default();
    Ok(entries)
}

#[tauri::command]
pub fn add_recent_file(
    path: String,
    file_name: String,
    settings: State<'_, SettingsState>,
) -> Result<Vec<RecentFileEntry>, String> {
    let snap = settings_snapshot(&settings);
    let app_dir = get_app_data_dir()?;
    let recent_path = app_dir.join("recent_files.json");

    if !snap.privacy.record_recent_files {
        return Ok(if recent_path.exists() {
            fs::read_to_string(&recent_path)
                .ok()
                .and_then(|content| serde_json::from_str(&content).ok())
                .unwrap_or_default()
        } else {
            Vec::new()
        });
    }

    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("앱 데이터 디렉터리를 생성할 수 없습니다: {e}"))?;

    let mut entries: Vec<RecentFileEntry> = if recent_path.exists() {
        let content = fs::read_to_string(&recent_path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    entries.retain(|e| e.path != path);

    let now = chrono_now();
    entries.insert(
        0,
        RecentFileEntry {
            path,
            file_name,
            opened_at: now,
        },
    );

    let limit = (snap.privacy.recent_files_limit as usize).max(1);
    entries.truncate(limit);

    let json = serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("최근 파일 목록을 저장할 수 없습니다: {e}"))?;
    fs::write(&recent_path, json)
        .map_err(|e| format!("최근 파일 목록을 저장할 수 없습니다: {e}"))?;

    Ok(entries)
}

#[tauri::command]
pub fn get_settings(settings: State<'_, SettingsState>) -> Result<AppSettings, String> {
    Ok(settings_snapshot(&settings))
}

#[tauri::command]
pub fn update_settings(
    next: AppSettings,
    settings: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let app_dir = get_app_data_dir()?;
    settings::save_to_dir(&app_dir, &next)?;
    let mut guard = settings
        .0
        .lock()
        .map_err(|_| "설정 잠금 오류".to_string())?;
    *guard = next.clone();
    Ok(next)
}

#[tauri::command]
pub fn reset_settings(settings: State<'_, SettingsState>) -> Result<AppSettings, String> {
    let defaults = AppSettings::default();
    let app_dir = get_app_data_dir()?;
    settings::save_to_dir(&app_dir, &defaults)?;
    let mut guard = settings
        .0
        .lock()
        .map_err(|_| "설정 잠금 오류".to_string())?;
    *guard = defaults.clone();
    Ok(defaults)
}

#[tauri::command]
pub fn clear_recent_files() -> Result<(), String> {
    let app_dir = get_app_data_dir()?;
    let recent_path = app_dir.join("recent_files.json");
    if recent_path.exists() {
        fs::remove_file(&recent_path)
            .map_err(|e| format!("최근 파일 목록 삭제 실패: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_app_data_path() -> Result<String, String> {
    get_app_data_dir().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn check_qpdf_available(settings: State<'_, SettingsState>) -> Result<QpdfInfo, String> {
    let override_path = settings_snapshot(&settings).external_tools.qpdf_path;
    match qpdf_service::find_qpdf_with(override_path.as_deref()) {
        Ok(tool) => Ok(QpdfInfo {
            available: true,
            path: tool.path.to_string_lossy().to_string(),
            version: tool.version,
        }),
        Err(e) => Ok(QpdfInfo {
            available: false,
            path: String::new(),
            version: e.to_string(),
        }),
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QpdfInfo {
    available: bool,
    path: String,
    version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeResult {
    output_path: String,
    input_count: usize,
    total_pages_estimate: u64,
}

#[tauri::command]
pub fn merge_pdfs(
    input_files: Vec<String>,
    output_path: String,
    settings: State<'_, SettingsState>,
) -> Result<MergeResult, String> {
    let tool = resolve_qpdf(&settings)?;

    let input_paths: Vec<PathBuf> = input_files.iter().map(PathBuf::from).collect();
    let output = PathBuf::from(&output_path);

    let result = qpdf_service::merge_pdfs(&input_paths, &output, &tool)
        .map_err(|e| e.to_string())?;

    Ok(MergeResult {
        output_path: result.output_path.to_string_lossy().to_string(),
        input_count: result.input_count,
        total_pages_estimate: result.total_pages_estimate,
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SplitResult {
    output_files: Vec<String>,
    output_dir: String,
}

#[tauri::command]
pub fn split_pdf(
    input_file: String,
    output_dir: String,
    settings: State<'_, SettingsState>,
) -> Result<SplitResult, String> {
    let tool = resolve_qpdf(&settings)?;

    let input = PathBuf::from(&input_file);
    let dir = PathBuf::from(&output_dir);

    let result_files = qpdf_service::split_pdf(&input, &dir, &tool)
        .map_err(|e| e.to_string())?;

    Ok(SplitResult {
        output_files: result_files
            .iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect(),
        output_dir: dir.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn encrypt_pdf(
    input_file: String,
    output_path: String,
    user_password: String,
    owner_password: String,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let input = PathBuf::from(&input_file);
    let output = PathBuf::from(&output_path);
    qpdf_service::encrypt_pdf(&input, &output, &user_password, &owner_password, &tool)
        .map(|p| format!("암호화 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn decrypt_pdf(
    input_file: String,
    output_path: String,
    password: String,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let input = PathBuf::from(&input_file);
    let output = PathBuf::from(&output_path);
    qpdf_service::decrypt_pdf(&input, &output, &password, &tool)
        .map(|p| format!("복호화 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn extract_pages(
    input_file: String,
    output_path: String,
    page_range: String,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let input = PathBuf::from(&input_file);
    let output = PathBuf::from(&output_path);
    qpdf_service::extract_pages(&input, &output, &page_range, &tool)
        .map(|p| format!("페이지 추출 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rotate_pages(
    input_file: String,
    output_path: String,
    angle: u16,
    page_range: String,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let input = PathBuf::from(&input_file);
    let output = PathBuf::from(&output_path);
    qpdf_service::rotate_pages(&input, &output, angle, &page_range, &tool)
        .map(|p| format!("페이지 회전 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn compress_pdf(
    input_file: String,
    output_path: String,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let input = PathBuf::from(&input_file);
    let output = PathBuf::from(&output_path);
    qpdf_service::compress_pdf(&input, &output, &tool)
        .map(|p| format!("압축 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_pdf_metadata(
    input_file: String,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let input = PathBuf::from(&input_file);
    qpdf_service::read_metadata(&input, &tool).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_job_status(
    id: String,
    manager: State<'_, JobManagerState>,
) -> Result<Option<JobStatus>, String> {
    let mgr = manager
        .lock()
        .map_err(|_| "작업 관리자 잠금 오류".to_string())?;
    Ok(mgr.get(&id))
}

#[tauri::command]
pub fn get_active_jobs(manager: State<'_, JobManagerState>) -> Result<Vec<JobStatus>, String> {
    let mgr = manager
        .lock()
        .map_err(|_| "작업 관리자 잠금 오류".to_string())?;
    Ok(mgr.all_active())
}

#[tauri::command]
pub fn check_tesseract_available(
    settings: State<'_, SettingsState>,
) -> Result<TesseractInfo, String> {
    let override_path = settings_snapshot(&settings).external_tools.tesseract_path;
    match ocr_service::find_tesseract_with(override_path.as_deref()) {
        Ok(tool) => Ok(TesseractInfo {
            available: true,
            path: tool.path.to_string_lossy().to_string(),
            version: tool.version,
            languages: tool.languages,
        }),
        Err(e) => Ok(TesseractInfo {
            available: false,
            path: String::new(),
            version: e.to_string(),
            languages: Vec::new(),
        }),
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TesseractInfo {
    available: bool,
    path: String,
    version: String,
    languages: Vec<String>,
}

#[tauri::command]
pub fn run_ocr(
    input_file: String,
    output_file: String,
    language: String,
    dpi: u32,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tesseract = resolve_tesseract(&settings)?;
    let input = PathBuf::from(&input_file);
    let output = PathBuf::from(&output_file);
    ocr_service::run_ocr(&input, &output, &language, dpi, &tesseract)
        .map(|p| format!("OCR 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn apply_watermark(
    input_file: String,
    watermark_file: String,
    output_path: String,
) -> Result<String, String> {
    let input = PathBuf::from(&input_file);
    let watermark = PathBuf::from(&watermark_file);
    let output = PathBuf::from(&output_path);
    watermark_service::apply_watermark_pdf(&input, &watermark, &output)
        .map(|p| format!("워터마크 적용 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn apply_stamp(
    input_file: String,
    stamp_file: String,
    output_path: String,
) -> Result<String, String> {
    let input = PathBuf::from(&input_file);
    let stamp = PathBuf::from(&stamp_file);
    let output = PathBuf::from(&output_path);
    watermark_service::stamp_pdf(&input, &stamp, &output)
        .map(|p| format!("스탬프 적용 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_text_file(path: String, content: String) -> Result<String, String> {
    std::fs::write(&path, &content)
        .map_err(|e| format!("파일 저장 실패: {e}"))?;
    Ok(path)
}

#[tauri::command]
pub fn get_tab_state() -> Result<TabState, String> {
    let app_dir = get_app_data_dir()?;
    let tab_state_path = app_dir.join("tab_state.json");
    if !tab_state_path.exists() {
        return Ok(TabState::default());
    }
    let content = fs::read_to_string(&tab_state_path)
        .map_err(|e| format!("탭 상태를 읽을 수 없습니다: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("탭 상태 파싱 실패: {e}"))
}

#[tauri::command]
pub fn save_tab_state(state: TabState) -> Result<(), String> {
    let app_dir = get_app_data_dir()?;
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("앱 데이터 디렉터리를 생성할 수 없습니다: {e}"))?;
    let tab_state_path = app_dir.join("tab_state.json");
    let json = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("탭 상태 직렬화 실패: {e}"))?;
    fs::write(&tab_state_path, json)
        .map_err(|e| format!("탭 상태 저장 실패: {e}"))
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

fn tool_status(
    command_name: &str,
    display_name: &str,
    required_for: &[&str],
    override_path: Option<&str>,
) -> ExternalToolStatus {
    let path = override_path
        .and_then(|p| {
            let pb = PathBuf::from(p);
            if pb.exists() { Some(pb) } else { None }
        })
        .or_else(|| which::which(command_name).ok());

    let version = path
        .as_ref()
        .and_then(|tool_path| read_tool_version(tool_path));

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

fn get_app_data_dir() -> Result<PathBuf, String> {
    let dir = dirs_next()
        .ok_or("앱 데이터 디렉터리를 찾을 수 없습니다.")?;
    Ok(dir.join("LocalPDF Studio"))
}

fn dirs_next() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA")
            .ok()
            .map(PathBuf::from)
    }
    #[cfg(not(target_os = "windows"))]
    {
        dirs_next_crate()
    }
}

#[cfg(not(target_os = "windows"))]
fn dirs_next_crate() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join(".local").join("share"))
}

fn chrono_now() -> String {
    use std::time::SystemTime;
    let ts = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let secs = (ts % 86400) as u32;
    let days = ts / 86400;

    let year = 1970 + (days / 365) as u32;
    let rem = days % 365;
    let month = (rem / 30 + 1).min(12);
    let day = (rem % 30 + 1).min(31);
    let hour = secs / 3600;
    let min = (secs % 3600) / 60;
    let sec = secs % 60;

    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{min:02}:{sec:02}")
}
