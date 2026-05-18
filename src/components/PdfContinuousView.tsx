import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { computeFitScale, LoadingOverlay, renderQualityToScale, type PdfCanvasProps } from './PdfCanvas';
import type { RenderQuality } from '../types';

type PageDim = { width: number; height: number };

export function PdfContinuousView({
  document,
  pageNumber,
  scale,
  rotation,
  fitMode,
  renderQuality,
  loadProgress,
  onPageChange,
  onFittedScale,
}: PdfCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageDims, setPageDims] = useState<PageDim[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [activeScale, setActiveScale] = useState(1);
  const pageCount = document?.numPages ?? 0;
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  const onFittedScaleRef = useRef(onFittedScale);
  onFittedScaleRef.current = onFittedScale;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, [document]);

  useEffect(() => {
    let cancelled = false;
    if (!document) {
      setPageDims([]);
      return;
    }
    (async () => {
      const dims: PageDim[] = [];
      for (let i = 1; i <= document.numPages; i += 1) {
        if (cancelled) return;
        try {
          const page = await document.getPage(i);
          const v = page.getViewport({ scale: 1, rotation });
          dims.push({ width: v.width, height: v.height });
        } catch {
          dims.push({ width: 612, height: 792 });
        }
      }
      if (!cancelled) setPageDims(dims);
    })();
    return () => {
      cancelled = true;
    };
  }, [document, rotation]);

  const firstDim = pageDims[0];
  useEffect(() => {
    if (!firstDim || containerSize.width === 0) return;
    const effective = computeFitScale({
      fitMode,
      customScale: scale,
      baseWidth: firstDim.width,
      baseHeight: firstDim.height,
      containerWidth: containerSize.width - 60,
      containerHeight: containerSize.height - 60,
    });
    setActiveScale(effective);
    onFittedScaleRef.current?.(effective);
  }, [firstDim, fitMode, scale, containerSize]);

  // Scroll to a specific page when pageNumber changes externally (e.g., via toolbar or thumbnails)
  const lastScrolledPage = useRef<number>(-1);
  useEffect(() => {
    if (lastScrolledPage.current === pageNumber) return;
    const el = containerRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLDivElement>(`[data-page-index="${pageNumber}"]`);
    if (target) {
      lastScrolledPage.current = pageNumber;
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [pageNumber, pageDims.length]);

  // Track current page based on which page is most visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el || pageDims.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1;
        let bestRatio = 0;
        for (const e of entries) {
          if (e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            const idx = parseInt(e.target.getAttribute('data-page-index') ?? '-1', 10);
            if (idx > 0) bestIdx = idx;
          }
        }
        if (bestIdx > 0 && bestIdx !== lastScrolledPage.current) {
          lastScrolledPage.current = bestIdx;
          onPageChangeRef.current?.(bestIdx);
        }
      },
      { root: el, threshold: [0.1, 0.5, 0.9] },
    );

    const nodes = el.querySelectorAll<HTMLDivElement>('[data-page-index]');
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [pageDims.length]);

  const placeholderDims = useMemo(
    () =>
      pageDims.map((d) => ({
        width: Math.floor(d.width * activeScale),
        height: Math.floor(d.height * activeScale),
      })),
    [pageDims, activeScale],
  );

  if (!document) {
    return (
      <div className="canvas-wrap" ref={containerRef}>
        {loadProgress ? (
          <LoadingOverlay progress={loadProgress} />
        ) : (
          <div className="canvas-message">PDF를 열어주세요.</div>
        )}
      </div>
    );
  }

  return (
    <div className="canvas-wrap continuous" ref={containerRef}>
      {loadProgress && <LoadingOverlay progress={loadProgress} />}
      {pageCount > 0 && placeholderDims.length === 0 && (
        <div className="canvas-message">페이지 정보를 분석 중…</div>
      )}
      {placeholderDims.map((dim, idx) => (
        <ContinuousPage
          key={idx}
          pageIndex={idx + 1}
          document={document}
          rotation={rotation}
          scale={activeScale}
          width={dim.width}
          height={dim.height}
          renderQuality={renderQuality}
          container={containerRef.current}
        />
      ))}
    </div>
  );
}

function ContinuousPage({
  pageIndex,
  document,
  rotation,
  scale,
  width,
  height,
  renderQuality,
  container,
}: {
  pageIndex: number;
  document: PDFDocumentProxy;
  rotation: number;
  scale: number;
  width: number;
  height: number;
  renderQuality: RenderQuality;
  container: HTMLDivElement | null;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!wrapRef.current || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setShouldRender(true);
        }
      },
      { root: container, rootMargin: '400px 0px' },
    );
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [container]);

  useEffect(() => {
    setRendered(false);
  }, [scale, rotation]);

  useEffect(() => {
    if (!shouldRender || rendered || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await document.getPage(pageIndex);
        if (cancelled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const outputScale = renderQualityToScale(renderQuality);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        renderTaskRef.current?.cancel();
        const task = page.render({ canvas, canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch (e) {
        const err = e as { name?: string };
        if (err.name !== 'RenderingCancelledException') {
          // swallow; placeholder remains visible
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [shouldRender, rendered, document, pageIndex, scale, rotation, renderQuality]);

  return (
    <div
      ref={wrapRef}
      data-page-index={pageIndex}
      className="continuous-page"
      style={{ width, height }}
    >
      <canvas ref={canvasRef} className="pdf-canvas" />
      {!rendered && <span className="continuous-page-number">페이지 {pageIndex}</span>}
    </div>
  );
}

