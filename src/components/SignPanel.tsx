import { useEffect, useMemo, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { applyFillAndSign, removeWhiteBackgroundFromDataUrl } from '../lib/fillSign';
import { readFileBytes } from '../lib/tauriCommands';
import { invoke } from '@tauri-apps/api/core';
import { maybeReveal } from '../lib/revealOutput';
import { t, useLocale } from '../i18n/messages';
import type { SavedSignature, SignTool, StampElement } from '../types';
import { SignatureDrawDialog } from './SignatureDrawDialog';

const SAVED_SIGNATURES_KEY = 'localpdf.savedSignatures.v1';

function loadSavedSignatures(): SavedSignature[] {
  try {
    const raw = localStorage.getItem(SAVED_SIGNATURES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SavedSignature =>
        s && typeof s.id === 'string' && typeof s.dataUrl === 'string' && (s.kind === 'drawn' || s.kind === 'image'),
    );
  } catch {
    return [];
  }
}

function persistSavedSignatures(sigs: SavedSignature[]) {
  try {
    localStorage.setItem(SAVED_SIGNATURES_KEY, JSON.stringify(sigs));
  } catch {
    // 용량 초과 등 비치명적
  }
}

async function readImageAsDataUrl(path: string): Promise<string> {
  const b64 = await readFileBytes(path);
  const ext = path.split('.').pop()?.toLowerCase() ?? 'png';
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${b64}`;
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SignPanel({
  file,
  stamps,
  setStamps,
  signModeEnabled,
  setSignModeEnabled,
  selectedTool,
  setSelectedTool,
  savedSignatures,
  setSavedSignatures,
  defaultFontSize,
  setDefaultFontSize,
  defaultColor,
  setDefaultColor,
  selectedStampId,
  onStatus,
}: {
  file: { path: string; fileName: string } | null;
  stamps: StampElement[];
  setStamps: React.Dispatch<React.SetStateAction<StampElement[]>>;
  signModeEnabled: boolean;
  setSignModeEnabled: (v: boolean) => void;
  selectedTool: SignTool | null;
  setSelectedTool: (t: SignTool | null) => void;
  savedSignatures: SavedSignature[];
  setSavedSignatures: React.Dispatch<React.SetStateAction<SavedSignature[]>>;
  defaultFontSize: number;
  setDefaultFontSize: (n: number) => void;
  defaultColor: string;
  setDefaultColor: (c: string) => void;
  selectedStampId: string | null;
  onStatus: (msg: string) => void;
}) {
  useLocale();
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flattenForm, setFlattenForm] = useState(true);
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    persistSavedSignatures(savedSignatures);
  }, [savedSignatures]);

  const selectedStamp = useMemo(
    () => stamps.find((s) => s.id === selectedStampId) ?? null,
    [stamps, selectedStampId],
  );

  function pickTool(tool: SignTool) {
    setSelectedTool(tool);
    setSignModeEnabled(true);
  }

  function clearTool() {
    setSelectedTool(null);
    setSignModeEnabled(false);
  }

  function handleSaveDrawnSignature(dataUrl: string) {
    const newSig: SavedSignature = {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: `${t('sign.signatures.draw')} ${savedSignatures.length + 1}`,
      kind: 'drawn',
      dataUrl,
      createdAt: new Date().toISOString(),
    };
    setSavedSignatures((prev) => [...prev, newSig]);
    setShowDrawDialog(false);
    pickTool({ kind: 'signature', signatureId: newSig.id });
  }

  async function handleImportSignature() {
    if (importBusy) return;
    setImportBusy(true);
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg'] }],
      });
      if (typeof selected !== 'string') return;
      let dataUrl = await readImageAsDataUrl(selected);
      if (autoRemoveBg) {
        try {
          dataUrl = await removeWhiteBackgroundFromDataUrl(dataUrl);
        } catch {
          // 배경 제거 실패는 무시하고 원본 사용
        }
      }
      const base = selected.split(/[\\/]/).pop() ?? 'image';
      const newSig: SavedSignature = {
        id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: base,
        kind: 'image',
        dataUrl,
        createdAt: new Date().toISOString(),
      };
      setSavedSignatures((prev) => [...prev, newSig]);
      pickTool({ kind: 'signature', signatureId: newSig.id });
    } catch (err) {
      onStatus(t('sign.image.failed', { message: (err as Error).message ?? String(err) }));
    } finally {
      setImportBusy(false);
    }
  }

  function removeSignature(id: string) {
    setSavedSignatures((prev) => prev.filter((s) => s.id !== id));
    if (selectedTool?.kind === 'signature' && selectedTool.signatureId === id) {
      clearTool();
    }
  }

  function patchSelectedStamp(patch: Partial<StampElement>) {
    if (!selectedStamp) return;
    setStamps((prev) => prev.map((s) => (s.id === selectedStamp.id ? { ...s, ...patch } : s)));
  }

  async function handleSave() {
    if (!file) return;
    if (stamps.length === 0 && !flattenForm) {
      onStatus(t('sign.save.nothing'));
      return;
    }
    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, '_signed.pdf'),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setSaving(true);
    onStatus(t('sign.save.saving'));
    try {
      await applyFillAndSign({
        inputFilePath: file.path,
        outputFilePath: outputPath,
        stamps,
        flattenForm,
        invokeFn: invoke,
      });
      onStatus(t('sign.save.success', { path: outputPath }));
      void maybeReveal(outputPath);
    } catch (err) {
      onStatus(t('sign.save.failed', { message: (err as Error).message ?? String(err) }));
    } finally {
      setSaving(false);
    }
  }

  if (!file) {
    return <p className="empty-text">{t('sign.panel.emptyClosed')}</p>;
  }

  const toolButtons: { tool: SignTool; labelKey: string }[] = [
    { tool: { kind: 'text' }, labelKey: 'sign.tool.text' },
    { tool: { kind: 'check' }, labelKey: 'sign.tool.check' },
    { tool: { kind: 'cross' }, labelKey: 'sign.tool.cross' },
    { tool: { kind: 'dot' }, labelKey: 'sign.tool.dot' },
    { tool: { kind: 'date' }, labelKey: 'sign.tool.date' },
  ];

  function isToolActive(tool: SignTool): boolean {
    if (!selectedTool) return false;
    if (selectedTool.kind !== tool.kind) return false;
    if (selectedTool.kind === 'signature' && tool.kind === 'signature') {
      return selectedTool.signatureId === tool.signatureId;
    }
    return true;
  }

  return (
    <div className="sign-panel">
      <section className="panel">
        <h2>{t('sign.panel.title')}</h2>
        <p className="muted">{t('sign.panel.desc')}</p>
      </section>

      <section className="panel">
        <h3>{t('sign.tool.section')}</h3>
        <div className="sign-tool-grid">
          {toolButtons.map(({ tool, labelKey }) => (
            <button
              key={tool.kind}
              type="button"
              className={`sign-tool-btn ${isToolActive(tool) ? 'active' : ''}`}
              onClick={() => pickTool(tool)}
            >
              {t(labelKey)}
            </button>
          ))}
          <button
            type="button"
            className={`sign-tool-btn ${selectedTool === null ? 'active' : ''}`}
            onClick={clearTool}
          >
            {t('sign.tool.none')}
          </button>
        </div>
        <p className="muted small">{t('sign.tool.placeHint')}</p>
      </section>

      <section className="panel">
        <h3>{t('sign.style.section')}</h3>
        <label className="form-label">
          {t('sign.style.fontSize')}
          <input
            type="number"
            className="form-input"
            min={6}
            max={96}
            value={defaultFontSize}
            onChange={(e) => setDefaultFontSize(Math.max(6, Math.min(96, parseInt(e.target.value, 10) || 14)))}
          />
        </label>
        <label className="form-label">
          {t('sign.style.color')}
          <input
            type="color"
            value={defaultColor}
            onChange={(e) => setDefaultColor(e.target.value)}
          />
        </label>
        {selectedStamp && (selectedStamp.type === 'text' || selectedStamp.type === 'date') && (
          <label className="form-label">
            {t('sign.style.text')}
            <input
              type="text"
              className="form-input"
              placeholder={t('sign.style.textPlaceholder')}
              value={selectedStamp.text}
              onChange={(e) => patchSelectedStamp({ text: e.target.value })}
            />
          </label>
        )}
      </section>

      <section className="panel">
        <h3>{t('sign.signatures.section')}</h3>
        {savedSignatures.length === 0 ? (
          <p className="muted small">{t('sign.signatures.empty')}</p>
        ) : (
          <div className="sign-signatures-list">
            {savedSignatures.map((sig) => {
              const active = selectedTool?.kind === 'signature' && selectedTool.signatureId === sig.id;
              return (
                <div key={sig.id} className={`sign-signature-card ${active ? 'active' : ''}`}>
                  <img src={sig.dataUrl} alt={sig.label} className="sign-signature-preview" />
                  <div className="sign-signature-meta">
                    <strong>{sig.label}</strong>
                    <small className="muted">{t('sign.signatures.created', { date: formatDateShort(sig.createdAt) })}</small>
                  </div>
                  <div className="sign-signature-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => pickTool({ kind: 'signature', signatureId: sig.id })}
                    >
                      {t('sign.signatures.use')}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSignature(sig.id)}
                    >
                      {t('sign.signatures.delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="sign-signature-creators">
          <button type="button" onClick={() => setShowDrawDialog(true)}>
            {t('sign.signatures.draw')}
          </button>
          <button type="button" onClick={handleImportSignature} disabled={importBusy}>
            {t('sign.signatures.import')}
          </button>
          <label className="form-label inline">
            <input
              type="checkbox"
              checked={autoRemoveBg}
              onChange={(e) => setAutoRemoveBg(e.target.checked)}
            />
            <span>{t('sign.signatures.removeBg')}</span>
          </label>
        </div>
      </section>

      <section className="panel">
        <h3>{t('sign.stamps.section', { count: stamps.length })}</h3>
        {stamps.length === 0 ? (
          <p className="muted small">{t('sign.stamps.empty')}</p>
        ) : (
          <ul className="sign-stamps-list">
            {stamps.map((s) => (
              <li key={s.id} className={selectedStampId === s.id ? 'active' : ''}>
                <small className="muted">{t('sign.stamps.page', { page: String(s.pageNumber) })}</small>
                <span>{s.type === 'imageSig' || s.type === 'drawnSig' ? '🖋️' : `“${s.text || ''}”`}</span>
              </li>
            ))}
          </ul>
        )}
        {stamps.length > 0 && (
          <button type="button" onClick={() => setStamps([])}>
            {t('sign.stamps.clearAll')}
          </button>
        )}
      </section>

      <section className="panel">
        <label className="form-label inline">
          <input
            type="checkbox"
            checked={flattenForm}
            onChange={(e) => setFlattenForm(e.target.checked)}
          />
          <span>{t('sign.save.flattenForm')}</span>
        </label>
        <button
          type="button"
          className="primary"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? t('sign.save.saving') : t('sign.save.button')}
        </button>
      </section>

      {showDrawDialog && (
        <SignatureDrawDialog
          onConfirm={handleSaveDrawnSignature}
          onCancel={() => setShowDrawDialog(false)}
        />
      )}
    </div>
  );
}
