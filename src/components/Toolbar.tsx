import type { FitMode, PageLayout, ViewerState } from '../types';
import { t, useLocale } from '../i18n/messages';

export function Toolbar({
  hasDocument,
  viewer,
  tabCount,
  onOpen,
  onPrev,
  onNext,
  onZoomOut,
  onZoomIn,
  onRotate,
  onCheckUpdates,
  onLayoutChange,
  onFitChange,
  onHelp,
}: {
  hasDocument: boolean;
  viewer: ViewerState;
  tabCount: number;
  onOpen: () => void;
  onPrev: () => void;
  onNext: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onRotate: () => void;
  onCheckUpdates: () => void;
  onLayoutChange: (layout: PageLayout) => void;
  onFitChange: (mode: FitMode) => void;
  onHelp: () => void;
}) {
  useLocale();
  return (
    <div className="toolbar-inner">
      <button className="primary" type="button" onClick={onOpen}>{t('toolbar.open')}</button>
      {tabCount > 0 && (
        <span className="tab-count-badge">{t('toolbar.tabCount', { count: tabCount })}</span>
      )}
      <div className="divider" />
      <button type="button" disabled={!hasDocument || viewer.currentPage <= 1} onClick={onPrev}>{t('toolbar.prev')}</button>
      <span className="page-indicator">{viewer.currentPage} / {Math.max(viewer.pageCount, 1)}</span>
      <button type="button" disabled={!hasDocument || viewer.currentPage >= viewer.pageCount} onClick={onNext}>{t('toolbar.next')}</button>
      <div className="divider" />
      <button type="button" disabled={!hasDocument} onClick={onZoomOut} title={t('toolbar.zoomOut')}>-</button>
      <span className="page-indicator">{Math.round(viewer.scale * 100)}%</span>
      <button type="button" disabled={!hasDocument} onClick={onZoomIn} title={t('toolbar.zoomIn')}>+</button>
      <button type="button" disabled={!hasDocument} onClick={onRotate}>{t('toolbar.rotate')}</button>
      <div className="divider" />
      <div className="toolbar-group" role="group" aria-label="page layout">
        <button
          type="button"
          className={`toolbar-toggle ${viewer.layout === 'single' ? 'active' : ''}`}
          disabled={!hasDocument}
          onClick={() => onLayoutChange('single')}
          title={t('toolbar.single')}
        >
          {t('toolbar.single')}
        </button>
        <button
          type="button"
          className={`toolbar-toggle ${viewer.layout === 'continuous' ? 'active' : ''}`}
          disabled={!hasDocument}
          onClick={() => onLayoutChange('continuous')}
          title={t('toolbar.continuous')}
        >
          {t('toolbar.continuous')}
        </button>
      </div>
      <div className="toolbar-group" role="group" aria-label="page fit">
        <button
          type="button"
          className={`toolbar-toggle ${viewer.fitMode === 'fit-width' ? 'active' : ''}`}
          disabled={!hasDocument}
          onClick={() => onFitChange('fit-width')}
          title={t('toolbar.fitWidth')}
        >
          ↔
        </button>
        <button
          type="button"
          className={`toolbar-toggle ${viewer.fitMode === 'fit-page' ? 'active' : ''}`}
          disabled={!hasDocument}
          onClick={() => onFitChange('fit-page')}
          title={t('toolbar.fitPage')}
        >
          ⤢
        </button>
        <button
          type="button"
          className={`toolbar-toggle ${viewer.fitMode === 'actual' ? 'active' : ''}`}
          disabled={!hasDocument}
          onClick={() => onFitChange('actual')}
          title={t('toolbar.actual')}
        >
          1:1
        </button>
      </div>
      <div className="spacer" />
      <button type="button" onClick={onCheckUpdates}>{t('toolbar.checkUpdates')}</button>
      <button type="button" onClick={onHelp} title={`${t('toolbar.help')} (F1)`}>?</button>
    </div>
  );
}
