import { SelectionRect } from './textSelection';

export interface TextItem {
  str: string;
  width: number;
  height: number;
  transform: number[]; // [scaleX, skewX, skewY, scaleY, translateX, translateY]
}

export interface AutoRedactMatch {
  id: string;
  type: AutoRedactType;
  text: string;
  pageNumber: number;
  rects: SelectionRect[];
}

export type AutoRedactType =
  | 'jumin'
  | 'phone'
  | 'email'
  | 'card'
  | 'account'
  | 'business'
  | 'passport'
  | 'driver';

const PATTERN_PRIORITY: AutoRedactType[] = [
  'jumin',
  'business',
  'driver',
  'passport',
  'card',
  'phone',
  'email',
  'account',
];

// 핵심 개인정보 및 국내 문서 식별자 정규식 정의
export const REDACTION_PATTERNS = {
  jumin: /\b\d{6}-[1-4]\d{6}\b/g,
  phone: /(010-\d{4}-\d{4}|0\d{2}-\d{3,4}-\d{4}|\b010\d{8}\b)/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  card: /(\b\d{4}-\d{4}-\d{4}-\d{4}\b|\b\d{16}\b)/g,
  account: /\b\d{3,6}-\d{2,6}-\d{3,6}\b/g,
  business: /\b\d{3}-\d{2}-\d{5}\b/g,
  passport: /\b(?:[MSROD]\d{8}|[A-Z]{2}\d{7})\b/g,
  driver: /\b\d{2}-\d{2}-\d{6}-\d{2}\b/g,
};

interface CharMapEntry {
  itemIndex: number;
  localCharIndex: number;
}

/**
 * 특정 페이지의 TextItem[] 데이터를 받아 5대 개인정보 패턴을 검색하고 PDF Point 기준의 좌표를 계산합니다.
 */
export function scanPageForPrivateInfo(
  items: TextItem[],
  pageNumber: number,
): AutoRedactMatch[] {
  // 1. 전체 문자열 빌드 및 문자 단위 맵 매핑 구축
  let fullText = '';
  const charMap: CharMapEntry[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const textStr = item.str;

    for (let j = 0; j < textStr.length; j++) {
      charMap.push({
        itemIndex: i,
        localCharIndex: j,
      });
    }
    fullText += textStr;

    // 아이템 간의 간격을 주기 위해 스페이스 추가가 필요한 경우도 있으나,
    // 정규식 매칭 및 좌표 매핑의 정확도를 위해 순수 결합을 기본으로 하고,
    // 필요 시 아래와 같이 스페이스를 추가하되 인덱스 맵에서 제외하는 전략을 쓸 수 있습니다.
    // 여기서는 텍스트 레이어 글자 결합 특성을 유지하기 위해 단순 결합을 사용합니다.
  }

  const matches: Array<AutoRedactMatch & { startIndex: number; endIndex: number }> = [];

  for (const type of PATTERN_PRIORITY) {
    const pattern = REDACTION_PATTERNS[type];
    // 정규식 매칭 플래그 초기화
    pattern.lastIndex = 0;

    let matchResult: RegExpExecArray | null;
    while ((matchResult = pattern.exec(fullText)) !== null) {
      const matchedText = matchResult[0];
      const matchStart = matchResult.index;
      const matchEnd = matchStart + matchedText.length;

      // 매칭에 참여하는 TextItem들의 바운딩 박스 리스트 추출
      const rects: SelectionRect[] = [];
      
      // 매칭 시작 인덱스부터 끝 인덱스까지 문자들의 소속 아이템 추적
      let currentItemIndex = -1;
      let currentLocalStart = -1;
      let currentLocalEnd = -1;

      for (let c = matchStart; c < matchEnd; c++) {
        if (c >= charMap.length) break;
        const entry = charMap[c];

        if (entry.itemIndex !== currentItemIndex) {
          // 새로운 TextItem으로 넘어간 경우, 이전 아이템의 누적된 부분 좌표를 Rect로 등록
          if (currentItemIndex !== -1) {
            const pdfRect = calculatePartialRect(
              items[currentItemIndex],
              currentLocalStart,
              currentLocalEnd + 1,
            );
            if (pdfRect) rects.push(pdfRect);
          }

          currentItemIndex = entry.itemIndex;
          currentLocalStart = entry.localCharIndex;
          currentLocalEnd = entry.localCharIndex;
        } else {
          currentLocalEnd = entry.localCharIndex;
        }
      }

      // 루프 종료 후 남은 마지막 아이템 누적 영역 등록
      if (currentItemIndex !== -1) {
        const pdfRect = calculatePartialRect(
          items[currentItemIndex],
          currentLocalStart,
          currentLocalEnd + 1,
        );
        if (pdfRect) rects.push(pdfRect);
      }

      if (rects.length > 0) {
        // 고유 ID는 유형 + 페이지 + 매칭 시작위치를 조합해 생성
        const id = `${type}_p${pageNumber}_${matchStart}`;
        matches.push({
          id,
          type,
          text: matchedText,
          pageNumber,
          rects,
          startIndex: matchStart,
          endIndex: matchEnd,
        });
      }
    }
  }

  return dedupeOverlappingMatches(matches).map(({ startIndex, endIndex, ...match }) => match);
}

function dedupeOverlappingMatches(
  matches: Array<AutoRedactMatch & { startIndex: number; endIndex: number }>,
): Array<AutoRedactMatch & { startIndex: number; endIndex: number }> {
  const priority = new Map(PATTERN_PRIORITY.map((type, index) => [type, index]));
  const selected: Array<AutoRedactMatch & { startIndex: number; endIndex: number }> = [];

  for (const candidate of matches.sort((a, b) => {
    if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
    return (priority.get(a.type) ?? 999) - (priority.get(b.type) ?? 999);
  })) {
    const overlappingIndex = selected.findIndex(existing =>
      candidate.startIndex < existing.endIndex && candidate.endIndex > existing.startIndex
    );

    if (overlappingIndex === -1) {
      selected.push(candidate);
      continue;
    }

    const existing = selected[overlappingIndex];
    const candidatePriority = priority.get(candidate.type) ?? 999;
    const existingPriority = priority.get(existing.type) ?? 999;
    const candidateLength = candidate.endIndex - candidate.startIndex;
    const existingLength = existing.endIndex - existing.startIndex;

    if (
      candidatePriority < existingPriority ||
      (candidatePriority === existingPriority && candidateLength > existingLength)
    ) {
      selected[overlappingIndex] = candidate;
    }
  }

  return selected.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * TextItem 내부의 특정 문자 영역(localStart ~ localEnd)에 대한 PDF Point 좌표를 비례 배분하여 산출합니다.
 */
function calculatePartialRect(
  item: TextItem,
  localStart: number,
  localEnd: number,
): SelectionRect | null {
  const textLen = item.str.length;
  if (textLen === 0) return null;

  // transform Matrix: [scaleX, skewX, skewY, scaleY, translateX, translateY]
  const baseLeft = item.transform[4];
  const baseBottom = item.transform[5];
  const totalWidth = item.width;
  const height = item.height || Math.abs(item.transform[3]); // 텍스트 높이

  // 만약 전체 문자 범위라면 오프셋 계산 없이 그대로 반환
  if (localStart === 0 && localEnd === textLen) {
    return {
      x: baseLeft,
      y: baseBottom,
      width: totalWidth,
      height: height,
    };
  }

  // 부분 문자 범위라면 글자수 비례 배분을 통해 오프셋 및 너비 계산
  const charWidth = totalWidth / textLen;
  const relativeLeft = localStart * charWidth;
  const relativeWidth = (localEnd - localStart) * charWidth;

  return {
    x: baseLeft + relativeLeft,
    y: baseBottom,
    width: relativeWidth,
    height: height,
  };
}
