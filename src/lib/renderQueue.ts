/**
 * Simple cooperative render queue. PDF.js rasterizes on the main thread, so
 * kicking off many page renders simultaneously starves UI events (scroll, input).
 * We serialize renders with a small concurrency limit and let callers cancel
 * before their turn begins.
 *
 * Each entry returns a Promise that resolves with whatever the task returns.
 * The task receives a `shouldCancel()` check it can use to bail early.
 */

export type RenderTask<T> = (shouldCancel: () => boolean) => Promise<T>;

export type EnqueueResult<T> = {
  promise: Promise<T | null>;
  cancel: () => void;
};

export class RenderQueue {
  private active = 0;
  private readonly concurrency: number;
  private queue: Array<{
    run: RenderTask<unknown>;
    resolve: (v: unknown) => void;
    reject: (e: unknown) => void;
    cancelled: boolean;
  }> = [];

  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }

  enqueue<T>(task: RenderTask<T>): EnqueueResult<T> {
    let cancelRef: { cancelled: boolean } = { cancelled: false };
    const promise = new Promise<T | null>((resolve, reject) => {
      const entry = {
        run: task as RenderTask<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject,
        cancelled: false,
      };
      cancelRef = entry;
      this.queue.push(entry);
      this.drain();
    });

    return {
      promise,
      cancel: () => {
        cancelRef.cancelled = true;
      },
    };
  }

  private drain(): void {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const entry = this.queue.shift()!;
      if (entry.cancelled) {
        entry.resolve(null);
        continue;
      }
      this.active += 1;
      entry
        .run(() => entry.cancelled)
        .then((value) => entry.resolve(value))
        .catch((err) => entry.reject(err))
        .finally(() => {
          this.active -= 1;
          this.drain();
        });
    }
  }
}

export const pdfRenderQueue = new RenderQueue(1);
