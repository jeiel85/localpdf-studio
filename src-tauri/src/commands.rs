use crate::hidden_cmd;
use crate::installer_service;
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
    atomic_write(&recent_path, json.as_bytes())
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

    let input_paths: Vec<PathBuf> = input_files
        .iter()
        .map(|p| validate_pdf_path(p))
        .collect::<Result<Vec<_>, _>>()?;
    let output = validate_output_path(&output_path)?;

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

    let input = validate_pdf_path(&input_file)?;
    let dir = validate_output_dir(&output_dir)?;

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
    let input = validate_pdf_path(&input_file)?;
    let output = validate_output_path(&output_path)?;
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
    let input = validate_pdf_path(&input_file)?;
    let output = validate_output_path(&output_path)?;
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
    let input = validate_pdf_path(&input_file)?;
    let output = validate_output_path(&output_path)?;
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
    let input = validate_pdf_path(&input_file)?;
    let output = validate_output_path(&output_path)?;
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
    let input = validate_pdf_path(&input_file)?;
    let output = validate_output_path(&output_path)?;
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
    let input = validate_pdf_path(&input_file)?;
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
    let input = PathBuf::from(&input_file)
        .canonicalize()
        .map_err(|e| format!("입력 파일 경로 오류: {e}"))?;
    let output = validate_output_path(&output_file)?;
    ocr_service::run_ocr(&input, &output, &language, dpi, &tesseract)
        .map(|p| format!("OCR 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn run_ocr_searchable_pdf(
    image_paths: Vec<String>,
    output_pdf: String,
    language: String,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tesseract = resolve_tesseract(&settings)?;
    let images: Vec<PathBuf> = image_paths
        .iter()
        .map(|p| {
            PathBuf::from(p)
                .canonicalize()
                .map_err(|e| format!("이미지 경로 오류 ({p}): {e}"))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let output = validate_output_path(&output_pdf)?;
    ocr_service::run_ocr_searchable_pdf(&images, &output, &language, &tesseract)
        .map(|p| format!("검색 가능 PDF 생성 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn apply_watermark(
    input_file: String,
    watermark_file: String,
    output_path: String,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let _ = settings;
    let input = validate_pdf_path(&input_file)?;
    let watermark = validate_pdf_path(&watermark_file)?;
    let output = validate_output_path(&output_path)?;
    watermark_service::apply_watermark_pdf(&input, &watermark, &output)
        .map(|p| format!("워터마크 적용 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn apply_stamp(
    input_file: String,
    stamp_file: String,
    output_path: String,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let _ = settings;
    let input = validate_pdf_path(&input_file)?;
    let stamp = validate_pdf_path(&stamp_file)?;
    let output = validate_output_path(&output_path)?;
    watermark_service::stamp_pdf(&input, &stamp, &output)
        .map(|p| format!("스탬프 적용 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_text_file(path: String, content: String) -> Result<String, String> {
    let file_path = validate_output_path(&path)?;
    atomic_write(&file_path, content.as_bytes()).map_err(|e| format!("파일 저장 실패: {e}"))?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_binary_file(path: String, base64_data: String) -> Result<String, String> {
    let file_path = validate_output_path(&path)?;
    let bytes = general_purpose::STANDARD
        .decode(base64_data.as_bytes())
        .map_err(|e| format!("base64 디코딩 실패: {e}"))?;
    atomic_write(&file_path, &bytes).map_err(|e| format!("파일 저장 실패: {e}"))?;
    Ok(file_path.to_string_lossy().to_string())
}

const MAX_READ_BYTES_BYTES: u64 = 512 * 1024 * 1024;

#[tauri::command]
pub fn read_text_file_if_exists(path: String) -> Result<String, String> {
    let Some(p) = validate_existing_file_path_if_exists(
        &path,
        &["json", "txt"],
        "텍스트/JSON 파일만 읽을 수 있습니다.",
    )? else {
        return Ok(String::new());
    };
    let metadata = fs::metadata(&p).map_err(|e| format!("파일 정보 읽기 실패: {e}"))?;
    if metadata.len() > 8 * 1024 * 1024 {
        return Err("텍스트 파일이 너무 큽니다 (최대 8MB).".to_string());
    }
    fs::read_to_string(&p).map_err(|e| format!("파일 읽기 실패: {e}"))
}

#[tauri::command]
pub fn delete_file_if_exists(path: String) -> Result<(), String> {
    if let Some(p) = validate_existing_file_path_if_exists(
        &path,
        &[
            "png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff", "txt", "json",
        ],
        "지원하지 않는 파일 형식은 삭제할 수 없습니다.",
    )? {
        fs::remove_file(&p).map_err(|e| format!("파일 삭제 실패: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn read_file_bytes(path: String) -> Result<String, String> {
    let pdf_path = PathBuf::from(&path);
    let canonical = pdf_path
        .canonicalize()
        .map_err(|e| format!("파일 경로가 올바르지 않습니다: {e}"))?;
    let metadata = fs::metadata(&canonical)
        .map_err(|e| format!("파일 정보를 읽을 수 없습니다: {e}"))?;
    if !metadata.is_file() {
        return Err("파일이 아닙니다.".to_string());
    }
    if metadata.len() > MAX_READ_BYTES_BYTES {
        return Err("파일이 너무 큽니다 (최대 512MB).".to_string());
    }
    let ext = canonical
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
        .to_lowercase();
    if !matches!(
        ext.as_str(),
        "png" | "jpg" | "jpeg" | "webp" | "bmp" | "gif" | "tif" | "tiff" | "pdf"
    ) {
        return Err("지원하지 않는 파일 형식입니다.".to_string());
    }
    let bytes = fs::read(&canonical).map_err(|e| format!("파일 읽기 실패: {e}"))?;
    Ok(general_purpose::STANDARD.encode(bytes))
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
    atomic_write(&tab_state_path, json.as_bytes())
        .map_err(|e| format!("탭 상태 저장 실패: {e}"))
}

#[tauri::command]
pub fn install_qpdf_auto(settings: State<'_, SettingsState>) -> Result<String, String> {
    let path = installer_service::install_qpdf().map_err(|e| e.to_string())?;

    let mut snap = settings_snapshot(&settings);
    snap.external_tools.qpdf_path = Some(path.clone());
    let app_dir = get_app_data_dir()?;
    settings::save_to_dir(&app_dir, &snap)?;
    let mut guard = settings
        .0
        .lock()
        .map_err(|_| "설정 잠금 오류".to_string())?;
    *guard = snap;

    Ok(path)
}

#[tauri::command]
pub fn install_tesseract_auto(settings: State<'_, SettingsState>) -> Result<String, String> {
    let installer_path = installer_service::download_tesseract_installer()
        .map_err(|e| e.to_string())?;

    installer_service::run_tesseract_elevated(&installer_path)
        .map_err(|e| e.to_string())?;

    let detected = installer_service::detect_tesseract_path()
        .ok_or_else(|| "Tesseract가 설치되었지만 실행 파일을 찾을 수 없습니다. Program Files를 확인하세요.".to_string())?;

    let mut snap = settings_snapshot(&settings);
    snap.external_tools.tesseract_path = Some(detected.clone());
    let app_dir = get_app_data_dir()?;
    settings::save_to_dir(&app_dir, &snap)?;
    let mut guard = settings
        .0
        .lock()
        .map_err(|_| "설정 잠금 오류".to_string())?;
    *guard = snap;

    Ok(detected)
}

#[tauri::command]
pub fn check_elevation() -> bool {
    installer_service::is_elevated()
}

#[tauri::command]
pub fn reorder_pages(
    input_file: String,
    output_path: String,
    page_order: Vec<u32>,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let input = validate_pdf_path(&input_file)?;
    let output = validate_output_path(&output_path)?;
    qpdf_service::reorder_pages(&input, &output, &page_order, &tool)
        .map(|p| format!("페이지 재정렬 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_pages(
    input_file: String,
    output_path: String,
    pages_to_delete: Vec<u32>,
    total_pages: u32,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let input = validate_pdf_path(&input_file)?;
    let output = validate_output_path(&output_path)?;
    qpdf_service::delete_pages(&input, &output, &pages_to_delete, total_pages, &tool)
        .map(|p| format!("페이지 삭제 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn normalize_pdf(
    input_file: String,
    output_path: String,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let input = validate_pdf_path(&input_file)?;
    let output = validate_output_path(&output_path)?;
    qpdf_service::normalize_pdf(&input, &output, &tool)
        .map(|p| format!("PDF 정규화 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rotate_pages_individually(
    input_file: String,
    output_path: String,
    rotations: Vec<(u32, u16)>,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let input = validate_pdf_path(&input_file)?;
    let output = validate_output_path(&output_path)?;
    qpdf_service::rotate_pages_individually(&input, &output, &rotations, &tool)
        .map(|p| format!("페이지 회전 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn insert_pages(
    base_file: String,
    insert_file: String,
    output_path: String,
    after_page: u32,
    base_total_pages: u32,
    settings: State<'_, SettingsState>,
) -> Result<String, String> {
    let tool = resolve_qpdf(&settings)?;
    let base = validate_pdf_path(&base_file)?;
    let insert = validate_pdf_path(&insert_file)?;
    let output = validate_output_path(&output_path)?;
    qpdf_service::insert_pages(&base, &insert, &output, after_page, base_total_pages, &tool)
        .map(|p| format!("페이지 삽입 완료: {}", p.to_string_lossy()))
        .map_err(|e| e.to_string())
}

fn validate_pdf_path(path: &str) -> Result<PathBuf, String> {
    let pdf_path = PathBuf::from(path);
    let canonical = pdf_path
        .canonicalize()
        .map_err(|e| format!("파일 경로가 올바르지 않습니다: {e}"))?;
    let extension = canonical
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();

    if extension != "pdf" {
        return Err("PDF 파일만 열 수 있습니다.".to_string());
    }

    Ok(canonical)
}

const FORBIDDEN_OUTPUT_EXTENSIONS: &[&str] = &[
    "exe", "dll", "sys", "bat", "cmd", "ps1", "psm1", "vbs", "vbe", "js", "jse", "wsf", "wsh",
    "msi", "msp", "scr", "com", "cpl", "lnk", "reg", "inf",
];

fn blocked_system_roots() -> Vec<PathBuf> {
    ["WINDIR", "SYSTEMROOT", "PROGRAMFILES", "PROGRAMFILES(X86)"]
        .iter()
        .filter_map(|key| std::env::var(key).ok())
        .map(PathBuf::from)
        .filter_map(|p| p.canonicalize().ok())
        .collect()
}

fn ensure_not_system_dir(path: &Path) -> Result<(), String> {
    for root in blocked_system_roots() {
        if path.starts_with(&root) {
            return Err("시스템 디렉터리에는 접근할 수 없습니다.".to_string());
        }
    }
    Ok(())
}

fn validate_output_path(path: &str) -> Result<PathBuf, String> {
    if path.trim().is_empty() {
        return Err("출력 경로가 비어 있습니다.".to_string());
    }
    let raw = PathBuf::from(path);
    let ext = raw
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
        .to_lowercase();
    if FORBIDDEN_OUTPUT_EXTENSIONS.contains(&ext.as_str()) {
        return Err("보호된 파일 형식에는 저장할 수 없습니다.".to_string());
    }

    let parent = raw.parent().ok_or_else(|| "상위 디렉터리를 알 수 없습니다.".to_string())?;
    if parent.as_os_str().is_empty() {
        return Err("절대 경로를 사용하세요.".to_string());
    }
    fs::create_dir_all(parent)
        .map_err(|e| format!("디렉터리를 생성할 수 없습니다: {e}"))?;
    let canonical_parent = parent
        .canonicalize()
        .map_err(|e| format!("출력 경로가 올바르지 않습니다: {e}"))?;

    ensure_not_system_dir(&canonical_parent)
        .map_err(|_| "시스템 디렉터리에는 저장할 수 없습니다.".to_string())?;

    let file_name = raw
        .file_name()
        .ok_or_else(|| "파일 이름이 없습니다.".to_string())?;
    Ok(canonical_parent.join(file_name))
}

fn validate_existing_file_path_if_exists(
    path: &str,
    allowed_extensions: &[&str],
    extension_error: &str,
) -> Result<Option<PathBuf>, String> {
    if path.trim().is_empty() {
        return Err("파일 경로가 비어 있습니다.".to_string());
    }
    let raw = PathBuf::from(path);
    let ext = raw
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
        .to_lowercase();
    if !allowed_extensions.contains(&ext.as_str())
        || FORBIDDEN_OUTPUT_EXTENSIONS.contains(&ext.as_str())
    {
        return Err(extension_error.to_string());
    }
    if !raw.exists() {
        return Ok(None);
    }

    let canonical = raw
        .canonicalize()
        .map_err(|e| format!("파일 경로가 올바르지 않습니다: {e}"))?;
    let metadata = fs::metadata(&canonical).map_err(|e| format!("파일 정보 읽기 실패: {e}"))?;
    if !metadata.is_file() {
        return Err("파일이 아닙니다.".to_string());
    }
    if let Some(parent) = canonical.parent() {
        ensure_not_system_dir(parent)?;
    }
    Ok(Some(canonical))
}

fn validate_output_dir(dir: &str) -> Result<PathBuf, String> {
    if dir.trim().is_empty() {
        return Err("출력 디렉터리가 비어 있습니다.".to_string());
    }
    let raw = PathBuf::from(dir);
    fs::create_dir_all(&raw)
        .map_err(|e| format!("디렉터리를 생성할 수 없습니다: {e}"))?;
    let canonical = raw
        .canonicalize()
        .map_err(|e| format!("출력 디렉터리 경로 오류: {e}"))?;

    ensure_not_system_dir(&canonical)
        .map_err(|_| "시스템 디렉터리에는 저장할 수 없습니다.".to_string())?;
    Ok(canonical)
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
    let output = hidden_cmd(path).arg("--version").output().ok()?;
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
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

fn atomic_write(path: &Path, content: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("디렉터리 생성 실패: {e}"))?;
    }
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("tmp");
    let tmp = parent.join(format!(
        ".{file_name}.{}.tmp",
        uuid::Uuid::new_v4().simple()
    ));
    fs::write(&tmp, content).map_err(|e| format!("임시 파일 쓰기 실패: {e}"))?;
    if path.exists() {
        let backup = parent.join(format!(
            ".{file_name}.{}.bak",
            uuid::Uuid::new_v4().simple()
        ));
        fs::rename(path, &backup).map_err(|e| {
            let _ = fs::remove_file(&tmp);
            format!("기존 파일 백업 실패: {e}")
        })?;
        if let Err(e) = fs::rename(&tmp, path) {
            let _ = fs::rename(&backup, path);
            let _ = fs::remove_file(&tmp);
            return Err(format!("파일 교체 실패: {e}"));
        }
        let _ = fs::remove_file(&backup);
        return Ok(());
    }
    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("파일 교체 실패: {e}")
    })
}

#[cfg(test)]
mod command_tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(name: &str) -> PathBuf {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("localpdf_commands_{name}_{nanos}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn save_text_file_replaces_existing_content() {
        let dir = temp_dir("atomic_text");
        let path = dir.join("bookmarks.json");
        fs::write(&path, "old").unwrap();

        let saved = save_text_file(
            path.to_string_lossy().to_string(),
            "{\"ok\":true}".to_string(),
        )
        .unwrap();

        assert!(PathBuf::from(saved).exists());
        assert_eq!(fs::read_to_string(&path).unwrap(), "{\"ok\":true}");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn read_text_file_rejects_unsupported_extension() {
        let dir = temp_dir("read_ext");
        let path = dir.join("secret.env");
        fs::write(&path, "TOKEN=1").unwrap();

        let result = read_text_file_if_exists(path.to_string_lossy().to_string());

        assert!(matches!(result, Err(message) if message.contains("텍스트/JSON")));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn delete_file_rejects_protected_extension_without_removing_file() {
        let dir = temp_dir("delete_ext");
        let path = dir.join("tool.exe");
        fs::write(&path, "binary").unwrap();

        let result = delete_file_if_exists(path.to_string_lossy().to_string());

        assert!(matches!(result, Err(message) if message.contains("지원하지 않는 파일 형식")));
        assert!(path.exists());
        fs::remove_dir_all(&dir).ok();
    }
}
