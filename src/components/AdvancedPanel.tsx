import { useEffect, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

type AdvancedAction = 'ocr' | 'pdf-to-img' | 'pdf-to-txt' | 'img-to-pdf' | 'watermark' | 'stamp' | 'compare' | null;

export function AdvancedPanel({
  document,
  file,
  onStatus,
}: {
  document: PDFDocumentProxy | null;
  file: { path: string; fileName: string } | null;
  onStatus: (message: string) => void;
}) {
  const [action, setAction] = useState<AdvancedAction>(null);
  const [running, setRunning] = useState(false);
  const [tesseractInfo, setTesseractInfo] = useState<{
    available: boolean;
    languages: string[];
    version: string;
  } | null>(null);

  useEffect(() => {
    invoke<{ available: boolean; languages: string[]; version: string }>('check_tesseract_available')
      .then(setTesseractInfo)
      .catch(() => {});
  }, []);

  const actions = [
    { key: 'ocr' as const, label: 'OCR 텍스트 추출', needDoc: true, needTesseract: true },
    { key: 'pdf-to-img' as const, label: 'PDF → 이미지 변환', needDoc: true, needTesseract: false },
    { key: 'pdf-to-txt' as const, label: 'PDF → TXT 변환', needDoc: true, needTesseract: false },
    { key: 'img-to-pdf' as const, label: '이미지 → PDF 변환', needDoc: false, needTesseract: false },
    { key: 'watermark' as const, label: '워터마크 적용', needDoc: true, needTesseract: false },
    { key: 'stamp' as const, label: '스탬프 추가', needDoc: true, needTesseract: false },
    { key: 'compare' as const, label: '문서 비교', needDoc: true, needTesseract: false },
  ];

  return (
    <div className="advanced-panel">
      <section className="panel">
        <h2>OCR 상태</h2>
        {tesseractInfo ? (
          <div>
            <div className="tool-row">
              <span className={tesseractInfo.available ? 'dot ok' : 'dot warn'} />
              <div>
                <strong>Tesseract OCR</strong>
                <small>
                  {tesseractInfo.available
                    ? `${tesseractInfo.version} · 언어: ${tesseractInfo.languages.join(', ') || '없음'}`
                    : '설치 필요'}
                </small>
              </div>
            </div>
          </div>
        ) : (
          <p className="empty-text">확인 중...</p>
        )}
      </section>

      <section className="panel">
        <h2>고급 기능</h2>
        <div className="tool-actions">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={(a.needDoc && !document) || (a.needTesseract && !tesseractInfo?.available) || running}
              onClick={() => setAction(action === a.key ? null : a.key)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>

      {action && (
        <ActionForm
          action={action}
          document={document}
          file={file}
          running={running}
          tesseractInfo={tesseractInfo}
          onStatus={onStatus}
          onComplete={() => {
            setRunning(false);
            setAction(null);
          }}
          setRunning={setRunning}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  );
}

function ActionForm({
  action,
  document,
  file,
  running,
  tesseractInfo,
  onStatus,
  onComplete,
  setRunning,
  onClose,
}: {
  action: AdvancedAction;
  document: PDFDocumentProxy | null;
  file: { path: string; fileName: string } | null;
  running: boolean;
  tesseractInfo: { available: boolean; languages: string[] } | null;
  onStatus: (msg: string) => void;
  onComplete: () => void;
  setRunning: (v: boolean) => void;
  onClose: () => void;
}) {
  switch (action) {
    case 'ocr':
      return <OcrForm {...{ file, running, tesseractInfo, onStatus, onComplete, setRunning, onClose }} />;
    case 'pdf-to-img':
      return <PdfToImageForm {...{ document, file, running, onStatus, onComplete, setRunning, onClose }} />;
    case 'pdf-to-txt':
      return <PdfToTextForm {...{ document, file, running, onStatus, onComplete, setRunning, onClose }} />;
    case 'img-to-pdf':
      return <ImageToPdfForm {...{ running, onStatus, onComplete, setRunning, onClose }} />;
    case 'watermark':
      return <WatermarkForm {...{ file, isStamp: false, running, onStatus, onComplete, setRunning, onClose }} />;
    case 'stamp':
      return <WatermarkForm {...{ file, isStamp: true, running, onStatus, onComplete, setRunning, onClose }} />;
    case 'compare':
      return <CompareForm {...{ document, file, running, onStatus, onComplete, setRunning, onClose }} />;
    default:
      return null;
  }
}

function FormPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <section className="panel action-form-panel">
      <div className="form-header">
        <h2>{title}</h2>
        <button type="button" className="form-close-btn" onClick={onClose}>✕</button>
      </div>
      {children}
    </section>
  );
}

function OcrForm({
  file, running, tesseractInfo, onStatus, onComplete, setRunning, onClose,
}: {
  file: { path: string; fileName: string } | null;
  running: boolean;
  tesseractInfo: { languages: string[] } | null;
  onStatus: (msg: string) => void;
  onComplete: () => void;
  setRunning: (v: boolean) => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState('kor+eng');
  const [dpi, setDpi] = useState('300');

  async function run() {
    if (!file) return;
    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, '_ocr'),
      filters: [{ name: '텍스트 파일', extensions: ['txt'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus('OCR 처리 중...');
    try {
      const result = await invoke<string>('run_ocr', {
        inputFile: file.path,
        outputFile: outputPath,
        language: lang,
        dpi: parseInt(dpi, 10),
      });
      onStatus(result);
      onComplete();
    } catch (e) {
      onStatus(`OCR 실패: ${e}`);
      setRunning(false);
    }
  }

  return (
    <FormPanel title="OCR 텍스트 추출" onClose={onClose}>
      <label className="form-label">
        언어
        <input className="form-input" value={lang} onChange={(e) => setLang(e.target.value)}
          placeholder="kor+eng" disabled={running} />
        <small className="form-hint">
          사용 가능: {tesseractInfo?.languages.join(', ') ?? '알 수 없음'}
        </small>
      </label>
      <label className="form-label">
        DPI
        <input className="form-input" type="number" value={dpi} onChange={(e) => setDpi(e.target.value)}
          disabled={running} />
      </label>
      <button className="primary" disabled={!file || running} onClick={run}>
        {running ? '처리 중...' : 'OCR 실행'}
      </button>
    </FormPanel>
  );
}

function PdfToImageForm({
  document, file, running, onStatus, onComplete, setRunning, onClose,
}: {
  document: PDFDocumentProxy | null;
  file: { path: string; fileName: string } | null;
  running: boolean;
  onStatus: (msg: string) => void;
  onComplete: () => void;
  setRunning: (v: boolean) => void;
  onClose: () => void;
}) {
  const [pageRange, setPageRange] = useState('1');
  const [format, setFormat] = useState('png');

  async function run() {
    if (!document || !file) return;
    setRunning(true);
    onStatus('이미지 변환 중...');

    try {
      const pages = parsePageRange(pageRange, document.numPages);
      for (const pageNum of pages) {
        const page = await document.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = window.document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvas, viewport }).promise;

        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b: Blob | null) => resolve(b!), `image/${format}`)
        );

        const arrayBuffer = await blob.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        const base64 = btoa(String.fromCharCode(...bytes));
        const outPath = file.path.replace(/\.pdf$/i, `_p${pageNum}.${format}`);

        await invoke('save_text_file', { path: outPath, content: base64 });
        onStatus(`페이지 ${pageNum}/${pages.length} 저장 완료`);
      }
      onStatus(`이미지 변환 완료 (${pages.length}페이지)`);
      onComplete();
    } catch (e) {
      onStatus(`변환 실패: ${e}`);
      setRunning(false);
    }
  }

  return (
    <FormPanel title="PDF → 이미지 변환" onClose={onClose}>
      <label className="form-label">
        페이지
        <input className="form-input" value={pageRange} onChange={(e) => setPageRange(e.target.value)}
          placeholder="1 (단일 페이지)" disabled={running} />
      </label>
      <label className="form-label">
        형식
        <select className="form-input" value={format} onChange={(e) => setFormat(e.target.value)} disabled={running}>
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
      </label>
      <button className="primary" disabled={!document || running} onClick={run}>
        {running ? '변환 중...' : '이미지로 저장'}
      </button>
    </FormPanel>
  );
}

function PdfToTextForm({
  document, file, running, onStatus, onComplete, setRunning, onClose,
}: {
  document: PDFDocumentProxy | null;
  file: { path: string; fileName: string } | null;
  running: boolean;
  onStatus: (msg: string) => void;
  onComplete: () => void;
  setRunning: (v: boolean) => void;
  onClose: () => void;
}) {
  async function run() {
    if (!document || !file) return;

    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, '.txt'),
      filters: [{ name: '텍스트 파일', extensions: ['txt'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus('텍스트 추출 중...');

    try {
      const lines: string[] = [];
      for (let i = 1; i <= document.numPages; i++) {
        const page = await document.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: unknown) => (item as { str?: string }).str ?? '')
          .join(' ');
        lines.push(`--- 페이지 ${i} ---`, pageText, '');
        onStatus(`페이지 ${i}/${document.numPages} 추출 중...`);
      }

      await invoke('save_text_file', { path: outputPath, content: lines.join('\n') });
      onStatus(`텍스트 추출 완료: ${outputPath}`);
      onComplete();
    } catch (e) {
      onStatus(`추출 실패: ${e}`);
      setRunning(false);
    }
  }

  return (
    <FormPanel title="PDF → TXT 변환" onClose={onClose}>
      <p className="form-description">현재 문서의 모든 페이지에서 텍스트를 추출하여 TXT 파일로 저장합니다.</p>
      <button className="primary" disabled={!document || running} onClick={run}>
        {running ? '추출 중...' : 'TXT로 저장'}
      </button>
    </FormPanel>
  );
}

function ImageToPdfForm({
  running, onStatus, onComplete, setRunning, onClose,
}: {
  running: boolean;
  onStatus: (msg: string) => void;
  onComplete: () => void;
  setRunning: (v: boolean) => void;
  onClose: () => void;
}) {
  async function run() {
    const selected = await open({
      multiple: true,
      directory: false,
      filters: [{ name: '이미지 파일', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
    });
    if (!selected) return;

    const imagePaths = Array.isArray(selected) ? selected : [selected];
    if (imagePaths.length === 0) return;

    const outputPath = await save({
      defaultPath: 'converted.pdf',
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus('이미지 → PDF 변환 중...');

    try {
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < imagePaths.length; i++) {
        const imgPath = imagePaths[i];
        const response = await fetch(`pdf-local://localhost/${imgPath.replace(/\\/g, '/')}`);
        const arrayBuffer = await response.arrayBuffer();

        const ext = imgPath.split('.').pop()?.toLowerCase();
        let image;
        if (ext === 'png') image = await pdfDoc.embedPng(arrayBuffer);
        else if (ext === 'jpg' || ext === 'jpeg') image = await pdfDoc.embedJpg(arrayBuffer);
        else continue;

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        onStatus(`이미지 ${i + 1}/${imagePaths.length} 추가 중...`);
      }

      const pdfBytes = await pdfDoc.save();
      const base64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(pdfBytes))));
      await invoke('save_text_file', { path: outputPath, content: base64 });
      onStatus(`이미지 → PDF 변환 완료: ${outputPath}`);
      onComplete();
    } catch (e) {
      onStatus(`변환 실패: ${e}`);
      setRunning(false);
    }
  }

  return (
    <FormPanel title="이미지 → PDF 변환" onClose={onClose}>
      <p className="form-description">
        여러 이미지를 선택하여 하나의 PDF로 변환합니다. 각 이미지가 PDF의 한 페이지가 됩니다.
        지원: PNG, JPEG, WebP
      </p>
      <button className="primary" disabled={running} onClick={run}>
        {running ? '변환 중...' : '이미지 선택 후 변환'}
      </button>
    </FormPanel>
  );
}

function WatermarkForm({
  file, isStamp, running, onStatus, onComplete, setRunning, onClose,
}: {
  file: { path: string; fileName: string } | null;
  isStamp: boolean;
  running: boolean;
  onStatus: (msg: string) => void;
  onComplete: () => void;
  setRunning: (v: boolean) => void;
  onClose: () => void;
}) {
  async function run() {
    if (!file) return;

    const overlayFile = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'PDF 파일', extensions: ['pdf'] }],
    });
    if (typeof overlayFile !== 'string') return;

    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, isStamp ? '_stamped.pdf' : '_watermarked.pdf'),
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus(isStamp ? '스탬프 적용 중...' : '워터마크 적용 중...');

    try {
      const cmd = isStamp ? 'apply_stamp' : 'apply_watermark';
      const result = await invoke<string>(cmd, {
        inputFile: file.path,
        [isStamp ? 'stampFile' : 'watermarkFile']: overlayFile,
        outputPath,
      });
      onStatus(result);
      onComplete();
    } catch (e) {
      onStatus(`실패: ${e}`);
      setRunning(false);
    }
  }

  const label = isStamp ? '스탬프 추가' : '워터마크 적용';
  const desc = isStamp
    ? 'PDF 파일을 선택하여 각 페이지 아래에 스탬프로 추가합니다.'
    : 'PDF 파일을 선택하여 각 페이지 위에 워터마크로 덮습니다.';

  return (
    <FormPanel title={label} onClose={onClose}>
      <p className="form-description">{desc}</p>
      <button className="primary" disabled={!file || running} onClick={run}>
        {running ? '처리 중...' : isStamp ? '스탬프 PDF 선택' : '워터마크 PDF 선택'}
      </button>
    </FormPanel>
  );
}

function CompareForm({
  document, file, running, onStatus, onComplete, setRunning, onClose,
}: {
  document: PDFDocumentProxy | null;
  file: { path: string; fileName: string } | null;
  running: boolean;
  onStatus: (msg: string) => void;
  onComplete: () => void;
  setRunning: (v: boolean) => void;
  onClose: () => void;
}) {
  async function run() {
    if (!document || !file) return;

    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (typeof selected !== 'string') return;

    setRunning(true);
    onStatus('문서 비교 중...');

    try {
      const text1 = await extractAllText(document);
      const { pdfjsLib } = await import('../lib/pdfjs');
      const bytes = await invoke<{ base64Data: string }>('load_pdf_base64', { path: selected });
      const { base64ToUint8Array } = await import('../lib/base64');
      const data = base64ToUint8Array(bytes.base64Data);
      const loadingTask = pdfjsLib.getDocument({ data });
      const doc2 = await loadingTask.promise;
      const text2 = await extractAllText(doc2);
      doc2.destroy();

      const diff = computeDiff(text1, text2);
      const outputPath = file.path.replace(/\.pdf$/i, '_diff.txt');
      const diffText = [
        `비교: ${file.fileName} ↔ ${selected.split(/[/\\]/).pop()}`,
        '',
        '--- 차이점 ---',
        diff.diffLines.join('\n'),
        '',
        `추가된 줄: ${diff.added}, 제거된 줄: ${diff.removed}`,
      ].join('\n');

      await invoke('save_text_file', { path: outputPath, content: diffText });
      onStatus(`비교 완료: ${outputPath}`);
      onComplete();
    } catch (e) {
      onStatus(`비교 실패: ${e}`);
      setRunning(false);
    }
  }

  return (
    <FormPanel title="문서 비교" onClose={onClose}>
      <p className="form-description">
        다른 PDF를 선택해 현재 문서와 텍스트 내용을 비교합니다. 차이점은 TXT 파일로 저장됩니다.
      </p>
      <button className="primary" disabled={!document || running} onClick={run}>
        {running ? '비교 중...' : '비교할 PDF 선택'}
      </button>
    </FormPanel>
  );
}

async function extractAllText(document: PDFDocumentProxy): Promise<string[]> {
  const lines: string[] = [];
  for (let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i);
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      const str = (item as { str?: string }).str;
      if (str) lines.push(str);
    }
  }
  return lines;
}

function computeDiff(lines1: string[], lines2: string[]): { diffLines: string[]; added: number; removed: number } {
  const diffLines: string[] = [];
  let added = 0;
  let removed = 0;
  const maxLen = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLen; i++) {
    if (i >= lines1.length) {
      diffLines.push(`+ ${lines2[i]}`);
      added++;
    } else if (i >= lines2.length) {
      diffLines.push(`- ${lines1[i]}`);
      removed++;
    } else if (lines1[i] !== lines2[i]) {
      diffLines.push(`- ${lines1[i]}`);
      diffLines.push(`+ ${lines2[i]}`);
      removed++;
      added++;
    }
  }
  return { diffLines, added, removed };
}

function parsePageRange(range: string, maxPage: number): number[] {
  const pages: number[] = [];
  const parts = range.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return [1];

  for (const part of parts) {
    if (part.includes('-')) {
      const [s, e] = part.split('-').map(Number);
      const start = Math.max(1, Math.min(s, e));
      const end = Math.min(maxPage, Math.max(s, e));
      for (let i = start; i <= end; i++) pages.push(i);
    } else {
      const n = Number(part);
      if (n >= 1 && n <= maxPage) pages.push(n);
    }
  }
  return [...new Set(pages)].sort((a, b) => a - b);
}
