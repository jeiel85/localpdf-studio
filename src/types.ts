export type PdfFilePayload = {
  path: string;
  fileName: string;
  sizeBytes: number;
  base64Data: string;
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
