import { DEFAULT_SETTINGS, type AppSettings, type ExternalToolStatus } from '../types';

export function makeTools(overrides: Partial<ExternalToolStatus>[] = []): ExternalToolStatus[] {
  const base: ExternalToolStatus[] = [
    {
      name: 'qpdf',
      displayName: 'qpdf',
      available: false,
      path: null,
      version: null,
      requiredFor: ['병합', '분할', '암호화', '최적화'],
    },
    {
      name: 'tesseract',
      displayName: 'Tesseract OCR',
      available: false,
      path: null,
      version: null,
      requiredFor: ['OCR', '스캔 PDF 텍스트화'],
    },
  ];
  overrides.forEach((o, i) => {
    if (base[i]) base[i] = { ...base[i], ...o };
  });
  return base;
}

export function cloneSettings(partial?: Partial<AppSettings>): AppSettings {
  return { ...DEFAULT_SETTINGS, ...(partial ?? {}) };
}
