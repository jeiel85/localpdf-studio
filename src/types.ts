export type PdfFilePayload = {
  path: string;
  fileName: string;
  sizeBytes: number;
  base64Data: string;
  url?: string;
};

export type StartupContext = {
  action: string | null;
  files: string[];
};

export type ExternalToolStatus = {
  name: string;
  displayName: string;
  available: boolean;
  path: string | null;
  version: string | null;
  requiredFor: string[];
};

export type AppInfo = {
  appName: string;
  version: string;
  target: string;
};

export type ViewerState = {
  currentPage: number;
  pageCount: number;
  scale: number;
  rotation: number;
  layout: PageLayout;
  fitMode: FitMode;
};

export type OutlineItem = {
  title: string;
  dest?: string;
  pageNumber?: number;
  children: OutlineItem[];
};

export type SearchResult = {
  pageNumber: number;
  text: string;
  matchIndex: number;
};

export type RecentFileEntry = {
  path: string;
  fileName: string;
  openedAt: string;
};

export type SidebarTab = 'document' | 'thumbnails' | 'outline' | 'search' | 'merge' | 'tools' | 'advanced' | 'editor' | 'metadata' | 'form' | 'sign' | 'bookmarks' | 'compare' | 'settings';

export type ViewerZoomMode = 'fit-width' | 'fit-height' | 'custom';
export type WheelAction = 'scroll' | 'zoom';
export type RenderQuality = 'auto' | 'high' | 'low';
export type TempCleanupMode = 'immediate' | 'on-exit' | 'never';
export type ThemeMode = 'dark' | 'light' | 'system';
export type PageLayout = 'single' | 'continuous';
export type FitMode = 'custom' | 'fit-width' | 'fit-page' | 'actual';

export type ViewerSettings = {
  initialZoomMode: ViewerZoomMode;
  initialScale: number;
  wheelAction: WheelAction;
  rotationStep: number;
  renderQuality: RenderQuality;
  pageLayout: PageLayout;
  defaultFitMode: FitMode;
};

export type ExternalToolSettings = {
  qpdfPath: string | null;
  tesseractPath: string | null;
};

export type OutputSettings = {
  defaultFolder: string | null;
  openFolderAfterJob: boolean;
};

export type PrivacySettings = {
  recordRecentFiles: boolean;
  recentFilesLimit: number;
  tempCleanup: TempCleanupMode;
};

export type OcrSettings = {
  defaultLanguage: string;
};

export type PerformanceSettings = {
  streamingThresholdMb: number;
};

export type UpdateSettings = {
  checkOnStartup: boolean;
};

export type UiSettings = {
  theme: ThemeMode;
  showShortcutHelp: boolean;
};

export type SessionSettings = {
  restoreTabs: boolean;
};

export type AppSettings = {
  viewer: ViewerSettings;
  externalTools: ExternalToolSettings;
  output: OutputSettings;
  privacy: PrivacySettings;
  ocr: OcrSettings;
  performance: PerformanceSettings;
  update: UpdateSettings;
  ui: UiSettings;
  session: SessionSettings;
};

export const DEFAULT_SETTINGS: AppSettings = {
  viewer: {
    initialZoomMode: 'custom',
    initialScale: 1.2,
    wheelAction: 'scroll',
    rotationStep: 90,
    renderQuality: 'auto',
    pageLayout: 'single',
    defaultFitMode: 'custom',
  },
  externalTools: { qpdfPath: null, tesseractPath: null },
  output: { defaultFolder: null, openFolderAfterJob: false },
  privacy: { recordRecentFiles: true, recentFilesLimit: 20, tempCleanup: 'on-exit' },
  ocr: { defaultLanguage: 'kor+eng' },
  performance: { streamingThresholdMb: 250 },
  update: { checkOnStartup: true },
  ui: { theme: 'dark', showShortcutHelp: false },
  session: { restoreTabs: true },
};

export type DocTab = {
  id: string;
  file: PdfFilePayload;
  viewer: ViewerState;
};

export type PersistedTab = {
  path: string;
  currentPage: number;
  scale: number;
  rotation: number;
  layout: string;
  fitMode: string;
};

export type TabState = {
  tabs: PersistedTab[];
  activeIndex: number | null;
};

export interface RedactionArea {
  id: string;
  pageNumber: number;
  x: number;      // PDF unrotated point space
  y: number;      // PDF unrotated point space
  width: number;  // PDF unrotated point space
  height: number; // PDF unrotated point space
}

/**
 * v0.17.0 Fill & Sign 스탬프 도구.
 * `text` / `check` / `cross` / `dot` / `date`: 텍스트 또는 단일 문자 스탬프.
 * `imageSig`: 이미지(PNG/JPG)에서 임포트한 서명. payload는 dataURL.
 * `drawnSig`: 마우스로 그린 서명 PNG. payload는 dataURL.
 */
export type StampType = 'text' | 'check' | 'cross' | 'dot' | 'date' | 'imageSig' | 'drawnSig';

/**
 * 자유 스탬프 / 서명 데이터.
 * 좌표는 RedactionArea와 동일하게 unrotated 72dpi PDF Point 기준.
 */
export interface StampElement {
  id: string;
  pageNumber: number;
  type: StampType;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 텍스트형 스탬프의 표시 내용. 이미지형 스탬프는 빈 문자열. */
  text: string;
  /** 텍스트형 스탬프의 폰트 크기 (PDF point). */
  fontSize: number;
  /** 텍스트 색상 (#RRGGBB). 이미지형은 무시. */
  color: string;
  /** 이미지형 스탬프의 PNG dataURL. */
  imageDataUrl?: string;
}

/**
 * 사용자가 SignPanel에서 그리거나 임포트해 둔 서명 라이브러리 엔트리.
 * localStorage에 영속화하여 다음 세션에서도 재사용.
 */
export interface SavedSignature {
  id: string;
  label: string;
  /** 'drawn' = 캔버스 그리기, 'image' = 파일 임포트. */
  kind: 'drawn' | 'image';
  dataUrl: string;
  createdAt: string;
}

/**
 * SignPanel에서 현재 선택된 도구.
 * `null`이면 모드 미활성 상태.
 */
export type SignTool =
  | { kind: 'text' }
  | { kind: 'check' }
  | { kind: 'cross' }
  | { kind: 'dot' }
  | { kind: 'date' }
  | { kind: 'signature'; signatureId: string };

