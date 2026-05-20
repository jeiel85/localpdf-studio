import { memo, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfRenderQueue } from '../lib/renderQueue';
import { pdfjsLib } from '../lib/pdfjs';
import type { FitMode, PageLayout, RenderQuality } from '../types';
import { PdfContinuousView } from './PdfContinuousView';

export type PdfCanvasProps = {
  document: PDFDocumentProxy | null;
  pageNumber: number;
  scale: number;
  rotation: number;
  layout: PageLayout;
  fitMode: FitMode;
  renderQuality: RenderQuality;
  loadProgress: { loaded: number; total: number } | null;
  highlightQuery?: string;
  onPageChange?: (page: number) => void;
  onFittedScale?: (scale: number) => void;
};

export function applyHighlight(container: HTMLElement | null, query: string): void {
  if (!container) return;
  const trimmed = query.trim();
  // 기존 하이라이트 제거
  container.querySelectorAll('.search-mark').forEach((el) => {
    el.classList.remove('search-mark');
  });
  if (!trimmed) return;
  const lower = trimmed.toLowerCase();
  container.querySelectorAll<HTMLElement>('span').forEach((span) => {
    if (span.textContent && span.textContent.toLowerCase().includes(lower)) {
      span.classList.add('search-mark');
    }
  });
}

function PdfCanvasInner(props: PdfCanvasProps) {
  if (props.layout === 'continuous') {
    return <PdfContinuousView {...props} />;
  }
  return <PdfCanvasSingle {...props} />;
}

export const PdfCanvas = memo(PdfCanvasInner);

function PdfCanvasSingle({
  document,
  pageNumber,
  scale,
  rotation,
  fitMode,
  renderQuality,
  loadProgress,
  highlightQuery,
  onFittedScale,
}: PdfCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageNodeRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const fittedScaleRef = useRef(onFittedScale);
  fittedScaleRef.current = onFittedScale;
  const [message, setMessage] = useState('PDF를 열어주세요.');

  useEffect(() => {
    if (!document) {
      setMessage('PDF를 열어주세요.');
      return;
    }

    setMessage('렌더링 중...');
    renderTaskRef.current?.cancel();

    // Clear previous text layer
    if (textLayerRef.current) {
      textLayerRef.current.innerHTML = '';
    }

    const handle = pdfRenderQueue.enqueue(async (shouldCancel) => {
      if (shouldCancel() || !canvasRef.current || !containerRef.current) return null;
      try {
        const page = await document.getPage(pageNumber);
        if (shouldCancel() || !canvasRef.current || !containerRef.current) return null;

        const baseViewport = page.getViewport({ scale: 1, rotation });
        const container = containerRef.current;
        const effectiveScale = computeFitScale({
          fitMode,
          customScale: scale,
          baseWidth: baseViewport.width,
          baseHeight: baseViewport.height,
          containerWidth: container.clientWidth - 60,
          containerHeight: container.clientHeight - 60,
        });
        fittedScaleRef.current?.(effectiveScale);

        const viewport = page.getViewport({ scale: effectiveScale, rotation });
        // 텍스트 선택 → PDF 좌표 변환용 (textSelection.ts가 dataset 사용)
        if (pageNodeRef.current) {
          pageNodeRef.current.dataset.pageIndex = String(pageNumber);
          pageNodeRef.current.dataset.baseWidth = String(baseViewport.width);
          pageNodeRef.current.dataset.baseHeight = String(baseViewport.height);
        }
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context를 생성할 수 없습니다.');

        const outputScale = renderQualityToScale(renderQuality);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        const task = page.render({ canvas, canvasContext: context, viewport });
        renderTaskRef.current = task;
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

        if (!shouldCancel()) setMessage('');
      } catch (error) {
        const err = error as { name?: string; message?: string };
        if (err.name === 'RenderingCancelledException') return null;
        setMessage(err.message ?? 'PDF 페이지 렌더링 중 오류가 발생했습니다.');
      }
      return null;
    });

    return () => {
      handle.cancel();
      renderTaskRef.current?.cancel();
    };
  }, [document, pageNumber, scale, rotation, fitMode, renderQuality]);

  // 검색어만 변경 시 재렌더 없이 하이라이트만 갱신
  useEffect(() => {
    applyHighlight(textLayerRef.current, highlightQuery ?? '');
  }, [highlightQuery]);

  return (
    <div className="canvas-wrap" ref={containerRef}>
      {loadProgress && <LoadingOverlay progress={loadProgress} />}
      {!loadProgress && message && <div className="canvas-message">{message}</div>}
      <div ref={pageNodeRef} className="canvas-page-layer">
        <canvas ref={canvasRef} className="pdf-canvas" />
        <div ref={textLayerRef} className="textLayer" />
      </div>
    </div>
  );
}

export function LoadingOverlay({ progress }: { progress: { loaded: number; total: number } }) {
  const total = progress.total > 0 ? progress.total : 0;
  const percent = total > 0 ? Math.min(100, Math.floor((progress.loaded / total) * 100)) : 0;
  const loadedMB = (progress.loaded / (1024 * 1024)).toFixed(1);
  const totalMB = total > 0 ? (total / (1024 * 1024)).toFixed(1) : null;

  return (
    <div className="loading-overlay" role="status" aria-label="PDF 로딩 중">
      <div className="loading-card">
        <strong>PDF 불러오는 중…</strong>
        {totalMB ? (
          <small>{loadedMB} MB / {totalMB} MB ({percent}%)</small>
        ) : (
          <small>{loadedMB} MB</small>
        )}
        <div className="progress-track">
          <div
            className="progress-bar"
            style={{ width: total > 0 ? `${percent}%` : '50%' }}
            data-indeterminate={total > 0 ? 'false' : 'true'}
          />
        </div>
      </div>
    </div>
  );
}

export function computeFitScale(params: {
  fitMode: FitMode;
  customScale: number;
  baseWidth: number;
  baseHeight: number;
  containerWidth: number;
  containerHeight: number;
}): number {
  const { fitMode, customScale, baseWidth, baseHeight, containerWidth, containerHeight } = params;
  if (fitMode === 'actual') return 1;
  if (fitMode === 'fit-width' && baseWidth > 0 && containerWidth > 0) {
    return containerWidth / baseWidth;
  }
  if (fitMode === 'fit-page' && baseWidth > 0 && baseHeight > 0 && containerWidth > 0 && containerHeight > 0) {
    return Math.min(containerWidth / baseWidth, containerHeight / baseHeight);
  }
  return customScale;
}

export function renderQualityToScale(quality: RenderQuality): number {
  if (quality === 'high') return Math.max(window.devicePixelRatio || 1, 2);
  if (quality === 'low') return 1;
  // 'auto' caps at 1.5 to balance sharpness and performance
  const dpr = window.devicePixelRatio || 1;
  return Math.min(dpr, 1.5);
}
