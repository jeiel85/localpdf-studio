export type Locale = 'ko' | 'en' | 'ja';

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

type Dict = Record<string, string>;

const ko: Dict = {
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
  'toolbar.open': 'PDF 열기',
  'toolbar.prev': '이전',
  'toolbar.next': '다음',
  'toolbar.rotate': '회전',
  'toolbar.checkUpdates': '업데이트 확인',
  'toolbar.help': '도움말',
  'toolbar.fitWidth': '너비에 맞춤',
  'toolbar.fitPage': '페이지에 맞춤',
  'toolbar.actual': '실제 크기',
  'toolbar.single': '단일',
  'toolbar.continuous': '연속',
  'status.ready': '준비됨',
};

const en: Dict = {
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
  'toolbar.open': 'Open PDF',
  'toolbar.prev': 'Previous',
  'toolbar.next': 'Next',
  'toolbar.rotate': 'Rotate',
  'toolbar.checkUpdates': 'Check updates',
  'toolbar.help': 'Help',
  'toolbar.fitWidth': 'Fit width',
  'toolbar.fitPage': 'Fit page',
  'toolbar.actual': 'Actual size',
  'toolbar.single': 'Single',
  'toolbar.continuous': 'Continuous',
  'status.ready': 'Ready',
};

const ja: Dict = {
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
  'toolbar.open': 'PDFを開く',
  'toolbar.prev': '前へ',
  'toolbar.next': '次へ',
  'toolbar.rotate': '回転',
  'toolbar.checkUpdates': '更新を確認',
  'toolbar.help': 'ヘルプ',
  'toolbar.fitWidth': '幅に合わせる',
  'toolbar.fitPage': 'ページに合わせる',
  'toolbar.actual': '実寸',
  'toolbar.single': '単一',
  'toolbar.continuous': '連続',
  'status.ready': '準備完了',
};

const dictionaries: Record<Locale, Dict> = { ko, en, ja };

let currentLocale: Locale = 'ko';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try {
    localStorage.setItem('locale', locale);
  } catch {
    // ignore
  }
  document.documentElement.lang = locale;
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
  return currentLocale;
}

export function t(key: string): string {
  const dict = dictionaries[currentLocale] ?? ko;
  return dict[key] ?? ko[key] ?? key;
}

export function getLocale(): Locale {
  return currentLocale;
}
