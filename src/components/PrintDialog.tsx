import { useEffect, useState } from 'react';
import type { PrintOptions } from '../lib/printPdf';
import { t, useLocale } from '../i18n/messages';

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
  useLocale();
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
          <h2>{t('print.title')}</h2>
          <button type="button" className="shortcut-help-close" onClick={onCancel} aria-label={t('common.close')}>
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
            <span>{t('print.all', { count: pageCount })}</span>
          </label>
          <label className="settings-row settings-row-inline">
            <input
              type="radio"
              name="print-mode"
              checked={mode === 'current'}
              onChange={() => setMode('current')}
            />
            <span>{t('print.current', { page: currentPage })}</span>
          </label>
          <label className="settings-row settings-row-inline">
            <input
              type="radio"
              name="print-mode"
              checked={mode === 'range'}
              onChange={() => setMode('range')}
            />
            <span>{t('print.range')}</span>
          </label>
          {mode === 'range' && (
            <input
              type="text"
              className="form-input"
              placeholder={t('print.rangePlaceholder')}
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          )}
          <div className="print-dialog-actions">
            <button type="button" className="primary" onClick={confirm}>{t('print.confirm')}</button>
            <button type="button" onClick={onCancel}>{t('print.cancel')}</button>
          </div>
          <small className="form-hint">
            {t('print.hint')}
          </small>
        </div>
      </div>
    </div>
  );
}
