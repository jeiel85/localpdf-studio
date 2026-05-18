# HISTORY.md

## 2026-05-18

- 작업: LocalPDF Studio 초기 저장소 코드 생성
- 변경 파일:
  - React UI, Tauri/Rust backend, Windows scripts, GitHub Actions, 문서 묶음
- 검증:
  - 파일 생성 및 ZIP 패키징 확인
  - 실제 `npm install` / 빌드 검증은 실행하지 않음
- 결과:
  - GitHub 업로드 가능한 초기 코드 패키지 생성
- 후속 작업:
  - Windows 개발 환경에서 의존성 설치 후 빌드 검증
  - PDF.js worker import와 Tauri permission 설정 확인
  - qpdf/Tesseract wrapper 구현
