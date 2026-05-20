# DECISION_LOG.md

## 2026-05-20 - 파일 command 안전성 보강

- 결정: 프론트에서 직접 호출 가능한 범용 파일 command는 저장, 읽기, 삭제 각각의 용도에 맞춰 허용 범위를 명시적으로 제한한다. 저장은 임시 파일 작성 후 교체 흐름으로 통일하고, 텍스트 읽기는 `.json`/`.txt`, 임시 삭제는 이미지 파일과 `.json`/`.txt`만 허용한다.
- 이유: `save_text_file`, `save_binary_file`, `read_text_file_if_exists`, `delete_file_if_exists`는 여러 UI 기능에서 재사용되는 편의 command라서 한 곳의 검증 누락이 전체 앱의 로컬 파일 안전성에 영향을 준다. 특히 삭제 command는 임시 이미지 정리 용도이므로 보호 확장자와 시스템 디렉터리를 명시적으로 배제하는 것이 맞다.
- 안전장치: 기존 파일 교체 중 실패하면 백업 파일을 원래 경로로 되돌리고, 읽기/삭제는 허용 확장자 검사와 시스템 디렉터리 차단을 통과한 기존 일반 파일만 처리한다.
- 한계: Windows의 진짜 원자적 replace API를 직접 호출하지는 않는다. 표준 라이브러리 기반 백업-교체-복원 흐름으로 원본 보존을 우선했다.

## 2026-05-20 - v0.17.2 배포 후속 자동화 전략

- 결정: 패키지 매니저 제출은 수동 안내만 두지 않고 `validate-winget-manifests.ps1`, `submit-winget.ps1`, `publish-chocolatey.ps1`로 재현 가능한 명령화한다. 릴리즈 워크플로는 Windows 단독에서 Windows/macOS/Linux matrix로 되돌리고, CI에서 winget 검증과 Chocolatey pack을 기본 검증에 포함한다.
- 이유: winget 검증은 README가 같은 디렉터리에 있으면 YAML scanner 오류로 실패할 수 있고, Chocolatey push는 API key 유무에 따라 로컬 결과가 달라진다. 검증/제출 단계를 스크립트로 분리하면 실제 제출 권한이 없는 환경에서도 패키지 품질을 확인할 수 있고, 키가 있는 환경에서는 같은 명령으로 push까지 이어갈 수 있다.
- 안전장치: winget 제출 스크립트는 YAML만 임시 디렉터리에 복사해 검증/제출하고, Chocolatey 스크립트는 `-SkipPush`로 패키지만 생성할 수 있다. `verify-release-assets.ps1`은 필수 산출물 누락과 digest 누락을 즉시 실패 처리한다.
- 추가 안전장치: `verify-release-assets.ps1`은 `latest.json`의 Windows updater URL이 실제 Release asset 이름과 일치하는지도 확인한다. Tauri 로컬 번들 파일명과 GitHub Release asset 파일명이 다를 수 있어 updater URL 검증을 별도 단계로 둔다.
- 한계: Chocolatey community push는 `CHOCO_API_KEY`가 없으면 진행할 수 없다. macOS DMG와 Linux 패키지는 v0.17.2 태그 빌드에서 처음 복구 검증되므로, CI 실패 시 플랫폼별 의존성을 추가 조정해야 한다.

## 2026-05-20 - v0.17.1 매니페스트 sync 스크립트 폴백 전략

- 결정: `sync-package-manifests.ps1`이 GitHub Release에서 `.deb` 또는 DMG 자산을 찾지 못해도 즉시 실패하지 않고, 해당 자산이 필요한 매니페스트(AUR, Snap, Homebrew)만 건너뛰며 winget·Chocolatey는 정상 갱신하도록 변경한다.
- 이유: v0.16.1에서 CI가 Windows 전용 빌드로 단순화된 뒤 v0.17.0 산출물에 Linux `.deb`·macOS DMG가 포함되지 않는다. 스크립트가 엄격한 자산 요구를 그대로 유지하면 모든 후속 릴리즈에서 매니페스트 sync가 실패하므로, 패키지 매니저 제출 흐름 전체가 멈춰버린다. 옵션 폴백을 도입해 Windows 매니페스트만이라도 자동 동기화되도록 한다.
- 안전장치: Windows NSIS 자산은 여전히 필수(`Get-AssetHash` 호출에서 `-Optional` 미지정). 자산 부재 시 사용자에게 "skip" 메시지를 명시적으로 출력하여 의도하지 않은 누락을 인지할 수 있게 했다.
- 한계: 추후 Linux/macOS 빌드가 재개되면 Snap/AUR/Homebrew 매니페스트는 v0.15.0 시점 SHA-256에서 갱신이 멈춘 상태이므로 별도 sync 실행이 필요하다. README의 상태 표가 이를 명시적으로 반영한다.

## 2026-05-20 - v0.17.0 Fill & Sign 아키텍처 결정

- 결정: PDF 위에 자유 텍스트, 기호, 날짜, 손글씨/이미지 서명을 배치하는 Fill & Sign 도구를 pdf-lib + HTML5 캔버스 + localStorage 만으로 구성하여 100% 오프라인으로 처리한다. 스탬프 좌표는 RedactionArea와 동일하게 unrotated 72dpi PDF Point로 영속화하고, AcroForm 평탄화(`form.flatten()`) 여부는 폼 저장과 Fill & Sign 저장 양쪽에서 명시적 체크박스로 노출한다.
- 이유: 외부 서명 SaaS나 OS Keychain 의존은 LocalPDF Studio의 로컬 우선 원칙에 위배된다. pdf-lib의 `drawText`/`drawImage`로 충분히 시각적 서명을 임베드할 수 있고, 평탄화는 표준 AcroForm API로 호환성 손실 없이 가능하다. 좌표계는 줌·회전·연속/단일 레이아웃에서 동일하게 동작해야 하므로 마스킹·하이라이트와 같이 unrotated PDF Point로 통일하는 것이 유지보수 측면에서 최적이다.
- 안전장치: 이미지 서명은 흰색에 가까운 픽셀(RGB ≥235)을 자동으로 알파 0으로 치환해 별도 편집 없이 깔끔하게 사용할 수 있도록 했으며, 사용자가 이 동작을 끌 수 있는 체크박스를 둔다. 서명 라이브러리는 localStorage에 저장하되 키를 `localpdf.savedSignatures.v1`로 두어 향후 마이그레이션에 대비한다. AcroForm 평탄화는 기본값을 명시적으로 표시해 사용자가 의도와 다른 영구 변경을 일으키지 않도록 한다.
- 한계: 디지털 서명(PKCS#7) 자체는 도입하지 않고 시각적 서명에 한정한다. 디지털 서명은 OS Keychain/PKI 인증서·시간 도장 서버 통신을 동반하므로 본 릴리즈 범위에서 제외했다. 향후 별도 트랙으로 검토한다.

## 2026-05-20 - v0.16.1 GitHub Release 배포 규칙

- 결정: 릴리즈는 `v*` 태그 푸시로만 시작하고, Windows build job이 산출물을 artifact로 업로드한 뒤 단일 release job이 GitHub Release를 생성한다.
- 이유: 참고 프로젝트처럼 빌드 단계와 릴리즈 게시 단계를 분리하면 릴리즈 본문, asset 목록, 공개 타이밍을 예측 가능하게 유지할 수 있다. matrix job이 Draft Release를 동시에 수정하는 구조보다 실패 지점과 재실행 범위도 명확하다.
- 안전장치: 릴리즈 본문은 `CHANGELOG.md`의 현재 버전 섹션에서 추출하고, `actions/upload-artifact`와 `softprops/action-gh-release` 모두 asset 누락 시 실패하도록 설정한다.
- 한계: 이번 정비는 Windows 실사용 배포 산출물(setup exe, MSI, Portable ZIP, updater signature, latest.json)을 우선한다. macOS/Linux 자동 릴리즈는 서명/검증 정책이 정리된 뒤 별도 job으로 확장한다.

## 2026-05-20 - v0.16.0 패키지 매니저 매니페스트 동기화 전략

- 결정: winget, Chocolatey, Homebrew, Snap, AUR 제출 파일의 버전/URL/SHA-256 갱신을 `scripts/windows/sync-package-manifests.ps1` 단일 스크립트로 자동화한다.
- 이유: 릴리즈마다 산출물을 내려받아 해시를 수동 계산하고 여러 매니페스트에 옮겨 적는 작업은 실수 가능성이 높다. GitHub Release asset의 `sha256:` digest를 기준으로 삼으면 릴리즈 산출물과 제출 파일의 일관성을 빠르게 확인할 수 있다.
- 안전장치: 스크립트는 필수 asset이 없거나 digest가 누락된 경우 즉시 실패하고, 파일 저장 시 UTF-8 no BOM을 사용해 한글 locale/README 인코딩을 보존한다.
- 한계: GitHub CLI 인증 및 릴리즈 asset digest 제공이 필요하다. Draft 릴리즈 상태에서도 조회는 가능하지만, 실제 패키지 매니저 제출 전에는 공개 릴리즈 여부를 별도로 확인해야 한다.

## 2026-05-20 - 릴리즈 Draft 자동 공개 전략

- 결정: matrix 빌드 중에는 기존처럼 Draft 릴리즈에 산출물을 업로드하고, 모든 플랫폼 빌드가 성공한 뒤 별도 `publish` job에서 `gh release edit --draft=false --latest`로 공개 전환한다.
- 이유: `releaseDraft: false`를 matrix job에 직접 설정하면 첫 플랫폼 빌드가 끝나는 순간 불완전한 산출물 목록이 공개될 수 있다. 별도 publish job은 산출물이 모두 올라간 뒤 공개하므로 사용자에게 반쪽 릴리즈가 보이는 시간을 없앤다.
- 한계: publish job은 GitHub CLI와 `contents: write` 권한에 의존한다.

## 2026-05-20 - v0.15.0 개인정보 자동 패턴 탐지 및 마스킹 추천 (Auto-Redaction) 구현 전략

- 결정: PDF.js의 `getTextContent()` API를 활용해 오프라인으로 텍스트 구조를 스캔하고, 8종 프라이버시 핵심 식별자(주민번호, 휴대전화번호, 이메일, 신용카드 번호, 은행 계좌번호, 사업자등록번호, 여권번호, 운전면허번호) 정규식과 연계하여 100% 온디바이스 로컬 방식으로 개인정보 자동 탐지(Auto-Redaction) 코어 엔진을 설계한다. 이를 프리미엄 다크모드 친화적 UI 목록으로 렌더링하고, 사용자가 토글 제어하여 상위 마스킹 영역(`RedactionArea`)에 실시간으로 일체화하도록 연동한다.
- 이유: 민감한 개인정보를 클라우드나 외부 OCR API 서버로 전송하여 파싱하는 방식은 원본 PDF 데이터 유출 가능성을 내포하여 LocalPDF Studio의 최우선 가치인 '100% 안전한 오프라인 단독 구동 원칙'에 정면 위배된다. 따라서 클라이언트 브라우저 상에서만 작동하는 순수 오프라인 구조를 고수하되, 부분 글자 매칭 오차를 최소화할 수 있는 charWidth 기반 비례 배분 바운딩 박스 오프셋 수식을 도입하여 정밀도를 극대화한다.
- 안전장치: 계좌번호처럼 넓은 정규식이 구조화 식별자와 겹치는 경우 우선순위 기반 중복 제거를 적용하고, 자동 탐지로 추가한 영역은 즉시 되돌릴 수 있게 한다. 실제 저장 직전에는 래스터/벡터 마스킹의 보안 차이를 확인 대화상자로 고지한다.
- 한계: 텍스트 레이어가 누락된 스캔 이미지 형태의 PDF 문서인 경우에는 단순 `getTextContent()` 텍스트 스캔만으로 탐지할 수 없으므로, 해당 문서 유형에는 먼저 'OCR → 검색 가능 PDF' 처리를 거친 후 자동 마스킹 스캔을 수행해야 함을 UI 빈 상태와 상태 메시지로 고지한다.

## 2026-05-20 - v0.14.0 PDF 개인정보 보안 마스킹 (블랙아웃) 구현 전략

- 결정: 마스킹 기능 처리를 위한 오프라인 전용 비즈니스 로직 엔진을 설계하고, '영구 래스터화 마스킹'과 '일반 벡터 마스킹' 두 가지 선택지를 사용자에게 제공한다. 영구 래스터화 시에는 300DPI 고해상도 PNG 대체 이미지 생성 후 기존 구 페이지를 완전히 삭제(`removePage`)하고 이미지를 탑재한 신규 빈 페이지를 삽입(`insertPage`)하여 원자적 교체 전략을 취한다.
- 이유: 단순 벡터 사각형 덧그림 방식은 텍스트 레이어나 메타데이터가 하단에 잔존하여 외부 PDF 리더기에서 드래그나 복사를 통해 민감한 개인정보가 그대로 노출되는 심각한 유출 취약점을 내포하고 있다. 이를 완벽하게 근절하기 위해 대상 페이지를 완전히 평평한 래스터 이미지로 렌더링하고 영역을 블랙아웃 페인팅한 후 원자적으로 대체함으로써 absolute 보안(개인정보 영구 파괴)을 확립한다.
- 한계: 래스터화 마스킹의 경우 해당 페이지의 다른 모든 벡터 레이어와 하이라이트/주석 등도 이미지로 결합되어 개별 수정이 불가능해지며, 300DPI 고해상도 이미지가 내장되므로 PDF 파일의 크기가 소폭 증가할 수 있다. 이 한계와 특성을 다국어 UI 툴팁 등을 통해 사용자에게 친절하게 고지한다.
- 좌표 보정: 뷰어 줌/회전 상태에 관계없이 정확한 드래그 수렴을 보장하기 위해 unrotated 72dpi PDF Point 기준으로 역산 저장하고, 화면 드로잉 단계에서 정방향 변환을 수행하도록 좌표 관리 계층을 철저히 분리한다.

## 2026-05-20 - v0.13.0 하이라이트 다중 페이지 캡처 및 표준 주석 연동

- 결정: 다중 페이지 텍스트 캡처를 지원하기 위해 DOMRect의 중심 Y축으로 페이지 엘리먼트 경계를 동적 식별하고, 단순배경 덧칠(`drawRectangle`) 방식 대신 `pdf-lib` 저수준 context API를 활용하여 국제 표준 PDF `/Highlight` Annotation 딕셔너리를 임베딩한다.
- 이유: 사용자가 두 개 이상의 페이지를 가로지르며 텍스트를 드래그하는 UX를 자연스럽게 처리하고, 생성된 하이라이트 PDF가 Adobe Acrobat, Chrome 브라우저 등에서 '주석'으로 정식 인식(편집, 조회, 삭제 가능)되도록 표준 사양의 호환성을 확보하기 위함이다.
- 한계: 저수준 PDF Object 조작이 필요하므로 pdf-lib의 `/Annots` 딕셔너리 구조에 직접 write하며, 이 과정에서 strict typechecking 유지를 위해 low-level context lookup 처리가 요구된다.

## 2026-05-18 - P3 OCR/변환 구현 전략

- 결정: OCR은 Tesseract CLI, PDF↔이미지 변환은 프론트엔드 canvas + pdf-lib 사용.
- 이유: Tesseract는 가장 널리 사용되는 OCR 엔진이며 CLI 통합이 간단하다. 이미지 변환은 PDF.js의 canvas 렌더링 기능을 재활용하고, pdf-lib은 순수 JS로 PDF 생성이 가능하다.
- 한계: 이미지→PDF는 pdf-lib 의존성 추가 필요 (5 packages).

## 2026-05-18 - 워터마크/스탬프 구현

- 결정: qpdf의 `--overlay`(워터마크)와 `--underlay`(스탬프) 옵션을 활용한다.
- 이유: qpdf CLI로 추가 도구 없이 구현 가능. 오버레이 PDF를 미리 생성해야 하는 제약은 있음.
- 한계: 텍스트 워터마크는 오버레이 PDF를 별도 생성해야 하므로, 향후 pdf-lib으로 텍스트 직접 삽입 가능.

## 2026-05-18 - 문서 비교

- 결정: 두 PDF의 텍스트를 추출한 후 라인 단위 diff를 TXT로 출력한다.
- 이유: 간단하고 실용적이며, 외부 diff 도구 없이 구현 가능.
- 한계: 시각적 diff(이미지 비교)는 미지원. 복잡한 레이아웃 비교에는 부적합.

## 2026-05-18 - CI/CD 전략

- 결정: CI는 `cargo check`로 검증, Release는 `tauri-action` + `includeUpdaterJson: true` 사용.
- 이유: CI에서 전체 Tauri 빌드는 서명 키가 없어 실패. cargo check로 충분한 검증 가능.
- Release: tauri-action이 빌드+서명+릴리즈를 자동화, latest.json도 자동 생성 가능.

## 2026-05-18 - 다중 문서 탭 관리

- 결정: `Map<string, PDFDocumentProxy>` ref와 `DocTab[]` state로 분리 관리한다.
- 이유: PDFDocumentProxy는 직렬화 불가능한 클래스 인스턴스이므로 React state 대신 ref에 보관한다.
- 구현: 탭 전환 시 activeTabId만 변경, 탭 닫을 때 `doc.destroy()` 호출로 메모리 해제.

## 2026-05-18 - 키보드 단축키

- 결정: `window.addEventListener('keydown')`으로 App 레벨에서 단축키를 처리한다.
- 이유: 별도 라이브러리 없이 구현 가능하며, input/textarea 포커스 시에는 단축키를 무시한다.
- 구현: Ctrl+O(열기), Ctrl+F(검색), Ctrl+1~6(사이드바 탭), Ctrl+W(탭 닫기), Ctrl+Tab(탭 전환), Alt+←→(페이지 이동)

## 2026-05-18 - 대용량 PDF 로딩 방식

- 결정: 250MB 초과 PDF는 `pdf-local://` 커스텀 URI 프로토콜로 스트리밍 로드한다.
- 이유: PDF.js의 Range 요청 기능을 활용하면 전체 파일을 IPC로 전송하지 않고 필요한 청크만 읽을 수 있다.
- 구현: Tauri 2 `register_uri_scheme_protocol`로 `pdf-local://` 프로토콜 등록, Range 헤더 파싱 후 부분 응답.
- 한계: custom protocol은 `http` crate 의존성이 필요하다.

## 2026-05-18 - 사이드바 탭 구조

- 결정: 사이드바를 문서/썸네일/목차/검색/병합/도구 탭으로 분리한다.
- 이유: 기능이 늘어날수록 단일 패널에 나열하기 어려워지므로 탭으로 관심사를 분리한다.
- 구현: App.tsx에서 `activeTab` 상태로 렌더링 분기, Sidebar 컴포넌트는 탭 네비게이션만 담당.

## 2026-05-18 - 최근 문서 저장소

- 결정: `%APPDATA%/LocalPDF Studio/recent_files.json`에 JSON 파일로 저장한다.
- 이유: 파일 시스템 기반으로 간단하게 구현 가능하며, 별도 DB 의존성이 없다.
- 한계: 동시성 이슈 가능성 (단일 인스턴스 앱이므로 낮음), 대용량 히스토리에는 부적합.

## 2026-05-18 - qpdf wrapper 설계

- 결정: `qpdf_service.rs` 모듈에서 순수 함수로 분리하고, commands.rs는 Tauri command 계층만 담당한다.
- 이유: 테스트 가능성과 관심사 분리를 위해 service 함수를 command와 분리한다.
- 구현: `find_qpdf()`, `merge_pdfs()`, `split_pdf()`, `validate_pdf_files()`, `check_output_overwrite()`.
- 한글 오류 메시지: `QpdfError` enum의 `Display` trait에서 한국어 메시지 제공.

## 2026-05-18 - NSIS context menu 통합

- 결정: PowerShell 스크립트 대신 NSIS 매크로에서 직접 HKCU 레지스트리 등록/해제를 수행한다.
- 이유: PowerShell 의존성 제거, 설치 파일 내 추가 리소스 불필요, 안정성 향상.
- 구현: `NSIS_HOOK_POSTINSTALL`에서 `WriteRegStr`, `NSIS_HOOK_PREUNINSTALL`에서 `DeleteRegKey`.
- action: open, merge, split, compress, ocr, metadata (6개).

## 2026-05-18 - 초기 기술 스택

- 결정: Tauri 2 + React + TypeScript + Rust를 기본 스택으로 사용한다.
- 이유: Windows 데스크톱 앱, 설치 파일, 자체 업데이트, Rust 기반 로컬 파일 처리에 적합하다.
- 대안: Electron, .NET/WPF, Qt.
- 결과: 앱 크기와 보안 경계를 고려해 Tauri를 우선한다.

## 2026-05-18 - PDF 뷰어 엔진

- 결정: 초기 뷰어는 `pdfjs-dist`를 사용한다.
- 이유: 웹 UI와 잘 맞고 라이선스 활용성이 높다.
- 한계: 매우 큰 PDF는 base64 IPC 방식이 비효율적이다.
- 후속: custom protocol 또는 chunk streaming 구조로 전환한다.

## 2026-05-18 - PDF 조작 엔진

- 결정: 병합/분할/암호화/구조 조작은 qpdf wrapper로 시작한다.
- 이유: CLI 기반 통합이 단순하고 라이선스 리스크가 낮다.
- 후속: 기능별 Rust abstraction을 만들고 외부 바이너리 경로 설정 UI를 제공한다.

## 2026-05-18 - Windows 우클릭 메뉴

- 결정: Phase 1은 HKCU registry 기반 context menu 스크립트로 시작한다.
- 이유: 구현 난도가 낮고 설치 권한 부담이 작다.
- 한계: 다중 파일 선택 처리 UX는 제한적이다.
- 후속: SendTo 및 ExplorerCommand COM extension을 검토한다.
