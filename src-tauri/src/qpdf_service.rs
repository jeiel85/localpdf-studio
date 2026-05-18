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

pub fn find_qpdf() -> Result<QpdfTool, QpdfError> {
    let path = which::which("qpdf").map_err(|_| QpdfError::NotFound)?;

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

pub fn validate_pdf_files(paths: &[PathBuf]) -> Result<(), QpdfError> {
    if paths.is_empty() {
        return Err(QpdfError::InvalidInput("파일 목록이 비어 있습니다.".to_string()));
    }

    if paths.len() < 2 {
        return Err(QpdfError::InvalidInput(
            "병합할 PDF 파일이 2개 이상 필요합니다.".to_string(),
        ));
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

    let mut cmd = Command::new(&qpdf_tool.path);
    cmd.arg("--decrypt")
        .arg(format!("--password={password}"))
        .arg(input_file)
        .arg(output_path);

    let output = cmd.output().map_err(|e| {
        QpdfError::ExecutionFailed(format!("qpdf 복호화 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(QpdfError::ExecutionFailed(format!(
            "qpdf 복호화 실패 (암호가 틀렸거나 지원되지 않는 암호화입니다): {stderr}"
        )));
    }

    Ok(output_path.to_path_buf())
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
