use std::{
    io,
    path::{Path, PathBuf},
    process::Command,
};

#[derive(Debug, Clone)]
pub struct QpdfTool {
    pub path: PathBuf,
    pub version: String,
}

#[derive(Debug, Clone)]
pub struct MergeResult {
    pub output_path: PathBuf,
    pub input_count: usize,
    pub total_pages_estimate: u64,
}

#[derive(Debug)]
pub enum QpdfError {
    NotFound,
    InvalidInput(String),
    FileNotFound(String),
    NotPdfFile(String),
    OutputExists(String),
    ExecutionFailed(String),
    IoError(String),
}

impl std::fmt::Display for QpdfError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFound => write!(f, "qpdf 실행 파일을 찾을 수 없습니다."),
            Self::InvalidInput(msg) => write!(f, "입력 파일 오류: {msg}"),
            Self::FileNotFound(path) => write!(f, "파일을 찾을 수 없습니다: {path}"),
            Self::NotPdfFile(path) => write!(f, "PDF 파일이 아닙니다: {path}"),
            Self::OutputExists(path) => write!(
                f,
                "출력 파일이 이미 존재합니다: {path}\n덮어쓰기를 원하시면 기존 파일을 삭제하거나 다른 이름을 지정하세요."
            ),
            Self::ExecutionFailed(msg) => write!(f, "qpdf 실행 실패: {msg}"),
            Self::IoError(msg) => write!(f, "파일 입출력 오류: {msg}"),
        }
    }
}

impl From<io::Error> for QpdfError {
    fn from(e: io::Error) -> Self {
        Self::IoError(e.to_string())
    }
}

#[allow(dead_code)]
pub fn find_qpdf() -> Result<QpdfTool, QpdfError> {
    find_qpdf_with(None)
}

pub fn find_qpdf_with(override_path: Option<&str>) -> Result<QpdfTool, QpdfError> {
    let path = match override_path {
        Some(value) if !value.trim().is_empty() => {
            let candidate = PathBuf::from(value);
            if !candidate.exists() {
                return Err(QpdfError::NotFound);
            }
            candidate
        }
        _ => which::which("qpdf").map_err(|_| QpdfError::NotFound)?,
    };

    let version = Command::new(&path)
        .arg("--version")
        .output()
        .map(|output| {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            stdout
                .lines()
                .chain(stderr.lines())
                .find(|line| !line.trim().is_empty())
                .unwrap_or("unknown")
                .trim()
                .to_string()
        })
        .unwrap_or_else(|_| "unknown".to_string());

    Ok(QpdfTool { path, version })
}

const MAX_FILE_SIZE_BYTES: u64 = 2 * 1024 * 1024 * 1024;

pub fn validate_pdf_files(paths: &[PathBuf]) -> Result<(), QpdfError> {
    if paths.is_empty() {
        return Err(QpdfError::InvalidInput("파일 목록이 비어 있습니다.".to_string()));
    }

    for path in paths {
        if !path.exists() {
            return Err(QpdfError::FileNotFound(
                path.to_string_lossy().to_string(),
            ));
        }

        if !path.is_file() {
            return Err(QpdfError::NotPdfFile(
                path.to_string_lossy().to_string(),
            ));
        }

        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        if ext != "pdf" {
            return Err(QpdfError::NotPdfFile(
                path.to_string_lossy().to_string(),
            ));
        }

        let metadata = std::fs::metadata(path)?;
        if metadata.len() == 0 {
            return Err(QpdfError::InvalidInput(format!(
                "빈 파일입니다: {}",
                path.to_string_lossy()
            )));
        }

        if metadata.len() > MAX_FILE_SIZE_BYTES {
            return Err(QpdfError::InvalidInput(format!(
                "파일 크기가 너무 큽니다 (최대 2GB): {} ({}MB)",
                path.to_string_lossy(),
                metadata.len() / (1024 * 1024)
            )));
        }
    }

    Ok(())
}

pub fn check_output_overwrite(output_path: &Path) -> Result<(), QpdfError> {
    if output_path.exists() {
        return Err(QpdfError::OutputExists(
            output_path.to_string_lossy().to_string(),
        ));
    }

    if let Some(parent) = output_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| {
                QpdfError::IoError(format!(
                    "출력 디렉터리를 생성할 수 없습니다: {} - {e}",
                    parent.display()
                ))
            })?;
        }
    }

    Ok(())
}

pub fn merge_pdfs(
    input_files: &[PathBuf],
    output_path: &Path,
    qpdf_tool: &QpdfTool,
) -> Result<MergeResult, QpdfError> {
    if input_files.len() < 2 {
        return Err(QpdfError::InvalidInput(
            "병합할 PDF 파일이 2개 이상 필요합니다.".to_string(),
        ));
    }
    validate_pdf_files(input_files)?;
    check_output_overwrite(output_path)?;

    let mut cmd = Command::new(&qpdf_tool.path);

    cmd.arg("--empty").arg("--pages");

    for file in input_files {
        cmd.arg(file);
    }

    cmd.arg("--").arg(output_path);

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let err_msg = if stderr.trim().is_empty() {
            stdout.trim().to_string()
        } else {
            stderr.trim().to_string()
        };

        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 병합 실패 (종료 코드: {}): {err_msg}",
            output.status.code().unwrap_or(-1)
        )));
    }

    if !output_path.exists() {
        return Err(QpdfError::ExecutionFailed(
            "qpdf가 실행되었으나 출력 파일이 생성되지 않았습니다.".to_string(),
        ));
    }

    let output_size = std::fs::metadata(output_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(MergeResult {
        output_path: output_path.to_path_buf(),
        input_count: input_files.len(),
        total_pages_estimate: output_size,
    })
}

pub fn split_pdf(
    input_file: &Path,
    output_dir: &Path,
    qpdf_tool: &QpdfTool,
) -> Result<Vec<PathBuf>, QpdfError> {
    validate_pdf_files(&[input_file.to_path_buf()])?;

    if !output_dir.exists() {
        std::fs::create_dir_all(output_dir).map_err(|e| {
            QpdfError::IoError(format!(
                "출력 디렉터리를 생성할 수 없습니다: {} - {e}",
                output_dir.display()
            ))
        })?;
    }

    let stem = input_file
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("page");
    let output_pattern = output_dir.join(format!("{stem}-%d.pdf"));

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg("--split-pages")
        .arg(input_file)
        .arg(output_pattern.to_string_lossy().as_ref());

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 분할 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 분할 실패: {stderr}"
        )));
    }

    let mut result_files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(output_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase() == "pdf")
                .unwrap_or(false)
            {
                if path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.starts_with(stem))
                    .unwrap_or(false)
                {
                    result_files.push(path);
                }
            }
        }
    }

    result_files.sort();
    Ok(result_files)
}

pub fn encrypt_pdf(
    input_file: &Path,
    output_path: &Path,
    user_password: &str,
    owner_password: &str,
    qpdf_tool: &QpdfTool,
) -> Result<PathBuf, QpdfError> {
    validate_pdf_files(&[input_file.to_path_buf()])?;
    check_output_overwrite(output_path)?;

    if user_password.is_empty() {
        return Err(QpdfError::InvalidInput(
            "사용자 암호를 입력하세요.".to_string(),
        ));
    }

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg("--encrypt")
        .arg(user_password)
        .arg(owner_password)
        .arg("256")
        .arg("--")
        .arg(input_file)
        .arg(output_path);

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 암호화 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 암호화 실패: {stderr}"
        )));
    }

    Ok(output_path.to_path_buf())
}

pub fn decrypt_pdf(
    input_file: &Path,
    output_path: &Path,
    password: &str,
    qpdf_tool: &QpdfTool,
) -> Result<PathBuf, QpdfError> {
    validate_pdf_files(&[input_file.to_path_buf()])?;
    check_output_overwrite(output_path)?;

    if password.is_empty() {
        return Err(QpdfError::InvalidInput(
            "암호를 입력하세요.".to_string(),
        ));
    }

    let pw_file = write_temp_password_file(password)?;

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg("--decrypt")
        .arg(format!("--password-file={}", pw_file.display()))
        .arg(input_file)
        .arg(output_path);

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 복호화 실행 중 오류: {e}"))
    })?;

    let _ = std::fs::remove_file(&pw_file);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 복호화 실패 (암호가 틀렸거나 지원되지 않는 암호화입니다): {stderr}"
        )));
    }

    Ok(output_path.to_path_buf())
}

fn write_temp_password_file(password: &str) -> Result<PathBuf, QpdfError> {
    let mut path = std::env::temp_dir();
    path.push(format!("lpdf_pw_{}", std::process::id()));
    std::fs::write(&path, password).map_err(|e| {
        QpdfError::IoError(format!("임시 파일 생성 실패: {e}"))
    })?;
    Ok(path)
}

pub fn extract_pages(
    input_file: &Path,
    output_path: &Path,
    page_range: &str,
    qpdf_tool: &QpdfTool,
) -> Result<PathBuf, QpdfError> {
    validate_pdf_files(&[input_file.to_path_buf()])?;
    check_output_overwrite(output_path)?;

    if page_range.trim().is_empty() {
        return Err(QpdfError::InvalidInput(
            "추출할 페이지 범위를 입력하세요 (예: 1-5).".to_string(),
        ));
    }

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg("--empty")
        .arg("--pages")
        .arg(input_file)
        .arg(page_range)
        .arg("--")
        .arg(output_path);

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 페이지 추출 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 페이지 추출 실패: {stderr}"
        )));
    }

    Ok(output_path.to_path_buf())
}

pub fn rotate_pages(
    input_file: &Path,
    output_path: &Path,
    angle: u16,
    page_range: &str,
    qpdf_tool: &QpdfTool,
) -> Result<PathBuf, QpdfError> {
    validate_pdf_files(&[input_file.to_path_buf()])?;
    check_output_overwrite(output_path)?;

    if angle != 90 && angle != 180 && angle != 270 {
        return Err(QpdfError::InvalidInput(
            "회전 각도는 90, 180, 270 중 하나여야 합니다.".to_string(),
        ));
    }

    let range = if page_range.trim().is_empty() {
        "1-z".to_string()
    } else {
        page_range.to_string()
    };

    let rotate_arg = format!("{angle}:{range}");

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg(input_file)
        .arg(output_path)
        .arg(format!("--rotate={rotate_arg}"));

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 페이지 회전 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 페이지 회전 실패: {stderr}"
        )));
    }

    Ok(output_path.to_path_buf())
}

pub fn compress_pdf(
    input_file: &Path,
    output_path: &Path,
    qpdf_tool: &QpdfTool,
) -> Result<PathBuf, QpdfError> {
    validate_pdf_files(&[input_file.to_path_buf()])?;
    check_output_overwrite(output_path)?;

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg("--linearize")
        .arg("--object-streams=generate")
        .arg(input_file)
        .arg(output_path);

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 압축 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 압축 실패: {stderr}"
        )));
    }

    Ok(output_path.to_path_buf())
}

pub fn read_metadata(input_file: &Path, qpdf_tool: &QpdfTool) -> Result<String, QpdfError> {
    validate_pdf_files(&[input_file.to_path_buf()])?;

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg("--json").arg(input_file);

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 메타데이터 읽기 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 메타데이터 읽기 실패: {stderr}"
        )));
    }

    let json = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(json)
}

pub fn reorder_pages(
    input_file: &Path,
    output_path: &Path,
    page_order: &[u32],
    qpdf_tool: &QpdfTool,
) -> Result<PathBuf, QpdfError> {
    validate_pdf_files(&[input_file.to_path_buf()])?;
    check_output_overwrite(output_path)?;

    if page_order.is_empty() {
        return Err(QpdfError::InvalidInput(
            "페이지 순서 목록이 비어 있습니다.".to_string(),
        ));
    }

    let specification = pages_to_qpdf_spec(page_order);

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg("--empty")
        .arg("--pages")
        .arg(input_file)
        .arg(&specification)
        .arg("--")
        .arg(output_path);

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 페이지 재정렬 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 페이지 재정렬 실패: {stderr}"
        )));
    }

    if !output_path.exists() {
        return Err(QpdfError::ExecutionFailed(
            "qpdf가 실행되었으나 출력 파일이 생성되지 않았습니다.".to_string(),
        ));
    }

    Ok(output_path.to_path_buf())
}

pub fn delete_pages(
    input_file: &Path,
    output_path: &Path,
    pages_to_delete: &[u32],
    total_pages: u32,
    qpdf_tool: &QpdfTool,
) -> Result<PathBuf, QpdfError> {
    validate_pdf_files(&[input_file.to_path_buf()])?;
    check_output_overwrite(output_path)?;

    if pages_to_delete.is_empty() {
        return Err(QpdfError::InvalidInput(
            "삭제할 페이지를 선택하세요.".to_string(),
        ));
    }

    if total_pages == 0 {
        return Err(QpdfError::InvalidInput(
            "전체 페이지 수를 알 수 없습니다.".to_string(),
        ));
    }

    let keep_pages = compute_page_complement(pages_to_delete, total_pages);
    if keep_pages.is_empty() {
        return Err(QpdfError::InvalidInput(
            "모든 페이지를 삭제할 수 없습니다. 최소 1페이지는 남겨야 합니다.".to_string(),
        ));
    }

    let specification = pages_to_qpdf_spec(&keep_pages);

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg("--empty")
        .arg("--pages")
        .arg(input_file)
        .arg(&specification)
        .arg("--")
        .arg(output_path);

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 페이지 삭제 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 페이지 삭제 실패: {stderr}"
        )));
    }

    if !output_path.exists() {
        return Err(QpdfError::ExecutionFailed(
            "qpdf가 실행되었으나 출력 파일이 생성되지 않았습니다.".to_string(),
        ));
    }

    Ok(output_path.to_path_buf())
}

pub fn insert_pages(
    base_file: &Path,
    insert_file: &Path,
    output_path: &Path,
    after_page: u32,
    base_total_pages: u32,
    qpdf_tool: &QpdfTool,
) -> Result<PathBuf, QpdfError> {
    validate_pdf_files(&[base_file.to_path_buf(), insert_file.to_path_buf()])?;
    check_output_overwrite(output_path)?;

    if after_page > base_total_pages {
        return Err(QpdfError::InvalidInput(format!(
            "삽입 위치({after_page})가 전체 페이지 수({base_total_pages})보다 큽니다."
        )));
    }

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg("--empty").arg("--pages");

    if after_page == 0 {
        cmd.arg(insert_file).arg("1-z");
        cmd.arg(base_file).arg("1-z");
    } else if after_page >= base_total_pages {
        cmd.arg(base_file).arg("1-z");
        cmd.arg(insert_file).arg("1-z");
    } else {
        cmd.arg(base_file).arg(format!("1-{after_page}"));
        cmd.arg(insert_file).arg("1-z");
        cmd.arg(base_file).arg(format!("{}-z", after_page + 1));
    }

    cmd.arg("--").arg(output_path);

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 페이지 삽입 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 페이지 삽입 실패: {stderr}"
        )));
    }

    if !output_path.exists() {
        return Err(QpdfError::ExecutionFailed(
            "qpdf가 실행되었으나 출력 파일이 생성되지 않았습니다.".to_string(),
        ));
    }

    Ok(output_path.to_path_buf())
}

fn pages_to_qpdf_spec(pages: &[u32]) -> String {
    if pages.is_empty() {
        return String::new();
    }

    let mut sorted = pages.to_vec();
    sorted.sort_unstable();
    sorted.dedup();

    let mut parts: Vec<String> = Vec::new();
    let mut range_start = sorted[0];
    let mut range_end = sorted[0];

    for &page in &sorted[1..] {
        if page == range_end + 1 {
            range_end = page;
        } else {
            parts.push(if range_start == range_end {
                range_start.to_string()
            } else {
                format!("{range_start}-{range_end}")
            });
            range_start = page;
            range_end = page;
        }
    }
    parts.push(if range_start == range_end {
        range_start.to_string()
    } else {
        format!("{range_start}-{range_end}")
    });

    parts.join(",")
}

fn compute_page_complement(delete: &[u32], total: u32) -> Vec<u32> {
    let mut delete_sorted = delete.to_vec();
    delete_sorted.sort_unstable();
    delete_sorted.dedup();

    let mut result = Vec::new();
    for page in 1..=total {
        if delete_sorted.binary_search(&page).is_err() {
            result.push(page);
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(name: &str) -> PathBuf {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("qpdf_test_{name}_{nanos}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_pdf_like(path: &Path, content: &[u8]) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(path, content).unwrap();
    }

    #[test]
    fn validate_rejects_empty_list() {
        let result = validate_pdf_files(&[]);
        assert!(matches!(result, Err(QpdfError::InvalidInput(_))));
    }

    #[test]
    fn validate_accepts_single_pdf() {
        let dir = temp_dir("single_ok");
        let pdf = dir.join("a.pdf");
        write_pdf_like(&pdf, b"%PDF-1.4\n%fake\n");

        let result = validate_pdf_files(&[pdf]);
        assert!(result.is_ok(), "single valid PDF should pass: {result:?}");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn validate_rejects_missing_file() {
        let result = validate_pdf_files(&[PathBuf::from("Z:/this/does/not/exist.pdf")]);
        assert!(matches!(result, Err(QpdfError::FileNotFound(_))));
    }

    #[test]
    fn validate_rejects_non_pdf_extension() {
        let dir = temp_dir("ext");
        let path = dir.join("not_a.pdf.txt");
        write_pdf_like(&path, b"hello");
        let result = validate_pdf_files(&[path]);
        assert!(matches!(result, Err(QpdfError::NotPdfFile(_))));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn validate_rejects_empty_pdf() {
        let dir = temp_dir("empty");
        let pdf = dir.join("empty.pdf");
        write_pdf_like(&pdf, b"");
        let result = validate_pdf_files(&[pdf]);
        assert!(matches!(result, Err(QpdfError::InvalidInput(_))));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn check_output_overwrite_blocks_existing_file() {
        let dir = temp_dir("overwrite");
        let out = dir.join("out.pdf");
        write_pdf_like(&out, b"existing");
        let result = check_output_overwrite(&out);
        assert!(matches!(result, Err(QpdfError::OutputExists(_))));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn check_output_overwrite_allows_new_path() {
        let dir = temp_dir("new_out");
        let out = dir.join("does_not_exist.pdf");
        assert!(check_output_overwrite(&out).is_ok());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn find_qpdf_with_nonexistent_override_returns_not_found() {
        let result = find_qpdf_with(Some("Z:/no/such/qpdf.exe"));
        assert!(matches!(result, Err(QpdfError::NotFound)));
    }

    #[test]
    fn find_qpdf_with_empty_override_falls_through_to_path() {
        // We don't assert availability — just that empty override doesn't crash.
        // If qpdf is installed, this returns Ok; otherwise NotFound. Either is fine.
        let _ = find_qpdf_with(Some(""));
        let _ = find_qpdf_with(Some("   "));
    }

    #[test]
    fn pages_to_qpdf_spec_single_page() {
        assert_eq!(pages_to_qpdf_spec(&[1]), "1");
    }

    #[test]
    fn pages_to_qpdf_spec_individual() {
        assert_eq!(pages_to_qpdf_spec(&[1, 3, 5]), "1,3,5");
    }

    #[test]
    fn pages_to_qpdf_spec_range() {
        assert_eq!(pages_to_qpdf_spec(&[1, 2, 3, 4, 5]), "1-5");
    }

    #[test]
    fn pages_to_qpdf_spec_mixed() {
        assert_eq!(pages_to_qpdf_spec(&[1, 2, 4, 5, 7]), "1-2,4-5,7");
    }

    #[test]
    fn pages_to_qpdf_spec_sorts_unsorted_input() {
        assert_eq!(pages_to_qpdf_spec(&[5, 1, 3, 2, 4]), "1-5");
    }

    #[test]
    fn pages_to_qpdf_spec_empty() {
        assert_eq!(pages_to_qpdf_spec(&[]), "");
    }

    #[test]
    fn compute_complement_empty_delete() {
        assert_eq!(compute_page_complement(&[], 5), vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn compute_complement_delete_middle() {
        assert_eq!(compute_page_complement(&[3], 5), vec![1, 2, 4, 5]);
    }

    #[test]
    fn compute_complement_delete_edges() {
        assert_eq!(compute_page_complement(&[1, 5], 5), vec![2, 3, 4]);
    }

    #[test]
    fn compute_complement_delete_all() {
        assert!(compute_page_complement(&[1, 2, 3], 3).is_empty());
    }

    #[test]
    fn compute_complement_handles_duplicates() {
        assert_eq!(compute_page_complement(&[2, 2, 3], 5), vec![1, 4, 5]);
    }

    #[test]
    fn reorder_pages_empty_order_rejected() {
        let dir = temp_dir("reorder_empty");
        let input = dir.join("in.pdf");
        let output = dir.join("out.pdf");
        write_pdf_like(&input, b"%PDF-1.4\n%fake\n");

        let tool = QpdfTool {
            path: PathBuf::from("qpdf"),
            version: "test".to_string(),
        };
        let result = reorder_pages(&input, &output, &[], &tool);
        assert!(matches!(result, Err(QpdfError::InvalidInput(_))));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn delete_pages_empty_list_rejected() {
        let dir = temp_dir("delete_empty");
        let input = dir.join("in.pdf");
        let output = dir.join("out.pdf");
        write_pdf_like(&input, b"%PDF-1.4\n%fake\n");

        let tool = QpdfTool {
            path: PathBuf::from("qpdf"),
            version: "test".to_string(),
        };
        let result = delete_pages(&input, &output, &[], 10, &tool);
        assert!(matches!(result, Err(QpdfError::InvalidInput(_))));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn delete_pages_all_rejected() {
        let dir = temp_dir("delete_all");
        let input = dir.join("in.pdf");
        let output = dir.join("out.pdf");
        write_pdf_like(&input, b"%PDF-1.4\n%fake\n");

        let tool = QpdfTool {
            path: PathBuf::from("qpdf"),
            version: "test".to_string(),
        };
        let result = delete_pages(&input, &output, &[1, 2, 3], 3, &tool);
        assert!(matches!(result, Err(QpdfError::InvalidInput(_))));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn insert_pages_beyond_total_rejected() {
        let dir = temp_dir("insert_beyond");
        let base = dir.join("base.pdf");
        let insert = dir.join("insert.pdf");
        let output = dir.join("out.pdf");
        write_pdf_like(&base, b"%PDF-1.4\n%fake\n");
        write_pdf_like(&insert, b"%PDF-1.4\n%fake\n");

        let tool = QpdfTool {
            path: PathBuf::from("qpdf"),
            version: "test".to_string(),
        };
        let result = insert_pages(&base, &insert, &output, 10, 5, &tool);
        assert!(matches!(result, Err(QpdfError::InvalidInput(_))));
        fs::remove_dir_all(&dir).ok();
    }
}
