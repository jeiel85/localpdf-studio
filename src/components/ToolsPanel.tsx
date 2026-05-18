import { useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { ExternalToolStatus, PdfFilePayload } from '../types';

type ToolAction = 'encrypt' | 'decrypt' | 'extract' | 'rotate' | 'compress' | 'metadata';

export function ToolsPanel({
  currentFile,
  tools,
  onStatus,
}: {
  currentFile: PdfFilePayload | null;
  tools: ExternalToolStatus[];
  onStatus: (message: string) => void;
}) {
  const [activeAction, setActiveAction] = useState<ToolAction | null>(null);
  const [running, setRunning] = useState(false);

  return (
    <div className="tools-panel">
      <section className="panel">
        <h2>PDF 작업</h2>
        <div className="tool-actions">
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'encrypt' ? null : 'encrypt')}
          >
            암호 설정
          </button>
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'decrypt' ? null : 'decrypt')}
          >
            암호 해제
          </button>
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'extract' ? null : 'extract')}
          >
            페이지 추출
          </button>
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'rotate' ? null : 'rotate')}
          >
            페이지 회전 저장
          </button>
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'compress' ? null : 'compress')}
          >
            압축
          </button>
          <button
            type="button"
            disabled={!currentFile}
            onClick={() => setActiveAction(activeAction === 'metadata' ? null : 'metadata')}
          >
            메타데이터 보기
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
        <h2>외부 도구</h2>
        {tools.length === 0 ? (
          <p className="empty-text">도구 상태를 확인 중입니다.</p>
        ) : (
          tools.map((tool) => (
            <div className="tool-row" key={tool.name}>
              <span className={tool.available ? 'dot ok' : 'dot warn'} />
              <div>
                <strong>{tool.displayName}</strong>
                <small>{tool.available ? tool.path : '설치 필요'}</small>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );

  async function executeAction(action: ToolAction, params: Record<string, string>) {
    if (!currentFile) return;

    setRunning(true);
    onStatus(`${actionLabel(action)} 작업 중...`);

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
          break;
        }
        case 'metadata': {
          const result = await invoke<string>('read_pdf_metadata', {
            inputFile: currentFile.path,
          });
          onStatus('메타데이터 확인 완료 (콘솔에서 확인)');
          console.log(JSON.parse(result));
          break;
        }
      }
    } catch (error) {
      onStatus(`${actionLabel(action)} 실패: ${error}`);
    } finally {
      setRunning(false);
    }
  }
}

async function saveOutput(defaultPath: string): Promise<string | null> {
  const selected = await save({
    defaultPath,
    filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
  });
  return typeof selected === 'string' ? selected : null;
}

function actionLabel(action: ToolAction): string {
  const labels: Record<ToolAction, string> = {
    encrypt: '암호화',
    decrypt: '복호화',
    extract: '페이지 추출',
    rotate: '페이지 회전',
    compress: 'PDF 압축',
    metadata: '메타데이터 읽기',
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
  const [userPass, setUserPass] = useState('');
  const [ownerPass, setOwnerPass] = useState('');

  return (
    <FormPanel title="PDF 암호 설정" onClose={onClose}>
      <label className="form-label">
        사용자 암호 (문서 열기)
        <input
          type="password"
          className="form-input"
          value={userPass}
          onChange={(e) => setUserPass(e.target.value)}
          disabled={running}
          placeholder="문서를 열 때 필요한 암호"
        />
      </label>
      <label className="form-label">
        소유자 암호 (권한 제어)
        <input
          type="password"
          className="form-input"
          value={ownerPass}
          onChange={(e) => setOwnerPass(e.target.value)}
          disabled={running}
          placeholder="인쇄/복사 제한용 암호 (사용자 암호와 다르게)"
        />
      </label>
      <button
        type="button"
        className="primary"
        disabled={!userPass || running}
        onClick={() => onStart({ userPassword: userPass, ownerPassword: ownerPass })}
      >
        {running ? '처리 중...' : '암호화 실행'}
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
  const [password, setPassword] = useState('');

  return (
    <FormPanel title="PDF 암호 해제" onClose={onClose}>
      <label className="form-label">
        문서 암호
        <input
          type="password"
          className="form-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={running}
          placeholder="문서 암호를 입력하세요"
        />
      </label>
      <button
        type="button"
        className="primary"
        disabled={!password || running}
        onClick={() => onStart({ password })}
      >
        {running ? '처리 중...' : '복호화 실행'}
      </button>
    </FormPanel>
  );
}

function ExtractForm({
  running,
  pageCount,
  onStart,
  onClose,
}: {
  running: boolean;
  pageCount?: number;
  onStart: (p: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [pageRange, setPageRange] = useState('');

  return (
    <FormPanel title="페이지 추출" onClose={onClose}>
      <label className="form-label">
        페이지 범위
        <input
          type="text"
          className="form-input"
          value={pageRange}
          onChange={(e) => setPageRange(e.target.value)}
          disabled={running}
          placeholder="예: 1-5, 1,3,5-7 (빈 칸=전체)"
        />
        <small className="form-hint">
          첫 페이지를 1로 하는 범위입니다. 예: 2-4 (2~4페이지), 1,3 (1,3페이지)
        </small>
      </label>
      <button
        type="button"
        className="primary"
        disabled={running}
        onClick={() => onStart({ pageRange })}
      >
        {running ? '처리 중...' : '페이지 추출'}
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
  const [angle, setAngle] = useState('90');
  const [pageRange, setPageRange] = useState('');

  return (
    <FormPanel title="페이지 회전 저장" onClose={onClose}>
      <label className="form-label">
        회전 각도
        <select
          className="form-input"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          disabled={running}
        >
          <option value="90">90° (시계방향)</option>
          <option value="180">180°</option>
          <option value="270">270° (반시계방향)</option>
        </select>
      </label>
      <label className="form-label">
        페이지 범위
        <input
          type="text"
          className="form-input"
          value={pageRange}
          onChange={(e) => setPageRange(e.target.value)}
          disabled={running}
          placeholder="예: 1-5 (빈 칸=전체)"
        />
        <small className="form-hint">
          빈 칸으로 두면 전체 페이지에 적용됩니다.
        </small>
      </label>
      <button
        type="button"
        className="primary"
        disabled={running}
        onClick={() => onStart({ angle, pageRange })}
      >
        {running ? '처리 중...' : '회전 저장'}
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
  return (
    <FormPanel title="PDF 압축" onClose={onClose}>
      <p className="form-description">
        qpdf의 linearize 및 object stream 최적화로 PDF를 압축합니다.
        저장 경로를 선택하세요.
      </p>
      <button
        type="button"
        className="primary"
        disabled={running}
        onClick={() => onStart({})}
      >
        {running ? '처리 중...' : '압축 실행'}
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
  return (
    <FormPanel title="메타데이터 확인" onClose={onClose}>
      <p className="form-description">
        qpdf --json 명령으로 PDF 메타데이터를 JSON 형식으로 읽습니다.
        결과는 콘솔(DevTools)에서 확인할 수 있습니다.
      </p>
      <button
        type="button"
        className="primary"
        disabled={running}
        onClick={() => onStart({})}
      >
        {running ? '읽는 중...' : '메타데이터 읽기'}
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
