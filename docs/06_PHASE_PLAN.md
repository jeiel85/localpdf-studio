# 작업 계획 (v0.3.x 로드맵)

작성: 2026-05-18 / 마지막 출시: **v0.2.5**

이 문서는 다음 세션에서 끊김 없이 이어가기 위한 컨텍스트 + 단계별 작업 계획.
세션 시작 시 이 문서부터 읽고 Phase 1부터 차례대로 진행.

---

## 현재 상태 스냅샷

### 출시된 기능 (v0.2.5까지)
- PDF 뷰어: 단일/연속 레이아웃, 너비/페이지/실제 맞춤, 회전, 줌
- PDF 작업: 병합/분할/추출/회전/암호화/복호화/압축/메타데이터 (qpdf)
- 고급: OCR(Tesseract), PDF↔이미지, PDF→TXT, 이미지→PDF, 워터마크, 비교
- 설정 화면 (8 섹션 / 17 옵션, JSON 영속화)
- 외부 도구 패널 (다시 확인, 다운로드 가이드)
- 자동 업데이트 (시작 시 백그라운드 체크 + 우하단 토스트, 다운로드 → 재시작 분리)
- 다중 탭, 키보드 단축키, 최근 파일

### 인프라
- Tauri 2 + React 19 + TypeScript + Rust
- 테스트: Rust 18 + Frontend 39 = **57개**
- CI: `ci.yml` (master 트리거), `release.yml` (v*.*.* 태그)
- 자동 업데이트 서명: `~/.tauri/localpdf-studio.key` + GitHub Secret `TAURI_SIGNING_PRIVATE_KEY`
- Public key in `src-tauri/tauri.conf.json` `plugins.updater.pubkey`

### 주요 파일 위치
- `src/App.tsx` — 진입점, 탭/뷰어 상태, 단축키
- `src/components/PdfCanvas.tsx` — 단일 페이지 캔버스 + 로딩 오버레이
- `src/components/PdfContinuousView.tsx` — 연속 스크롤 뷰
- `src/components/Sidebar.tsx` — 사이드바 탭
- `src/components/Toolbar.tsx` — 상단 툴바
- `src/components/SettingsPanel.tsx` — 설정 UI
- `src/components/UpdateNotification.tsx` — 업데이트 토스트
- `src/lib/renderQueue.ts` — pdf.js 렌더 큐 (concurrency=1)
- `src/lib/tauriCommands.ts` — Rust 명령 래퍼
- `src/types.ts` — 모든 타입 정의 + `DEFAULT_SETTINGS`
- `src/styles.css` — 전역 CSS
- `src-tauri/src/commands.rs` — Tauri 명령 핸들러
- `src-tauri/src/settings.rs` — 설정 영속화
- `src-tauri/src/qpdf_service.rs` — qpdf 래퍼
- `src-tauri/src/ocr_service.rs` — Tesseract 래퍼
- `src-tauri/src/watermark_service.rs` — 워터마크/스탬프

### 알려진 제약
- 윈도우 전용 빌드 (macOS/Linux 미지원)
- 텍스트 선택 불가 (캔버스만 렌더링)
- 다크 테마 only
- 설정 변경 후 일부는 다음 PDF 열 때만 반영 (예: 초기 배율, 레이아웃)

---

## Phase 1 — v0.3.0: 뷰어 핵심 보강

목표: PDF 뷰어 기본 기대치 충족 + 세션 연속성

### A1. 텍스트 선택/복사 (가장 큰 작업)

**접근**: pdf.js의 텍스트 레이어 오버레이를 캔버스 위에 absolute로 얹기.

**구현 단계**:
1. `PdfCanvas.tsx` 단일 모드:
   - 캔버스 컨테이너를 `position: relative`로
   - 캔버스 위에 `<div class="textLayer">` 추가
   - pdf.js의 `page.getTextContent()` → `pdf.TextLayer({ textContentSource, container, viewport })` 사용 (v5 API)
   - 렌더 완료 후 텍스트 레이어 렌더링 트리거
2. `PdfContinuousView.tsx`의 `ContinuousPage`도 동일하게
3. CSS 추가:
   ```css
   .textLayer {
     position: absolute;
     left: 0;
     top: 0;
     right: 0;
     bottom: 0;
     overflow: hidden;
     opacity: 0.25;
     line-height: 1;
   }
   .textLayer span,
   .textLayer br {
     color: transparent;
     position: absolute;
     white-space: pre;
     cursor: text;
     transform-origin: 0% 0%;
   }
   .textLayer ::selection {
     background: rgba(91, 140, 255, 0.4);
   }
   ```
4. pdf.js v5에서 TextLayer 클래스 위치 확인 — `pdfjsLib.TextLayer` 또는 `import { TextLayer } from 'pdfjs-dist'`

**주의점**:
- 텍스트 레이어와 캔버스의 픽셀 정렬이 어긋나면 선택 부정확. viewport 동일하게 사용
- 회전 시에도 정렬 유지
- 렌더 큐 통합 필요할 수도 있음 (text layer도 비동기 작업)
- 연속 모드에서 페이지 간 선택 가능하면 좋지만 일단은 페이지 내로 한정

**테스트**: 컴포넌트 자체는 jsdom에서 pdf.js 동작 불가. 통합은 수동 검증.

### A2. 파일 드래그앤드롭

**접근**: Tauri 2의 webview drag-drop 이벤트 (window 레벨).

**구현**:
```ts
import { getCurrentWebview } from '@tauri-apps/api/webview';

useEffect(() => {
  const unlisten = getCurrentWebview().onDragDropEvent((event) => {
    if (event.payload.type === 'drop') {
      for (const path of event.payload.paths) {
        if (path.toLowerCase().endsWith('.pdf')) {
          void loadPath(path);
          break; // 일단 첫 PDF만, 나중에 여러 개 지원 검토
        }
      }
    }
  });
  return () => { unlisten.then((fn) => fn()); };
}, [loadPath]);
```

**capabilities/default.json** 확인 필요. 보통 별도 permission 불필요 (core:webview).

**UX**: 드래그 중 시각적 피드백 (드롭존 강조) 추가하면 좋음. 단순 시작은 생략 가능.

### A3. 탭/뷰 상태 영속화

**스키마**:
```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct PersistedTab {
    pub path: String,
    pub current_page: u32,
    pub scale: f64,
    pub rotation: u32,
    pub layout: String,
    pub fit_mode: String,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct TabState {
    pub tabs: Vec<PersistedTab>,
    pub active_index: Option<usize>,
}
```

**저장 위치**: `<app_data>/tab_state.json`

**새 Rust 명령**:
- `get_tab_state() -> Result<TabState, String>`
- `save_tab_state(state: TabState) -> Result<(), String>`

**프론트엔드 흐름**:
1. 부트스트랩에서 `getTabState()` 호출 → 파일이 존재하면 각 path를 순서대로 `loadPath` (silent, 진행률 안 보여도 됨)
2. 복원 후 `viewer` 상태(페이지/스케일 등) 덮어쓰기
3. 탭 추가/닫기 / viewer 변경 시 debounced save (예: 500ms)
4. `settings.privacy.recordRecentFiles` 같은 기존 토글에 묶거나 별도 설정 추가

**설정 추가**: `settings.session.restoreTabs: boolean` (기본 true)

**주의점**:
- 복원 시 파일이 더 이상 존재하지 않으면 silent skip
- 너무 많은 탭(예: 50개+) 한 번에 열면 메모리 폭발 → 일단 그대로 두되, 향후 lazy하게 로드 고려
- 스트리밍 모드 PDF는 path만 저장하면 됨

### A4. 단축키 안내 다이얼로그

**트리거**:
- F1 키
- 또는 툴바 우측 끝에 도움말 아이콘
- `settings.ui.showShortcutHelp` 토글(현재 미사용)을 "시작 시 자동 표시"로 의미 부여 OR 제거하고 단순 F1 진입만

**컴포넌트**: `src/components/ShortcutHelp.tsx` — 모달 형태

**표시 내용**:
| 단축키 | 동작 |
|---|---|
| Ctrl+O | PDF 열기 |
| Ctrl+W | 현재 탭 닫기 |
| Ctrl+Tab | 다음 탭 |
| Ctrl+1~6 | 사이드바 탭 전환 |
| Ctrl+F | 검색 |
| Alt+← / Alt+→ | 이전/다음 페이지 |
| F1 | 이 도움말 |

App.tsx 단축키 핸들러에서 추출해서 자동 생성하면 더 좋음.

### A5. 사이드바 접기

**상태**: App.tsx에 `sidebarCollapsed: boolean` (localStorage 또는 settings에 영속화)

**구현**:
- AppShell의 grid-template-columns: `${collapsed ? '0' : '320px'} 1fr`
- 접힌 상태에서 작은 토글 버튼만 노출 (40px 너비 컬럼)
- 또는 sidebar `display: none` + 우상단 floating 토글 버튼
- 단축키 `Ctrl+B` 같은 것으로도 토글 가능하면 좋음

**CSS 트랜지션**: `transition: grid-template-columns 0.2s ease`

### Phase 1 마무리
- Vitest 통과 + Rust cargo test 통과
- 수동 검증: 텍스트 드래그/복사, 파일 드롭, 앱 재시작 후 탭 복원, F1로 단축키 다이얼로그, 사이드바 토글
- CHANGELOG.md에 v0.3.0 섹션 작성
- package.json / tauri.conf.json / Cargo.toml 버전 bump
- 커밋 → 푸시 → 태그 → Release 자동 발행 확인 → publish

---

## Phase 2 — v0.3.1: 페이지 편집

### B1. 썸네일 다중 선택
- `ThumbnailPanel.tsx`에 selection 상태 추가
- Ctrl 클릭 = toggle, Shift 클릭 = 범위 선택, 일반 클릭 = 단일 + 페이지 이동
- 선택된 페이지 인디케이터 (border + checkbox 아이콘)

### B2. 페이지 삭제
- 선택된 페이지 → "삭제" 버튼
- qpdf로 빼낸 후 새 PDF로 저장 (원본 덮어쓰기 옵션)
- 백엔드: 기존 `extract_pages`의 inverse 가능. 또는 새 명령 `remove_pages(input, output, ranges)`
  - qpdf 명령: `qpdf input.pdf --pages . 1,3-5 -- output.pdf` (남길 페이지 지정 방식)
  - 즉, 삭제할 페이지를 제외한 나머지 페이지 범위를 계산해서 추출

### B3. 페이지 드래그 재정렬
- 썸네일을 드래그해서 순서 바꿈
- HTML5 drag-drop API 사용 또는 라이브러리(@dnd-kit/sortable)
- 변경 후 "저장" 누르면 qpdf `--pages` 새 순서로 출력
- 백엔드 새 명령: `reorder_pages(input, output, new_order: Vec<u32>)`

### B4. 책갈피(목차) 편집
- 현재는 읽기만 (`load_pdf_outline`)
- 추가는 PDF.js 자체로는 어려움 — qpdf로 outline 조작 가능한지 확인 필요
- 어려우면 이 항목은 보류

---

## Phase 3 — v0.3.2: 주석 기능

### C1. 형광펜 / 밑줄
- 텍스트 레이어 위에서 드래그 → 선택 영역 좌표 추출
- 좌표를 페이지별 주석 목록에 저장 (앱 데이터)
- 렌더 시 캔버스 또는 별도 오버레이 div에 형광색 사각형 그리기
- PDF로 저장: pdf-lib으로 hightlight annotation 추가 후 새 파일로 출력

### C2. 스티키 메모
- 임의 좌표 클릭 → 메모 박스 (textarea + 색상)
- 저장: pdf-lib의 text annotation (icon + content)

### C3. 펜 도구 (자유 그리기)
- 캔버스 위 별도 SVG/Canvas 레이어
- 마우스 트레이스를 베지어 패스로 저장
- pdf-lib의 ink annotation으로 저장

### C4. 주석 패널
- 사이드바 새 탭 "주석" — 모든 주석 목록
- 클릭 시 해당 위치로 점프
- 삭제 가능

**핵심 라이브러리**: `pdf-lib` (이미 dep에 있음). PDFAnnotation으로 작업.
**가장 어려운 부분**: 페이지 → 화면 좌표 변환 + 회전 처리

---

## Phase 4 — v0.3.3: UX 폴리시

### D1. 라이트 테마
- CSS 변수화 (현재 하드코딩된 색상들)
- `prefers-color-scheme` 또는 `settings.ui.theme` 따라 적용
- 모든 컴포넌트의 색상 일관성 확인

### D2. 인쇄
- `window.print()` 또는 PDF.js의 인쇄 헬퍼
- Ctrl+P 단축키
- 페이지 범위 선택 다이얼로그

### D3. 빈 상태 디자인
- PDF 열기 전 메인 영역 (현재는 "PDF를 열어주세요" 텍스트만)
- "최근 파일에서 빠르게 열기" 카드, "PDF 열기" 큰 버튼, 드래그앤드롭 안내

### D4. 상태바 단축키 안내
- `settings.ui.showShortcutHelp` 토글 살리기
- 활성화 시 상태바 우측에 회전식 단축키 힌트 (5초마다 변경)

---

## 다음 세션 시작 가이드

```
1. 이 문서(docs/06_PHASE_PLAN.md) 다시 읽기
2. git pull (혹시 다른 변경 있을 수 있음)
3. npm install (의존성 변경 가능성)
4. npm run typecheck && npm test && cargo test --manifest-path src-tauri/Cargo.toml
   → 모두 그린이어야 시작 가능
5. Phase 1의 A1 (텍스트 선택)부터 순서대로 진행
6. 각 항목 완료 후 todo 업데이트
7. Phase 1 전체 끝나면 v0.3.0 릴리즈
```

### Phase 1 작업 순서 추천
1. **A5 사이드바 접기** (가장 작음, 빠른 win)
2. **A4 단축키 다이얼로그** (독립적, 짧음)
3. **A2 드래그앤드롭** (Tauri API 한 번 호출)
4. **A3 탭 영속화** (백엔드 + 프론트 양쪽, 중간 분량)
5. **A1 텍스트 선택** (가장 크고 복잡, 마지막에)

### 검증 체크리스트 (각 항목 끝날 때마다)
- [ ] TypeScript typecheck 통과
- [ ] Vitest 통과 (필요 시 새 테스트 추가)
- [ ] cargo check 통과
- [ ] cargo test 통과 (백엔드 변경 시)
- [ ] tauri dev에서 수동 검증

### Phase 1 완료 기준
- 5개 항목 모두 동작 + 회귀 없음
- 테스트 모두 그린
- CHANGELOG에 v0.3.0 섹션
- 버전 bump (package.json / tauri.conf.json / Cargo.toml)
- 커밋 + 태그 푸시 + Release CI 성공 + publish

---

## 메모

### 다음 세션에 잊지 말 것
- 작업 중 dev 서버 띄우면 종료 후 `netstat -ano | grep :1420 | awk '{print $5}' | xargs -I {} powershell.exe -Command "Stop-Process -Id {} -Force"` 로 정리
- localpdf-studio.exe 좀비 프로세스도 동일하게 확인
- 한글 버튼은 `white-space: nowrap` 필수 (이미 settings.css 적용됨)
- PDF.js v5 API는 v4와 다른 부분 있으니 공식 문서 확인 권장
- 자동 업데이트 키 ~/.tauri/localpdf-studio.key 분실 주의 (분실 시 v0.2.4 이상 사용자가 업데이트 못 받음)

### 향후 (Phase 5+) 후보
- macOS/Linux 빌드
- 시각적 PDF diff
- 양식 채우기
- 디지털 서명
- 리덕션
- 코드 스플리팅 (메인 번들 1.1MB 줄이기)
- OCR을 백그라운드 작업 큐로 옮기기
