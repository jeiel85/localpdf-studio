use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct ViewerSettings {
    pub initial_zoom_mode: String,
    pub initial_scale: f64,
    pub wheel_action: String,
    pub rotation_step: u32,
    pub render_quality: String,
    pub page_layout: String,
    pub default_fit_mode: String,
}

impl Default for ViewerSettings {
    fn default() -> Self {
        Self {
            initial_zoom_mode: "custom".to_string(),
            initial_scale: 1.2,
            wheel_action: "scroll".to_string(),
            rotation_step: 90,
            render_quality: "auto".to_string(),
            page_layout: "single".to_string(),
            default_fit_mode: "custom".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct ExternalToolSettings {
    pub qpdf_path: Option<String>,
    pub tesseract_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct OutputSettings {
    pub default_folder: Option<String>,
    pub open_folder_after_job: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct PrivacySettings {
    pub record_recent_files: bool,
    pub recent_files_limit: u32,
    pub temp_cleanup: String,
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            record_recent_files: true,
            recent_files_limit: 20,
            temp_cleanup: "on-exit".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct OcrSettings {
    pub default_language: String,
}

impl Default for OcrSettings {
    fn default() -> Self {
        Self {
            default_language: "kor+eng".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct PerformanceSettings {
    pub streaming_threshold_mb: u64,
}

impl Default for PerformanceSettings {
    fn default() -> Self {
        Self {
            streaming_threshold_mb: 250,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct UpdateSettings {
    pub check_on_startup: bool,
}

impl Default for UpdateSettings {
    fn default() -> Self {
        Self {
            check_on_startup: true,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct UiSettings {
    pub theme: String,
    pub show_shortcut_help: bool,
}

impl Default for UiSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            show_shortcut_help: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct SessionSettings {
    pub restore_tabs: bool,
}

impl Default for SessionSettings {
    fn default() -> Self {
        Self { restore_tabs: true }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    pub viewer: ViewerSettings,
    pub external_tools: ExternalToolSettings,
    pub output: OutputSettings,
    pub privacy: PrivacySettings,
    pub ocr: OcrSettings,
    pub performance: PerformanceSettings,
    pub update: UpdateSettings,
    pub ui: UiSettings,
    pub session: SessionSettings,
}

pub struct SettingsState(pub Mutex<AppSettings>);

pub fn settings_file_path(app_dir: &Path) -> PathBuf {
    app_dir.join("settings.json")
}

pub fn load_from_dir(app_dir: &Path) -> AppSettings {
    let path = settings_file_path(app_dir);
    if !path.exists() {
        return AppSettings::default();
    }
    fs::read_to_string(&path)
        .ok()
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default()
}

pub fn save_to_dir(app_dir: &Path, settings: &AppSettings) -> Result<(), String> {
    fs::create_dir_all(app_dir)
        .map_err(|e| format!("앱 데이터 디렉터리를 생성할 수 없습니다: {e}"))?;
    let path = settings_file_path(app_dir);
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("설정 직렬화 실패: {e}"))?;

    let tmp = path.with_extension(format!(
        "json.{}.tmp",
        uuid::Uuid::new_v4().simple()
    ));
    fs::write(&tmp, json).map_err(|e| format!("설정 임시 저장 실패: {e}"))?;
    if path.exists() {
        let _ = fs::remove_file(&path);
    }
    fs::rename(&tmp, &path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("설정 저장 실패: {e}")
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = env::temp_dir().join(format!("localpdf_settings_test_{name}_{}", rand_suffix()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn rand_suffix() -> u64 {
        use std::time::{SystemTime, UNIX_EPOCH};
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64
    }

    #[test]
    fn defaults_are_sane() {
        let s = AppSettings::default();
        assert_eq!(s.viewer.initial_scale, 1.2);
        assert_eq!(s.viewer.rotation_step, 90);
        assert!(s.privacy.record_recent_files);
        assert_eq!(s.privacy.recent_files_limit, 20);
        assert_eq!(s.performance.streaming_threshold_mb, 250);
        assert_eq!(s.ocr.default_language, "kor+eng");
        assert!(s.update.check_on_startup);
    }

    #[test]
    fn load_returns_default_when_file_missing() {
        let dir = temp_dir("missing");
        let s = load_from_dir(&dir);
        assert_eq!(s.viewer.initial_scale, 1.2);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn roundtrip_save_load() {
        let dir = temp_dir("roundtrip");
        let mut s = AppSettings::default();
        s.viewer.initial_scale = 2.0;
        s.privacy.recent_files_limit = 50;
        s.external_tools.qpdf_path = Some("C:/tools/qpdf.exe".to_string());
        save_to_dir(&dir, &s).unwrap();

        let loaded = load_from_dir(&dir);
        assert_eq!(loaded.viewer.initial_scale, 2.0);
        assert_eq!(loaded.privacy.recent_files_limit, 50);
        assert_eq!(loaded.external_tools.qpdf_path.as_deref(), Some("C:/tools/qpdf.exe"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn partial_json_uses_defaults_for_missing_fields() {
        let dir = temp_dir("partial");
        let path = settings_file_path(&dir);
        fs::write(&path, r#"{"viewer":{"initialScale":3.0}}"#).unwrap();

        let loaded = load_from_dir(&dir);
        assert_eq!(loaded.viewer.initial_scale, 3.0);
        // Other fields should fall back to defaults
        assert_eq!(loaded.viewer.rotation_step, 90);
        assert_eq!(loaded.privacy.recent_files_limit, 20);
        assert_eq!(loaded.ocr.default_language, "kor+eng");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn corrupted_json_falls_back_to_defaults() {
        let dir = temp_dir("corrupt");
        let path = settings_file_path(&dir);
        fs::write(&path, "this is not json").unwrap();
        let loaded = load_from_dir(&dir);
        assert_eq!(loaded.viewer.initial_scale, 1.2);
        fs::remove_dir_all(&dir).ok();
    }
}
