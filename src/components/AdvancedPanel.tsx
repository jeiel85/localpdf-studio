import { useEffect, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { pdfRenderQueue } from '../lib/renderQueue';
import { t, useLocale } from '../i18n/messages';
import type { PageSelection } from '../lib/textSelection';

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
  lastSelection,
}: {
  document: PDFDocumentProxy | null;
  file: { path: string; fileName: string } | null;
  onStatus: (message: string) => void;
  lastSelection?: PageSelection | null;
}) {
  useLocale();
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
    { key: 'ocr' as const, label: t('adv.btn.ocr'), needDoc: true, needTesseract: true },
    { key: 'ocr-searchable' as const, label: t('adv.btn.ocrSearchable'), needDoc: true, needTesseract: true },
    { key: 'image-ocr' as const, label: t('adv.btn.imageOcr'), needDoc: false, needTesseract: true },
    { key: 'pdf-to-img' as const, label: t('adv.btn.pdfToImg'), needDoc: true, needTesseract: false },
    { key: 'pdf-to-txt' as const, label: t('adv.btn.pdfToTxt'), needDoc: true, needTesseract: false },
    { key: 'img-to-pdf' as const, label: t('adv.btn.imgToPdf'), needDoc: false, needTesseract: false },
    { key: 'watermark' as const, label: t('adv.btn.watermark'), needDoc: true, needTesseract: false },
    { key: 'stamp' as const, label: t('adv.btn.stamp'), needDoc: true, needTesseract: false },
    { key: 'compare' as const, label: t('adv.btn.compare'), needDoc: true, needTesseract: false },
    { key: 'highlight' as const, label: t('adv.btn.highlight'), needDoc: true, needTesseract: false },
    { key: 'normalize' as const, label: t('adv.btn.normalize'), needDoc: true, needTesseract: false },
  ];

  return (
    <div className="advanced-panel">
      <section className="panel">
        <h2>{t('adv.ocrStatus')}</h2>
        {tesseractInfo ? (
          <div>
            <div className="tool-row">
              <span className={tesseractInfo.available ? 'dot ok' : 'dot warn'} />
              <div>
                <strong>{t('adv.tesseractOcr')}</strong>
                <small>
                  {tesseractInfo.available
                    ? t('adv.tesseractInfo', {
                        version: tesseractInfo.version,
                        languages: tesseractInfo.languages.join(', ') || t('adv.noLang'),
                      })
                    : t('adv.installNeeded')}
                </small>
              </div>
            </div>
          </div>
        ) : (
          <p className="empty-text">{t('adv.checking')}</p>
        )}
      </section>

      <section className="panel">
        <h2>{t('adv.advTitle')}</h2>
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
          lastSelection={lastSelection ?? null}
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
  lastSelection,
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
  lastSelection: PageSelection | null;
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
      return <HighlightForm {...{ document, file, running, lastSelection, onStatus, onComplete, setRunning, onClose }} />;
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
      filters: [{ name: t('adv.txtFilter'), extensions: ['txt'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus(t('adv.ocr.running'));
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
      onStatus(t('adv.ocr.failed', { error: String(e) }));
      setRunning(false);
    }
  }

  return (
    <FormPanel title={t('adv.ocr.title')} onClose={onClose}>
      <label className="form-label">
        {t('adv.lang')}
        <input className="form-input" value={lang} onChange={(e) => setLang(e.target.value)}
          placeholder="kor+eng" disabled={running} />
        <small className="form-hint">
          {t('adv.langAvail', { list: tesseractInfo?.languages.join(', ') ?? t('adv.langUnknown') })}
        </small>
      </label>
      <label className="form-label">
        {t('adv.ocr.dpi')}
        <input className="form-input" type="number" value={dpi} onChange={(e) => setDpi(e.target.value)}
          disabled={running} />
      </label>
      <button className="primary" disabled={!file || running} onClick={run}>
        {running ? t('adv.processing') : t('adv.ocr.run')}
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
    onStatus(t('adv.pti.running'));

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
        onStatus(t('adv.pti.savedProgress', { done: completed, total: pages.length }));
      }
      onStatus(t('adv.pti.done', { count: pages.length }));
      onComplete();
    } catch (e) {
      onStatus(t('adv.pti.failed', { error: String(e) }));
      setRunning(false);
    }
  }

  return (
    <FormPanel title={t('adv.pti.title')} onClose={onClose}>
      <label className="form-label">
        {t('adv.pti.page')}
        <input className="form-input" value={pageRange} onChange={(e) => setPageRange(e.target.value)}
          placeholder={t('adv.pti.pagePlaceholder')} disabled={running} />
      </label>
      <label className="form-label">
        {t('adv.pti.format')}
        <select className="form-input" value={format} onChange={(e) => setFormat(e.target.value)} disabled={running}>
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
      </label>
      <button className="primary" disabled={!document || running} onClick={run}>
        {running ? t('adv.pti.processing') : t('adv.pti.run')}
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
      filters: [{ name: t('adv.txtFilter'), extensions: ['txt'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus(t('adv.ptt.running'));

    try {
      const lines: string[] = [];
      for (let i = 1; i <= document.numPages; i++) {
        const page = await document.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: unknown) => (item as { str?: string }).str ?? '')
          .join(' ');
        lines.push(t('adv.ptt.pageHeader', { n: i }), pageText, '');
        onStatus(t('adv.ptt.pageProgress', { done: i, total: document.numPages }));
      }

      await invoke('save_text_file', { path: outputPath, content: lines.join('\n') });
      onStatus(t('adv.ptt.done', { path: outputPath }));
      onComplete();
    } catch (e) {
      onStatus(t('adv.ptt.failed', { error: String(e) }));
      setRunning(false);
    }
  }

  return (
    <FormPanel title={t('adv.ptt.title')} onClose={onClose}>
      <p className="form-description">{t('adv.ptt.desc')}</p>
      <button className="primary" disabled={!document || running} onClick={run}>
        {running ? t('adv.ptt.processing') : t('adv.ptt.run')}
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
      filters: [{ name: t('adv.imgFilter'), extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
    });
    if (!selected) return;

    const imagePaths = Array.isArray(selected) ? selected : [selected];
    if (imagePaths.length === 0) return;

    const outputPath = await save({
      defaultPath: 'converted.pdf',
      filters: [{ name: t('adv.pdfFilter'), extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus(t('adv.itp.running'));

    try {
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < imagePaths.length; i++) {
        const imgPath = imagePaths[i];
        const ext = imgPath.split('.').pop()?.toLowerCase();
        if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') {
          onStatus(t('adv.itp.skipped', { path: imgPath }));
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
        onStatus(t('adv.itp.adding', { done: i + 1, total: imagePaths.length }));
      }

      const pdfBytes = await pdfDoc.save();
      const base64 = uint8ToBase64(pdfBytes);
      await invoke('save_binary_file', { path: outputPath, base64Data: base64 });
      onStatus(t('adv.itp.done', { path: outputPath }));
      onComplete();
    } catch (e) {
      onStatus(t('adv.itp.failed', { error: String(e) }));
      setRunning(false);
    }
  }

  return (
    <FormPanel title={t('adv.itp.title')} onClose={onClose}>
      <p className="form-description">
        {t('adv.itp.desc')}
      </p>
      <button className="primary" disabled={running} onClick={run}>
        {running ? t('adv.itp.processing') : t('adv.itp.run')}
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
      filters: [{ name: t('adv.pdfFilter2'), extensions: ['pdf'] }],
    });
    if (typeof overlayFile !== 'string') return;

    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, isStamp ? '_stamped.pdf' : '_watermarked.pdf'),
      filters: [{ name: t('adv.pdfFilter'), extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus(isStamp ? t('adv.wm.runningStamp') : t('adv.wm.runningWm'));

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
      onStatus(t('adv.wm.failed', { error: String(e) }));
      setRunning(false);
    }
  }

  const label = isStamp ? t('adv.wm.titleStamp') : t('adv.wm.titleWm');
  const desc = isStamp ? t('adv.wm.descStamp') : t('adv.wm.descWm');

  return (
    <FormPanel title={label} onClose={onClose}>
      <p className="form-description">{desc}</p>
      <button className="primary" disabled={!file || running} onClick={run}>
        {running ? t('adv.processing') : isStamp ? t('adv.wm.runStamp') : t('adv.wm.runWm')}
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
      filters: [{ name: t('adv.pdfFilter'), extensions: ['pdf'] }],
    });
    if (typeof selected !== 'string') return;

    setRunning(true);
    onStatus(t('adv.cmp.running'));

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
        t('adv.cmp.header', { a: file.fileName, b: selected.split(/[/\\]/).pop() ?? '' }),
        '',
        t('adv.cmp.diffLabel'),
        diff.diffLines.join('\n'),
        '',
        t('adv.cmp.footer', { added: diff.added, removed: diff.removed }),
      ].join('\n');

      await invoke('save_text_file', { path: outputPath, content: diffText });
      onStatus(t('adv.cmp.done', { path: outputPath }));
      onComplete();
    } catch (e) {
      onStatus(t('adv.cmp.failed', { error: String(e) }));
      setRunning(false);
    }
  }

  return (
    <FormPanel title={t('adv.cmp.title')} onClose={onClose}>
      <p className="form-description">
        {t('adv.cmp.desc')}
      </p>
      <button className="primary" disabled={!document || running} onClick={run}>
        {running ? t('adv.cmp.processing') : t('adv.cmp.run')}
      </button>
    </FormPanel>
  );
}

function HighlightForm({
  document, file, running, lastSelection, onStatus, onComplete, setRunning, onClose,
}: {
  document: PDFDocumentProxy | null;
  file: { path: string; fileName: string } | null;
  running: boolean;
  lastSelection: PageSelection | null;
  onStatus: (msg: string) => void;
  onComplete: () => void;
  setRunning: (v: boolean) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'band' | 'selection'>('selection');
  const [pageList, setPageList] = useState('1');
  const [color, setColor] = useState<'yellow' | 'green' | 'pink' | 'blue'>('yellow');
  const [position, setPosition] = useState<'top' | 'middle' | 'bottom'>('top');

  const colorMap = {
    yellow: { r: 1, g: 0.95, b: 0.3 },
    green: { r: 0.5, g: 0.95, b: 0.5 },
    pink: { r: 1, g: 0.6, b: 0.85 },
    blue: { r: 0.55, g: 0.78, b: 1 },
  };

  async function run() {
    if (!document || !file) return;
    if (mode === 'selection' && (!lastSelection || lastSelection.rects.length === 0)) {
      onStatus(t('adv.hl.noSelection'));
      return;
    }

    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, '_highlighted.pdf'),
      filters: [{ name: t('adv.pdfFilter'), extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus(t('adv.hl.running'));
    try {
      const b64 = await invoke<string>('read_file_bytes', { path: file.path });
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const rgb = colorMap[color];
      const docPages = doc.getPages();

      if (mode === 'selection' && lastSelection) {
        const page = docPages[lastSelection.pageNumber - 1];
        if (!page) throw new Error(t('adv.hl.noPages'));
        for (const r of lastSelection.rects) {
          // 텍스트 줄 위로 약간 여유 (pdf-lib y는 사각형 아래 모서리)
          page.drawRectangle({
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            color: { type: 'RGB', red: rgb.r, green: rgb.g, blue: rgb.b } as never,
            opacity: 0.4,
          });
        }
      } else {
        const pages = parsePageRange(pageList, document.numPages);
        if (pages.length === 0) {
          throw new Error(t('adv.hl.noPages'));
        }
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
      }

      const out = await doc.save();
      const outB64 = uint8ToBase64(out);
      await invoke('save_binary_file', { path: outputPath, base64Data: outB64 });
      onStatus(t('adv.hl.done', { path: outputPath }));
      onComplete();
    } catch (e) {
      onStatus(t('adv.hl.failed', { error: String(e) }));
      setRunning(false);
    }
  }

  const selectionPreview =
    lastSelection && lastSelection.text
      ? t('adv.hl.selectionInfo', {
          text: lastSelection.text.length > 40 ? `${lastSelection.text.slice(0, 40)}…` : lastSelection.text,
          page: lastSelection.pageNumber,
          count: lastSelection.rects.length,
        })
      : t('adv.hl.noSelection');

  return (
    <FormPanel title={t('adv.hl.title')} onClose={onClose}>
      <p className="form-description">
        {t('adv.hl.desc')}
      </p>
      <label className="form-label">
        {t('adv.hl.mode')}
        <select className="form-input" value={mode} onChange={(e) => setMode(e.target.value as 'band' | 'selection')} disabled={running}>
          <option value="selection">{t('adv.hl.modeSelection')}</option>
          <option value="band">{t('adv.hl.modeBand')}</option>
        </select>
      </label>
      {mode === 'selection' ? (
        <small className="form-hint">{selectionPreview}</small>
      ) : (
        <>
          <label className="form-label">
            {t('adv.hl.targetPages')}
            <input className="form-input" value={pageList} onChange={(e) => setPageList(e.target.value)}
              placeholder={t('adv.hl.targetPlaceholder')} disabled={running} />
          </label>
          <label className="form-label">
            {t('adv.hl.position')}
            <select className="form-input" value={position} onChange={(e) => setPosition(e.target.value as never)} disabled={running}>
              <option value="top">{t('adv.hl.top')}</option>
              <option value="middle">{t('adv.hl.middle')}</option>
              <option value="bottom">{t('adv.hl.bottom')}</option>
            </select>
          </label>
        </>
      )}
      <label className="form-label">
        {t('adv.hl.color')}
        <select className="form-input" value={color} onChange={(e) => setColor(e.target.value as never)} disabled={running}>
          <option value="yellow">{t('adv.hl.yellow')}</option>
          <option value="green">{t('adv.hl.green')}</option>
          <option value="pink">{t('adv.hl.pink')}</option>
          <option value="blue">{t('adv.hl.blue')}</option>
        </select>
      </label>
      <button className="primary" disabled={!document || running} onClick={run}>
        {running ? t('adv.processing') : t('adv.hl.run')}
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
      filters: [{ name: t('adv.pdfFilter'), extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus(t('adv.norm.running'));
    try {
      const result = await invoke<string>('normalize_pdf', {
        inputFile: file.path,
        outputPath,
      });
      onStatus(result);
      onComplete();
    } catch (e) {
      onStatus(t('adv.norm.failed', { error: String(e) }));
      setRunning(false);
    }
  }

  return (
    <FormPanel title={t('adv.norm.title')} onClose={onClose}>
      <p className="form-description">
        {t('adv.norm.desc')}
      </p>
      <button className="primary" disabled={!file || running} onClick={run}>
        {running ? t('adv.processing') : t('adv.norm.run')}
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
      filters: [{ name: t('adv.pdfFilter'), extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus(t('adv.sp.renderingStart'));

    const tempImagePaths: string[] = [];
    try {
      const scale = Math.max(1, parseInt(dpi, 10) / 72);
      const baseTemp = file.path.replace(/\.pdf$/i, '_lpdf_ocr_tmp');
      for (let i = 1; i <= document.numPages; i++) {
        onStatus(t('adv.sp.renderProgress', { done: i, total: document.numPages }));
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

      onStatus(t('adv.sp.combining'));
      const result = await invoke<string>('run_ocr_searchable_pdf', {
        imagePaths: tempImagePaths,
        outputPdf: outputPath,
        language: lang,
      });
      onStatus(result);
      onComplete();
    } catch (e) {
      onStatus(t('adv.sp.failed', { error: String(e) }));
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
    <FormPanel title={t('adv.sp.title')} onClose={onClose}>
      <p className="form-description">
        {t('adv.sp.desc')}
      </p>
      <label className="form-label">
        {t('adv.lang')}
        <input className="form-input" value={lang} onChange={(e) => setLang(e.target.value)}
          placeholder="kor+eng" disabled={running} />
        <small className="form-hint">
          {t('adv.langAvail', { list: tesseractInfo?.languages.join(', ') ?? t('adv.langUnknown') })}
        </small>
      </label>
      <label className="form-label">
        {t('adv.sp.dpi')}
        <input className="form-input" type="number" value={dpi} onChange={(e) => setDpi(e.target.value)}
          disabled={running} />
        <small className="form-hint">{t('adv.sp.dpiHint')}</small>
      </label>
      <button className="primary" disabled={!document || running} onClick={run}>
        {running ? t('adv.processing') : t('adv.sp.run')}
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
      filters: [{ name: t('adv.imgFilter2'), extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff'] }],
    });
    if (typeof selected !== 'string') return;

    const outputPath = await save({
      defaultPath: selected.replace(/\.[^.]+$/i, '_ocr.txt'),
      filters: [{ name: t('adv.txtFilter'), extensions: ['txt'] }],
    });
    if (typeof outputPath !== 'string') return;

    setRunning(true);
    onStatus(t('adv.io.running'));
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
      onStatus(t('adv.io.failed', { error: String(e) }));
      setRunning(false);
    }
  }

  return (
    <FormPanel title={t('adv.io.title')} onClose={onClose}>
      <p className="form-description">
        {t('adv.io.desc')}
      </p>
      <label className="form-label">
        {t('adv.lang')}
        <input className="form-input" value={lang} onChange={(e) => setLang(e.target.value)}
          placeholder="kor+eng" disabled={running} />
        <small className="form-hint">
          {t('adv.langAvail', { list: tesseractInfo?.languages.join(', ') ?? t('adv.langUnknown') })}
        </small>
      </label>
      <button className="primary" disabled={running} onClick={run}>
        {running ? t('adv.processing') : t('adv.io.run')}
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
