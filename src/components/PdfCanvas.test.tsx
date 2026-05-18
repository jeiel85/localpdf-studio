import { describe, expect, it } from 'vitest';
import { computeFitScale, renderQualityToScale } from './PdfCanvas';

describe('computeFitScale', () => {
  const baseDims = { baseWidth: 600, baseHeight: 800 };

  it('returns customScale when mode is "custom"', () => {
    expect(
      computeFitScale({
        fitMode: 'custom',
        customScale: 1.5,
        ...baseDims,
        containerWidth: 1200,
        containerHeight: 1600,
      }),
    ).toBe(1.5);
  });

  it('returns exactly 1 for "actual"', () => {
    expect(
      computeFitScale({
        fitMode: 'actual',
        customScale: 5,
        ...baseDims,
        containerWidth: 100,
        containerHeight: 100,
      }),
    ).toBe(1);
  });

  it('fits to width: scale = containerWidth / baseWidth', () => {
    expect(
      computeFitScale({
        fitMode: 'fit-width',
        customScale: 1,
        ...baseDims,
        containerWidth: 1200,
        containerHeight: 99999,
      }),
    ).toBe(2);
  });

  it('fits to page: chooses smaller of width/height scale', () => {
    // Tall container — width is the limit
    expect(
      computeFitScale({
        fitMode: 'fit-page',
        customScale: 1,
        ...baseDims,
        containerWidth: 600,
        containerHeight: 2000,
      }),
    ).toBe(1);
    // Wide container — height is the limit
    expect(
      computeFitScale({
        fitMode: 'fit-page',
        customScale: 1,
        ...baseDims,
        containerWidth: 6000,
        containerHeight: 400,
      }),
    ).toBe(0.5);
  });

  it('falls back to customScale when container has zero size', () => {
    expect(
      computeFitScale({
        fitMode: 'fit-width',
        customScale: 0.8,
        ...baseDims,
        containerWidth: 0,
        containerHeight: 0,
      }),
    ).toBe(0.8);
  });
});

describe('renderQualityToScale', () => {
  it('returns 1 for "low"', () => {
    expect(renderQualityToScale('low')).toBe(1);
  });

  it('returns at least 2 for "high"', () => {
    expect(renderQualityToScale('high')).toBeGreaterThanOrEqual(2);
  });

  it('returns DPR-based value for "auto"', () => {
    // jsdom defaults devicePixelRatio to 1; just verify it's a positive number
    const v = renderQualityToScale('auto');
    expect(v).toBeGreaterThan(0);
  });
});
