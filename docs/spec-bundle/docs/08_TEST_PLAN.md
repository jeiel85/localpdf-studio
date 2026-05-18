# 08. Test Plan

## 1. 테스트 레벨

### Unit Test

- 파일 경로 검증
- 페이지 범위 파서
- 출력 파일명 생성기
- job state machine
- settings repository
- update version comparator
- CLI argument parser

### Integration Test

- PDF open
- merge
- split
- rotate
- extract
- optimize
- OCR
- image export
- text extraction
- metadata read/write
- context menu command routing

### E2E Test

- 앱 실행
- PDF 열기
- 검색
- 페이지 이동
- 병합 마법사 완료
- OCR 마법사 완료
- 설정 변경
- 업데이트 확인 mock
- 우클릭 CLI flow

## 2. 테스트 샘플 PDF 세트

```text
test-fixtures/
├─ normal/
│  ├─ simple_1page.pdf
│  ├─ text_10pages.pdf
│  ├─ images_20pages.pdf
│  └─ mixed_100pages.pdf
├─ edge/
│  ├─ encrypted_user_password.pdf
│  ├─ encrypted_owner_password.pdf
│  ├─ damaged_xref.pdf
│  ├─ huge_1000pages.pdf
│  ├─ unicode_filename_한글.pdf
│  ├─ long_path.pdf
│  └─ form_fields.pdf
├─ ocr/
│  ├─ scan_kor.pdf
│  ├─ scan_eng.pdf
│  └─ scan_kor_eng.pdf
└─ compare/
   ├─ old.pdf
   └─ new.pdf
```

## 3. 성능 테스트

- 100페이지 PDF 열기 시간
- 1,000페이지 썸네일 스크롤
- 500MB PDF 열기
- 100개 PDF 병합
- 50개 PDF 배치 압축
- 100페이지 OCR
- 메모리 사용량
- 작업 취소 응답 시간

## 4. 릴리즈 검증

- 설치 파일 실행
- 설치 후 앱 실행
- 우클릭 메뉴 표시
- 우클릭 메뉴 제거
- Portable ZIP 실행
- 업데이트 mock 성공
- 업데이트 서명 실패
- 제거 후 잔여 파일 확인
- 릴리즈 assets 파일 크기 확인

## 5. 수동 QA 체크리스트

- [ ] 첫 실행 화면 정상
- [ ] 한국어 UI 정상
- [ ] 영어 UI 정상
- [ ] 다크 모드 정상
- [ ] PDF 열기 정상
- [ ] 암호 PDF 처리 정상
- [ ] 검색 정상
- [ ] 썸네일 정상
- [ ] 병합 정상
- [ ] 분할 정상
- [ ] OCR 정상
- [ ] 압축 정상
- [ ] 인쇄 정상
- [ ] 설정 저장 정상
- [ ] 앱 재시작 후 최근 파일 정상
- [ ] 업데이트 확인 정상
- [ ] 앱 삭제 정상
