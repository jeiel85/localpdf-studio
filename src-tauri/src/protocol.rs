use std::{
    fs::{self, File},
    io::{Read, Seek, SeekFrom},
    path::Path,
};

const PDF_MIME: &str = "application/pdf";

const ALLOWED_ORIGINS: &[&str] = &[
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
    "http://localhost:1420",
];

fn resolve_origin(request: &http::Request<Vec<u8>>) -> String {
    let origin = request
        .headers()
        .get("origin")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if ALLOWED_ORIGINS.iter().any(|o| origin.eq_ignore_ascii_case(o)) {
        origin.to_string()
    } else {
        // Default to first known Tauri origin (matches WebView2 default on Windows).
        ALLOWED_ORIGINS[0].to_string()
    }
}

pub fn pdf_local_protocol(request: http::Request<Vec<u8>>) -> http::Response<Vec<u8>> {
    let cors_origin = resolve_origin(&request);
    let uri = request.uri().to_string();

    let path = uri
        .strip_prefix("pdf-local://localhost/")
        .or_else(|| uri.strip_prefix("pdf-local://"))
        .unwrap_or("");

    let decoded = match percent_decode(path) {
        Ok(decoded) => decoded,
        Err(e) => return error_response(400, &format!("잘못된 파일 경로입니다: {e}")),
    };

    let raw_path = Path::new(&decoded);

    let ext = raw_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if ext != "pdf" {
        return error_response(403, "PDF 파일만 접근 가능합니다.");
    }

    let file_path = match raw_path.canonicalize() {
        Ok(canonical) => canonical.to_string_lossy().to_string(),
        Err(e) => return error_response(400, &format!("잘못된 파일 경로입니다: {e}")),
    };

    let metadata = match fs::metadata(&file_path) {
        Ok(m) => m,
        Err(e) => return error_response(404, &format!("파일을 찾을 수 없습니다: {e}")),
    };

    if !metadata.is_file() {
        return error_response(404, "파일을 찾을 수 없습니다.");
    }

    let file_size = metadata.len();
    let range_header = request
        .headers()
        .get("range")
        .and_then(|v| v.to_str().ok());

    if let Some(range) = range_header {
        if let Some(range_value) = range.strip_prefix("bytes=") {
            let parts: Vec<&str> = range_value.splitn(2, '-').collect();
            if parts.len() == 2 {
                let start: u64 = parts[0].parse().unwrap_or(0);
                let end: u64 = if parts[1].is_empty() {
                    file_size.saturating_sub(1)
                } else {
                    parts[1].parse().unwrap_or(file_size.saturating_sub(1))
                };
                let end = end.min(file_size.saturating_sub(1));

                if start <= end && start < file_size {
                    let length = end - start + 1;
                    let mut file = match File::open(&file_path) {
                        Ok(f) => f,
                        Err(e) => {
                            return error_response(500, &format!("파일을 열 수 없습니다: {e}"))
                        }
                    };

                    if file.seek(SeekFrom::Start(start)).is_err() {
                        return error_response(500, "파일 위치 이동 실패");
                    }

                    let mut buffer = vec![0u8; length as usize];
                    if file.read_exact(&mut buffer).is_err() {
                        return error_response(500, "파일 청크 읽기 실패");
                    }

                    return http::Response::builder()
                        .status(206)
                        .header("Content-Type", PDF_MIME)
                        .header("Content-Range", format!("bytes {start}-{end}/{file_size}"))
                        .header("Content-Length", length.to_string())
                        .header("Accept-Ranges", "bytes")
                        .header("Access-Control-Allow-Origin", cors_origin.as_str())
                        .header("Access-Control-Allow-Headers", "range")
                        .header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
                        .body(buffer)
                        .unwrap_or_else(|_| error_response(500, "응답 생성 실패"));
                }
            }
        }

        return http::Response::builder()
            .status(416)
            .header("Content-Range", format!("bytes */{file_size}"))
            .body(Vec::new())
            .unwrap_or_else(|_| error_response(500, "응답 생성 실패"));
    }

    match fs::read(&file_path) {
        Ok(data) => http::Response::builder()
            .status(200)
            .header("Content-Type", PDF_MIME)
            .header("Content-Length", data.len().to_string())
            .header("Accept-Ranges", "bytes")
            .header("Access-Control-Allow-Origin", cors_origin.as_str())
            .header("Cache-Control", "no-cache")
            .body(data)
            .unwrap_or_else(|_| error_response(500, "응답 생성 실패")),
        Err(e) => error_response(500, &format!("파일을 읽을 수 없습니다: {e}")),
    }
}

fn error_response(status: u16, message: &str) -> http::Response<Vec<u8>> {
    http::Response::builder()
        .status(status)
        .header("Content-Type", "text/plain; charset=utf-8")
        .body(message.as_bytes().to_vec())
        .unwrap_or_else(|_| {
            http::Response::builder()
                .status(500)
                .body(Vec::new())
                .unwrap()
        })
}

fn percent_decode(input: &str) -> Result<String, String> {
    let mut result = String::with_capacity(input.len());
    let mut chars = input.bytes();
    while let Some(b) = chars.next() {
        if b == b'%' {
            let hi = chars.next().ok_or("잘못된 퍼센트 인코딩")?;
            let lo = chars.next().ok_or("잘못된 퍼센트 인코딩")?;
            let byte = (hex_val(hi)? << 4) | hex_val(lo)?;
            result.push(byte as char);
        } else if b == b'+' {
            result.push(' ');
        } else {
            result.push(b as char);
        }
    }
    Ok(result)
}

fn hex_val(b: u8) -> Result<u8, String> {
    match b {
        b'0'..=b'9' => Ok(b - b'0'),
        b'A'..=b'F' => Ok(b - b'A' + 10),
        b'a'..=b'f' => Ok(b - b'a' + 10),
        _ => Err(format!("잘못된 16진수 문자: {}", b as char)),
    }
}
