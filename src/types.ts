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

export type SidebarTab = 'document' | 'thumbnails' | 'outline' | 'search' | 'merge' | 'tools' | 'advanced' | 'editor' | 'metadata' | 'form' | 'bookmarks' | 'compare' | 'settings';

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
