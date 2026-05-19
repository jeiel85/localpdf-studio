import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfRenderQueue } from '../lib/renderQueue';

interface ThumbnailItem {
  pageNumber: number;
  dataUrl: string | null;
}

export function ThumbnailPanel({
  document,
  pageCount,
  currentPage,
  onPageSelect,
}: {
  document: PDFDocumentProxy | null;
  pageCount: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
}) {
  const [thumbnails, setThumbnails] = useState<ThumbnailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document || pageCount === 0) {
      setThumbnails([]);
      return;
    }

    let cancelled = false;
    const handles: { cancel: () => void }[] = [];
    setLoading(true);
    const items: ThumbnailItem[] = [];

    const thumbScale = 0.2;
    for (let i = 1; i <= pageCount; i++) {
      const pageNum = i;
      const handle = pdfRenderQueue.enqueue(async (shouldCancel) => {
        if (cancelled || shouldCancel()) return null;
        try {
          const page = await (document as PDFDocumentProxy).getPage(pageNum);
          if (cancelled || shouldCancel()) return null;
          const viewport = page.getViewport({ scale: thumbScale });
          const canvas = window.document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled || shouldCancel()) return null;
          items.push({ pageNumber: pageNum, dataUrl: canvas.toDataURL() });
        } catch {
          if (!cancelled) items.push({ pageNumber: pageNum, dataUrl: null });
        }
        if (!cancelled) {
          setThumbnails([...items].sort((a, b) => a.pageNumber - b.pageNumber));
          if (items.length === pageCount) setLoading(false);
        }
        return null;
      });
      handles.push(handle);
    }

    return () => {
      cancelled = true;
      handles.forEach((h) => h.cancel());
    };
  }, [document, pageCount]);

  useEffect(() => {
    if (containerRef.current) {
      const el = containerRef.current.querySelector(`[data-page="${currentPage}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentPage]);

  if (!document) {
    return <p className="empty-text">PDF를 열면 썸네일이 표시됩니다.</p>;
  }

  return (
    <div ref={containerRef} className="thumbnail-list">
      {loading && thumbnails.length === 0 && <p className="empty-text">썸네일 생성 중...</p>}
      {thumbnails.map((t) => (
        <div
          key={t.pageNumber}
          data-page={t.pageNumber}
          className={`thumbnail-item ${t.pageNumber === currentPage ? 'active' : ''}`}
          onClick={() => onPageSelect(t.pageNumber)}
        >
          <span className="thumbnail-label">{t.pageNumber}</span>
          {t.dataUrl ? (
            <img src={t.dataUrl} alt={`페이지 ${t.pageNumber}`} />
          ) : (
            <div className="thumbnail-placeholder">?</div>
          )}
        </div>
      ))}
    </div>
  );
}
