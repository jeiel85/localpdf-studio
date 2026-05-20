import { memo, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfRenderQueue } from '../lib/renderQueue';
import { pdfjsLib } from '../lib/pdfjs';
import type { FitMode, PageLayout, RenderQuality, RedactionArea } from '../types';
import { PdfContinuousView } from './PdfContinuousView';
import { pdfRectToCssRect } from '../lib/textSelection';

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
  redactions?: RedactionArea[];
  onAddRedaction?: (r: RedactionArea) => void;
  onRemoveRedaction?: (id: string) => void;
  redactModeEnabled?: boolean;
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
  redactions,
  onAddRedaction,
  onRemoveRedaction,
  redactModeEnabled,
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

        const unrotatedViewport = page.getViewport({ scale: 1, rotation: 0 });
        const rotatedBaseViewport = page.getViewport({ scale: 1, rotation });
        const container = containerRef.current;
        const effectiveScale = computeFitScale({
          fitMode,
          customScale: scale,
          baseWidth: rotatedBaseViewport.width,
          baseHeight: rotatedBaseViewport.height,
          containerWidth: container.clientWidth - 60,
          containerHeight: container.clientHeight - 60,
        });
        fittedScaleRef.current?.(effectiveScale);

        const viewport = page.getViewport({ scale: effectiveScale, rotation });
        // 텍스트 선택 → PDF 좌표 변환용 (textSelection.ts가 dataset 사용)
        if (pageNodeRef.current) {
          pageNodeRef.current.dataset.pageIndex = String(pageNumber);
          pageNodeRef.current.dataset.baseWidth = String(unrotatedViewport.width);
          pageNodeRef.current.dataset.baseHeight = String(unrotatedViewport.height);
          pageNodeRef.current.dataset.pageRotation = String((page.rotate + rotation) % 360);
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
        {onAddRedaction && onRemoveRedaction && (
          <RedactPageOverlay
            pageNumber={pageNumber}
            scale={scale}
            rotation={rotation}
            redactions={redactions ?? []}
            onAddRedaction={onAddRedaction}
            onRemoveRedaction={onRemoveRedaction}
            redactModeEnabled={!!redactModeEnabled}
          />
        )}
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

export function RedactPageOverlay({
  pageNumber,
  scale,
  rotation,
  redactions,
  onAddRedaction,
  onRemoveRedaction,
  redactModeEnabled,
}: {
  pageNumber: number;
  scale: number;
  rotation: number;
  redactions: RedactionArea[];
  onAddRedaction: (r: RedactionArea) => void;
  onRemoveRedaction: (id: string) => void;
  redactModeEnabled: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // 현재 페이지에 해당하는 redaction들 필터링
  const pageRedactions = redactions.filter((r) => r.pageNumber === pageNumber);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!redactModeEnabled || e.button !== 0) return; // 좌클릭만 허용
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setDragStart({ x: startX, y: startY });
    setDragCurrent({ x: startX, y: startY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();

    const curX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const curY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setDragCurrent({ x: curX, y: curY });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStart || !dragCurrent || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const pageNode = containerRef.current.parentElement; // parentElement가 .canvas-page-layer
    if (pageNode) {
      const baseWidth = parseFloat(pageNode.dataset.baseWidth ?? '0');
      const baseHeight = parseFloat(pageNode.dataset.baseHeight ?? '0');
      const pageRotation = parseInt(pageNode.dataset.pageRotation ?? '0', 10);

      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragStart.x - dragCurrent.x);
      const h = Math.abs(dragStart.y - dragCurrent.y);

      if (w > 3 && h > 3 && baseWidth > 0 && baseHeight > 0) {
        const isRotated90or270 = pageRotation === 90 || pageRotation === 270;
        const scaleX = rect.width > 0 ? rect.width / (isRotated90or270 ? baseHeight : baseWidth) : 1;
        const scaleY = rect.height > 0 ? rect.height / (isRotated90or270 ? baseWidth : baseHeight) : 1;

        // 클램프 & 스케일 unrotated 역산
        const wLeft = x / scaleX;
        const wRight = (x + w) / scaleX;
        const wTop = y / scaleY;
        const wBottom = (y + h) / scaleY;

        let pdfX = 0;
        let pdfY = 0;
        let pdfWidth = 0;
        let pdfHeight = 0;

        switch (pageRotation) {
          case 90:
            pdfX = wTop;
            pdfWidth = wBottom - wTop;
            pdfY = baseHeight - wRight;
            pdfHeight = wRight - wLeft;
            break;
          case 180:
            pdfX = baseWidth - wRight;
            pdfWidth = wRight - wLeft;
            pdfY = wTop;
            pdfHeight = wBottom - wTop;
            break;
          case 270:
            pdfX = baseWidth - wBottom;
            pdfWidth = wBottom - wTop;
            pdfY = wLeft;
            pdfHeight = wRight - wLeft;
            break;
          case 0:
          default:
            pdfX = wLeft;
            pdfWidth = wRight - wLeft;
            pdfY = baseHeight - wBottom;
            pdfHeight = wBottom - wTop;
            break;
        }

        const id = `redact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        onAddRedaction({
          id,
          pageNumber,
          x: pdfX,
          y: pdfY,
          width: pdfWidth,
          height: pdfHeight,
        });
      }
    }

    setDragStart(null);
    setDragCurrent(null);
  };

  let dragBoxStyle: React.CSSProperties | null = null;
  if (dragStart && dragCurrent) {
    const x = Math.min(dragStart.x, dragCurrent.x);
    const y = Math.min(dragStart.y, dragCurrent.y);
    const w = Math.abs(dragStart.x - dragCurrent.x);
    const h = Math.abs(dragStart.y - dragCurrent.y);
    dragBoxStyle = {
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      border: '1.5px dashed var(--danger, #ff4d4f)',
      backgroundColor: 'rgba(255, 77, 79, 0.15)',
      pointerEvents: 'none',
      zIndex: 100,
    };
  }

  const [dims, setDims] = useState<{ baseWidth: number; baseHeight: number; pageRotation: number } | null>(null);

  useEffect(() => {
    const pageNode = containerRef.current?.parentElement;
    if (pageNode) {
      const baseWidth = parseFloat(pageNode.dataset.baseWidth ?? '0');
      const baseHeight = parseFloat(pageNode.dataset.baseHeight ?? '0');
      const pageRotation = parseInt(pageNode.dataset.pageRotation ?? '0', 10);
      if (baseWidth > 0 && baseHeight > 0) {
        setDims({ baseWidth, baseHeight, pageRotation });
      }
    }
  }, [scale, rotation, pageRedactions.length]);

  return (
    <div
      ref={containerRef}
      className={`redact-page-overlay ${redactModeEnabled ? 'active' : ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 10,
        cursor: redactModeEnabled ? 'crosshair' : 'default',
        pointerEvents: redactModeEnabled || pageRedactions.length > 0 ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {dragBoxStyle && <div style={dragBoxStyle} />}

      {dims &&
        pageRedactions.map((redact) => {
          const rect = pdfRectToCssRect(
            { x: redact.x, y: redact.y, width: redact.width, height: redact.height },
            dims.baseWidth,
            dims.baseHeight,
            dims.pageRotation,
            containerRef.current?.clientWidth ?? 0,
            containerRef.current?.clientHeight ?? 0,
          );

          return (
            <div
              key={redact.id}
              className="redact-draft-overlay"
              style={{
                position: 'absolute',
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                border: '1.5px solid var(--danger, #ff4d4f)',
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                backgroundSize: '10px 10px',
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 77, 79, 0.1) 0, rgba(255, 77, 79, 0.1) 1px, transparent 0, transparent 50%)',
                zIndex: 90,
                pointerEvents: 'auto',
              }}
            >
              <button
                type="button"
                className="redact-delete-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveRedaction(redact.id);
                }}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--danger, #ff4d4f)',
                  color: 'white',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  zIndex: 95,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
    </div>
  );
}

