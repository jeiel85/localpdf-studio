// PDF 텍스트 선택 캡처 + PDF 좌표 변환 헬퍼.
// PDF.js TextLayer는 [data-page-index="N"] 컨테이너 안의 .textLayer span으로 렌더링됨.
// 각 페이지 노드의 dataset에 baseWidth/baseHeight(unrotated, scale=1 viewport)를 부착해 두면
// canvas px → PDF point 변환이 가능하다.

export interface SelectionRect {
  // PDF point space (origin: 좌하단). pdf-lib drawRectangle와 호환.
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageSelection {
  pageNumber: number;
  rects: SelectionRect[];
  text: string;
  capturedAt: number;
}

interface PageNodeInfo {
  node: HTMLElement;
  pageNumber: number;
  baseWidth: number;
  baseHeight: number;
  pageRotation: number;
}

function findPageNode(target: Node | null): PageNodeInfo | null {
  let el: HTMLElement | null =
    target instanceof HTMLElement
      ? target
      : target instanceof Node && target.parentElement
        ? target.parentElement
        : null;
  while (el) {
    if (el.dataset.pageIndex) {
      const pageNumber = parseInt(el.dataset.pageIndex, 10);
      const baseWidth = parseFloat(el.dataset.baseWidth ?? '0');
      const baseHeight = parseFloat(el.dataset.baseHeight ?? '0');
      const pageRotation = parseInt(el.dataset.pageRotation ?? '0', 10);
      if (pageNumber > 0 && baseWidth > 0 && baseHeight > 0) {
        return { node: el, pageNumber, baseWidth, baseHeight, pageRotation };
      }
    }
    el = el.parentElement;
  }
  return null;
}

function rectToPdfPoint(
  rect: DOMRect,
  pageRect: DOMRect,
  baseWidth: number,
  baseHeight: number,
  pageRotation: number,
): SelectionRect {
  // 페이지 노드 내부의 CSS 픽셀 좌표
  const relLeft = rect.left - pageRect.left;
  const relTop = rect.top - pageRect.top;
  const relWidth = rect.width;
  const relHeight = rect.height;

  // 90도 또는 270도 회전 시 뷰포트의 너비/높이가 바뀌므로 대응 스케일 계산
  const isRotated90or270 = pageRotation === 90 || pageRotation === 270;
  const scaleX = pageRect.width > 0 ? pageRect.width / (isRotated90or270 ? baseHeight : baseWidth) : 1;
  const scaleY = pageRect.height > 0 ? pageRect.height / (isRotated90or270 ? baseWidth : baseHeight) : 1;

  // 클램프: 페이지 영역 밖으로 나간 선택은 페이지 안쪽으로 제한
  const cssLeft = Math.max(0, Math.min(pageRect.width, relLeft));
  const cssRight = Math.max(0, Math.min(pageRect.width, relLeft + relWidth));
  const cssTop = Math.max(0, Math.min(pageRect.height, relTop));
  const cssBottom = Math.max(0, Math.min(pageRect.height, relTop + relHeight));

  // 스케일 해제된 1.0 비율의 뷰포트 좌표 (회전된 상태)
  const wLeft = cssLeft / scaleX;
  const wRight = cssRight / scaleX;
  const wTop = cssTop / scaleY;
  const wBottom = cssBottom / scaleY;

  let pdfX = 0;
  let pdfY = 0;
  let pdfWidth = 0;
  let pdfHeight = 0;

  // 회전 각도별 PDF Point 역산 공식 적용 (Point 원점은 unrotated 페이지의 좌하단)
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

  return { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight };
}

// 현재 window.getSelection()을 PDF 좌표 페이지별 사각형으로 변환.
// 페이지를 가로지르는 선택은 첫 페이지의 사각형만 반환 (MVP).
export function captureCurrentSelection(): PageSelection | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const text = sel.toString();
  if (!text.trim()) return null;

  // 첫 range의 시작 컨테이너에서 페이지 정보 찾음
  const range = sel.getRangeAt(0);
  const info = findPageNode(range.startContainer);
  if (!info) return null;

  const pageRect = info.node.getBoundingClientRect();
  if (pageRect.width === 0 || pageRect.height === 0) return null;

  // 모든 range의 client rects를 모음. 같은 페이지 안 사각형만 채택.
  const rects: SelectionRect[] = [];
  for (let i = 0; i < sel.rangeCount; i++) {
    const r = sel.getRangeAt(i);
    const clientRects = r.getClientRects();
    for (let j = 0; j < clientRects.length; j++) {
      const cr = clientRects[j];
      if (cr.width < 0.5 || cr.height < 0.5) continue;
      // 페이지 영역과 겹치는지 확인
      const overlapsHorizontal = cr.right > pageRect.left && cr.left < pageRect.right;
      const overlapsVertical = cr.bottom > pageRect.top && cr.top < pageRect.bottom;
      if (!overlapsHorizontal || !overlapsVertical) continue;
      const pdfRect = rectToPdfPoint(cr, pageRect, info.baseWidth, info.baseHeight, info.pageRotation);
      if (pdfRect.width > 0.5 && pdfRect.height > 0.5) rects.push(pdfRect);
    }
  }

  if (rects.length === 0) return null;

  return {
    pageNumber: info.pageNumber,
    rects,
    text,
    capturedAt: Date.now(),
  };
}
