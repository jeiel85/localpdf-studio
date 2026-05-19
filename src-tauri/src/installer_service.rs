use std::path::{Path, PathBuf};
use std::process::Command;

const QPDF_VERSION: &str = "12.3.2";
const QPDF_ZIP_URL: &str = "https://github.com/qpdf/qpdf/releases/download/v12.3.2/qpdf-12.3.2-msvc64.zip";
const TESSERACT_VERSION: &str = "5.4.0.20240606";
const TESSERACT_INSTALLER_URL: &str = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.4.0.20240606/tesseract-ocr-w64-setup-5.4.0.20240606.exe";

#[derive(Debug)]
pub struct InstallerError(pub String);

impl std::fmt::Display for InstallerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

fn get_tools_dir() -> Result<PathBuf, InstallerError> {
    let appdata = std::env::var("APPDATA")
        .map_err(|_| InstallerError("APPDATA 환경 변수를 찾을 수 없습니다.".to_string()))?;
    let tools_dir = PathBuf::from(appdata).join("LocalPDF Studio").join("tools");
    std::fs::create_dir_all(&tools_dir)
        .map_err(|e| InstallerError(format!("도구 디렉터리 생성 실패: {e}")))?;
    Ok(tools_dir)
}

fn download_file(url: &str, dest: &Path) -> Result<(), InstallerError> {
    if dest.exists() {
        let _ = std::fs::remove_file(dest);
    }

    let status = Command::new("curl.exe")
        .args(["-L", "--fail", "--progress-bar", "-o", dest.to_str().unwrap(), url])
        .status()
        .map_err(|e| InstallerError(format!("다운로드 실행 실패 (curl): {e}")))?;

    if !status.success() {
        let _ = std::fs::remove_file(dest);
        return Err(InstallerError("다운로드에 실패했습니다. 네트워크 연결을 확인하세요.".to_string()));
    }

    let metadata = std::fs::metadata(dest)
        .map_err(|e| InstallerError(format!("다운로드 파일 확인 실패: {e}")))?;
    if metadata.len() < 1024 {
        let _ = std::fs::remove_file(dest);
        return Err(InstallerError("다운로드된 파일이 너무 작습니다. URL을 확인하세요.".to_string()));
    }

    Ok(())
}

fn extract_zip(zip_path: &Path, dest: &Path) -> Result<(), InstallerError> {
    let status = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
                zip_path.display().to_string().replace('\'', "''"),
                dest.display().to_string().replace('\'', "''"),
            ),
        ])
        .status()
        .map_err(|e| InstallerError(format!("압축 해제 실행 실패: {e}")))?;

    if !status.success() {
        return Err(InstallerError("압축 해제에 실패했습니다.".to_string()));
    }
    Ok(())
}

fn find_file_recursive(dir: &Path, filename: &str) -> Option<PathBuf> {
    if !dir.is_dir() {
        return None;
    }
    for entry in std::fs::read_dir(dir).ok()?.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(found) = find_file_recursive(&path, filename) {
                return Some(found);
            }
        } else if path.file_name().and_then(|n| n.to_str()) == Some(filename) {
            return Some(path);
        }
    }
    None
}

pub fn install_qpdf() -> Result<String, InstallerError> {
    let tools_dir = get_tools_dir()?;
    let qpdf_dir = tools_dir.join("qpdf");

    if let Some(existing) = find_file_recursive(&qpdf_dir, "qpdf.exe") {
        return Ok(existing.to_string_lossy().to_string());
    }

    std::fs::create_dir_all(&qpdf_dir)
        .map_err(|e| InstallerError(format!("qpdf 디렉터리 생성 실패: {e}")))?;

    let zip_path = tools_dir.join(format!("qpdf-{}-download.zip", QPDF_VERSION));

    download_file(QPDF_ZIP_URL, &zip_path)?;

    extract_zip(&zip_path, &qpdf_dir)?;

    let _ = std::fs::remove_file(&zip_path);

    let qpdf_exe = find_file_recursive(&qpdf_dir, "qpdf.exe")
        .ok_or_else(|| InstallerError(
            "압축 해제 후 qpdf.exe를 찾을 수 없습니다. 수동으로 설치해 주세요.".to_string()
        ))?;

    Ok(qpdf_exe.to_string_lossy().to_string())
}

pub fn download_tesseract_installer() -> Result<PathBuf, InstallerError> {
    let tools_dir = get_tools_dir()?;
    let installer_path = tools_dir.join(format!("tesseract-ocr-setup-{}.exe", TESSERACT_VERSION));

    download_file(TESSERACT_INSTALLER_URL, &installer_path)?;

    Ok(installer_path)
}

pub fn run_tesseract_elevated(exe_path: &Path) -> Result<(), InstallerError> {
    if !exe_path.exists() {
        return Err(InstallerError("설치 파일을 찾을 수 없습니다.".to_string()));
    }

    let status = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "Start-Process -FilePath '{}' -ArgumentList '/S' -Verb RunAs -Wait",
                exe_path.display().to_string().replace('\'', "''"),
            ),
        ])
        .status()
        .map_err(|e| InstallerError(format!("관리자 권한 실행 실패: {e}")))?;

    if !status.success() {
        return Err(InstallerError(
            "관리자 권한 설치가 거부되었거나 실패했습니다. UAC 프롬프트에서 허용해 주세요.".to_string()
        ));
    }

    let _ = std::fs::remove_file(exe_path);

    Ok(())
}

pub fn detect_tesseract_path() -> Option<String> {
    let candidates = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ];

    for candidate in &candidates {
        if Path::new(candidate).exists() {
            return Some(candidate.to_string());
        }
    }

    if let Ok(output) = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-Command tesseract -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source",
        ])
        .output()
    {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() && Path::new(&path).exists() {
            return Some(path);
        }
    }

    None
}

pub fn is_elevated() -> bool {
    Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')",
        ])
        .output()
        .map(|o| {
            let stdout = String::from_utf8_lossy(&o.stdout).trim().to_lowercase();
            stdout == "true"
        })
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tools_dir_creates_successfully() {
        let dir = get_tools_dir();
        assert!(dir.is_ok(), "tools_dir should be created: {dir:?}");
        let d = dir.unwrap();
        assert!(d.exists());
        assert!(d.to_string_lossy().contains("LocalPDF Studio"));
    }

    #[test]
    fn find_file_recursive_finds_existing() {
        let dir = std::env::temp_dir().join("lpdf_installer_test_find");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("nested/sub")).unwrap();
        std::fs::write(dir.join("nested/sub/test.txt"), "x").unwrap();

        let found = find_file_recursive(&dir, "test.txt");
        assert!(found.is_some());
        assert!(found.unwrap().ends_with("test.txt"));

        let missing = find_file_recursive(&dir, "nope.txt");
        assert!(missing.is_none());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn detect_tesseract_returns_option() {
        let result = detect_tesseract_path();
        if let Some(ref path) = result {
            assert!(Path::new(path).exists());
        }
    }

    #[test]
    fn is_elevated_returns_bool() {
        let _ = is_elevated();
    }
}
