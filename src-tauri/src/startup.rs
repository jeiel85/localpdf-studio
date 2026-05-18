use serde::Serialize;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupContext {
    pub action: Option<String>,
    pub files: Vec<String>,
}

pub struct StartupContextState(pub Mutex<StartupContext>);

pub fn parse_startup_context() -> StartupContext {
    let mut args = std::env::args().skip(1).peekable();
    let mut action = None;
    let mut files = Vec::new();

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--context-action" | "--action" => {
                action = args.next();
            }
            "--files" | "--file" => {
                if let Some(value) = args.next() {
                    files.push(value);
                }
            }
            other if other.to_lowercase().ends_with(".pdf") => {
                files.push(other.to_string());
            }
            _ => {}
        }
    }

    StartupContext { action, files }
}
