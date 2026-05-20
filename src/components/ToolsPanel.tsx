import { useEffect, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { checkExternalTools, installQpdfAuto, installTesseractAuto, checkElevation } from '../lib/tauriCommands';
import { maybeReveal } from '../lib/revealOutput';
import type { ExternalToolStatus, PdfFilePayload } from '../types';
import { t, useLocale } from '../i18n/messages';

const TOOL_INSTALL_GUIDE: Record<string, { url: string; hintKey: string }> = {
  qpdf: {
    url: 'https://github.com/qpdf/qpdf/releases',
    hintKey: 'tools.qpdfHint',
  },
  tesseract: {
    url: 'https://github.com/UB-Mannheim/tesseract/wiki',
    hintKey: 'tools.tesseractHint',
  },
};

type ToolAction = 'encrypt' | 'decrypt' | 'extract' | 'rotate' | 'compress' | 'metadata';

export function ToolsPanel({
  currentFile,
  tools,
  onStatus,
  onToolsChange,
}: {
  currentFile: PdfFilePayload | null;
  tools: ExternalToolStatus[];
  onStatus: (message: string) => void;
  onToolsChange?: (next: ExternalToolStatus[]) => void;
}) {
  useLocale();
  const [activeAction, setActiveAction] = useState<ToolAction | null>(null);
  const [running, setRunning] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  async function recheckTools() {
    setRechecking(true);
    onStatus(t('tools.recheckStatus'));
    try {
      const next = await checkExternalTools();
      onToolsChange?.(next);
      const missing = next.filter((tool) => !tool.available).map((tool) => tool.displayName);
      onStatus(missing.length === 0
        ? t('tools.allInstalled')
        : t('tools.missing', { names: missing.join(', ') }));
    } catch (err) {
      onStatus(t('tools.recheckFailed', { message: (err as Error).message ?? String(err) }));
    } finally {
      setRechecking(false);
    }
  }

  async function handleOpenUrl(url: string) {
    try {
      await openUrl(url);
    } catch (err) {
      onStatus(t('tools.openLinkFailed', { message: (err as Error).message ?? String(err) }));
    }
  }

  async function handleAutoInstall(toolName: string) {
    setInstalling(toolName);
    setInstallError(null);

    try {
      if (toolName === 'qpdf') {
        onStatus(t('tools.qpdfInstalling'));
        const path = await installQpdfAuto();
        onStatus(t('tools.qpdfInstalled', { path }));
      } else if (toolName === 'tesseract') {
        const elevated = await checkElevation();
        if (!elevated) {
          const confirmed = await confirm(t('tools.tesseractAdminConfirm'));
          if (!confirmed) {
            setInstalling(null);
            return;
          }
        }
        onStatus(t('tools.tesseractInstalling'));
        const path = await installTesseractAuto();
        onStatus(t('tools.tesseractInstalled', { path }));
      }

      await recheckTools();
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      setInstallError(msg);
      onStatus(t('tools.installFailed', { name: toolName, message: msg }));
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div className="tools-panel">
      <section className="panel">
        <h2>{t('tools.pdfOps')}</h2>
        <div className="tool-actions">
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'encrypt' ? null : 'encrypt')}
          >
            {t('tools.encryptBtn')}
          </button>
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'decrypt' ? null : 'decrypt')}
          >
            {t('tools.decryptBtn')}
          </button>
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'extract' ? null : 'extract')}
          >
            {t('tools.extractBtn')}
          </button>
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'rotate' ? null : 'rotate')}
          >
            {t('tools.rotateBtn')}
          </button>
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'compress' ? null : 'compress')}
          >
            {t('tools.compressBtn')}
          </button>
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'metadata' ? null : 'metadata')}
          >
            {t('tools.metadataBtn')}
          </button>
        </div>
      </section>

      {activeAction && (
        <ActionPanel
          action={activeAction}
          currentFile={currentFile}
          running={running}
          onStart={(params) => executeAction(activeAction, params)}
          onClose={() => setActiveAction(null)}
          onStatus={onStatus}
          setRunning={setRunning}
        />
      )}

      <section className="panel">
        <div className="panel-header">
          <h2>{t('tools.externalTitle')}</h2>
          <button type="button" className="btn-small" disabled={rechecking} onClick={recheckTools}>
            {rechecking ? t('tools.recheckingBtn') : t('tools.recheckBtn')}
          </button>
        </div>
        {tools.length === 0 ? (
          <p className="empty-text">{t('tools.checkingStatus')}</p>
        ) : (
          tools.map((tool) => {
            const guide = TOOL_INSTALL_GUIDE[tool.name];
            return (
              <div className="tool-card" key={tool.name}>
                <div className="tool-row">
                  <span className={tool.available ? 'dot ok' : 'dot warn'} />
                  <div>
                    <strong>{tool.displayName}</strong>
                    {tool.available ? (
                      <>
                        <small>{tool.version ?? t('tools.noVersion')}</small>
                        <small className="tool-path">{tool.path}</small>
                      </>
                    ) : (
                      <small className="tool-missing">{t('tools.notInstalled')}</small>
                    )}
                    {tool.requiredFor.length > 0 && (
                      <small className="tool-required-for">{t('tools.requiredFor', { list: tool.requiredFor.join(', ') })}</small>
                    )}
                  </div>
                </div>
                {!tool.available && guide && (
                  <div className="tool-install">
                    {installError && installing === null && (
                      <p className="tool-install-error">{installError}</p>
                    )}
                    <div className="tool-install-actions">
                      {tool.name === 'qpdf' ? (
                        <button
                          type="button"
                          className="primary"
                          disabled={installing !== null}
                          onClick={() => handleAutoInstall('qpdf')}
                        >
                          {installing === 'qpdf' ? t('tools.installingBtn') : t('tools.autoInstall')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="primary"
                          disabled={installing !== null}
                          onClick={() => handleAutoInstall('tesseract')}
                        >
                          {installing === 'tesseract' ? t('tools.installingBtn') : t('tools.adminAutoInstall')}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={installing !== null}
                        onClick={() => handleOpenUrl(guide.url)}
                      >
                        {t('tools.manualDownload')}
                      </button>
                    </div>
                    <p className="tool-hint">{t(guide.hintKey)}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );

  async function executeAction(action: ToolAction, params: Record<string, string>) {
    if (!currentFile) return;

    setRunning(true);
    onStatus(t('tools.actionRunning', { action: actionLabel(action) }));

    try {
      switch (action) {
        case 'encrypt': {
          const outputPath = await saveOutput(`${currentFile.path.replace(/\.pdf$/i, '_encrypted.pdf')}`);
          if (!outputPath) { setRunning(false); return; }
          const result = await invoke<string>('encrypt_pdf', {
            inputFile: currentFile.path,
            outputPath,
            userPassword: params.userPassword,
            ownerPassword: params.ownerPassword,
          });
          onStatus(result);
          void maybeReveal(outputPath);
          break;
        }
        case 'decrypt': {
          const outputPath = await saveOutput(`${currentFile.path.replace(/\.pdf$/i, '_decrypted.pdf')}`);
          if (!outputPath) { setRunning(false); return; }
          const result = await invoke<string>('decrypt_pdf', {
            inputFile: currentFile.path,
            outputPath,
            password: params.password,
          });
          onStatus(result);
          void maybeReveal(outputPath);
          break;
        }
        case 'extract': {
          const outputPath = await saveOutput(`${currentFile.path.replace(/\.pdf$/i, '_extracted.pdf')}`);
          if (!outputPath) { setRunning(false); return; }
          const result = await invoke<string>('extract_pages', {
            inputFile: currentFile.path,
            outputPath,
            pageRange: params.pageRange,
          });
          onStatus(result);
          void maybeReveal(outputPath);
          break;
        }
        case 'rotate': {
          const outputPath = await saveOutput(`${currentFile.path.replace(/\.pdf$/i, '_rotated.pdf')}`);
          if (!outputPath) { setRunning(false); return; }
          const result = await invoke<string>('rotate_pages', {
            inputFile: currentFile.path,
            outputPath,
            angle: parseInt(params.angle, 10),
            pageRange: params.pageRange,
          });
          onStatus(result);
          void maybeReveal(outputPath);
          break;
        }
        case 'compress': {
          const outputPath = await saveOutput(`${currentFile.path.replace(/\.pdf$/i, '_compressed.pdf')}`);
          if (!outputPath) { setRunning(false); return; }
          const result = await invoke<string>('compress_pdf', {
            inputFile: currentFile.path,
            outputPath,
          });
          onStatus(result);
          void maybeReveal(outputPath);
          break;
        }
        case 'metadata': {
          const result = await invoke<string>('read_pdf_metadata', {
            inputFile: currentFile.path,
          });
          onStatus(t('tools.metadataDoneConsole'));
          console.log(JSON.parse(result));
          break;
        }
      }
    } catch (error) {
      onStatus(t('tools.actionFailed', { action: actionLabel(action), error: String(error) }));
    } finally {
      setRunning(false);
    }
  }
}

async function saveOutput(defaultPath: string): Promise<string | null> {
  const selected = await save({
    defaultPath,
    filters: [{ name: t('tools.fileFilter'), extensions: ['pdf'] }],
  });
  return typeof selected === 'string' ? selected : null;
}

function actionLabel(action: ToolAction): string {
  const labels: Record<ToolAction, string> = {
    encrypt: t('tools.actionEncrypt'),
    decrypt: t('tools.actionDecrypt'),
    extract: t('tools.actionExtract'),
    rotate: t('tools.actionRotate'),
    compress: t('tools.actionCompress'),
    metadata: t('tools.actionMetadata'),
  };
  return labels[action];
}

function ActionPanel({
  action,
  currentFile,
  running,
  onStart,
  onClose,
  onStatus,
  setRunning,
}: {
  action: ToolAction;
  currentFile: PdfFilePayload | null;
  running: boolean;
  onStart: (params: Record<string, string>) => void;
  onClose: () => void;
  onStatus: (message: string) => void;
  setRunning: (v: boolean) => void;
}) {
  switch (action) {
    case 'encrypt':
      return <EncryptForm running={running} onStart={onStart} onClose={onClose} />;
    case 'decrypt':
      return <DecryptForm running={running} onStart={onStart} onClose={onClose} />;
    case 'extract':
      return (
        <ExtractForm
          running={running}
          pageCount={currentFile ? undefined : 0}
          onStart={onStart}
          onClose={onClose}
        />
      );
    case 'rotate':
      return <RotateForm running={running} onStart={onStart} onClose={onClose} />;
    case 'compress':
      return <CompressForm running={running} onStart={onStart} onClose={onClose} />;
    case 'metadata':
      return <MetadataForm running={running} onStart={onStart} onClose={onClose} />;
  }
}

function EncryptForm({
  running,
  onStart,
  onClose,
}: {
  running: boolean;
  onStart: (p: Record<string, string>) => void;
  onClose: () => void;
}) {
  useLocale();
  const [userPass, setUserPass] = useState('');
  const [ownerPass, setOwnerPass] = useState('');

  return (
    <FormPanel title={t('tools.formEncryptTitle')} onClose={onClose}>
      <label className="form-label">
        {t('tools.userPassLabel')}
        <input
          type="password"
          className="form-input"
          value={userPass}
          onChange={(e) => setUserPass(e.target.value)}
          disabled={running}
          placeholder={t('tools.userPassPlaceholder')}
        />
      </label>
      <label className="form-label">
        {t('tools.ownerPassLabel')}
        <input
          type="password"
          className="form-input"
          value={ownerPass}
          onChange={(e) => setOwnerPass(e.target.value)}
          disabled={running}
          placeholder={t('tools.ownerPassPlaceholder')}
        />
      </label>
      <button
        type="button"
        className="primary"
        disabled={!userPass || running}
        onClick={() => onStart({ userPassword: userPass, ownerPassword: ownerPass })}
      >
        {running ? t('tools.processing') : t('tools.encryptRun')}
      </button>
    </FormPanel>
  );
}

function DecryptForm({
  running,
  onStart,
  onClose,
}: {
  running: boolean;
  onStart: (p: Record<string, string>) => void;
  onClose: () => void;
}) {
  useLocale();
  const [password, setPassword] = useState('');

  return (
    <FormPanel title={t('tools.formDecryptTitle')} onClose={onClose}>
      <label className="form-label">
        {t('tools.docPassLabel')}
        <input
          type="password"
          className="form-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={running}
          placeholder={t('tools.docPassPlaceholder')}
        />
      </label>
      <button
        type="button"
        className="primary"
        disabled={!password || running}
        onClick={() => onStart({ password })}
      >
        {running ? t('tools.processing') : t('tools.decryptRun')}
      </button>
    </FormPanel>
  );
}

function ExtractForm({
  running,
  onStart,
  onClose,
}: {
  running: boolean;
  pageCount?: number;
  onStart: (p: Record<string, string>) => void;
  onClose: () => void;
}) {
  useLocale();
  const [pageRange, setPageRange] = useState('');

  return (
    <FormPanel title={t('tools.formExtractTitle')} onClose={onClose}>
      <label className="form-label">
        {t('tools.pageRangeLabel')}
        <input
          type="text"
          className="form-input"
          value={pageRange}
          onChange={(e) => setPageRange(e.target.value)}
          disabled={running}
          placeholder={t('tools.extractPlaceholder')}
        />
        <small className="form-hint">
          {t('tools.extractHint')}
        </small>
      </label>
      <button
        type="button"
        className="primary"
        disabled={running}
        onClick={() => onStart({ pageRange })}
      >
        {running ? t('tools.processing') : t('tools.extractRun')}
      </button>
    </FormPanel>
  );
}

function RotateForm({
  running,
  onStart,
  onClose,
}: {
  running: boolean;
  onStart: (p: Record<string, string>) => void;
  onClose: () => void;
}) {
  useLocale();
  const [angle, setAngle] = useState('90');
  const [pageRange, setPageRange] = useState('');

  return (
    <FormPanel title={t('tools.formRotateTitle')} onClose={onClose}>
      <label className="form-label">
        {t('tools.angleLabel')}
        <select
          className="form-input"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          disabled={running}
        >
          <option value="90">{t('tools.angle90')}</option>
          <option value="180">{t('tools.angle180')}</option>
          <option value="270">{t('tools.angle270')}</option>
        </select>
      </label>
      <label className="form-label">
        {t('tools.pageRangeLabel')}
        <input
          type="text"
          className="form-input"
          value={pageRange}
          onChange={(e) => setPageRange(e.target.value)}
          disabled={running}
          placeholder={t('tools.rotatePlaceholder')}
        />
        <small className="form-hint">
          {t('tools.rotateHint')}
        </small>
      </label>
      <button
        type="button"
        className="primary"
        disabled={running}
        onClick={() => onStart({ angle, pageRange })}
      >
        {running ? t('tools.processing') : t('tools.rotateRun')}
      </button>
    </FormPanel>
  );
}

function CompressForm({
  running,
  onStart,
  onClose,
}: {
  running: boolean;
  onStart: (p: Record<string, string>) => void;
  onClose: () => void;
}) {
  useLocale();
  return (
    <FormPanel title={t('tools.formCompressTitle')} onClose={onClose}>
      <p className="form-description">
        {t('tools.compressDesc')}
      </p>
      <button
        type="button"
        className="primary"
        disabled={running}
        onClick={() => onStart({})}
      >
        {running ? t('tools.processing') : t('tools.compressRun')}
      </button>
    </FormPanel>
  );
}

function MetadataForm({
  running,
  onStart,
  onClose,
}: {
  running: boolean;
  onStart: (p: Record<string, string>) => void;
  onClose: () => void;
}) {
  useLocale();
  return (
    <FormPanel title={t('tools.formMetadataTitle')} onClose={onClose}>
      <p className="form-description">
        {t('tools.metadataDesc')}
      </p>
      <button
        type="button"
        className="primary"
        disabled={running}
        onClick={() => onStart({})}
      >
        {running ? t('tools.metadataReading') : t('tools.metadataRun')}
      </button>
    </FormPanel>
  );
}

function FormPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <section className="panel action-form-panel">
      <div className="form-header">
        <h2>{title}</h2>
        <button type="button" className="form-close-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      {children}
    </section>
  );
}
