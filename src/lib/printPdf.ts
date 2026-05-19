import type { PDFDocumentProxy } from 'pdfjs-dist';

export async function printPdf(
  pdf: PDFDocumentProxy,
  _currentPage: number,
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  const total = pdf.numPages;
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
        .print-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 10px;
          color: #999;
          padding: 4px;
        }
      </style>
    </head>
    <body></body>
    </html>
  `);
  printWindow.document.close();

  const body = printWindow.document.body;

  try {
    for (let i = 1; i <= total; i++) {
      onProgress?.(i, total);
      const page = await pdf.getPage(i);
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
      // Fallback if onafterprint doesn't fire
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
