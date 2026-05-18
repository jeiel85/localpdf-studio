import { describe, expect, it } from 'vitest';
import { base64ToUint8Array, formatBytes } from './base64';

describe('base64ToUint8Array', () => {
  it('decodes empty string to empty array', () => {
    expect(base64ToUint8Array('').length).toBe(0);
  });

  it('decodes "AAA=" to bytes', () => {
    const out = base64ToUint8Array('AAA=');
    expect(Array.from(out)).toEqual([0, 0]);
  });

  it('decodes PDF magic bytes', () => {
    // '%PDF' = 0x25 50 44 46 -> base64 "JVBERg=="
    const out = base64ToUint8Array('JVBERg==');
    expect(Array.from(out)).toEqual([0x25, 0x50, 0x44, 0x46]);
  });
});

describe('formatBytes', () => {
  it('formats bytes under 1024', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats KB', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(2048)).toBe('2.00 KB');
    expect(formatBytes(10 * 1024)).toBe('10.0 KB');
  });

  it('formats MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(formatBytes(250 * 1024 * 1024)).toBe('250.0 MB');
  });

  it('formats GB', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
  });
});
