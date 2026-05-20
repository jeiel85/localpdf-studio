import { useEffect, useRef, useState } from 'react';
import type { SignTool, StampElement, StampType, SavedSignature } from '../types';
import { stampDisplayText } from '../lib/fillSign';
import { pdfRectToCssRect } from '../lib/textSelection';

type Dims = { baseWidth: number; baseHeight: number; pageRotation: number };

const SMALL_DEFAULT_PT = { width: 120, height: 28 };
const SIGNATURE_DEFAULT_PT = { width: 180, height: 60 };
const MIN_DIM_PT = 8;

function rectFromTwoPoints(a: { x: number; y: number }, b: { x: number; y: number }) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 화면 CSS 좌표(rotated, screen pixels)를 unrotated 72dpi PDF point 좌표로 환산.
 */
function cssRectToPdfRect(
  cssRect: { left: number; top: number; width: number; height: number },
  containerWidth: number,
  containerHeight: number,
  dims: Dims,
): { x: number; y: number; width: number; height: number } {
  const { baseWidth, baseHeight, pageRotation } = dims;
  const isRotated90or270 = pageRotation === 90 || pageRotation === 270;
  const scaleX = containerWidth > 0 ? containerWidth / (isRotated90or270 ? baseHeight : baseWidth) : 1;
  const scaleY = containerHeight > 0 ? containerHeight / (isRotated90or270 ? baseWidth : baseHeight) : 1;

  const wLeft = cssRect.left / scaleX;
  const wRight = (cssRect.left + cssRect.width) / scaleX;
  const wTop = cssRect.top / scaleY;
  const wBottom = (cssRect.top + cssRect.height) / scaleY;

  switch (pageRotation) {
    case 90:
      return {
        x: wTop,
        y: baseHeight - wRight,
        width: wBottom - wTop,
        height: wRight - wLeft,
      };
    case 180:
      return {
        x: baseWidth - wRight,
        y: wTop,
        width: wRight - wLeft,
        height: wBottom - wTop,
      };
    case 270:
      return {
        x: baseWidth - wBottom,
        y: wLeft,
        width: wBottom - wTop,
        height: wRight - wLeft,
      };
    case 0:
    default:
      return {
        x: wLeft,
        y: baseHeight - wBottom,
        width: wRight - wLeft,
        height: wBottom - wTop,
      };
  }
}

function getDefaultSize(toolKind: SignTool['kind']) {
  return toolKind === 'signature' ? SIGNATURE_DEFAULT_PT : SMALL_DEFAULT_PT;
}

function stampTypeFromTool(tool: SignTool, signature?: SavedSignature): StampType {
  if (tool.kind === 'signature') {
    if (signature?.kind === 'image') return 'imageSig';
    return 'drawnSig';
  }
  return tool.kind as StampType;
}

interface StampOverlayProps {
  pageNumber: number;
  scale: number;
  rotation: number;
  stamps: StampElement[];
  selectedTool: SignTool | null;
  savedSignatures: SavedSignature[];
  signModeEnabled: boolean;
  defaultFontSize: number;
  defaultColor: string;
  /** 선택된 스탬프 ID. 다른 페이지의 같은 stamps 배열을 공유하므로 페이지를 넘나들 수 있다. */
  selectedStampId: string | null;
  onSelect: (id: string | null) => void;
  onAddStamp: (s: StampElement) => void;
  onUpdateStamp: (id: string, patch: Partial<StampElement>) => void;
  onRemoveStamp: (id: string) => void;
}

export function StampPageOverlay({
  pageNumber,
  scale,
  rotation,
  stamps,
  selectedTool,
  savedSignatures,
  signModeEnabled,
  defaultFontSize,
  defaultColor,
  selectedStampId,
  onSelect,
  onAddStamp,
  onUpdateStamp,
  onRemoveStamp,
}: StampOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [dims, setDims] = useState<Dims | null>(null);

  // 스탬프 이동/리사이즈 상태
  const [interaction, setInteraction] = useState<
    | null
    | {
        kind: 'move' | 'resize';
        id: string;
        startMouse: { x: number; y: number };
        startBox: { left: number; top: number; width: number; height: number };
      }
  >(null);

  const pageStamps = stamps.filter((s) => s.pageNumber === pageNumber);

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
  }, [scale, rotation, pageStamps.length]);

  function resolveSignature(): SavedSignature | undefined {
    if (selectedTool?.kind !== 'signature') return undefined;
    return savedSignatures.find((s) => s.id === selectedTool.signatureId);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!signModeEnabled || !selectedTool || e.button !== 0) return;
    if (interaction) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setDragStart({ x: startX, y: startY });
    setDragCurrent({ x: startX, y: startY });
    onSelect(null);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (interaction) {
      handleInteractionMove(e);
      return;
    }
    if (!dragStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const curY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setDragCurrent({ x: curX, y: curY });
  }

  function handleInteractionMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!interaction || !containerRef.current || !dims) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = mx - interaction.startMouse.x;
    const dy = my - interaction.startMouse.y;
    if (interaction.kind === 'move') {
      const newLeft = Math.max(0, Math.min(rect.width, interaction.startBox.left + dx));
      const newTop = Math.max(0, Math.min(rect.height, interaction.startBox.top + dy));
      const newRect = {
        left: newLeft,
        top: newTop,
        width: interaction.startBox.width,
        height: interaction.startBox.height,
      };
      const pdfRect = cssRectToPdfRect(newRect, rect.width, rect.height, dims);
      if (pdfRect.width >= MIN_DIM_PT && pdfRect.height >= MIN_DIM_PT) {
        onUpdateStamp(interaction.id, {
          x: pdfRect.x,
          y: pdfRect.y,
          width: pdfRect.width,
          height: pdfRect.height,
        });
      }
    } else {
      // resize: 우하단 핸들을 잡고 늘림
      const newW = Math.max(8, interaction.startBox.width + dx);
      const newH = Math.max(8, interaction.startBox.height + dy);
      const newRect = {
        left: interaction.startBox.left,
        top: interaction.startBox.top,
        width: Math.min(newW, rect.width - interaction.startBox.left),
        height: Math.min(newH, rect.height - interaction.startBox.top),
      };
      const pdfRect = cssRectToPdfRect(newRect, rect.width, rect.height, dims);
      if (pdfRect.width >= MIN_DIM_PT && pdfRect.height >= MIN_DIM_PT) {
        onUpdateStamp(interaction.id, {
          x: pdfRect.x,
          y: pdfRect.y,
          width: pdfRect.width,
          height: pdfRect.height,
        });
      }
    }
  }

  function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (interaction) {
      setInteraction(null);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!dragStart || !dragCurrent || !containerRef.current || !dims || !selectedTool || !signModeEnabled) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const drag = rectFromTwoPoints(dragStart, dragCurrent);

    const isClick = drag.w < 4 && drag.h < 4;
    const defaults = getDefaultSize(selectedTool.kind);

    // CSS 박스 좌표(아직 회전 보정 전)
    const cssBox = isClick
      ? {
          left: Math.max(0, Math.min(rect.width - 8, drag.x - defaults.width / 2)),
          top: Math.max(0, Math.min(rect.height - 8, drag.y - defaults.height / 2)),
          width: defaults.width,
          height: defaults.height,
        }
      : {
          left: drag.x,
          top: drag.y,
          width: Math.max(8, drag.w),
          height: Math.max(8, drag.h),
        };

    const pdfRect = cssRectToPdfRect(cssBox, rect.width, rect.height, dims);

    setDragStart(null);
    setDragCurrent(null);

    if (pdfRect.width < MIN_DIM_PT || pdfRect.height < MIN_DIM_PT) return;

    const signature = resolveSignature();
    const stampType = stampTypeFromTool(selectedTool, signature);
    const id = generateId('stamp');
    const stamp: StampElement = {
      id,
      pageNumber,
      type: stampType,
      x: pdfRect.x,
      y: pdfRect.y,
      width: pdfRect.width,
      height: pdfRect.height,
      text: '',
      fontSize: defaultFontSize,
      color: defaultColor,
      imageDataUrl: stampType === 'imageSig' || stampType === 'drawnSig' ? signature?.dataUrl : undefined,
    };
    // 텍스트 스탬프는 placeholder를 즉시 채워줘 사용자가 무엇이 들어갔는지 알게 한다.
    if (stamp.type === 'text') {
      stamp.text = '';
    }
    onAddStamp(stamp);
    onSelect(id);
  }

  function startInteraction(
    e: React.MouseEvent,
    stamp: StampElement,
    kind: 'move' | 'resize',
    cssRect: { left: number; top: number; width: number; height: number },
  ) {
    if (!containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    setInteraction({
      kind,
      id: stamp.id,
      startMouse: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      startBox: cssRect,
    });
    onSelect(stamp.id);
  }

  let dragBoxStyle: React.CSSProperties | null = null;
  if (dragStart && dragCurrent && (Math.abs(dragStart.x - dragCurrent.x) > 2 || Math.abs(dragStart.y - dragCurrent.y) > 2)) {
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
      border: '1.5px dashed var(--accent, #5b9dff)',
      backgroundColor: 'rgba(91, 157, 255, 0.12)',
      pointerEvents: 'none',
      zIndex: 100,
    };
  }

  const overlayActive = signModeEnabled || pageStamps.length > 0;

  return (
    <div
      ref={containerRef}
      className={`stamp-page-overlay ${signModeEnabled ? 'active' : ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 11,
        cursor: signModeEnabled && selectedTool ? 'crosshair' : 'default',
        pointerEvents: overlayActive ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {dragBoxStyle && <div style={dragBoxStyle} />}

      {dims &&
        pageStamps.map((stamp) => {
          const cssRect = pdfRectToCssRect(
            { x: stamp.x, y: stamp.y, width: stamp.width, height: stamp.height },
            dims.baseWidth,
            dims.baseHeight,
            dims.pageRotation,
            containerRef.current?.clientWidth ?? 0,
            containerRef.current?.clientHeight ?? 0,
          );
          const isSelected = stamp.id === selectedStampId;
          const isImage = stamp.type === 'imageSig' || stamp.type === 'drawnSig';
          const fontSizeCss = (stamp.fontSize * (cssRect.height / stamp.height || 1));

          return (
            <div
              key={stamp.id}
              className={`stamp-box ${isSelected ? 'selected' : ''} ${signModeEnabled ? 'editable' : ''}`}
              style={{
                position: 'absolute',
                left: cssRect.left,
                top: cssRect.top,
                width: cssRect.width,
                height: cssRect.height,
                border: isSelected
                  ? '1.5px solid var(--accent, #5b9dff)'
                  : signModeEnabled
                    ? '1px dashed rgba(91, 157, 255, 0.55)'
                    : '1px solid transparent',
                backgroundColor: isImage ? 'transparent' : 'rgba(255,255,255,0.0)',
                cursor: signModeEnabled ? 'move' : 'default',
                userSelect: 'none',
                zIndex: 90,
                pointerEvents: signModeEnabled ? 'auto' : 'none',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: stamp.type === 'text' || stamp.type === 'date' ? 'flex-start' : 'center',
                paddingLeft: stamp.type === 'text' || stamp.type === 'date' ? Math.max(2, fontSizeCss * 0.1) : 0,
                overflow: 'hidden',
              }}
              onMouseDown={(e) => {
                if (!signModeEnabled) return;
                if (e.button !== 0) return;
                startInteraction(e, stamp, 'move', cssRect);
              }}
              onClick={(e) => {
                if (!signModeEnabled) return;
                e.stopPropagation();
                onSelect(stamp.id);
              }}
            >
              {isImage && stamp.imageDataUrl ? (
                <img
                  src={stamp.imageDataUrl}
                  alt=""
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                />
              ) : (
                <span
                  style={{
                    color: stamp.color,
                    fontSize: `${Math.max(8, fontSizeCss)}px`,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stampDisplayText(stamp) || (stamp.type === 'text' ? ' ' : '')}
                </span>
              )}

              {isSelected && signModeEnabled && (
                <>
                  <button
                    type="button"
                    className="stamp-delete-btn"
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      onRemoveStamp(stamp.id);
                      onSelect(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: '-9px',
                      right: '-9px',
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
                      boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                      zIndex: 95,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                  <div
                    role="button"
                    aria-label="resize"
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      startInteraction(ev, stamp, 'resize', cssRect);
                    }}
                    style={{
                      position: 'absolute',
                      right: '-6px',
                      bottom: '-6px',
                      width: '12px',
                      height: '12px',
                      backgroundColor: 'var(--accent, #5b9dff)',
                      borderRadius: '2px',
                      cursor: 'nwse-resize',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}
