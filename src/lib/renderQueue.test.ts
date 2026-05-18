import { describe, expect, it } from 'vitest';
import { RenderQueue } from './renderQueue';

function defer<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('RenderQueue', () => {
  it('serializes tasks with concurrency 1', async () => {
    const q = new RenderQueue(1);
    const events: string[] = [];
    const a = defer<void>();
    const b = defer<void>();

    const t1 = q.enqueue(async () => {
      events.push('t1-start');
      await a.promise;
      events.push('t1-end');
      return 'A';
    });
    const t2 = q.enqueue(async () => {
      events.push('t2-start');
      await b.promise;
      events.push('t2-end');
      return 'B';
    });

    // Let microtasks settle: only t1 should have started
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(['t1-start']);

    a.resolve();
    expect(await t1.promise).toBe('A');
    // Allow drain microtask + new task start microtask to flush
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
    expect(events).toContain('t2-start');

    b.resolve();
    expect(await t2.promise).toBe('B');
    expect(events).toEqual(['t1-start', 't1-end', 't2-start', 't2-end']);
  });

  it('allows higher concurrency', async () => {
    const q = new RenderQueue(2);
    const events: string[] = [];
    const a = defer<void>();
    const b = defer<void>();

    const t1 = q.enqueue(async () => {
      events.push('t1-start');
      await a.promise;
      return 1;
    });
    const t2 = q.enqueue(async () => {
      events.push('t2-start');
      await b.promise;
      return 2;
    });

    await Promise.resolve();
    await Promise.resolve();
    // Both should be active simultaneously with concurrency 2
    expect(events).toEqual(['t1-start', 't2-start']);

    a.resolve();
    b.resolve();
    await Promise.all([t1.promise, t2.promise]);
  });

  it('skips queued tasks that are cancelled before their turn', async () => {
    const q = new RenderQueue(1);
    const ran: string[] = [];
    const blocker = defer<void>();

    const first = q.enqueue(async () => {
      ran.push('first');
      await blocker.promise;
      return 'first';
    });
    const second = q.enqueue(async () => {
      ran.push('second'); // should not run
      return 'second';
    });

    second.cancel();
    blocker.resolve();
    const r2 = await second.promise;
    await first.promise;

    expect(ran).toEqual(['first']);
    expect(r2).toBeNull();
  });

  it('signals shouldCancel to a task that is already running', async () => {
    const q = new RenderQueue(1);
    let observed = false;
    const release = defer<void>();

    const handle = q.enqueue(async (shouldCancel) => {
      // Wait for the test to invoke cancel before checking
      await release.promise;
      observed = shouldCancel();
      return 'done';
    });

    handle.cancel();
    release.resolve();
    const result = await handle.promise;

    expect(observed).toBe(true);
    expect(result).toBe('done');
  });
});
