import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import type { StampElement } from '../types';
import { base64ToUint8Array } from './base64';

function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function dataUrlToUint8Array(dataUrl: string): { mime: string; bytes: Uint8Array } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('지원하지 않는 dataURL 형식입니다.');
  }
  const mime = match[1];
  const bytes = base64ToUint8Array(match[2]);
  return { mime, bytes };
}

function hexToRgb01(color: string): { r: number; g: number; b: number } {
  const cleaned = color.trim().replace(/^#/, '');
  if (cleaned.length !== 6) return { r: 0, g: 0, b: 0 };
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  if ([r, g, b].some((v) => Number.isNaN(v))) return { r: 0, g: 0, b: 0 };
  return { r, g, b };
}

/**
 * 텍스트형 스탬프(text/check/cross/dot/date)의 실제 표시 문자열을 결정한다.
 * date는 stamp.text가 비어있으면 오늘 날짜로 채운다.
 */
export function stampDisplayText(stamp: StampElement): string {
  if (stamp.type === 'check') return stamp.text || '✓';
  if (stamp.type === 'cross') return stamp.text || '✕';
  if (stamp.type === 'dot') return stamp.text || '●';
  if (stamp.type === 'date') {
    if (stamp.text) return stamp.text;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return stamp.text ?? '';
}

async function drawTextStamp(
  page: PDFPage,
  stamp: StampElement,
  font: PDFFont,
): Promise<void> {
  const text = stampDisplayText(stamp);
  if (!text) return;
  const { r, g, b } = hexToRgb01(stamp.color);
  // pdf-lib 좌표는 좌하단 기준. 텍스트 baseline은 박스 하단보다 약간 위로 띄움.
  const baselinePadding = Math.max(2, stamp.fontSize * 0.2);
  page.drawText(text, {
    x: stamp.x + Math.max(1, stamp.fontSize * 0.1),
    y: stamp.y + baselinePadding,
    size: stamp.fontSize,
    font,
    color: rgb(r, g, b),
  });
}

async function drawImageStamp(
  pdfDoc: PDFDocument,
  page: PDFPage,
  stamp: StampElement,
): Promise<void> {
  if (!stamp.imageDataUrl) return;
  const { mime, bytes } = dataUrlToUint8Array(stamp.imageDataUrl);
  const embedded = mime.includes('jpeg') || mime.includes('jpg')
    ? await pdfDoc.embedJpg(bytes)
    : await pdfDoc.embedPng(bytes);
  page.drawImage(embedded, {
    x: stamp.x,
    y: stamp.y,
    width: stamp.width,
    height: stamp.height,
  });
}

/**
 * 화이트 배경 픽셀을 투명으로 바꾼 PNG dataURL을 만든다.
 * 이미지 서명에서 배경을 자동으로 떼기 위한 용도.
 * 입력 dataURL이 SSR/Node 환경처럼 캔버스를 못 쓰면 원본을 그대로 반환.
 */
export async function removeWhiteBackgroundFromDataUrl(
  dataUrl: string,
  threshold = 235,
): Promise<string> {
  if (typeof window === 'undefined' || typeof window.document === 'undefined') return dataUrl;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
    img.src = dataUrl;
  });
  const canvas = window.document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      px[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * v0.17.0 Fill & Sign 메인 저장 파이프라인.
 *
 * - 자유 스탬프(텍스트/✓/✕/●/날짜/이미지/그린 서명)을 페이지에 그린다.
 * - 옵션에 따라 AcroForm 필드를 평탄화(flatten)하여 편집 불가능한 정적 PDF로 만든다.
 * - 결과를 outputFilePath에 저장한다.
 */
export async function applyFillAndSign(params: {
  inputFilePath: string;
  outputFilePath: string;
  stamps: StampElement[];
  flattenForm: boolean;
  onProgress?: (done: number, total: number) => void;
  invokeFn: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}): Promise<void> {
  const { inputFilePath, outputFilePath, stamps, flattenForm, onProgress, invokeFn } = params;

  const b64Bytes = await invokeFn<string>('read_file_bytes', { path: inputFilePath });
  const pdfBytes = base64ToUint8Array(b64Bytes);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const docPages = pdfDoc.getPages();

  const stampsByPage = new Map<number, StampElement[]>();
  for (const s of stamps) {
    if (!stampsByPage.has(s.pageNumber)) stampsByPage.set(s.pageNumber, []);
    stampsByPage.get(s.pageNumber)!.push(s);
  }

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const targets = Array.from(stampsByPage.keys()).sort((a, b) => a - b);
  let completed = 0;
  const total = targets.length || 1;

  for (const pageNum of targets) {
    const page = docPages[pageNum - 1];
    if (!page) continue;
    const pageStamps = stampsByPage.get(pageNum) ?? [];
    onProgress?.(completed, total);

    for (const stamp of pageStamps) {
      try {
        if (stamp.type === 'imageSig' || stamp.type === 'drawnSig') {
          await drawImageStamp(pdfDoc, page, stamp);
        } else {
          await drawTextStamp(page, stamp, helvetica);
        }
      } catch {
        // 단일 스탬프 실패는 비치명적: 다른 스탬프는 계속 진행
      }
    }
    completed += 1;
  }
  onProgress?.(completed, total);

  if (flattenForm) {
    try {
      const form = pdfDoc.getForm();
      if (form.getFields().length > 0) {
        form.flatten();
      }
    } catch {
      // AcroForm이 없거나 flatten 실패는 비치명적
    }
  }

  const finalBytes = await pdfDoc.save();
  const base64 = uint8ToBase64(finalBytes);
  await invokeFn('save_binary_file', { path: outputFilePath, base64Data: base64 });
}
