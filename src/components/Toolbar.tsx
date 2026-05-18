import type { FitMode, PageLayout, ViewerState } from '../types';

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
}) {
  return (
    <div className="toolbar-inner">
      <button className="primary" type="button" onClick={onOpen}>PDF 열기</button>
      {tabCount > 0 && (
        <span className="tab-count-badge">{tabCount}개 문서</span>
      )}
      <div className="divider" />
      <button type="button" disabled={!hasDocument || viewer.currentPage <= 1} onClick={onPrev}>이전</button>
      <span className="page-indicator">{viewer.currentPage} / {Math.max(viewer.pageCount, 1)}</span>
      <button type="button" disabled={!hasDocument || viewer.currentPage >= viewer.pageCount} onClick={onNext}>다음</button>
      <div className="divider" />
      <button type="button" disabled={!hasDocument} onClick={onZoomOut}>-</button>
      <span className="page-indicator">{Math.round(viewer.scale * 100)}%</span>
      <button type="button" disabled={!hasDocument} onClick={onZoomIn}>+</button>
      <button type="button" disabled={!hasDocument} onClick={onRotate}>회전</button>
      <div className="divider" />
      <div className="toolbar-group" role="group" aria-label="페이지 레이아웃">
        <button
          type="button"
          className={`toolbar-toggle ${viewer.layout === 'single' ? 'active' : ''}`}
          disabled={!hasDocument}
          onClick={() => onLayoutChange('single')}
          title="단일 페이지 (한 페이지씩 이동)"
        >
          단일
        </button>
        <button
          type="button"
          className={`toolbar-toggle ${viewer.layout === 'continuous' ? 'active' : ''}`}
          disabled={!hasDocument}
          onClick={() => onLayoutChange('continuous')}
          title="연속 스크롤 (휠로 부드럽게 이동)"
        >
          연속
        </button>
      </div>
      <div className="toolbar-group" role="group" aria-label="페이지 맞춤">
        <button
          type="button"
          className={`toolbar-toggle ${viewer.fitMode === 'fit-width' ? 'active' : ''}`}
          disabled={!hasDocument}
          onClick={() => onFitChange('fit-width')}
          title="너비에 맞춤"
        >
          ↔
        </button>
        <button
          type="button"
          className={`toolbar-toggle ${viewer.fitMode === 'fit-page' ? 'active' : ''}`}
          disabled={!hasDocument}
          onClick={() => onFitChange('fit-page')}
          title="페이지에 맞춤"
        >
          ⤢
        </button>
        <button
          type="button"
          className={`toolbar-toggle ${viewer.fitMode === 'actual' ? 'active' : ''}`}
          disabled={!hasDocument}
          onClick={() => onFitChange('actual')}
          title="실제 크기 (100%)"
        >
          1:1
        </button>
      </div>
      <div className="spacer" />
      <button type="button" onClick={onCheckUpdates}>업데이트 확인</button>
    </div>
  );
}
