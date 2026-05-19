import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface BookmarkEntry {
  page: number;
  label: string;
  createdAt: string;
}

interface BookmarksFile {
  byPath: Record<string, BookmarkEntry[]>;
}

export function BookmarksPanel({
  file,
  currentPage,
  onPageSelect,
  onStatus,
}: {
  file: { path: string; fileName: string } | null;
  currentPage: number;
  onPageSelect: (page: number) => void;
  onStatus: (msg: string) => void;
}) {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [appDataPath, setAppDataPath] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');

  const storePath = appDataPath ? `${appDataPath}\\bookmarks.json` : null;

  const load = useCallback(async () => {
    if (!file || !storePath) return;
    try {
      const text = await invoke<string>('read_text_file_if_exists', { path: storePath });
      if (!text) {
        setBookmarks([]);
        return;
      }
      const data = JSON.parse(text) as BookmarksFile;
      setBookmarks(data.byPath?.[file.path] ?? []);
    } catch {
      setBookmarks([]);
    }
  }, [file, storePath]);

  useEffect(() => {
    invoke<string>('get_app_data_path').then(setAppDataPath).catch(() => {});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveAll(next: BookmarkEntry[]) {
    if (!file || !storePath) return;
    setBookmarks(next);
    try {
      let data: BookmarksFile = { byPath: {} };
      const text = await invoke<string>('read_text_file_if_exists', { path: storePath });
      if (text) {
        try { data = JSON.parse(text) as BookmarksFile; } catch { /* ignore */ }
      }
      if (!data.byPath) data.byPath = {};
      data.byPath[file.path] = next;
      await invoke('save_text_file', { path: storePath, content: JSON.stringify(data, null, 2) });
    } catch (err) {
      onStatus(`책갈피 저장 실패: ${(err as Error).message ?? err}`);
    }
  }

  async function addBookmark() {
    if (!file) return;
    const label = newLabel.trim() || `페이지 ${currentPage}`;
    const next = [
      ...bookmarks,
      { page: currentPage, label, createdAt: new Date().toISOString() },
    ];
    setNewLabel('');
    await saveAll(next);
  }

  async function removeBookmark(idx: number) {
    const next = bookmarks.filter((_, i) => i !== idx);
    await saveAll(next);
  }

  if (!file) {
    return <p className="empty-text">PDF를 열면 책갈피를 추가할 수 있습니다.</p>;
  }

  return (
    <div className="bookmarks-panel">
      <section className="panel">
        <h2>책갈피 추가</h2>
        <input
          className="form-input"
          placeholder={`페이지 ${currentPage} 책갈피 이름 (선택)`}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <button type="button" className="primary" onClick={addBookmark}>
          현재 페이지 책갈피 추가
        </button>
        <small className="form-hint">
          앱 데이터 폴더에 PDF 경로 기준으로 저장됩니다 (PDF 자체 수정 안 함).
        </small>
      </section>
      <section className="panel">
        <h2>저장된 책갈피 ({bookmarks.length})</h2>
        {bookmarks.length === 0 ? (
          <p className="empty-text">아직 책갈피가 없습니다.</p>
        ) : (
          <div className="bookmark-list">
            {bookmarks.map((b, i) => (
              <div key={`${b.page}-${i}`} className="bookmark-item">
                <button type="button" className="bookmark-go" onClick={() => onPageSelect(b.page)}>
                  <span className="bookmark-page">{b.page}</span>
                  <span className="bookmark-label">{b.label}</span>
                </button>
                <button type="button" className="bookmark-remove" onClick={() => removeBookmark(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
