import { useEffect, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { pdfRenderQueue } from '../lib/renderQueue';

function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type AdvancedAction =
  | 'ocr'
  | 'ocr-searchable'
  | 'image-ocr'
  | 'pdf-to-img'
  | 'pdf-to-txt'
  | 'img-to-pdf'
  | 'watermark'
  | 'stamp'
  | 'compare'
  | 'highlight'
  | 'normalize'
  | null;

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
    { key: 'ocr-searchable' as const, label: 'OCR → 검색 가능 PDF', needDoc: true, needTesseract: true },
    { key: 'image-ocr' as const, label: '이미지 OCR (PNG/JPG → 텍스트)', needDoc: false, needTesseract: true },
    { key: 'pdf-to-img' as const, label: 'PDF → 이미지 변환', needDoc: true, needTesseract: false },
    { key: 'pdf-to-txt' as const, label: 'PDF → TXT 변환', needDoc: true, needTesseract: false },
    { key: 'img-to-pdf' as const, label: '이미지 → PDF 변환', needDoc: false, needTesseract: false },
    { key: 'watermark' as const, label: '워터마크 적용', needDoc: true, needTesseract: false },
    { key: 'stamp' as const, label: '스탬프 추가', needDoc: true, needTesseract: false },
    { key: 'compare' as const, label: '문서 비교 (TXT diff)', needDoc: true, needTesseract: false },
    { key: 'highlight' as const, label: '주석 (페이지별 하이라이트)', needDoc: true, needTesseract: false },
    { key: 'normalize' as const, label: 'PDF 정규화 (qpdf)', needDoc: true, needTesseract: false },
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
    case 'ocr-searchable':
      return <SearchablePdfForm {...{ document, file, running, tesseractInfo, onStatus, onComplete, setRunning, onClose }} />;
    case 'image-ocr':
      return <ImageOcrForm {...{ running, tesseractInfo, onStatus, onComplete, setRunning, onClose }} />;
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
    case 'highlight':
      return <HighlightForm {...{ document, file, running, onStatus, onComplete, setRunning, onClose }} />;
    case 'normalize':
      return <NormalizeForm {...{ file, running, onStatus, onComplete, setRunning, onClose }} />;
    default:
      return null;
  }
}

function FormPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
      let completed = 0;
      for (const pageNum of pages) {
        const result = await pdfRenderQueue.enqueue<Blob>(async (shouldCancel) => {
          if (shouldCancel()) return null as unknown as Blob;
          const page = await document.getPage(pageNum);
          if (shouldCancel()) return null as unknown as Blob;
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = window.document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (shouldCancel()) return null as unknown as Blob;
          return await new Promise<Blob>((resolve) =>
            canvas.toBlob((b: Blob | null) => resolve(b!), `image/${format}`),
          );
        }).promise;
        if (!result) continue;

        const arrayBuffer = await result.arrayBuffer();
        const base64 = uint8ToBase64(new Uint8Array(arrayBuffer));
        const outPath = file.path.replace(/\.pdf$/i, `_p${pageNum}.${format}`);

        await invoke('save_binary_file', { path: outPath, base64Data: base64 });
        completed += 1;
        onStatus(`페이지 ${completed}/${pages.length} 저장 완료`);
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
        const ext = imgPath.split('.').pop()?.toLowerCase();
        if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') {
          onStatus(`지원하지 않는 형식 건너뜀: ${imgPath}`);
          continue;
        }

        const b64 = await invoke<string>('read_file_bytes', { path: imgPath });
        const arrayBuffer = base64ToUint8Array(b64);

        const image =
          ext === 'png'
            ? await pdfDoc.embedPng(arrayBuffer)
            : await pdfDoc.embedJpg(arrayBuffer);

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        onStatus(`이미지 ${i + 1}/${imagePaths.length} 추가 중...`);
      }

      const pdfBytes = await pdfDoc.save();
      const base64 = uint8ToBase64(pdfBytes);
      await invoke('save_binary_file', { path: outputPath, base64Data: base64 });
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
      const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        // @ts-expect-error isEvalSupported is supported at runtime
        isEvalSupported: false,
      });
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

function HighlightForm({
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
  const [pageList, setPageList] = useState('1');
  const [color, setColor] = useState<'yellow' | 'green' | 'pink' | 'blue'>('yellow');
  const [position, setPosition] = useState<'top' | 'middle' | 'bottom'>('top');

  async function run() {
    if (!document || !file) return;
    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, '_highlighted.pdf'),
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus('하이라이트 적용 중...');
    try {
      const pages = parsePageRange(pageList, document.numPages);
      if (pages.length === 0) {
        throw new Error('하이라이트할 페이지가 없습니다.');
      }
      const b64 = await invoke<string>('read_file_bytes', { path: file.path });
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const colorMap = {
        yellow: { r: 1, g: 0.95, b: 0.3 },
        green: { r: 0.5, g: 0.95, b: 0.5 },
        pink: { r: 1, g: 0.6, b: 0.85 },
        blue: { r: 0.55, g: 0.78, b: 1 },
      };
      const rgb = colorMap[color];
      const docPages = doc.getPages();
      for (const pageNum of pages) {
        const page = docPages[pageNum - 1];
        if (!page) continue;
        const { width, height } = page.getSize();
        const bandHeight = height * 0.06;
        const y =
          position === 'top'
            ? height - bandHeight - 20
            : position === 'middle'
              ? (height - bandHeight) / 2
              : 20;
        page.drawRectangle({
          x: 20,
          y,
          width: width - 40,
          height: bandHeight,
          color: { type: 'RGB', red: rgb.r, green: rgb.g, blue: rgb.b } as never,
          opacity: 0.35,
        });
      }
      const out = await doc.save();
      const outB64 = uint8ToBase64(out);
      await invoke('save_binary_file', { path: outputPath, base64Data: outB64 });
      onStatus(`하이라이트 적용 완료: ${outputPath}`);
      onComplete();
    } catch (e) {
      onStatus(`하이라이트 실패: ${e}`);
      setRunning(false);
    }
  }

  return (
    <FormPanel title="페이지별 하이라이트" onClose={onClose}>
      <p className="form-description">
        지정한 페이지에 색상 띠를 추가합니다. 빠른 메모/강조 용도이며 본격적인 텍스트 주석은 추후 지원 예정입니다.
      </p>
      <label className="form-label">
        대상 페이지
        <input className="form-input" value={pageList} onChange={(e) => setPageList(e.target.value)}
          placeholder="예: 1-3, 5" disabled={running} />
      </label>
      <label className="form-label">
        색상
        <select className="form-input" value={color} onChange={(e) => setColor(e.target.value as never)} disabled={running}>
          <option value="yellow">노랑</option>
          <option value="green">초록</option>
          <option value="pink">분홍</option>
          <option value="blue">파랑</option>
        </select>
      </label>
      <label className="form-label">
        위치
        <select className="form-input" value={position} onChange={(e) => setPosition(e.target.value as never)} disabled={running}>
          <option value="top">상단</option>
          <option value="middle">중앙</option>
          <option value="bottom">하단</option>
        </select>
      </label>
      <button className="primary" disabled={!document || running} onClick={run}>
        {running ? '처리 중...' : '하이라이트 적용'}
      </button>
    </FormPanel>
  );
}

function NormalizeForm({
  file, running, onStatus, onComplete, setRunning, onClose,
}: {
  file: { path: string; fileName: string } | null;
  running: boolean;
  onStatus: (msg: string) => void;
  onComplete: () => void;
  setRunning: (v: boolean) => void;
  onClose: () => void;
}) {
  async function run() {
    if (!file) return;
    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, '_normalized.pdf'),
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus('PDF 정규화 중...');
    try {
      const result = await invoke<string>('normalize_pdf', {
        inputFile: file.path,
        outputPath,
      });
      onStatus(result);
      onComplete();
    } catch (e) {
      onStatus(`정규화 실패: ${e}`);
      setRunning(false);
    }
  }

  return (
    <FormPanel title="PDF 정규화" onClose={onClose}>
      <p className="form-description">
        qpdf로 linearize + object stream + 미참조 리소스 제거를 수행합니다.
        완전한 PDF/A 변환은 Ghostscript 별도 도구가 필요합니다.
      </p>
      <button className="primary" disabled={!file || running} onClick={run}>
        {running ? '처리 중...' : '정규화 실행'}
      </button>
    </FormPanel>
  );
}

function SearchablePdfForm({
  document, file, running, tesseractInfo, onStatus, onComplete, setRunning, onClose,
}: {
  document: PDFDocumentProxy | null;
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
    if (!document || !file) return;
    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, '_searchable.pdf'),
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus('PDF 페이지를 이미지로 렌더링 중...');

    const tempImagePaths: string[] = [];
    try {
      const scale = Math.max(1, parseInt(dpi, 10) / 72);
      const baseTemp = file.path.replace(/\.pdf$/i, '_lpdf_ocr_tmp');
      for (let i = 1; i <= document.numPages; i++) {
        onStatus(`렌더링 ${i}/${document.numPages}...`);
        const blob = await pdfRenderQueue.enqueue<Blob>(async (shouldCancel) => {
          if (shouldCancel()) return null as unknown as Blob;
          const page = await document.getPage(i);
          if (shouldCancel()) return null as unknown as Blob;
          const viewport = page.getViewport({ scale });
          const canvas = window.document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (shouldCancel()) return null as unknown as Blob;
          return await new Promise<Blob>((resolve) =>
            canvas.toBlob((b: Blob | null) => resolve(b!), 'image/png'),
          );
        }).promise;
        if (!blob) continue;
        const buf = await blob.arrayBuffer();
        const b64 = uint8ToBase64(new Uint8Array(buf));
        const imgPath = `${baseTemp}_p${i}.png`;
        await invoke('save_binary_file', { path: imgPath, base64Data: b64 });
        tempImagePaths.push(imgPath);
      }

      onStatus('Tesseract로 검색 가능 PDF 생성 중...');
      const result = await invoke<string>('run_ocr_searchable_pdf', {
        imagePaths: tempImagePaths,
        outputPdf: outputPath,
        language: lang,
      });
      onStatus(result);
      onComplete();
    } catch (e) {
      onStatus(`Searchable PDF 실패: ${e}`);
      setRunning(false);
    } finally {
      // 임시 이미지 정리
      for (const p of tempImagePaths) {
        try {
          await invoke('delete_file_if_exists', { path: p });
        } catch {
          // ignore
        }
      }
    }
  }

  return (
    <FormPanel title="OCR → 검색 가능 PDF" onClose={onClose}>
      <p className="form-description">
        PDF 페이지를 이미지로 렌더링 후 Tesseract로 텍스트 레이어를 합성한 PDF를 생성합니다.
        스캔 문서를 검색 가능한 PDF로 변환할 때 사용하세요.
      </p>
      <label className="form-label">
        언어
        <input className="form-input" value={lang} onChange={(e) => setLang(e.target.value)}
          placeholder="kor+eng" disabled={running} />
        <small className="form-hint">
          사용 가능: {tesseractInfo?.languages.join(', ') ?? '알 수 없음'}
        </small>
      </label>
      <label className="form-label">
        DPI (해상도)
        <input className="form-input" type="number" value={dpi} onChange={(e) => setDpi(e.target.value)}
          disabled={running} />
        <small className="form-hint">200~400 권장. 높을수록 정확도 향상 (속도 저하)</small>
      </label>
      <button className="primary" disabled={!document || running} onClick={run}>
        {running ? '처리 중...' : '검색 가능 PDF 생성'}
      </button>
    </FormPanel>
  );
}

function ImageOcrForm({
  running, tesseractInfo, onStatus, onComplete, setRunning, onClose,
}: {
  running: boolean;
  tesseractInfo: { languages: string[] } | null;
  onStatus: (msg: string) => void;
  onComplete: () => void;
  setRunning: (v: boolean) => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState('kor+eng');

  async function run() {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff'] }],
    });
    if (typeof selected !== 'string') return;

    const outputPath = await save({
      defaultPath: selected.replace(/\.[^.]+$/i, '_ocr.txt'),
      filters: [{ name: '텍스트 파일', extensions: ['txt'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus('이미지 OCR 중...');
    try {
      const result = await invoke<string>('run_ocr', {
        inputFile: selected,
        outputFile: outputPath,
        language: lang,
        dpi: 0,
      });
      onStatus(result);
      onComplete();
    } catch (e) {
      onStatus(`이미지 OCR 실패: ${e}`);
      setRunning(false);
    }
  }

  return (
    <FormPanel title="이미지 OCR" onClose={onClose}>
      <p className="form-description">
        단일 이미지 파일(PNG/JPG/WEBP/BMP/TIFF)에서 텍스트를 추출하여 TXT로 저장합니다.
      </p>
      <label className="form-label">
        언어
        <input className="form-input" value={lang} onChange={(e) => setLang(e.target.value)}
          placeholder="kor+eng" disabled={running} />
        <small className="form-hint">
          사용 가능: {tesseractInfo?.languages.join(', ') ?? '알 수 없음'}
        </small>
      </label>
      <button className="primary" disabled={running} onClick={run}>
        {running ? '처리 중...' : '이미지 선택 후 OCR'}
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
