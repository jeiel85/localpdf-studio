import type { Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useState } from 'react';

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
      onStatus('업데이트 다운로드 완료. 재시작하면 적용됩니다.');
    } catch (err) {
      const message = (err as Error).message ?? '업데이트 다운로드 중 오류가 발생했습니다.';
      onStatusChange({ kind: 'error', message });
      onStatus(`업데이트 실패: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleInstallAndRestart() {
    if (status.kind !== 'ready') return;
    setBusy(true);
    onStatus('업데이트 설치 중...');
    try {
      await status.update.install();
      await relaunch();
    } catch (err) {
      const message = (err as Error).message ?? '업데이트 설치 중 오류가 발생했습니다.';
      onStatusChange({ kind: 'error', message });
      onStatus(`업데이트 실패: ${message}`);
      setBusy(false);
    }
  }

  return (
    <div className="update-toast" role="alertdialog" aria-label="업데이트 알림">
      <button
        type="button"
        className="update-toast-close"
        aria-label="닫기"
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
      <strong className="update-toast-title">업데이트 가능</strong>
      <p className="update-toast-body">
        LocalPDF Studio의 새 버전(<b>{update.version}</b>)을 설치할 수 있습니다.
      </p>
      <div className="update-toast-actions">
        <button type="button" className="primary" disabled={busy} onClick={onDownload}>
          지금 다운로드
        </button>
        <button type="button" disabled={busy} onClick={onLater}>나중에</button>
      </div>
    </>
  );
}

function DownloadingView({ loaded, total }: { loaded: number; total: number }) {
  const percent = total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : 0;
  const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
  const totalMB = total > 0 ? (total / (1024 * 1024)).toFixed(1) : null;
  return (
    <>
      <strong className="update-toast-title">업데이트 다운로드 중…</strong>
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
      <strong className="update-toast-title">다운로드 완료</strong>
      <p className="update-toast-body">
        버전 {update.version} 준비 완료. 재시작하면 적용됩니다.
      </p>
      <div className="update-toast-actions">
        <button type="button" className="primary" disabled={busy} onClick={onRestart}>
          설치 및 다시 시작
        </button>
        <button type="button" disabled={busy} onClick={onLater}>나중에</button>
      </div>
    </>
  );
}

function ErrorView({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <>
      <strong className="update-toast-title">업데이트 오류</strong>
      <p className="update-toast-body update-toast-error">{message}</p>
      <div className="update-toast-actions">
        <button type="button" onClick={onDismiss}>닫기</button>
      </div>
    </>
  );
}
