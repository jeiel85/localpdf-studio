import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { applyHighlight, computeFitScale, LoadingOverlay, renderQualityToScale, type PdfCanvasProps } from './PdfCanvas';
import { pdfRenderQueue } from '../lib/renderQueue';
import { pdfjsLib } from '../lib/pdfjs';
import type { RenderQuality } from '../types';

type PageDim = { width: number; height: number };

const SCROLL_SETTLE_MS = 120;
const RENDER_ROOT_MARGIN = '250px 0px';

export function PdfContinuousView({
  document,
  pageNumber,
  scale,
  rotation,
  fitMode,
  renderQuality,
  loadProgress,
  highlightQuery,
  onPageChange,
  onFittedScale,
}: PdfCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [firstDim, setFirstDim] = useState<PageDim | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [activeScale, setActiveScale] = useState(1);
  const [isScrolling, setIsScrolling] = useState(false);
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

  // Track scrolling state — pause renders while user is actively scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: number | null = null;
    const onScroll = () => {
      setIsScrolling(true);
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setIsScrolling(false), SCROLL_SETTLE_MS);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [document]);

  // Only load FIRST page dimension up front — others use that as placeholder
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

  // Scroll to a page when pageNumber changes externally
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

  // Track current page based on visibility
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
            isScrolling={isScrolling}
            highlightQuery={highlightQuery ?? ''}
          />
        ))}
    </div>
  );
}

type ContinuousPageProps = {
  pageIndex: number;
  document: PDFDocumentProxy;
  rotation: number;
  scale: number;
  defaultWidth: number;
  defaultHeight: number;
  renderQuality: RenderQuality;
  container: HTMLDivElement | null;
  isScrolling: boolean;
  highlightQuery: string;
};

const ContinuousPage = memo(function ContinuousPage({
  pageIndex,
  document,
  rotation,
  scale,
  defaultWidth,
  defaultHeight,
  renderQuality,
  container,
  isScrolling,
  highlightQuery,
}: ContinuousPageProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const queueHandleRef = useRef<{ cancel: () => void } | null>(null);
  const [actualSize, setActualSize] = useState<{ width: number; height: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Track viewport visibility
  useEffect(() => {
    if (!wrapRef.current || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          setVisible(e.isIntersecting);
        }
      },
      { root: container, rootMargin: RENDER_ROOT_MARGIN },
    );
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [container]);

  // Reset rendered state when scale/rotation changes
  useEffect(() => {
    setRendered(false);
  }, [scale, rotation]);

  // Schedule render through the queue when visible and scroll has settled
  useEffect(() => {
    if (!visible || rendered || isScrolling || !canvasRef.current) return;

    queueHandleRef.current?.cancel();
    renderTaskRef.current?.cancel();

    if (textLayerRef.current) {
      textLayerRef.current.innerHTML = '';
    }

    const handle = pdfRenderQueue.enqueue(async (shouldCancel) => {
      if (shouldCancel()) return null;
      const page = await document.getPage(pageIndex);
      if (shouldCancel() || !canvasRef.current) return null;
      const viewport = page.getViewport({ scale, rotation });
      // 텍스트 선택 → PDF 좌표 변환용 (rotation=0 기준)
      const baseViewport = page.getViewport({ scale: 1, rotation: 0 });
      if (wrapRef.current) {
        wrapRef.current.dataset.baseWidth = String(baseViewport.width);
        wrapRef.current.dataset.baseHeight = String(baseViewport.height);
      }
      const wf = Math.floor(viewport.width);
      const hf = Math.floor(viewport.height);
      setActualSize((prev) =>
        prev && prev.width === wf && prev.height === hf ? prev : { width: wf, height: hf },
      );
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return null;

      const outputScale = renderQualityToScale(renderQuality);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${wf}px`;
      canvas.style.height = `${hf}px`;
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      const task = page.render({ canvas, canvasContext: context, viewport });
      renderTaskRef.current = task;
      try {
        await task.promise;
        if (shouldCancel()) return null;

        // Render text layer
        if (textLayerRef.current) {
          try {
            const textContent = await page.getTextContent();
            if (!shouldCancel() && textLayerRef.current) {
              const textLayer = new pdfjsLib.TextLayer({
                textContentSource: textContent,
                container: textLayerRef.current,
                viewport,
              });
              await textLayer.render();
              if (highlightQuery) {
                applyHighlight(textLayerRef.current, highlightQuery);
              }
            }
          } catch {
            // Text layer rendering failure is not critical
          }
        }

        if (!shouldCancel()) setRendered(true);
      } catch (e) {
        const err = e as { name?: string };
        if (err.name !== 'RenderingCancelledException') {
          // ignore — placeholder remains
        }
      }
      return null;
    });
    queueHandleRef.current = handle;

    return () => {
      handle.cancel();
      renderTaskRef.current?.cancel();
    };
  }, [visible, rendered, isScrolling, document, pageIndex, scale, rotation, renderQuality]);

  useEffect(() => {
    applyHighlight(textLayerRef.current, highlightQuery);
  }, [highlightQuery, rendered]);

  // E1/E2: 가시 영역에서 완전히 벗어나면 canvas/text 비워 GPU/메모리 해제
  useEffect(() => {
    if (visible || !rendered) return;
    const timer = window.setTimeout(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasRef.current.width = 1;
        canvasRef.current.height = 1;
      }
      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = '';
      }
      setRendered(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [visible, rendered]);

  const w = actualSize?.width ?? defaultWidth;
  const h = actualSize?.height ?? defaultHeight;

  return (
    <div
      ref={wrapRef}
      data-page-index={pageIndex}
      className="continuous-page"
      style={{ width: w, height: h }}
    >
      <div className="canvas-page-layer">
        <canvas ref={canvasRef} className="pdf-canvas" />
        <div ref={textLayerRef} className="textLayer" />
      </div>
      {!rendered && <span className="continuous-page-number">페이지 {pageIndex}</span>}
    </div>
  );
});
