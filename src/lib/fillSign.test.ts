import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PDFDocument, PDFTextField } from 'pdf-lib';
import { applyFillAndSign, dataUrlToUint8Array, stampDisplayText } from './fillSign';
import type { StampElement } from '../types';

async function createBlankPdfBase64(): Promise<string> {
  const doc = await PDFDocument.create();
  doc.addPage([600, 800]);
  const bytes = await doc.save();
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

async function createPdfWithFormBase64(): Promise<string> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  const form = doc.getForm();
  const textField = form.createTextField('test.field');
  textField.setText('hello');
  textField.addToPage(page, { x: 50, y: 700, width: 200, height: 20 });
  const bytes = await doc.save();
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function makeTextStamp(overrides: Partial<StampElement> = {}): StampElement {
  return {
    id: 's-1',
    pageNumber: 1,
    type: 'text',
    x: 100,
    y: 600,
    width: 120,
    height: 24,
    text: 'Hello LocalPDF',
    fontSize: 14,
    color: '#000000',
    ...overrides,
  };
}

describe('stampDisplayText', () => {
  it('uses default glyph when text empty for symbol stamps', () => {
    expect(stampDisplayText(makeTextStamp({ type: 'check', text: '' }))).toBe('✓');
    expect(stampDisplayText(makeTextStamp({ type: 'cross', text: '' }))).toBe('✕');
    expect(stampDisplayText(makeTextStamp({ type: 'dot', text: '' }))).toBe('●');
  });

  it('returns today date when date stamp has no explicit text', () => {
    const out = stampDisplayText(makeTextStamp({ type: 'date', text: '' }));
    expect(/^\d{4}-\d{2}-\d{2}$/.test(out)).toBe(true);
  });

  it('respects explicit text when provided', () => {
    expect(stampDisplayText(makeTextStamp({ type: 'check', text: 'OK' }))).toBe('OK');
    expect(stampDisplayText(makeTextStamp({ type: 'date', text: '2026-01-01' }))).toBe('2026-01-01');
  });
});

describe('dataUrlToUint8Array', () => {
  it('parses a base64 PNG data URL', () => {
    // 1x1 transparent PNG
    const url =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const { mime, bytes } = dataUrlToUint8Array(url);
    expect(mime).toBe('image/png');
    expect(bytes.length).toBeGreaterThan(20);
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
  });

  it('throws on malformed data URL', () => {
    expect(() => dataUrlToUint8Array('not-a-data-url')).toThrow();
  });
});

describe('applyFillAndSign', () => {
  let blankBase64: string;
  let formBase64: string;

  beforeEach(async () => {
    blankBase64 = await createBlankPdfBase64();
    formBase64 = await createPdfWithFormBase64();
  });

  function makeInvokeFn(initialBase64: string) {
    const saved: { path?: string; base64?: string } = {};
    const invokeFn = vi.fn().mockImplementation((cmd: string, args?: Record<string, unknown>) => {
      if (cmd === 'read_file_bytes') return Promise.resolve(initialBase64);
      if (cmd === 'save_binary_file') {
        saved.path = args?.path as string;
        saved.base64 = args?.base64Data as string;
        return Promise.resolve();
      }
      return Promise.reject(new Error(`Unknown command: ${cmd}`));
    });
    return { invokeFn, saved };
  }

  it('writes a text stamp into the output PDF without throwing', async () => {
    const { invokeFn, saved } = makeInvokeFn(blankBase64);
    await applyFillAndSign({
      inputFilePath: 'in.pdf',
      outputFilePath: 'out.pdf',
      stamps: [makeTextStamp()],
      flattenForm: false,
      invokeFn,
    });

    expect(invokeFn).toHaveBeenCalledWith('read_file_bytes', { path: 'in.pdf' });
    expect(saved.path).toBe('out.pdf');
    expect(saved.base64).toBeTruthy();

    const reloaded = await PDFDocument.load(base64ToBytes(saved.base64!));
    expect(reloaded.getPageCount()).toBe(1);
  });

  it('writes an image (drawnSig) stamp via embedPng', async () => {
    const { invokeFn, saved } = makeInvokeFn(blankBase64);
    // 1x1 transparent PNG dataURL
    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const stamp: StampElement = {
      id: 'sig-1',
      pageNumber: 1,
      type: 'drawnSig',
      x: 50,
      y: 50,
      width: 200,
      height: 80,
      text: '',
      fontSize: 14,
      color: '#000000',
      imageDataUrl: tinyPng,
    };

    await applyFillAndSign({
      inputFilePath: 'in.pdf',
      outputFilePath: 'out.pdf',
      stamps: [stamp],
      flattenForm: false,
      invokeFn,
    });

    expect(saved.base64).toBeTruthy();
    const reloaded = await PDFDocument.load(base64ToBytes(saved.base64!));
    expect(reloaded.getPageCount()).toBe(1);
  });

  it('flattens AcroForm when flattenForm is true', async () => {
    const { invokeFn, saved } = makeInvokeFn(formBase64);

    // sanity: input has at least one field
    const inputDoc = await PDFDocument.load(base64ToBytes(formBase64));
    expect(inputDoc.getForm().getFields().length).toBeGreaterThan(0);

    await applyFillAndSign({
      inputFilePath: 'in.pdf',
      outputFilePath: 'out.pdf',
      stamps: [],
      flattenForm: true,
      invokeFn,
    });

    const outDoc = await PDFDocument.load(base64ToBytes(saved.base64!));
    // After flatten, AcroForm fields are removed.
    expect(outDoc.getForm().getFields().length).toBe(0);
  });

  it('preserves AcroForm fields when flattenForm is false', async () => {
    const { invokeFn, saved } = makeInvokeFn(formBase64);
    await applyFillAndSign({
      inputFilePath: 'in.pdf',
      outputFilePath: 'out.pdf',
      stamps: [],
      flattenForm: false,
      invokeFn,
    });
    const outDoc = await PDFDocument.load(base64ToBytes(saved.base64!));
    const fields = outDoc.getForm().getFields();
    expect(fields.length).toBeGreaterThan(0);
    expect(fields[0] instanceof PDFTextField).toBe(true);
  });

  it('reports progress for each target page', async () => {
    const { invokeFn } = makeInvokeFn(blankBase64);
    const progress: { done: number; total: number }[] = [];
    await applyFillAndSign({
      inputFilePath: 'in.pdf',
      outputFilePath: 'out.pdf',
      stamps: [makeTextStamp({ pageNumber: 1 })],
      flattenForm: false,
      onProgress: (done, total) => progress.push({ done, total }),
      invokeFn,
    });
    expect(progress.length).toBeGreaterThanOrEqual(2);
    expect(progress[progress.length - 1]).toEqual({ done: 1, total: 1 });
  });
});
