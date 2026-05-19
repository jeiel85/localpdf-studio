import { useCallback, useEffect, useRef, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { deletePages, getAppDataPath, insertPages, reorderPages, rotatePagesIndividually } from '../lib/tauriCommands';
import { pdfRenderQueue } from '../lib/renderQueue';

interface AutosaveState {
  pageOrder: number[];
  rotations: Record<number, number>;
  savedAt: string;
}

function autosaveKey(filePath: string): string {
  // Simple stable hash from path
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    hash = ((hash << 5) - hash + filePath.charCodeAt(i)) | 0;
  }
  return `autosave_${Math.abs(hash).toString(36)}.json`;
}

interface PageEntry {
  pageNumber: number;
  thumbnailUrl: string | null;
  rotation: number; // 0/90/180/270 (이 페이지에 적용할 추가 회전)
}

export function PageEditorPanel({
  document,
  file,
  pageCount,
  onPageSelect,
  onStatus,
}: {
  document: PDFDocumentProxy | null;
  file: { path: string; fileName: string } | null;
  pageCount: number;
  onPageSelect: (page: number) => void;
  onStatus: (msg: string) => void;
}) {
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const renderRef = useRef<AbortController | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autosavePath, setAutosavePath] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      try {
        const root = await getAppDataPath();
        if (cancelled) return;
        const path = `${root}\\autosave\\${autosaveKey(file.path)}`;
        setAutosavePath(path);
        const existing = await invoke<string>('read_text_file_if_exists', { path });
        if (existing && !cancelled) {
          try {
            const data = JSON.parse(existing) as AutosaveState;
            if (data.pageOrder && data.pageOrder.length > 0 && pageCount > 0) {
              const ok = window.confirm(
                `이 PDF의 미저장 편집 상태(${data.savedAt})가 있습니다. 복구할까요?`,
              );
              if (ok) {
                setPages(
                  data.pageOrder.map((pn) => ({
                    pageNumber: pn,
                    thumbnailUrl: null,
                    rotation: data.rotations[pn] ?? 0,
                  })),
                );
                onStatus('자동 백업에서 복구했습니다.');
              }
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // 편집 상태 변경 시 debounce 자동 저장
  useEffect(() => {
    if (!autosavePath || pages.length === 0) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      const data: AutosaveState = {
        pageOrder: pages.map((p) => p.pageNumber),
        rotations: pages.reduce<Record<number, number>>((acc, p) => {
          if (p.rotation !== 0) acc[p.pageNumber] = p.rotation;
          return acc;
        }, {}),
        savedAt: new Date().toISOString(),
      };
      try {
        await invoke('save_text_file', { path: autosavePath, content: JSON.stringify(data) });
      } catch {
        // silent — non-critical
      }
    }, 1200);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [pages, autosavePath]);

  useEffect(() => {
    if (!document || pageCount === 0) {
      setPages([]);
      setSelected(new Set());
      return;
    }

    renderRef.current?.abort();
    const controller = new AbortController();
    renderRef.current = controller;

    const entries: PageEntry[] = [];
    for (let i = 1; i <= pageCount; i++) {
      entries.push({ pageNumber: i, thumbnailUrl: null, rotation: 0 });
    }
    setPages(entries);

    let cancelled = false;
    const handles: { cancel: () => void }[] = [];
    for (let i = 1; i <= pageCount; i++) {
      const pageNum = i;
      const handle = pdfRenderQueue.enqueue(async (shouldCancel) => {
        if (cancelled || shouldCancel()) return null;
        try {
          const page = await document!.getPage(pageNum);
          if (cancelled || shouldCancel()) return null;
          const viewport = page.getViewport({ scale: 0.18 });
          const canvas = globalThis.document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (cancelled || shouldCancel()) return null;
          const dataUrl = canvas.toDataURL('image/png');
          setPages((prev) => {
            const next = [...prev];
            const idx = next.findIndex((p) => p.pageNumber === pageNum);
            if (idx >= 0) {
              next[idx] = { ...next[idx], thumbnailUrl: dataUrl };
            }
            return next;
          });
        } catch {
          // skip rendering errors
        }
        return null;
      });
      handles.push(handle);
    }

    return () => {
      cancelled = true;
      handles.forEach((h) => h.cancel());
      controller.abort();
    };
  }, [document, pageCount]);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      return;
    }

    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  const handleSelect = useCallback((pageNumber: number, ctrl: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (ctrl) {
        if (next.has(pageNumber)) {
          next.delete(pageNumber);
        } else {
          next.add(pageNumber);
        }
      } else {
        if (next.size === 1 && next.has(pageNumber)) {
          next.clear();
        } else {
          next.clear();
          next.add(pageNumber);
        }
      }
      return next;
    });
  }, []);

  const currentOrder = pages.map((p) => p.pageNumber);

  async function handleReorderApply() {
    if (!file || currentOrder.length === 0) {
      onStatus('PDF 파일 정보가 없습니다.');
      return;
    }

    const isSameOrder = currentOrder.every((p, i) => p === i + 1);
    if (isSameOrder) {
      onStatus('페이지 순서가 변경되지 않았습니다.');
      return;
    }

    const stem = file.path.replace(/\.pdf$/i, '');
    const defaultPath = `${stem}_reordered.pdf`;
    const outPath = await save({
      defaultPath,
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (!outPath) return;

    setRunning(true);
    try {
      const result = await reorderPages(file.path, outPath, currentOrder);
      onStatus(result);
    } catch (error) {
      onStatus(`재정렬 실패: ${(error as Error).message ?? String(error)}`);
    } finally {
      setRunning(false);
    }
  }

  async function handleDeleteSelected() {
    if (!file) {
      onStatus('PDF 파일 정보가 없습니다.');
      return;
    }

    if (selected.size === 0) {
      onStatus('삭제할 페이지를 선택하세요.');
      return;
    }

    if (selected.size >= pages.length) {
      onStatus('모든 페이지를 삭제할 수 없습니다.');
      return;
    }

    const stem = file.path.replace(/\.pdf$/i, '');
    const defaultPath = `${stem}_deleted.pdf`;
    const outPath = await save({
      defaultPath,
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (!outPath) return;

    const deleteList = Array.from(selected).sort((a, b) => a - b);

    setRunning(true);
    try {
      const result = await deletePages(file.path, outPath, deleteList, pageCount);
      onStatus(result);
    } catch (error) {
      onStatus(`삭제 실패: ${(error as Error).message ?? String(error)}`);
    } finally {
      setRunning(false);
    }
  }

  function rotateSelected(delta: number) {
    if (selected.size === 0) {
      onStatus('회전할 페이지를 선택하세요.');
      return;
    }
    setPages((prev) =>
      prev.map((p) =>
        selected.has(p.pageNumber)
          ? { ...p, rotation: ((p.rotation + delta) % 360 + 360) % 360 }
          : p,
      ),
    );
  }

  async function handleRotateApply() {
    if (!file) {
      onStatus('PDF 파일 정보가 없습니다.');
      return;
    }
    const rotations: [number, number][] = pages
      .filter((p) => p.rotation !== 0)
      .map((p) => [p.pageNumber, p.rotation as 90 | 180 | 270]);
    if (rotations.length === 0) {
      onStatus('회전된 페이지가 없습니다.');
      return;
    }
    const stem = file.path.replace(/\.pdf$/i, '');
    const outPath = await save({
      defaultPath: `${stem}_rotated.pdf`,
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (!outPath) return;
    setRunning(true);
    try {
      const result = await rotatePagesIndividually(file.path, outPath, rotations);
      onStatus(result);
      // 회전 상태 초기화
      setPages((prev) => prev.map((p) => ({ ...p, rotation: 0 })));
    } catch (error) {
      onStatus(`회전 실패: ${(error as Error).message ?? String(error)}`);
    } finally {
      setRunning(false);
    }
  }

  async function handleInsertPdf() {
    if (!file) {
      onStatus('PDF 파일 정보가 없습니다.');
      return;
    }

    const insertFile = await open({
      multiple: false,
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (!insertFile || typeof insertFile !== 'string') return;

    const after = selected.size === 1 ? Math.min(...selected) : pages.length;

    const stem = file.path.replace(/\.pdf$/i, '');
    const defaultPath = `${stem}_inserted.pdf`;
    const outPath = await save({
      defaultPath,
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (!outPath) return;

    setRunning(true);
    try {
      const result = await insertPages(file.path, insertFile, outPath, after, pageCount);
      onStatus(result);
    } catch (error) {
      onStatus(`삽입 실패: ${(error as Error).message ?? String(error)}`);
    } finally {
      setRunning(false);
    }
  }

  async function handleResetOrder() {
    if (!document || pageCount === 0) return;
    const entries: PageEntry[] = [];
    for (let i = 1; i <= pageCount; i++) {
      entries.push({ pageNumber: i, thumbnailUrl: null, rotation: 0 });
    }
    setPages(entries);
    setSelected(new Set());

    for (let i = 1; i <= pageCount; i++) {
      const pageNum = i;
      pdfRenderQueue.enqueue(async (shouldCancel) => {
        if (shouldCancel()) return null;
        try {
          const page = await document!.getPage(pageNum);
          if (shouldCancel()) return null;
          const viewport = page.getViewport({ scale: 0.18 });
          const canvas = globalThis.document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (shouldCancel()) return null;
          const dataUrl = canvas.toDataURL('image/png');
          setPages((prev) => {
            const next = [...prev];
            const idx = next.findIndex((p) => p.pageNumber === pageNum);
            if (idx >= 0) {
              next[idx] = { ...next[idx], thumbnailUrl: dataUrl };
            }
            return next;
          });
        } catch {
          // skip
        }
        return null;
      });
    }
  }

  const isReordered = currentOrder.some((p, i) => p !== i + 1);

  if (!document || !file) {
    return <p className="empty-text">PDF를 열면 페이지 편집이 가능합니다.</p>;
  }

  return (
    <div className="page-editor-panel">
      <div className="editor-toolbar">
        <button
          type="button"
          className={`editor-btn primary ${running ? 'disabled' : ''}`}
          disabled={running || !isReordered}
          onClick={handleReorderApply}
        >
          재정렬 적용
        </button>
        <button
          type="button"
          className={`editor-btn danger ${running ? 'disabled' : ''}`}
          disabled={running || selected.size === 0}
          onClick={handleDeleteSelected}
        >
          선택 삭제 ({selected.size})
        </button>
        <button
          type="button"
          className={`editor-btn ${running ? 'disabled' : ''}`}
          disabled={running || selected.size === 0}
          onClick={() => rotateSelected(90)}
          title="선택 페이지 90° 시계방향 회전"
        >
          ↻ 90°
        </button>
        <button
          type="button"
          className={`editor-btn ${running ? 'disabled' : ''}`}
          disabled={running || selected.size === 0}
          onClick={() => rotateSelected(-90)}
          title="선택 페이지 90° 반시계 회전"
        >
          ↺ 90°
        </button>
        <button
          type="button"
          className={`editor-btn primary ${running ? 'disabled' : ''}`}
          disabled={running || pages.every((p) => p.rotation === 0)}
          onClick={handleRotateApply}
        >
          회전 적용
        </button>
        <button
          type="button"
          className={`editor-btn ${running ? 'disabled' : ''}`}
          disabled={running}
          onClick={handleInsertPdf}
        >
          PDF 삽입
        </button>
        <button
          type="button"
          className={`editor-btn ghost ${running ? 'disabled' : ''}`}
          disabled={running || !isReordered}
          onClick={handleResetOrder}
        >
          순서 초기화
        </button>
      </div>

      <p className="editor-hint">
        드래그하여 페이지 순서 변경 · 클릭으로 선택 (Ctrl+클릭 다중 선택)
      </p>

      <div className="editor-grid">
        {pages.map((entry, idx) => {
          const isSelected = selected.has(entry.pageNumber);
          const isDragging = dragIdx === idx;
          return (
            <button
              key={`${entry.pageNumber}-${idx}`}
              type="button"
              className={`editor-page ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={(e) => {
                handleSelect(entry.pageNumber, e.ctrlKey);
                onPageSelect(entry.pageNumber);
              }}
            >
              <span className="editor-page-num">{entry.pageNumber}</span>
              {entry.thumbnailUrl ? (
                <img
                  src={entry.thumbnailUrl}
                  alt={`페이지 ${entry.pageNumber}`}
                  style={{ transform: `rotate(${entry.rotation}deg)`, transition: 'transform 0.2s' }}
                />
              ) : (
                <div className="editor-page-placeholder" />
              )}
              {entry.rotation !== 0 && (
                <span className="editor-page-rotation">{entry.rotation}°</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
