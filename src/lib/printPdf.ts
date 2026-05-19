import type { PDFDocumentProxy } from 'pdfjs-dist';

export type PrintOptions = {
  /** "all" | "current" | "range" */
  mode?: 'all' | 'current' | 'range';
  currentPage?: number;
  /** 페이지 범위 문자열 (예: "1-5, 8, 10-12") - mode='range'일 때만 사용 */
  range?: string;
};

function parseRange(range: string, maxPage: number): number[] {
  const pages: number[] = [];
  const parts = range.split(',').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes('-')) {
      const [s, e] = part.split('-').map((x) => parseInt(x.trim(), 10));
      if (Number.isFinite(s) && Number.isFinite(e)) {
        const start = Math.max(1, Math.min(s, e));
        const end = Math.min(maxPage, Math.max(s, e));
        for (let i = start; i <= end; i++) pages.push(i);
      }
    } else {
      const n = parseInt(part, 10);
      if (Number.isFinite(n) && n >= 1 && n <= maxPage) pages.push(n);
    }
  }
  return Array.from(new Set(pages)).sort((a, b) => a - b);
}

export async function printPdf(
  pdf: PDFDocumentProxy,
  currentPage: number,
  onProgress?: (loaded: number, total: number) => void,
  options: PrintOptions = {},
): Promise<void> {
  const totalPages = pdf.numPages;
  const mode = options.mode ?? 'all';
  let pages: number[];
  if (mode === 'current') {
    pages = [Math.min(Math.max(1, options.currentPage ?? currentPage), totalPages)];
  } else if (mode === 'range' && options.range) {
    pages = parseRange(options.range, totalPages);
    if (pages.length === 0) {
      throw new Error('인쇄할 페이지가 없습니다. 범위를 확인하세요.');
    }
  } else {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('팝업 창을 열 수 없습니다. 팝업 차단 설정을 확인하세요.');
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>PDF 인쇄</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { padding: 12px; background: #fff; }
        canvas {
          display: block;
          margin: 0 auto;
          max-width: 100%;
          height: auto;
          page-break-after: always;
        }
        canvas:last-child { page-break-after: avoid; }
      </style>
    </head>
    <body></body>
    </html>
  `);
  printWindow.document.close();

  const body = printWindow.document.body;

  try {
    let processed = 0;
    for (const pageNum of pages) {
      processed += 1;
      onProgress?.(processed, pages.length);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / 2.0}px`;
      canvas.style.height = `${viewport.height / 2.0}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      body.appendChild(canvas);
    }

    await new Promise<void>((resolve) => {
      printWindow.onafterprint = () => {
        resolve();
        printWindow.close();
      };
      printWindow.print();
      setTimeout(() => {
        if (!printWindow.closed) {
          resolve();
          printWindow.close();
        }
      }, 2000);
    });
  } catch (err) {
    printWindow.close();
    throw err;
  }
}
