import { useCallback, useEffect, useRef, useState } from 'react';
import { t, useLocale } from '../i18n/messages';

type Stroke = {
  color: string;
  width: number;
  points: { x: number; y: number }[];
};

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 240;

/**
 * 마우스/스타일러스/터치로 직접 서명을 그릴 수 있는 모달.
 * onConfirm은 투명 배경 PNG dataURL을 반환한다.
 */
export function SignatureDrawDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  useLocale();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
  const [penColor, setPenColor] = useState('#1f1f1f');
  const [penWidth, setPenWidth] = useState(3);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const all = activeStroke ? [...strokes, activeStroke] : strokes;
    for (const stroke of all) {
      if (stroke.points.length < 1) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
  }, [strokes, activeStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  }

  function handleDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pos = pointerPos(e);
    setActiveStroke({ color: penColor, width: penWidth, points: [pos] });
  }

  function handleMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const pos = pointerPos(e);
    setActiveStroke((prev) => (prev ? { ...prev, points: [...prev.points, pos] } : prev));
  }

  function handleUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
    setActiveStroke((prev) => {
      if (prev && prev.points.length > 0) {
        setStrokes((all) => [...all, prev]);
      }
      return null;
    });
  }

  function handleClear() {
    setStrokes([]);
    setActiveStroke(null);
  }

  function handleUndo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function handleConfirm() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (strokes.length === 0) {
      onCancel();
      return;
    }
    // 빈 배경(투명) PNG로 그대로 내보내기 위해, 임시 캔버스에 한번 더 strokes만 그린다.
    const out = window.document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    for (const stroke of strokes) {
      if (stroke.points.length < 1) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
    onConfirm(out.toDataURL('image/png'));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel signature-modal">
        <h2>{t('sign.draw.title')}</h2>
        <p className="muted">{t('sign.draw.hint')}</p>
        <div className="signature-draw-area">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="signature-canvas"
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
          />
        </div>
        <div className="signature-controls">
          <label className="form-label inline">
            {t('sign.draw.color')}
            <input
              type="color"
              value={penColor}
              onChange={(e) => setPenColor(e.target.value)}
            />
          </label>
          <label className="form-label inline">
            {t('sign.draw.width')}
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={penWidth}
              onChange={(e) => setPenWidth(parseInt(e.target.value, 10))}
            />
            <span className="muted">{penWidth}px</span>
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={handleUndo} disabled={strokes.length === 0}>
            {t('sign.draw.undo')}
          </button>
          <button type="button" onClick={handleClear} disabled={strokes.length === 0 && !activeStroke}>
            {t('sign.draw.clear')}
          </button>
          <span className="spacer" />
          <button type="button" onClick={onCancel}>
            {t('sign.draw.cancel')}
          </button>
          <button type="button" className="primary" onClick={handleConfirm} disabled={strokes.length === 0}>
            {t('sign.draw.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
