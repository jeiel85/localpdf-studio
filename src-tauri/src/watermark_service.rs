use crate::hidden_cmd;
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub enum WatermarkError {
    QpdfNotFound,
    InvalidInput(String),
    FileNotFound(String),
    ExecutionFailed(String),
    IoError(String),
}

impl std::fmt::Display for WatermarkError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::QpdfNotFound => write!(f, "qpdf 실행 파일을 찾을 수 없습니다."),
            Self::InvalidInput(msg) => write!(f, "입력 오류: {msg}"),
            Self::FileNotFound(path) => write!(f, "파일을 찾을 수 없습니다: {path}"),
            Self::ExecutionFailed(msg) => write!(f, "워터마크 적용 실패: {msg}"),
            Self::IoError(msg) => write!(f, "파일 입출력 오류: {msg}"),
        }
    }
}

pub fn apply_watermark_pdf(
    input_path: &Path,
    watermark_path: &Path,
    output_path: &Path,
) -> Result<PathBuf, WatermarkError> {
    let qpdf = which::which("qpdf").map_err(|_| WatermarkError::QpdfNotFound)?;

    if !input_path.exists() {
        return Err(WatermarkError::FileNotFound(
            input_path.to_string_lossy().to_string(),
        ));
    }
    if !watermark_path.exists() {
        return Err(WatermarkError::FileNotFound(
            watermark_path.to_string_lossy().to_string(),
        ));
    }
    if output_path.exists() {
        return Err(WatermarkError::InvalidInput(format!(
            "출력 파일이 이미 존재합니다: {}",
            output_path.to_string_lossy()
        )));
    }

    if let Some(parent) = output_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| WatermarkError::IoError(e.to_string()))?;
        }
    }

    let mut cmd = hidden_cmd(&qpdf);
    cmd.arg(input_path)
        .arg("--overlay")
        .arg(watermark_path)
        .arg("--repeat=1")
        .arg("--")
        .arg(output_path);

    let output = cmd.output().map_err(|e| {
        WatermarkError::ExecutionFailed(format!("qpdf overlay 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(WatermarkError::ExecutionFailed(stderr.to_string()));
    }

    Ok(output_path.to_path_buf())
}

pub fn stamp_pdf(
    input_path: &Path,
    stamp_path: &Path,
    output_path: &Path,
) -> Result<PathBuf, WatermarkError> {
    let qpdf = which::which("qpdf").map_err(|_| WatermarkError::QpdfNotFound)?;

    if !input_path.exists() {
        return Err(WatermarkError::FileNotFound(
            input_path.to_string_lossy().to_string(),
        ));
    }
    if !stamp_path.exists() {
        return Err(WatermarkError::FileNotFound(
            stamp_path.to_string_lossy().to_string(),
        ));
    }
    if output_path.exists() {
        return Err(WatermarkError::InvalidInput(format!(
            "출력 파일이 이미 존재합니다: {}",
            output_path.to_string_lossy()
        )));
    }

    if let Some(parent) = output_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| WatermarkError::IoError(e.to_string()))?;
        }
    }

    let mut cmd = hidden_cmd(&qpdf);
    cmd.arg(input_path)
        .arg("--underlay")
        .arg(stamp_path)
        .arg("--repeat=1")
        .arg("--")
        .arg(output_path);

    let output = cmd.output().map_err(|e| {
        WatermarkError::ExecutionFailed(format!("qpdf stamp 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(WatermarkError::ExecutionFailed(stderr.to_string()));
    }

    Ok(output_path.to_path_buf())
}
