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

export type SidebarTab = 'document' | 'thumbnails' | 'outline' | 'search' | 'merge' | 'tools' | 'advanced';

export type DocTab = {
  id: string;
  file: PdfFilePayload;
  viewer: ViewerState;
};
