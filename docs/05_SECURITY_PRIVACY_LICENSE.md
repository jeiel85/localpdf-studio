# Security, Privacy, License

## Privacy

- PDF 파일은 기본적으로 로컬에서만 처리한다.
- 사용자가 명시하지 않은 외부 전송을 금지한다.
- 로그에는 파일 내용, 민감 경로, 개인 정보를 남기지 않는다.

## Security

- 파일 확장자와 경로를 검증한다.
- 외부 명령 실행 시 인자를 배열로 전달한다.
- 작업 결과는 임시 파일 생성 후 교체한다.
- 업데이트 파일은 서명 검증을 사용한다.

## License Review

- 앱 코드: Apache-2.0 예정
- PDF.js: 라이선스 확인 필요
- qpdf: 라이선스 확인 필요
- Tesseract: 라이선스 확인 필요
- OCRmyPDF/Ghostscript/Poppler/MuPDF는 배포 전 별도 검토 필요
