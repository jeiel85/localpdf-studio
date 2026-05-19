import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import {
  clearRecentFiles,
  getAppDataPath,
  getSettings,
  resetSettings,
  updateSettings,
} from '../lib/tauriCommands';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type FitMode,
  type PageLayout,
  type RenderQuality,
  type TempCleanupMode,
  type ThemeMode,
  type ViewerZoomMode,
  type WheelAction,
} from '../types';
import { LOCALES, getLocale, setLocale, type Locale } from '../i18n/messages';

type Status = { kind: 'idle' | 'saving' | 'saved' | 'error'; message?: string };

export function SettingsPanel({ onStatus }: { onStatus: (message: string) => void }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [appDataPath, setAppDataPath] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSettings(), getAppDataPath()])
      .then(([s, p]) => {
        setSettings(s);
        setAppDataPath(p);
        setLoaded(true);
      })
      .catch((err) => onStatus(`설정 불러오기 실패: ${(err as Error).message ?? err}`));
  }, [onStatus]);

  async function save(next: AppSettings) {
    setSettings(next);
    setStatus({ kind: 'saving' });
    try {
      const saved = await updateSettings(next);
      setSettings(saved);
      setStatus({ kind: 'saved' });
      onStatus('설정을 저장했습니다.');
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      setStatus({ kind: 'error', message });
      onStatus(`설정 저장 실패: ${message}`);
    }
  }

  function patchViewer<K extends keyof AppSettings['viewer']>(key: K, value: AppSettings['viewer'][K]) {
    void save({ ...settings, viewer: { ...settings.viewer, [key]: value } });
  }
  function patchExternal<K extends keyof AppSettings['externalTools']>(key: K, value: AppSettings['externalTools'][K]) {
    void save({ ...settings, externalTools: { ...settings.externalTools, [key]: value } });
  }
  function patchOutput<K extends keyof AppSettings['output']>(key: K, value: AppSettings['output'][K]) {
    void save({ ...settings, output: { ...settings.output, [key]: value } });
  }
  function patchPrivacy<K extends keyof AppSettings['privacy']>(key: K, value: AppSettings['privacy'][K]) {
    void save({ ...settings, privacy: { ...settings.privacy, [key]: value } });
  }
  function patchOcr<K extends keyof AppSettings['ocr']>(key: K, value: AppSettings['ocr'][K]) {
    void save({ ...settings, ocr: { ...settings.ocr, [key]: value } });
  }
  function patchPerformance<K extends keyof AppSettings['performance']>(key: K, value: AppSettings['performance'][K]) {
    void save({ ...settings, performance: { ...settings.performance, [key]: value } });
  }
  function patchUpdate<K extends keyof AppSettings['update']>(key: K, value: AppSettings['update'][K]) {
    void save({ ...settings, update: { ...settings.update, [key]: value } });
  }
  function patchUi<K extends keyof AppSettings['ui']>(key: K, value: AppSettings['ui'][K]) {
    void save({ ...settings, ui: { ...settings.ui, [key]: value } });
  }

  async function pickFile(label: string, currentValue: string | null, kind: 'qpdf' | 'tesseract') {
    const selected = await open({
      title: label,
      directory: false,
      multiple: false,
      defaultPath: currentValue ?? undefined,
      filters: [{ name: 'Executable', extensions: ['exe', ''] }],
    });
    if (typeof selected === 'string') {
      if (kind === 'qpdf') patchExternal('qpdfPath', selected);
      else patchExternal('tesseractPath', selected);
    }
  }

  async function pickFolder(currentValue: string | null) {
    const selected = await open({
      title: '기본 출력 폴더 선택',
      directory: true,
      multiple: false,
      defaultPath: currentValue ?? undefined,
    });
    if (typeof selected === 'string') patchOutput('defaultFolder', selected);
  }

  async function doReset() {
    if (!confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) return;
    try {
      const restored = await resetSettings();
      setSettings(restored);
      onStatus('설정을 기본값으로 되돌렸습니다.');
    } catch (err) {
      onStatus(`초기화 실패: ${(err as Error).message ?? err}`);
    }
  }

  async function doClearRecent() {
    if (!confirm('최근 파일 목록을 모두 삭제하시겠습니까?')) return;
    try {
      await clearRecentFiles();
      onStatus('최근 파일 목록을 삭제했습니다.');
    } catch (err) {
      onStatus(`삭제 실패: ${(err as Error).message ?? err}`);
    }
  }

  async function openDataFolder() {
    if (!appDataPath) return;
    try {
      await openPath(appDataPath);
    } catch (err) {
      onStatus(`폴더 열기 실패: ${(err as Error).message ?? err}`);
    }
  }

  if (!loaded) {
    return <p className="empty-text">설정을 불러오는 중…</p>;
  }

  return (
    <div className="settings-panel" data-testid="settings-panel">
      <section className="panel">
        <div className="panel-header">
          <h2>뷰어</h2>
          <span className="settings-status">{statusLabel(status)}</span>
        </div>

        <label className="settings-row">
          <span>초기 줌 모드</span>
          <select
            value={settings.viewer.initialZoomMode}
            onChange={(e) => patchViewer('initialZoomMode', e.target.value as ViewerZoomMode)}
          >
            <option value="custom">사용자 지정 배율</option>
            <option value="fit-width">너비에 맞춤</option>
            <option value="fit-height">높이에 맞춤</option>
          </select>
        </label>

        <label className="settings-row">
          <span>사용자 지정 배율 ({settings.viewer.initialScale.toFixed(2)}x)</span>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.05"
            value={settings.viewer.initialScale}
            onChange={(e) => patchViewer('initialScale', parseFloat(e.target.value))}
          />
        </label>

        <label className="settings-row">
          <span>마우스 휠 동작</span>
          <select
            value={settings.viewer.wheelAction}
            onChange={(e) => patchViewer('wheelAction', e.target.value as WheelAction)}
          >
            <option value="scroll">스크롤 (Ctrl+휠로 확대)</option>
            <option value="zoom">확대/축소</option>
          </select>
        </label>

        <label className="settings-row">
          <span>페이지 회전 단위</span>
          <select
            value={settings.viewer.rotationStep}
            onChange={(e) => patchViewer('rotationStep', parseInt(e.target.value, 10))}
          >
            <option value="90">90°</option>
            <option value="180">180°</option>
          </select>
        </label>

        <label className="settings-row">
          <span>렌더 품질</span>
          <select
            value={settings.viewer.renderQuality}
            onChange={(e) => patchViewer('renderQuality', e.target.value as RenderQuality)}
          >
            <option value="auto">자동 (DPR 사용)</option>
            <option value="high">최고 (선명)</option>
            <option value="low">저사양 (빠름)</option>
          </select>
        </label>

        <label className="settings-row">
          <span>기본 페이지 레이아웃</span>
          <select
            value={settings.viewer.pageLayout}
            onChange={(e) => patchViewer('pageLayout', e.target.value as PageLayout)}
          >
            <option value="single">단일 페이지</option>
            <option value="continuous">연속 스크롤</option>
          </select>
        </label>

        <label className="settings-row">
          <span>기본 맞춤 모드</span>
          <select
            value={settings.viewer.defaultFitMode}
            onChange={(e) => patchViewer('defaultFitMode', e.target.value as FitMode)}
          >
            <option value="custom">사용자 지정 배율</option>
            <option value="fit-width">너비에 맞춤</option>
            <option value="fit-page">페이지에 맞춤</option>
            <option value="actual">실제 크기 (100%)</option>
          </select>
        </label>
      </section>

      <section className="panel">
        <h2>외부 도구</h2>
        <small className="muted">PATH에 등록되지 않은 경우 직접 경로를 지정할 수 있습니다.</small>

        <label className="settings-row">
          <span>qpdf 경로</span>
          <div className="settings-input-row">
            <input
              type="text"
              placeholder="자동 탐지 (PATH)"
              value={settings.externalTools.qpdfPath ?? ''}
              onChange={(e) => patchExternal('qpdfPath', e.target.value || null)}
            />
            <button type="button" onClick={() => pickFile('qpdf 실행파일 선택', settings.externalTools.qpdfPath, 'qpdf')}>
              찾아보기
            </button>
            {settings.externalTools.qpdfPath && (
              <button type="button" onClick={() => patchExternal('qpdfPath', null)}>지우기</button>
            )}
          </div>
        </label>

        <label className="settings-row">
          <span>tesseract 경로</span>
          <div className="settings-input-row">
            <input
              type="text"
              placeholder="자동 탐지 (PATH)"
              value={settings.externalTools.tesseractPath ?? ''}
              onChange={(e) => patchExternal('tesseractPath', e.target.value || null)}
            />
            <button type="button" onClick={() => pickFile('tesseract 실행파일 선택', settings.externalTools.tesseractPath, 'tesseract')}>
              찾아보기
            </button>
            {settings.externalTools.tesseractPath && (
              <button type="button" onClick={() => patchExternal('tesseractPath', null)}>지우기</button>
            )}
          </div>
        </label>
      </section>

      <section className="panel">
        <h2>출력</h2>

        <label className="settings-row">
          <span>기본 출력 폴더</span>
          <div className="settings-input-row">
            <input
              type="text"
              placeholder="작업별로 묻기"
              value={settings.output.defaultFolder ?? ''}
              onChange={(e) => patchOutput('defaultFolder', e.target.value || null)}
            />
            <button type="button" onClick={() => pickFolder(settings.output.defaultFolder)}>찾아보기</button>
            {settings.output.defaultFolder && (
              <button type="button" onClick={() => patchOutput('defaultFolder', null)}>지우기</button>
            )}
          </div>
        </label>

        <label className="settings-row settings-row-inline">
          <input
            type="checkbox"
            checked={settings.output.openFolderAfterJob}
            onChange={(e) => patchOutput('openFolderAfterJob', e.target.checked)}
          />
          <span>작업 완료 후 결과 폴더 자동 열기</span>
        </label>
      </section>

      <section className="panel">
        <h2>개인정보</h2>

        <label className="settings-row settings-row-inline">
          <input
            type="checkbox"
            checked={settings.privacy.recordRecentFiles}
            onChange={(e) => patchPrivacy('recordRecentFiles', e.target.checked)}
          />
          <span>최근 파일 기록</span>
        </label>

        <label className="settings-row">
          <span>최근 파일 최대 개수 ({settings.privacy.recentFilesLimit})</span>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={settings.privacy.recentFilesLimit}
            onChange={(e) => patchPrivacy('recentFilesLimit', parseInt(e.target.value, 10))}
            disabled={!settings.privacy.recordRecentFiles}
          />
        </label>

        <label className="settings-row">
          <span>임시 파일 정리</span>
          <select
            value={settings.privacy.tempCleanup}
            onChange={(e) => patchPrivacy('tempCleanup', e.target.value as TempCleanupMode)}
          >
            <option value="immediate">작업 직후 즉시</option>
            <option value="on-exit">앱 종료 시</option>
            <option value="never">유지</option>
          </select>
        </label>

        <div className="settings-actions">
          <button type="button" onClick={doClearRecent}>최근 파일 기록 모두 삭제</button>
          {appDataPath && (
            <button type="button" onClick={openDataFolder}>설정 폴더 열기</button>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>OCR</h2>
        <label className="settings-row">
          <span>기본 OCR 언어</span>
          <input
            type="text"
            placeholder="kor+eng"
            value={settings.ocr.defaultLanguage}
            onChange={(e) => patchOcr('defaultLanguage', e.target.value)}
          />
        </label>
        <small className="form-hint">
          여러 언어를 사용하려면 +로 구분 (예: kor+eng). 사용 가능 언어는 고급 기능 탭에서 확인 가능.
        </small>
      </section>

      <section className="panel">
        <h2>성능</h2>
        <label className="settings-row">
          <span>대용량 PDF 스트리밍 임계값 ({settings.performance.streamingThresholdMb} MB)</span>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={settings.performance.streamingThresholdMb}
            onChange={(e) => patchPerformance('streamingThresholdMb', parseInt(e.target.value, 10))}
          />
        </label>
        <small className="form-hint">
          이 크기를 넘는 PDF는 base64로 인코딩하지 않고 로컬 스트리밍으로 로드합니다 (메모리 절약).
        </small>
      </section>

      <section className="panel">
        <h2>업데이트</h2>
        <label className="settings-row settings-row-inline">
          <input
            type="checkbox"
            checked={settings.update.checkOnStartup}
            onChange={(e) => patchUpdate('checkOnStartup', e.target.checked)}
          />
          <span>시작 시 자동 업데이트 확인</span>
        </label>
      </section>

      <section className="panel">
        <h2>UI</h2>
        <label className="settings-row">
          <span>언어 (Language)</span>
          <select
            value={getLocale()}
            onChange={(e) => {
              setLocale(e.target.value as Locale);
              onStatus('언어를 변경했습니다. (일부 영역은 재시작 후 반영)');
            }}
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </label>
        <label className="settings-row">
          <span>테마</span>
          <select
            value={settings.ui.theme}
            onChange={(e) => patchUi('theme', e.target.value as ThemeMode)}
          >
            <option value="dark">다크</option>
            <option value="light">라이트</option>
            <option value="system">시스템 테마 따라가기</option>
          </select>
        </label>
        <label className="settings-row settings-row-inline">
          <input
            type="checkbox"
            checked={settings.ui.showShortcutHelp}
            onChange={(e) => patchUi('showShortcutHelp', e.target.checked)}
          />
          <span>상태바에 단축키 안내 표시</span>
        </label>
      </section>

      <section className="panel">
        <div className="settings-actions">
          <button type="button" onClick={doReset} className="primary">
            모든 설정 기본값으로 되돌리기
          </button>
        </div>
      </section>
    </div>
  );
}

function statusLabel(s: Status): string {
  if (s.kind === 'saving') return '저장 중…';
  if (s.kind === 'saved') return '저장됨';
  if (s.kind === 'error') return `오류: ${s.message ?? ''}`;
  return '';
}
