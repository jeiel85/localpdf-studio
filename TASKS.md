# TASKS.md

## P0 - 저장소 초기 안정화

- [ ] `npm install` 성공 확인
- [ ] `npm run typecheck` 성공 확인
- [ ] `npm run build` 성공 확인
- [ ] `npm run tauri:dev` 실행 확인
- [ ] 기본 PDF 열기/렌더링 확인
- [ ] Windows 우클릭 메뉴 등록/해제 스크립트 검증

## P1 - PDF 뷰어 완성도

- [ ] 대용량 PDF 스트리밍 로딩 구조로 전환
- [ ] 페이지 썸네일 사이드바 구현
- [ ] 문서 목차/아웃라인 구현
- [ ] 텍스트 검색 구현
- [ ] 최근 문서 목록 구현
- [ ] 탭 기반 다중 문서 구현
- [ ] 키보드 단축키 구현

## P2 - PDF 작업 엔진

- [ ] qpdf 설치 경로 탐지 및 설정 UI 구현
- [ ] PDF 병합 구현
- [ ] PDF 분할 구현
- [ ] 페이지 추출 구현
- [ ] 페이지 회전 저장 구현
- [ ] 암호 설정/해제 구현
- [ ] 메타데이터 읽기/쓰기 구현
- [ ] 작업 큐와 진행률 표시 구현

## P3 - OCR / 변환 / 고급 기능

- [ ] Tesseract 설치 경로 탐지 및 언어팩 확인
- [ ] 이미지 PDF OCR 구현
- [ ] PDF → 이미지 변환 구현
- [ ] PDF → TXT 변환 구현
- [ ] 이미지 → PDF 구현
- [ ] 워터마크/스탬프 구현
- [ ] 비교 기능 구현

## P4 - 배포 / 업데이트

- [ ] Tauri updater signing key 생성 및 GitHub Secrets 설정
- [ ] 최신 릴리즈용 `latest.json` 생성 자동화
- [ ] NSIS installer에 context menu 등록 hook 통합
- [ ] MSI 산출물 확인
- [ ] Portable ZIP 생성 자동화
- [ ] GitHub Release 산출물 업로드 확인
