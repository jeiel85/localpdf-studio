import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export function PdfCanvas({
  document,
  pageNumber,
  scale,
  rotation,
}: {
  document: PDFDocumentProxy | null;
  pageNumber: number;
  scale: number;
  rotation: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [message, setMessage] = useState('PDF를 열어주세요.');

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      if (!document || !canvasRef.current) {
        setMessage('PDF를 열어주세요.');
        return;
      }

      setMessage('렌더링 중...');
      renderTaskRef.current?.cancel();

      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context를 생성할 수 없습니다.');

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setMessage('');
      } catch (error) {
        const err = error as { name?: string; message?: string };
        if (err.name === 'RenderingCancelledException') return;
        setMessage(err.message ?? 'PDF 페이지 렌더링 중 오류가 발생했습니다.');
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [document, pageNumber, scale, rotation]);

  return (
    <div className="canvas-wrap">
      {message && <div className="canvas-message">{message}</div>}
      <canvas ref={canvasRef} className="pdf-canvas" />
    </div>
  );
}
