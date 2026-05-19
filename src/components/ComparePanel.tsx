import { useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfjsLib } from '../lib/pdfjs';
import { base64ToUint8Array } from '../lib/base64';
import { loadPdfBase64 } from '../lib/tauriCommands';
import { pdfRenderQueue } from '../lib/renderQueue';

export function ComparePanel({
  currentFile,
  onStatus,
}: {
  currentFile: { path: string; fileName: string } | null;
  onStatus: (msg: string) => void;
}) {
  const [leftDoc, setLeftDoc] = useState<PDFDocumentProxy | null>(null);
  const [rightDoc, setRightDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [diffPages, setDiffPages] = useState<Set<number>>(new Set());
  const leftCanvas = useRef<HTMLCanvasElement | null>(null);
  const rightCanvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!currentFile) {
      if (leftDoc) {
        leftDoc.destroy();
        setLeftDoc(null);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const payload = await loadPdfBase64(currentFile.path);
        const bytes = base64ToUint8Array(payload.base64Data);
        const task = pdfjsLib.getDocument({
          data: bytes,
          useSystemFonts: true,
          // @ts-expect-error isEvalSupported is supported at runtime
          isEvalSupported: false,
        });
        const doc = await task.promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        setLeftDoc(doc);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentFile]);

  async function pickRight() {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (typeof selected !== 'string') return;
    setLoading(true);
    try {
      const payload = await loadPdfBase64(selected);
      const bytes = base64ToUint8Array(payload.base64Data);
      const task = pdfjsLib.getDocument({
        data: bytes,
        useSystemFonts: true,
        // @ts-expect-error isEvalSupported is supported at runtime
        isEvalSupported: false,
      });
      const doc = await task.promise;
      if (rightDoc) rightDoc.destroy();
      setRightDoc(doc);
      setPage(1);
      setDiffPages(new Set());
      onStatus(`비교 대상 로드 완료: ${selected.split(/[/\\]/).pop()}`);
    } catch (err) {
      onStatus(`로드 실패: ${(err as Error).message ?? err}`);
    } finally {
      setLoading(false);
    }
  }

  async function computeTextDiff() {
    if (!leftDoc || !rightDoc) return;
    setLoading(true);
    onStatus('페이지별 텍스트 차이 분석 중...');
    try {
      const pages = Math.max(leftDoc.numPages, rightDoc.numPages);
      const differences = new Set<number>();
      for (let i = 1; i <= pages; i++) {
        const l = i <= leftDoc.numPages ? await pageText(leftDoc, i) : null;
        const r = i <= rightDoc.numPages ? await pageText(rightDoc, i) : null;
        if (l !== r) differences.add(i);
      }
      setDiffPages(differences);
      onStatus(`차이 분석 완료: ${differences.size}개 페이지가 다릅니다.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!leftDoc || !rightDoc) return;
    const ph = page;
    void renderPage(leftDoc, ph, leftCanvas.current);
    void renderPage(rightDoc, ph, rightCanvas.current);
  }, [leftDoc, rightDoc, page]);

  if (!currentFile) {
    return <p className="empty-text">PDF를 열면 분할 뷰 비교를 시작할 수 있습니다.</p>;
  }

  return (
    <div className="compare-panel">
      <section className="panel">
        <h2>분할 뷰 비교</h2>
        <p className="muted">{currentFile.fileName} ↔ {rightDoc ? '비교 대상 로드됨' : '비교 대상 미선택'}</p>
        <div className="compare-actions">
          <button type="button" onClick={pickRight} disabled={loading}>
            비교 대상 선택...
          </button>
          <button type="button" onClick={computeTextDiff} disabled={!rightDoc || loading}>
            차이 분석
          </button>
        </div>
        {leftDoc && rightDoc && (
          <div className="compare-paginator">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}>이전</button>
            <span>
              페이지 {page} / {Math.max(leftDoc.numPages, rightDoc.numPages)}
              {diffPages.has(page) && <span className="diff-badge">차이 있음</span>}
            </span>
            <button type="button" onClick={() => setPage((p) => Math.min(Math.max(leftDoc.numPages, rightDoc.numPages), p + 1))}>다음</button>
          </div>
        )}
        {rightDoc && diffPages.size > 0 && (
          <div className="diff-page-list">
            <small className="form-hint">차이 페이지:</small>
            {Array.from(diffPages).sort((a, b) => a - b).map((p) => (
              <button key={p} type="button" className="diff-page-chip" onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="panel compare-canvases">
        <div className="compare-pane">
          <small className="muted">왼쪽: {currentFile.fileName}</small>
          <canvas ref={leftCanvas} className="pdf-canvas" />
        </div>
        <div className="compare-pane">
          <small className="muted">오른쪽: 비교 대상</small>
          <canvas ref={rightCanvas} className="pdf-canvas" />
        </div>
      </section>
    </div>
  );
}

async function pageText(doc: PDFDocumentProxy, page: number): Promise<string> {
  try {
    const p = await doc.getPage(page);
    const tc = await p.getTextContent();
    return tc.items.map((it: unknown) => (it as { str?: string }).str ?? '').join(' ').trim();
  } catch {
    return '';
  }
}

async function renderPage(doc: PDFDocumentProxy, page: number, canvas: HTMLCanvasElement | null) {
  if (!canvas || page < 1 || page > doc.numPages) {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    return;
  }
  await pdfRenderQueue.enqueue(async (shouldCancel) => {
    if (shouldCancel()) return null;
    const p = await doc.getPage(page);
    if (shouldCancel()) return null;
    const viewport = p.getViewport({ scale: 0.7 });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await p.render({ canvas, canvasContext: ctx, viewport }).promise;
    return null;
  }).promise;
}
