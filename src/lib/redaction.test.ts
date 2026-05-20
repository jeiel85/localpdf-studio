import { describe, expect, it, vi, beforeEach } from 'vitest';
import { applyRedactions } from './redaction';
import { PDFDocument, PDFPage } from 'pdf-lib';

// pdf-lib 모듈을 모킹할 필요가 없거나 일부만 모킹 가능하지만, 
// 실제 빈 PDF 문서를 활용하여 동작을 확인하는 것이 가장 신뢰성 있습니다.
// pdf-lib를 이용하여 최소한의 유효한 PDF 바이트를 생성하는 유틸리티 함수
async function createMockPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([600, 800]); // 1페이지 추가
  return await doc.save();
}

function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

describe('applyRedactions', () => {
  let mockPdfBytes: Uint8Array;
  let mockPdfBase64: string;

  beforeEach(async () => {
    mockPdfBytes = await createMockPdfBytes();
    mockPdfBase64 = uint8ToBase64(mockPdfBytes);
  });

  it('performs vector redaction correctly', async () => {
    const invokeFn = vi.fn().mockImplementation((cmd, args) => {
      if (cmd === 'read_file_bytes') {
        return Promise.resolve(mockPdfBase64);
      }
      if (cmd === 'save_binary_file') {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`Unknown command: ${cmd}`));
    });

    const mockPdfjsDoc = {
      getPage: vi.fn(),
    } as any;

    const redactions = [
      {
        id: 'redact-1',
        pageNumber: 1,
        x: 100,
        y: 150,
        width: 50,
        height: 30,
      },
    ];

    const progressCalls: { done: number; total: number }[] = [];
    const onProgress = (done: number, total: number) => {
      progressCalls.push({ done, total });
    };

    await applyRedactions({
      pdfjsDoc: mockPdfjsDoc,
      inputFilePath: 'input.pdf',
      outputFilePath: 'output.pdf',
      redactions,
      useRaster: false, // 벡터 마스킹
      onProgress,
      invokeFn,
    });

    // 1. read_file_bytes가 호출되었는지 확인
    expect(invokeFn).toHaveBeenCalledWith('read_file_bytes', { path: 'input.pdf' });

    // 2. save_binary_file이 호출되었는지 확인
    expect(invokeFn).toHaveBeenCalledWith('save_binary_file', expect.objectContaining({
      path: 'output.pdf',
      base64Data: expect.any(String),
    }));

    // 3. progress 콜백이 호출되었는지 확인
    expect(progressCalls).toContainEqual({ done: 0, total: 1 });
    expect(progressCalls).toContainEqual({ done: 1, total: 1 });

    // 4. 저장된 PDF 데이터를 파싱하여 사각형 그리기 등 상태 확인
    const savedBase64 = invokeFn.mock.calls.find(call => call[0] === 'save_binary_file')![1].base64Data;
    const binary = atob(savedBase64);
    const savedBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      savedBytes[i] = binary.charCodeAt(i);
    }

    const loadedDoc = await PDFDocument.load(savedBytes);
    expect(loadedDoc.getPageCount()).toBe(1);
  });

  it('performs raster redaction correctly (canvas flow mocked)', async () => {
    // 래스터 마스킹의 경우 jsdom 환경에서 Canvas 및 PDF.js의 렌더링 호출이 발생합니다.
    // HTML5 Canvas와 PDF.js getPage API 모의가 필요합니다.
    const invokeFn = vi.fn().mockImplementation((cmd, args) => {
      if (cmd === 'read_file_bytes') {
        return Promise.resolve(mockPdfBase64);
      }
      if (cmd === 'save_binary_file') {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`Unknown command: ${cmd}`));
    });

    // Canvas mock
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        fillRect: vi.fn(),
        fillStyle: '',
      }),
      toBlob: (cb: any) => cb(new Blob(['mock-image-data'], { type: 'image/png' })),
    };

    const spyCreateElement = vi.spyOn(window.document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return document.createElement(tagName);
    });

    const mockViewport = {
      width: 600,
      height: 800,
    };

    const mockPage = {
      getViewport: () => mockViewport,
      render: () => ({
        promise: Promise.resolve(),
      }),
    };

    const mockPdfjsDoc = {
      getPage: vi.fn().mockResolvedValue(mockPage),
    } as any;

    const redactions = [
      {
        id: 'redact-2',
        pageNumber: 1,
        x: 200,
        y: 300,
        width: 100,
        height: 50,
      },
    ];

    const progressCalls: { done: number; total: number }[] = [];
    const onProgress = (done: number, total: number) => {
      progressCalls.push({ done, total });
    };

    // Blob arrayBuffer 모킹 (Node 18+ 혹은 jsdom에서는 기본 지원될 수 있음)
    // 안전한 테스트를 위해 arrayBuffer를 지원하는 custom Blob/File 형태 주입
    const spyEmbedPng = vi.spyOn(PDFDocument.prototype, 'embedPng').mockResolvedValue({
      scale: (s: number) => ({ width: 100 * s, height: 100 * s }),
      width: 100,
      height: 100,
      ref: {} as any,
    } as any);

    const spyDrawImage = vi.spyOn(PDFPage.prototype, 'drawImage').mockImplementation(() => {
      return {} as any;
    });
    
    await applyRedactions({
      pdfjsDoc: mockPdfjsDoc,
      inputFilePath: 'input.pdf',
      outputFilePath: 'output.pdf',
      redactions,
      useRaster: true, // 래스터화 마스킹
      onProgress,
      invokeFn,
    });

    expect(mockPdfjsDoc.getPage).toHaveBeenCalledWith(1);
    expect(spyDrawImage).toHaveBeenCalled();
    expect(invokeFn).toHaveBeenCalledWith('save_binary_file', expect.objectContaining({
      path: 'output.pdf',
      base64Data: expect.any(String),
    }));

    spyCreateElement.mockRestore();
    spyEmbedPng.mockRestore();
    spyDrawImage.mockRestore();
  });
});
