#![allow(dead_code)]

use crate::hidden_cmd;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct TesseractTool {
    pub path: PathBuf,
    pub version: String,
    pub languages: Vec<String>,
}

#[derive(Debug)]
pub enum OcrError {
    NotFound,
    InvalidInput(String),
    FileNotFound(String),
    ExecutionFailed(String),
    IoError(String),
    NoLanguages,
}

impl std::fmt::Display for OcrError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFound => write!(f, "Tesseract OCR 실행 파일을 찾을 수 없습니다."),
            Self::InvalidInput(msg) => write!(f, "입력 오류: {msg}"),
            Self::FileNotFound(path) => write!(f, "파일을 찾을 수 없습니다: {path}"),
            Self::ExecutionFailed(msg) => write!(f, "Tesseract 실행 실패: {msg}"),
            Self::IoError(msg) => write!(f, "파일 입출력 오류: {msg}"),
            Self::NoLanguages => write!(f, "사용 가능한 OCR 언어가 없습니다."),
        }
    }
}

impl From<std::io::Error> for OcrError {
    fn from(e: std::io::Error) -> Self {
        Self::IoError(e.to_string())
    }
}

pub fn find_tesseract() -> Result<TesseractTool, OcrError> {
    find_tesseract_with(None)
}

pub fn find_tesseract_with(override_path: Option<&str>) -> Result<TesseractTool, OcrError> {
    let path = match override_path {
        Some(value) if !value.trim().is_empty() => {
            let candidate = PathBuf::from(value);
            if !candidate.exists() {
                return Err(OcrError::NotFound);
            }
            candidate
        }
        _ => which::which("tesseract").map_err(|_| OcrError::NotFound)?,
    };

    let version = hidden_cmd(&path)
        .arg("--version")
        .output()
        .map(|output| {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout
                .lines()
                .find(|line| !line.trim().is_empty())
                .unwrap_or("unknown")
                .trim()
                .to_string()
        })
        .unwrap_or_else(|_| "unknown".to_string());

    let languages = list_languages(&path).unwrap_or_default();

    Ok(TesseractTool {
        path,
        version,
        languages,
    })
}

fn list_languages(tesseract_path: &Path) -> Result<Vec<String>, OcrError> {
    let output = hidden_cmd(tesseract_path)
        .arg("--list-langs")
        .output()
        .map_err(|e| OcrError::ExecutionFailed(format!("언어 목록 확인 실패: {e}")))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let langs: Vec<String> = stdout
        .lines()
        .skip(1)
        .filter(|line| !line.trim().is_empty())
        .map(|line| line.trim().to_string())
        .collect();

    if langs.is_empty() {
        Err(OcrError::NoLanguages)
    } else {
        Ok(langs)
    }
}

pub fn run_ocr(
    input_path: &Path,
    output_path: &Path,
    language: &str,
    dpi: u32,
    tesseract: &TesseractTool,
) -> Result<PathBuf, OcrError> {
    if !input_path.exists() {
        return Err(OcrError::FileNotFound(
            input_path.to_string_lossy().to_string(),
        ));
    }

    if !input_path.is_file() {
        return Err(OcrError::InvalidInput("입력이 파일이 아닙니다.".to_string()));
    }

    if language.trim().is_empty() {
        return Err(OcrError::InvalidInput(
            "OCR 언어를 지정하세요 (예: kor+eng).".to_string(),
        ));
    }

    if let Some(parent) = output_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)?;
        }
    }

    if output_path.exists() {
        return Err(OcrError::InvalidInput(format!(
            "출력 파일이 이미 존재합니다: {}",
            output_path.to_string_lossy()
        )));
    }

    let output_base = output_path.with_extension("");

    let mut cmd = hidden_cmd(&tesseract.path);
    cmd.arg(input_path)
        .arg(output_base.to_string_lossy().as_ref())
        .arg("-l")
        .arg(language);

    if dpi > 0 {
        cmd.arg("--dpi").arg(dpi.to_string());
    }

    let output = cmd.output().map_err(|e| {
        OcrError::ExecutionFailed(format!("Tesseract 실행 중 오류: {e}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(OcrError::ExecutionFailed(format!(
            "OCR 실패: {stderr}"
        )));
    }

    Ok(output_path.to_path_buf())
}

pub fn extract_text(
    input_path: &Path,
    output_path: &Path,
    language: &str,
    tesseract: &TesseractTool,
) -> Result<String, OcrError> {
    run_ocr(input_path, output_path, language, 300, tesseract)?;

    let text = std::fs::read_to_string(output_path)?;
    Ok(text)
}

/// 여러 이미지 입력 + searchable PDF 출력.
/// Tesseract list-file 기능을 사용해 단일 multi-page PDF 생성.
pub fn run_ocr_searchable_pdf(
    image_paths: &[std::path::PathBuf],
    output_pdf: &Path,
    language: &str,
    tesseract: &TesseractTool,
) -> Result<PathBuf, OcrError> {
    if image_paths.is_empty() {
        return Err(OcrError::InvalidInput("이미지 목록이 비어 있습니다.".to_string()));
    }
    if language.trim().is_empty() {
        return Err(OcrError::InvalidInput("OCR 언어를 지정하세요 (예: kor+eng).".to_string()));
    }
    for p in image_paths {
        if !p.exists() {
            return Err(OcrError::FileNotFound(p.to_string_lossy().to_string()));
        }
    }
    if output_pdf.exists() {
        return Err(OcrError::InvalidInput(format!(
            "출력 파일이 이미 존재합니다: {}",
            output_pdf.to_string_lossy()
        )));
    }

    // list 파일 작성
    let temp_dir = std::env::temp_dir();
    let token = format!("lpdf_ocr_{}_{}.txt", std::process::id(), now_nanos());
    let list_path = temp_dir.join(token);
    let mut contents = String::new();
    for p in image_paths {
        contents.push_str(&p.to_string_lossy());
        contents.push('\n');
    }
    std::fs::write(&list_path, contents)
        .map_err(|e| OcrError::IoError(format!("OCR 입력 목록 작성 실패: {e}")))?;

    let output_base = output_pdf.with_extension("");
    let mut cmd = crate::hidden_cmd(&tesseract.path);
    cmd.arg(&list_path)
        .arg(output_base.to_string_lossy().as_ref())
        .arg("-l")
        .arg(language)
        .arg("pdf");

    let output = cmd
        .output()
        .map_err(|e| OcrError::ExecutionFailed(format!("Tesseract 실행 중 오류: {e}")));
    let _ = std::fs::remove_file(&list_path);
    let output = output?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(OcrError::ExecutionFailed(format!(
            "Searchable PDF OCR 실패: {stderr}"
        )));
    }
    if !output_pdf.exists() {
        return Err(OcrError::ExecutionFailed(
            "Tesseract가 실행되었으나 출력 PDF가 생성되지 않았습니다.".to_string(),
        ));
    }
    Ok(output_pdf.to_path_buf())
}

fn now_nanos() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(name: &str) -> PathBuf {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("ocr_test_{name}_{nanos}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn fake_tool() -> TesseractTool {
        TesseractTool {
            path: PathBuf::from("/nonexistent/tesseract"),
            version: "fake".to_string(),
            languages: vec!["eng".to_string()],
        }
    }

    #[test]
    fn run_ocr_rejects_missing_input() {
        let dir = temp_dir("missing_in");
        let out = dir.join("out.txt");
        let result = run_ocr(Path::new("Z:/nope.png"), &out, "eng", 300, &fake_tool());
        assert!(matches!(result, Err(OcrError::FileNotFound(_))));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn run_ocr_rejects_empty_language() {
        let dir = temp_dir("empty_lang");
        let input = dir.join("page.png");
        fs::write(&input, b"fake").unwrap();
        let out = dir.join("out.txt");
        let result = run_ocr(&input, &out, "   ", 300, &fake_tool());
        assert!(matches!(result, Err(OcrError::InvalidInput(_))));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn run_ocr_rejects_existing_output() {
        let dir = temp_dir("existing_out");
        let input = dir.join("page.png");
        fs::write(&input, b"fake").unwrap();
        let out = dir.join("out.txt");
        fs::write(&out, b"prev").unwrap();
        let result = run_ocr(&input, &out, "eng", 300, &fake_tool());
        assert!(matches!(result, Err(OcrError::InvalidInput(_))));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn find_tesseract_with_nonexistent_override_returns_not_found() {
        let result = find_tesseract_with(Some("Z:/no/such/tesseract.exe"));
        assert!(matches!(result, Err(OcrError::NotFound)));
    }
}
