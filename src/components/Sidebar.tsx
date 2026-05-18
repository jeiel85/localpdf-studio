import type { ExternalToolStatus, PdfFilePayload } from '../types';
import { formatBytes } from '../lib/base64';

export function Sidebar({
  document,
  tools,
  onOperation,
}: {
  document: PdfFilePayload | null;
  tools: ExternalToolStatus[];
  onOperation: (operation: string) => void;
}) {
  return (
    <div className="sidebar-inner">
      <h1>LocalPDF Studio</h1>
      <p className="muted">로컬 우선 PDF 데스크톱 앱</p>

      <section className="panel">
        <h2>문서</h2>
        {document ? (
          <div className="doc-card">
            <strong>{document.fileName}</strong>
            <span>{formatBytes(document.sizeBytes)}</span>
            <small title={document.path}>{document.path}</small>
          </div>
        ) : (
          <p className="empty-text">PDF를 열면 문서 정보가 표시됩니다.</p>
        )}
      </section>

      <section className="panel">
        <h2>작업</h2>
        <button type="button" disabled={!document} onClick={() => onOperation('split')}>분할</button>
        <button type="button" disabled={!document} onClick={() => onOperation('compress')}>압축</button>
        <button type="button" disabled={!document} onClick={() => onOperation('ocr')}>OCR</button>
        <button type="button" disabled={!document} onClick={() => onOperation('encrypt')}>암호화</button>
        <button type="button" disabled={!document} onClick={() => onOperation('metadata')}>메타데이터</button>
      </section>

      <section className="panel">
        <h2>외부 도구</h2>
        {tools.length === 0 ? (
          <p className="empty-text">도구 상태를 확인 중입니다.</p>
        ) : tools.map((tool) => (
          <div className="tool-row" key={tool.name}>
            <span className={tool.available ? 'dot ok' : 'dot warn'} />
            <div>
              <strong>{tool.displayName}</strong>
              <small>{tool.available ? tool.path : '설치 필요'}</small>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
