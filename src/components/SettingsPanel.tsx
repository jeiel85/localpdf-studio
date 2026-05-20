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
import { LOCALES, getLocale, setLocale, t, useLocale, type Locale } from '../i18n/messages';

type Status = { kind: 'idle' | 'saving' | 'saved' | 'error'; message?: string };

export function SettingsPanel({ onStatus }: { onStatus: (message: string) => void }) {
  useLocale();
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
      .catch((err) => onStatus(t('settings.loadFailed', { message: (err as Error).message ?? String(err) })));
  }, [onStatus]);

  async function save(next: AppSettings) {
    setSettings(next);
    setStatus({ kind: 'saving' });
    try {
      const saved = await updateSettings(next);
      setSettings(saved);
      setStatus({ kind: 'saved' });
      onStatus(t('settings.saved'));
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      setStatus({ kind: 'error', message });
      onStatus(t('settings.saveFailed', { message }));
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
      title: t('settings.pickOutFolderTitle'),
      directory: true,
      multiple: false,
      defaultPath: currentValue ?? undefined,
    });
    if (typeof selected === 'string') patchOutput('defaultFolder', selected);
  }

  async function doReset() {
    if (!confirm(t('settings.confirmReset'))) return;
    try {
      const restored = await resetSettings();
      setSettings(restored);
      onStatus(t('settings.resetDone'));
    } catch (err) {
      onStatus(t('settings.resetFailed', { message: (err as Error).message ?? String(err) }));
    }
  }

  async function doClearRecent() {
    if (!confirm(t('settings.confirmClearRecent'))) return;
    try {
      await clearRecentFiles();
      onStatus(t('settings.recentCleared'));
    } catch (err) {
      onStatus(t('settings.clearFailed', { message: (err as Error).message ?? String(err) }));
    }
  }

  async function openDataFolder() {
    if (!appDataPath) return;
    try {
      await openPath(appDataPath);
    } catch (err) {
      onStatus(t('settings.openFolderFailed', { message: (err as Error).message ?? String(err) }));
    }
  }

  if (!loaded) {
    return <p className="empty-text">{t('settings.loading')}</p>;
  }

  return (
    <div className="settings-panel" data-testid="settings-panel">
      <section className="panel">
        <div className="panel-header">
          <h2>{t('settings.viewer')}</h2>
          <span className="settings-status">{statusLabel(status)}</span>
        </div>

        <label className="settings-row">
          <span>{t('settings.initialZoomMode')}</span>
          <select
            value={settings.viewer.initialZoomMode}
            onChange={(e) => patchViewer('initialZoomMode', e.target.value as ViewerZoomMode)}
          >
            <option value="custom">{t('settings.zoomCustom')}</option>
            <option value="fit-width">{t('settings.zoomFitWidth')}</option>
            <option value="fit-height">{t('settings.zoomFitHeight')}</option>
          </select>
        </label>

        <label className="settings-row">
          <span>{t('settings.customScale', { scale: settings.viewer.initialScale.toFixed(2) })}</span>
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
          <span>{t('settings.wheelAction')}</span>
          <select
            value={settings.viewer.wheelAction}
            onChange={(e) => patchViewer('wheelAction', e.target.value as WheelAction)}
          >
            <option value="scroll">{t('settings.wheelScroll')}</option>
            <option value="zoom">{t('settings.wheelZoom')}</option>
          </select>
        </label>

        <label className="settings-row">
          <span>{t('settings.rotationStep')}</span>
          <select
            value={settings.viewer.rotationStep}
            onChange={(e) => patchViewer('rotationStep', parseInt(e.target.value, 10))}
          >
            <option value="90">90°</option>
            <option value="180">180°</option>
          </select>
        </label>

        <label className="settings-row">
          <span>{t('settings.renderQuality')}</span>
          <select
            value={settings.viewer.renderQuality}
            onChange={(e) => patchViewer('renderQuality', e.target.value as RenderQuality)}
          >
            <option value="auto">{t('settings.qualityAuto')}</option>
            <option value="high">{t('settings.qualityHigh')}</option>
            <option value="low">{t('settings.qualityLow')}</option>
          </select>
        </label>

        <label className="settings-row">
          <span>{t('settings.pageLayout')}</span>
          <select
            value={settings.viewer.pageLayout}
            onChange={(e) => patchViewer('pageLayout', e.target.value as PageLayout)}
          >
            <option value="single">{t('settings.layoutSingle')}</option>
            <option value="continuous">{t('settings.layoutContinuous')}</option>
          </select>
        </label>

        <label className="settings-row">
          <span>{t('settings.defaultFitMode')}</span>
          <select
            value={settings.viewer.defaultFitMode}
            onChange={(e) => patchViewer('defaultFitMode', e.target.value as FitMode)}
          >
            <option value="custom">{t('settings.zoomCustom')}</option>
            <option value="fit-width">{t('settings.zoomFitWidth')}</option>
            <option value="fit-page">{t('settings.zoomFitPage')}</option>
            <option value="actual">{t('settings.zoomActual')}</option>
          </select>
        </label>
      </section>

      <section className="panel">
        <h2>{t('settings.external')}</h2>
        <small className="muted">{t('settings.externalHint')}</small>

        <label className="settings-row">
          <span>{t('settings.qpdfPath')}</span>
          <div className="settings-input-row">
            <input
              type="text"
              placeholder={t('settings.autoDetect')}
              value={settings.externalTools.qpdfPath ?? ''}
              onChange={(e) => patchExternal('qpdfPath', e.target.value || null)}
            />
            <button type="button" onClick={() => pickFile(t('settings.pickQpdfTitle'), settings.externalTools.qpdfPath, 'qpdf')}>
              {t('settings.browse')}
            </button>
            {settings.externalTools.qpdfPath && (
              <button type="button" onClick={() => patchExternal('qpdfPath', null)}>{t('settings.clear')}</button>
            )}
          </div>
        </label>

        <label className="settings-row">
          <span>{t('settings.tesseractPath')}</span>
          <div className="settings-input-row">
            <input
              type="text"
              placeholder={t('settings.autoDetect')}
              value={settings.externalTools.tesseractPath ?? ''}
              onChange={(e) => patchExternal('tesseractPath', e.target.value || null)}
            />
            <button type="button" onClick={() => pickFile(t('settings.pickTesseractTitle'), settings.externalTools.tesseractPath, 'tesseract')}>
              {t('settings.browse')}
            </button>
            {settings.externalTools.tesseractPath && (
              <button type="button" onClick={() => patchExternal('tesseractPath', null)}>{t('settings.clear')}</button>
            )}
          </div>
        </label>
      </section>

      <section className="panel">
        <h2>{t('settings.output')}</h2>

        <label className="settings-row">
          <span>{t('settings.defaultOutFolder')}</span>
          <div className="settings-input-row">
            <input
              type="text"
              placeholder={t('settings.askPerJob')}
              value={settings.output.defaultFolder ?? ''}
              onChange={(e) => patchOutput('defaultFolder', e.target.value || null)}
            />
            <button type="button" onClick={() => pickFolder(settings.output.defaultFolder)}>{t('settings.browse')}</button>
            {settings.output.defaultFolder && (
              <button type="button" onClick={() => patchOutput('defaultFolder', null)}>{t('settings.clear')}</button>
            )}
          </div>
        </label>

        <label className="settings-row settings-row-inline">
          <input
            type="checkbox"
            checked={settings.output.openFolderAfterJob}
            onChange={(e) => patchOutput('openFolderAfterJob', e.target.checked)}
          />
          <span>{t('settings.openFolderAfter')}</span>
        </label>
      </section>

      <section className="panel">
        <h2>{t('settings.privacy')}</h2>

        <label className="settings-row settings-row-inline">
          <input
            type="checkbox"
            checked={settings.privacy.recordRecentFiles}
            onChange={(e) => patchPrivacy('recordRecentFiles', e.target.checked)}
          />
          <span>{t('settings.recordRecent')}</span>
        </label>

        <label className="settings-row">
          <span>{t('settings.recentLimit', { count: settings.privacy.recentFilesLimit })}</span>
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
          <span>{t('settings.tempCleanup')}</span>
          <select
            value={settings.privacy.tempCleanup}
            onChange={(e) => patchPrivacy('tempCleanup', e.target.value as TempCleanupMode)}
          >
            <option value="immediate">{t('settings.tempImmediate')}</option>
            <option value="on-exit">{t('settings.tempOnExit')}</option>
            <option value="never">{t('settings.tempNever')}</option>
          </select>
        </label>

        <div className="settings-actions">
          <button type="button" onClick={doClearRecent}>{t('settings.clearRecentBtn')}</button>
          {appDataPath && (
            <button type="button" onClick={openDataFolder}>{t('settings.openDataFolder')}</button>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>{t('settings.ocr')}</h2>
        <label className="settings-row">
          <span>{t('settings.defaultOcrLang')}</span>
          <input
            type="text"
            placeholder="kor+eng"
            value={settings.ocr.defaultLanguage}
            onChange={(e) => patchOcr('defaultLanguage', e.target.value)}
          />
        </label>
        <small className="form-hint">
          {t('settings.ocrLangHint')}
        </small>
      </section>

      <section className="panel">
        <h2>{t('settings.performance')}</h2>
        <label className="settings-row">
          <span>{t('settings.streamingThreshold', { mb: settings.performance.streamingThresholdMb })}</span>
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
          {t('settings.streamingHint')}
        </small>
      </section>

      <section className="panel">
        <h2>{t('settings.updates')}</h2>
        <label className="settings-row settings-row-inline">
          <input
            type="checkbox"
            checked={settings.update.checkOnStartup}
            onChange={(e) => patchUpdate('checkOnStartup', e.target.checked)}
          />
          <span>{t('settings.checkOnStartup')}</span>
        </label>
      </section>

      <section className="panel">
        <h2>{t('settings.ui')}</h2>
        <label className="settings-row">
          <span>{t('settings.language')}</span>
          <select
            value={getLocale()}
            onChange={(e) => {
              setLocale(e.target.value as Locale);
              onStatus(t('settings.languageChanged'));
            }}
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </label>
        <label className="settings-row">
          <span>{t('settings.theme')}</span>
          <select
            value={settings.ui.theme}
            onChange={(e) => patchUi('theme', e.target.value as ThemeMode)}
          >
            <option value="dark">{t('settings.themeDark')}</option>
            <option value="light">{t('settings.themeLight')}</option>
            <option value="system">{t('settings.themeSystem')}</option>
          </select>
        </label>
        <label className="settings-row settings-row-inline">
          <input
            type="checkbox"
            checked={settings.ui.showShortcutHelp}
            onChange={(e) => patchUi('showShortcutHelp', e.target.checked)}
          />
          <span>{t('settings.showShortcutHelp')}</span>
        </label>
      </section>

      <section className="panel">
        <div className="settings-actions">
          <button type="button" onClick={doReset} className="primary">
            {t('settings.resetBtn')}
          </button>
        </div>
      </section>
    </div>
  );
}

function statusLabel(s: Status): string {
  if (s.kind === 'saving') return t('settings.statusSaving');
  if (s.kind === 'saved') return t('settings.statusSaved');
  if (s.kind === 'error') return t('settings.statusError', { message: s.message ?? '' });
  return '';
}
