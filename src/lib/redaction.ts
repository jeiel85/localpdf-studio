import { PDFDocument } from 'pdf-lib';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { RedactionArea } from '../types';
import { pdfRenderQueue } from './renderQueue';
import { base64ToUint8Array } from './base64';

function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function applyRedactions(params: {
  pdfjsDoc: PDFDocumentProxy;
  inputFilePath: string;
  outputFilePath: string;
  redactions: RedactionArea[];
  useRaster: boolean;
  onProgress: (done: number, total: number) => void;
  invokeFn: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}): Promise<void> {
  const { pdfjsDoc, inputFilePath, outputFilePath, redactions, useRaster, onProgress, invokeFn } = params;

  // 1. 원본 PDF 파일을 읽어 pdf-lib로 로드
  const b64Bytes = await invokeFn<string>('read_file_bytes', { path: inputFilePath });
  const pdfBytes = base64ToUint8Array(b64Bytes);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const docPages = pdfDoc.getPages();

  // 2. 마스킹이 설정된 페이지 목록 추출 및 그룹화
  const redactionsMap = new Map<number, RedactionArea[]>();
  for (const r of redactions) {
    if (!redactionsMap.has(r.pageNumber)) {
      redactionsMap.set(r.pageNumber, []);
    }
    redactionsMap.get(r.pageNumber)!.push(r);
  }

  const targetPages = Array.from(redactionsMap.keys()).sort((a, b) => a - b);

  if (useRaster) {
    // 래스터화 마스킹
    let completed = 0;
    for (const pageNum of targetPages) {
      const pageRedacts = redactionsMap.get(pageNum) ?? [];
      if (pageRedacts.length === 0) continue;

      onProgress(completed, targetPages.length);

      // PDF.js를 통해 타겟 페이지를 300DPI로 캔버스 렌더링 및 마스킹 처리
      const imageBlob = await pdfRenderQueue.enqueue<Blob>(async (shouldCancel) => {
        if (shouldCancel()) return null as unknown as Blob;
        const page = await pdfjsDoc.getPage(pageNum);
        if (shouldCancel()) return null as unknown as Blob;

        // 300 DPI 렌더링 스케일 (72 DPI 기준의 4.167배)
        const dpiScale = 300 / 72;
        const viewport = page.getViewport({ scale: dpiScale, rotation: 0 }); // unrotated 기준

        const canvas = window.document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        
        // 렌더링
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (shouldCancel()) return null as unknown as Blob;

        // 캔버스 좌표계에 직접 블랙 아웃 박스 덮어 씌우기
        const pdfBaseViewport = page.getViewport({ scale: 1, rotation: 0 });
        const scaleX = viewport.width / pdfBaseViewport.width;
        const scaleY = viewport.height / pdfBaseViewport.height;

        ctx.fillStyle = '#000000';
        for (const r of pageRedacts) {
          // PDF point (좌하단 기준) -> HTML Canvas (좌상단 기준) 변환
          const x = r.x * scaleX;
          const y = (pdfBaseViewport.height - r.y - r.height) * scaleY;
          const w = r.width * scaleX;
          const h = r.height * scaleY;

          ctx.fillRect(x, y, w, h);
        }

        return await new Promise<Blob>((resolve) =>
          canvas.toBlob((b: Blob | null) => resolve(b!), 'image/png'),
        );
      }).promise;

      if (!imageBlob) continue;

      const imgBuffer = await imageBlob.arrayBuffer();
      const imgBytes = new Uint8Array(imgBuffer);

      // pdf-lib에서 PNG 이미지 embed
      const embeddedImg = await pdfDoc.embedPng(imgBytes);

      // 기존 페이지의 내용을 완전히 제거하고 래스터화된 단일 이미지로 대체
      const origPage = docPages[pageNum - 1];
      const { width, height } = origPage.getSize();

      // 기존 드로잉 리소스를 지우고 이미지를 크게 그리기 위해 신규 페이지 삽입 및 삭제 교체 전략 적용
      const newPage = pdfDoc.insertPage(pageNum - 1, [width, height]);
      newPage.drawImage(embeddedImg, { x: 0, y: 0, width, height });
      
      // 구 페이지 삭제
      pdfDoc.removePage(pageNum);

      completed += 1;
    }
    onProgress(completed, targetPages.length);
  } else {
    // 벡터 마스킹
    let completed = 0;
    for (const pageNum of targetPages) {
      const pageRedacts = redactionsMap.get(pageNum) ?? [];
      const page = docPages[pageNum - 1];
      if (!page) continue;

      onProgress(completed, targetPages.length);

      for (const r of pageRedacts) {
        page.drawRectangle({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          color: { type: 'RGB', red: 0, green: 0, blue: 0 } as never,
          opacity: 1.0,
        });
      }
      completed += 1;
    }
    onProgress(completed, targetPages.length);
  }

  // 3. 파일 저장
  const finalBytes = await pdfDoc.save();
  const base64 = uint8ToBase64(finalBytes);
  await invokeFn('save_binary_file', { path: outputFilePath, base64Data: base64 });
}
