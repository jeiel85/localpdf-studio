import type { Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useState } from 'react';
import { t, useLocale } from '../i18n/messages';

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'available'; update: Update }
  | { kind: 'downloading'; update: Update; loaded: number; total: number }
  | { kind: 'ready'; update: Update }
  | { kind: 'error'; message: string };

export function UpdateNotification({
  status,
  onStatusChange,
  onDismiss,
  onStatus,
}: {
  status: UpdateStatus;
  onStatusChange: (next: UpdateStatus) => void;
  onDismiss: () => void;
  onStatus: (message: string) => void;
}) {
  useLocale();
  const [busy, setBusy] = useState(false);

  if (status.kind === 'idle') return null;

  async function handleDownload() {
    if (status.kind !== 'available') return;
    const update = status.update;
    setBusy(true);
    let loaded = 0;
    let total = 0;
    onStatusChange({ kind: 'downloading', update, loaded: 0, total: 0 });
    try {
      await update.download((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
          onStatusChange({ kind: 'downloading', update, loaded: 0, total });
        } else if (event.event === 'Progress') {
          loaded += event.data.chunkLength;
          onStatusChange({ kind: 'downloading', update, loaded, total });
        }
      });
      onStatusChange({ kind: 'ready', update });
      onStatus(t('update.downloadDone'));
    } catch (err) {
      const message = (err as Error).message ?? t('update.errDownload');
      onStatusChange({ kind: 'error', message });
      onStatus(t('update.failedPrefix', { message }));
    } finally {
      setBusy(false);
    }
  }

  async function handleInstallAndRestart() {
    if (status.kind !== 'ready') return;
    setBusy(true);
    onStatus(t('update.installing'));
    try {
      await status.update.install();
      await relaunch();
    } catch (err) {
      const message = (err as Error).message ?? t('update.errInstall');
      onStatusChange({ kind: 'error', message });
      onStatus(t('update.failedPrefix', { message }));
      setBusy(false);
    }
  }

  return (
    <div className="update-toast" role="alertdialog" aria-label={t('update.notificationLabel')}>
      <button
        type="button"
        className="update-toast-close"
        aria-label={t('common.close')}
        onClick={onDismiss}
        disabled={status.kind === 'downloading'}
      >
        ×
      </button>

      {status.kind === 'available' && <AvailableView update={status.update} busy={busy} onDownload={handleDownload} onLater={onDismiss} />}
      {status.kind === 'downloading' && <DownloadingView loaded={status.loaded} total={status.total} />}
      {status.kind === 'ready' && <ReadyView update={status.update} busy={busy} onRestart={handleInstallAndRestart} onLater={onDismiss} />}
      {status.kind === 'error' && <ErrorView message={status.message} onDismiss={onDismiss} />}
    </div>
  );
}

function AvailableView({ update, busy, onDownload, onLater }: { update: Update; busy: boolean; onDownload: () => void; onLater: () => void }) {
  return (
    <>
      <strong className="update-toast-title">{t('update.available')}</strong>
      <p
        className="update-toast-body"
        dangerouslySetInnerHTML={{
          __html: t('update.availableBody', { version: `<b>${escapeHtml(update.version)}</b>` }),
        }}
      />
      <div className="update-toast-actions">
        <button type="button" className="primary" disabled={busy} onClick={onDownload}>
          {t('update.download')}
        </button>
        <button type="button" disabled={busy} onClick={onLater}>{t('update.later')}</button>
      </div>
    </>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

function DownloadingView({ loaded, total }: { loaded: number; total: number }) {
  const percent = total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : 0;
  const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
  const totalMB = total > 0 ? (total / (1024 * 1024)).toFixed(1) : null;
  return (
    <>
      <strong className="update-toast-title">{t('update.downloading')}</strong>
      <p className="update-toast-body">
        {totalMB ? `${loadedMB} MB / ${totalMB} MB (${percent}%)` : `${loadedMB} MB`}
      </p>
      <div className="update-progress-track">
        <div
          className="update-progress-bar"
          style={{ width: total > 0 ? `${percent}%` : '50%' }}
          data-indeterminate={total > 0 ? 'false' : 'true'}
        />
      </div>
    </>
  );
}

function ReadyView({ update, busy, onRestart, onLater }: { update: Update; busy: boolean; onRestart: () => void; onLater: () => void }) {
  return (
    <>
      <strong className="update-toast-title">{t('update.downloadComplete')}</strong>
      <p className="update-toast-body">
        {t('update.readyBody', { version: update.version })}
      </p>
      <div className="update-toast-actions">
        <button type="button" className="primary" disabled={busy} onClick={onRestart}>
          {t('update.installRestart')}
        </button>
        <button type="button" disabled={busy} onClick={onLater}>{t('update.later')}</button>
      </div>
    </>
  );
}

function ErrorView({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <>
      <strong className="update-toast-title">{t('update.error')}</strong>
      <p className="update-toast-body update-toast-error">{message}</p>
      <div className="update-toast-actions">
        <button type="button" onClick={onDismiss}>{t('common.close')}</button>
      </div>
    </>
  );
}
