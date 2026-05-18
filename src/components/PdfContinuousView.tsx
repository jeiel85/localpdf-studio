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
  const [firstDim, setFirstDim] = useState<PageDim | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [activeScale, setActiveScale] = useState(1);
  const pageCount = document?.numPages ?? 0;
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  const onFittedScaleRef = useRef(onFittedScale);
  onFittedScaleRef.current = onFittedScale;

  // Observe container size for fit-mode calculations
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

  // Only load FIRST page dimension up front — others are placeholders until they scroll into view
  useEffect(() => {
    let cancelled = false;
    if (!document) {
      setFirstDim(null);
      return;
    }
    (async () => {
      try {
        const page = await document.getPage(1);
        if (cancelled) return;
        const v = page.getViewport({ scale: 1, rotation });
        setFirstDim({ width: v.width, height: v.height });
      } catch {
        if (!cancelled) setFirstDim({ width: 612, height: 792 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [document, rotation]);

  // Compute effective scale from first page dimensions + container size
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

  // Scroll to a page when pageNumber changes externally (toolbar/thumbnails)
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
  }, [pageNumber, pageCount]);

  // Track current page based on what's most visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el || pageCount === 0) return;

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
  }, [pageCount]);

  const placeholderSize = useMemo(() => {
    if (!firstDim) return null;
    return {
      width: Math.floor(firstDim.width * activeScale),
      height: Math.floor(firstDim.height * activeScale),
    };
  }, [firstDim, activeScale]);

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
      {pageCount > 0 && placeholderSize === null && (
        <div className="canvas-message">페이지 정보를 분석 중…</div>
      )}
      {placeholderSize &&
        Array.from({ length: pageCount }, (_, i) => i + 1).map((pageIndex) => (
          <ContinuousPage
            key={pageIndex}
            pageIndex={pageIndex}
            document={document}
            rotation={rotation}
            scale={activeScale}
            defaultWidth={placeholderSize.width}
            defaultHeight={placeholderSize.height}
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
  defaultWidth,
  defaultHeight,
  renderQuality,
  container,
}: {
  pageIndex: number;
  document: PDFDocumentProxy;
  rotation: number;
  scale: number;
  defaultWidth: number;
  defaultHeight: number;
  renderQuality: RenderQuality;
  container: HTMLDivElement | null;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [actualSize, setActualSize] = useState<{ width: number; height: number } | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Watch for viewport intersection to trigger lazy render
  useEffect(() => {
    if (!wrapRef.current || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setShouldRender(true);
        }
      },
      { root: container, rootMargin: '600px 0px' },
    );
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [container]);

  // Reset rendered state when scale/rotation changes so the canvas redraws at the new size
  useEffect(() => {
    setRendered(false);
  }, [scale, rotation]);

  // Render the page when it enters the viewport
  useEffect(() => {
    if (!shouldRender || rendered || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await document.getPage(pageIndex);
        if (cancelled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale, rotation });
        if (!actualSize || actualSize.width !== Math.floor(viewport.width) || actualSize.height !== Math.floor(viewport.height)) {
          setActualSize({ width: Math.floor(viewport.width), height: Math.floor(viewport.height) });
        }
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
          // placeholder remains visible
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [shouldRender, rendered, document, pageIndex, scale, rotation, renderQuality, actualSize]);

  const w = actualSize?.width ?? defaultWidth;
  const h = actualSize?.height ?? defaultHeight;

  return (
    <div
      ref={wrapRef}
      data-page-index={pageIndex}
      className="continuous-page"
      style={{ width: w, height: h }}
    >
      <canvas ref={canvasRef} className="pdf-canvas" />
      {!rendered && <span className="continuous-page-number">페이지 {pageIndex}</span>}
    </div>
  );
}
