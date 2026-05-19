export type Locale = 'ko' | 'en' | 'ja';

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

type Dict = Record<string, string>;

const ko: Dict = {
  // Sidebar
  'sidebar.document': '문서',
  'sidebar.thumbnails': '썸네일',
  'sidebar.outline': '목차',
  'sidebar.search': '검색',
  'sidebar.merge': '병합',
  'sidebar.tools': '도구',
  'sidebar.advanced': '고급',
  'sidebar.editor': '편집',
  'sidebar.metadata': '정보',
  'sidebar.form': '폼',
  'sidebar.bookmarks': '책갈피',
  'sidebar.compare': '비교',
  'sidebar.settings': '설정',
  // Toolbar
  'toolbar.open': 'PDF 열기',
  'toolbar.prev': '이전',
  'toolbar.next': '다음',
  'toolbar.zoomIn': '확대',
  'toolbar.zoomOut': '축소',
  'toolbar.rotate': '회전',
  'toolbar.checkUpdates': '업데이트 확인',
  'toolbar.help': '도움말',
  'toolbar.fitWidth': '너비에 맞춤',
  'toolbar.fitPage': '페이지에 맞춤',
  'toolbar.actual': '실제 크기',
  'toolbar.single': '단일',
  'toolbar.continuous': '연속',
  'toolbar.tabCount': '{count}개 문서',
  // Status
  'status.ready': '준비됨',
  'status.loading': 'PDF 파일을 읽는 중...',
  'status.opening': '여는 중...',
  // TabBar
  'tab.noOpen': '열린 문서 없음',
  'tab.new': '+ PDF 열기',
  // Print dialog
  'print.title': '인쇄',
  'print.all': '전체 페이지 ({count}장)',
  'print.current': '현재 페이지만 (페이지 {page})',
  'print.range': '지정 페이지',
  'print.rangePlaceholder': '예: 1-5, 8, 10-12',
  'print.confirm': '인쇄',
  'print.cancel': '취소',
  'print.hint': '시스템 인쇄 다이얼로그에서 양면, 컬러, 매수 등을 추가 설정할 수 있습니다.',
  // Common
  'common.close': '닫기',
  'common.cancel': '취소',
  'common.save': '저장',
  'common.delete': '삭제',
  'common.apply': '적용',
  'common.running': '처리 중...',
};

const en: Dict = {
  // Sidebar
  'sidebar.document': 'Document',
  'sidebar.thumbnails': 'Thumbnails',
  'sidebar.outline': 'Outline',
  'sidebar.search': 'Search',
  'sidebar.merge': 'Merge',
  'sidebar.tools': 'Tools',
  'sidebar.advanced': 'Advanced',
  'sidebar.editor': 'Editor',
  'sidebar.metadata': 'Info',
  'sidebar.form': 'Form',
  'sidebar.bookmarks': 'Bookmarks',
  'sidebar.compare': 'Compare',
  'sidebar.settings': 'Settings',
  // Toolbar
  'toolbar.open': 'Open PDF',
  'toolbar.prev': 'Previous',
  'toolbar.next': 'Next',
  'toolbar.zoomIn': 'Zoom in',
  'toolbar.zoomOut': 'Zoom out',
  'toolbar.rotate': 'Rotate',
  'toolbar.checkUpdates': 'Check updates',
  'toolbar.help': 'Help',
  'toolbar.fitWidth': 'Fit width',
  'toolbar.fitPage': 'Fit page',
  'toolbar.actual': 'Actual size',
  'toolbar.single': 'Single',
  'toolbar.continuous': 'Continuous',
  'toolbar.tabCount': '{count} document(s)',
  // Status
  'status.ready': 'Ready',
  'status.loading': 'Reading PDF...',
  'status.opening': 'Opening...',
  // TabBar
  'tab.noOpen': 'No open documents',
  'tab.new': '+ Open PDF',
  // Print dialog
  'print.title': 'Print',
  'print.all': 'All pages ({count})',
  'print.current': 'Current page only (page {page})',
  'print.range': 'Specific pages',
  'print.rangePlaceholder': 'e.g. 1-5, 8, 10-12',
  'print.confirm': 'Print',
  'print.cancel': 'Cancel',
  'print.hint': 'Use the system print dialog for duplex, color, and copy count.',
  // Common
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.apply': 'Apply',
  'common.running': 'Running...',
};

const ja: Dict = {
  // Sidebar
  'sidebar.document': 'ドキュメント',
  'sidebar.thumbnails': 'サムネイル',
  'sidebar.outline': '目次',
  'sidebar.search': '検索',
  'sidebar.merge': '結合',
  'sidebar.tools': 'ツール',
  'sidebar.advanced': '高度',
  'sidebar.editor': '編集',
  'sidebar.metadata': '情報',
  'sidebar.form': 'フォーム',
  'sidebar.bookmarks': 'しおり',
  'sidebar.compare': '比較',
  'sidebar.settings': '設定',
  // Toolbar
  'toolbar.open': 'PDFを開く',
  'toolbar.prev': '前へ',
  'toolbar.next': '次へ',
  'toolbar.zoomIn': '拡大',
  'toolbar.zoomOut': '縮小',
  'toolbar.rotate': '回転',
  'toolbar.checkUpdates': '更新を確認',
  'toolbar.help': 'ヘルプ',
  'toolbar.fitWidth': '幅に合わせる',
  'toolbar.fitPage': 'ページに合わせる',
  'toolbar.actual': '実寸',
  'toolbar.single': '単一',
  'toolbar.continuous': '連続',
  'toolbar.tabCount': 'ドキュメント {count} 件',
  // Status
  'status.ready': '準備完了',
  'status.loading': 'PDFを読み込み中...',
  'status.opening': '開いています...',
  // TabBar
  'tab.noOpen': '開いているドキュメントなし',
  'tab.new': '+ PDFを開く',
  // Print dialog
  'print.title': '印刷',
  'print.all': '全ページ ({count}枚)',
  'print.current': '現在のページのみ (ページ {page})',
  'print.range': 'ページ指定',
  'print.rangePlaceholder': '例: 1-5, 8, 10-12',
  'print.confirm': '印刷',
  'print.cancel': 'キャンセル',
  'print.hint': '両面・カラー・部数はシステムの印刷ダイアログで設定できます。',
  // Common
  'common.close': '閉じる',
  'common.cancel': 'キャンセル',
  'common.save': '保存',
  'common.delete': '削除',
  'common.apply': '適用',
  'common.running': '処理中...',
};

const dictionaries: Record<Locale, Dict> = { ko, en, ja };

let currentLocale: Locale = 'ko';
const listeners = new Set<() => void>();

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try {
    localStorage.setItem('locale', locale);
  } catch {
    // ignore
  }
  document.documentElement.lang = locale;
  listeners.forEach((fn) => fn());
}

export function initLocale(): Locale {
  try {
    const stored = localStorage.getItem('locale') as Locale | null;
    if (stored && dictionaries[stored]) {
      currentLocale = stored;
      document.documentElement.lang = stored;
      return stored;
    }
  } catch {
    // ignore
  }
  // 브라우저/시스템 언어 자동 감지
  const nav = navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('en')) currentLocale = 'en';
  else if (nav.startsWith('ja')) currentLocale = 'ja';
  document.documentElement.lang = currentLocale;
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale] ?? ko;
  let str = dict[key] ?? ko[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// React hook 헬퍼
import { useEffect, useState } from 'react';
export function useLocale(): Locale {
  const [loc, setLoc] = useState<Locale>(currentLocale);
  useEffect(() => {
    return subscribeLocale(() => setLoc(getLocale()));
  }, []);
  return loc;
}
