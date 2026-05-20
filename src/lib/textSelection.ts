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

// 현재 window.getSelection()을 PDF 좌표 페이지별 사각형 배열로 변환.
// 페이지를 가로지르는 다중 페이지 드래그 선택을 완벽히 지원합니다.
export function captureCurrentSelection(): PageSelection[] | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const text = sel.toString();
  if (!text.trim()) return null;

  // 현재 화면에 렌더링된 모든 페이지 엘리먼트 검색 및 정보 구축
  const pageNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-page-index]'));
  const pagesInfo = pageNodes
    .map((node) => {
      const pageNumber = parseInt(node.dataset.pageIndex ?? '0', 10);
      const baseWidth = parseFloat(node.dataset.baseWidth ?? '0');
      const baseHeight = parseFloat(node.dataset.baseHeight ?? '0');
      const pageRotation = parseInt(node.dataset.pageRotation ?? '0', 10);
      const rect = node.getBoundingClientRect();
      return { node, pageNumber, baseWidth, baseHeight, pageRotation, rect };
    })
    .filter((p) => p.pageNumber > 0 && p.baseWidth > 0 && p.baseHeight > 0 && p.rect.width > 0 && p.rect.height > 0);

  if (pagesInfo.length === 0) return null;

  // 페이지 번호별 선택 영역 그룹화 맵
  const pageRectsMap = new Map<number, { info: typeof pagesInfo[0]; rects: SelectionRect[] }>();

  // 모든 range의 client rects를 순회하며 Y축 매핑을 통해 적절한 페이지에 할당
  for (let i = 0; i < sel.rangeCount; i++) {
    const r = sel.getRangeAt(i);
    const clientRects = r.getClientRects();
    for (let j = 0; j < clientRects.length; j++) {
      const cr = clientRects[j];
      if (cr.width < 0.5 || cr.height < 0.5) continue;

      // 사각형의 중앙 Y축 값으로 매칭 페이지 찾기
      const centerY = (cr.top + cr.bottom) / 2;
      const matchedPage = pagesInfo.find((p) => centerY >= p.rect.top && centerY <= p.rect.bottom);
      if (!matchedPage) continue;

      const pdfRect = rectToPdfPoint(
        cr,
        matchedPage.rect,
        matchedPage.baseWidth,
        matchedPage.baseHeight,
        matchedPage.pageRotation,
      );

      if (pdfRect.width > 0.5 && pdfRect.height > 0.5) {
        if (!pageRectsMap.has(matchedPage.pageNumber)) {
          pageRectsMap.set(matchedPage.pageNumber, { info: matchedPage, rects: [] });
        }
        pageRectsMap.get(matchedPage.pageNumber)!.rects.push(pdfRect);
      }
    }
  }

  if (pageRectsMap.size === 0) return null;

  const result: PageSelection[] = [];
  const capturedAt = Date.now();

  for (const [pageNumber, data] of pageRectsMap.entries()) {
    result.push({
      pageNumber,
      rects: data.rects,
      text, // 드래그된 전체 텍스트 보존
      capturedAt,
    });
  }

  // 페이지 번호 순 정렬
  result.sort((a, b) => a.pageNumber - b.pageNumber);
  return result;
}
