import type { ViewerState } from '../types';

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
      <div className="spacer" />
      <button type="button" onClick={onCheckUpdates}>업데이트 확인</button>
    </div>
  );
}
