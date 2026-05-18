import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// pdf.js requires DOMMatrix which is not available in jsdom
if (typeof DOMMatrix === 'undefined') {
  (globalThis as Record<string, unknown>).DOMMatrix = class {
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(init?: number[] | string) {
      if (!init) return;
      if (Array.isArray(init) && init.length === 6) {
        this.m11 = init[0]; this.m12 = init[1];
        this.m21 = init[2]; this.m22 = init[3];
        this.m41 = init[4]; this.m42 = init[5];
        this.is2D = true;
        this.isIdentity = false;
      }
      if (Array.isArray(init) && init.length === 16) {
        this.m11 = init[0]; this.m12 = init[1]; this.m13 = init[2]; this.m14 = init[3];
        this.m21 = init[4]; this.m22 = init[5]; this.m23 = init[6]; this.m24 = init[7];
        this.m31 = init[8]; this.m32 = init[9]; this.m33 = init[10]; this.m34 = init[11];
        this.m41 = init[12]; this.m42 = init[13]; this.m43 = init[14]; this.m44 = init[15];
        if (init[2] !== 0 || init[6] !== 0 || init[8] !== 0 || init[9] !== 0 ||
            init[10] !== 1 || init[11] !== 0 || init[14] !== 0 || init[15] !== 1) {
          this.is2D = false;
        }
        this.isIdentity = false;
      }
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    rotateFromVector() { return this; }
    rotateAxisAngle() { return this; }
    skewX() { return this; }
    skewY() { return this; }
    invert() { return this; }
    transformPoint() {
      return { x: 0, y: 0, z: 0, w: 1 } as unknown as DOMPoint;
    }
    toFloat32Array() { return new Float32Array(16); }
    toFloat64Array() { return new Float64Array(16); }
    toString() { return `matrix(1, 0, 0, 1, 0, 0)`; }
  } as unknown as typeof DOMMatrix;
}
