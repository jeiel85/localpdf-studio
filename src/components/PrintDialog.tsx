import { useEffect, useState } from 'react';
import type { PrintOptions } from '../lib/printPdf';

export function PrintDialog({
  currentPage,
  pageCount,
  onConfirm,
  onCancel,
}: {
  currentPage: number;
  pageCount: number;
  onConfirm: (options: PrintOptions) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<'all' | 'current' | 'range'>('all');
  const [range, setRange] = useState(`1-${pageCount}`);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function confirm() {
    if (mode === 'range' && !range.trim()) return;
    onConfirm({
      mode,
      currentPage,
      range: mode === 'range' ? range : undefined,
    });
  }

  return (
    <div className="shortcut-help-overlay" onClick={onCancel}>
      <div className="shortcut-help-modal print-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-help-header">
          <h2>인쇄</h2>
          <button type="button" className="shortcut-help-close" onClick={onCancel} aria-label="닫기">
            &times;
          </button>
        </div>
        <div className="print-dialog-body">
          <label className="settings-row settings-row-inline">
            <input
              type="radio"
              name="print-mode"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
            />
            <span>전체 페이지 ({pageCount}장)</span>
          </label>
          <label className="settings-row settings-row-inline">
            <input
              type="radio"
              name="print-mode"
              checked={mode === 'current'}
              onChange={() => setMode('current')}
            />
            <span>현재 페이지만 (페이지 {currentPage})</span>
          </label>
          <label className="settings-row settings-row-inline">
            <input
              type="radio"
              name="print-mode"
              checked={mode === 'range'}
              onChange={() => setMode('range')}
            />
            <span>지정 페이지</span>
          </label>
          {mode === 'range' && (
            <input
              type="text"
              className="form-input"
              placeholder="예: 1-5, 8, 10-12"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          )}
          <div className="print-dialog-actions">
            <button type="button" className="primary" onClick={confirm}>인쇄</button>
            <button type="button" onClick={onCancel}>취소</button>
          </div>
          <small className="form-hint">
            시스템 인쇄 다이얼로그에서 양면, 컬러, 매수 등을 추가 설정할 수 있습니다.
          </small>
        </div>
      </div>
    </div>
  );
}
