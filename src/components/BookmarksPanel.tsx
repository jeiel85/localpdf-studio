import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { t, useLocale } from '../i18n/messages';

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
  useLocale();
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
      onStatus(t('bm.saveFailed', { message: (err as Error).message ?? String(err) }));
    }
  }

  async function addBookmark() {
    if (!file) return;
    const label = newLabel.trim() || t('bm.defaultLabel', { page: currentPage });
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
    return <p className="empty-text">{t('bm.emptyClosed')}</p>;
  }

  return (
    <div className="bookmarks-panel">
      <section className="panel">
        <h2>{t('bm.addTitle')}</h2>
        <input
          className="form-input"
          placeholder={t('bm.placeholder', { page: currentPage })}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <button type="button" className="primary" onClick={addBookmark}>
          {t('bm.addBtn')}
        </button>
        <small className="form-hint">
          {t('bm.hint')}
        </small>
      </section>
      <section className="panel">
        <h2>{t('bm.listTitle', { count: bookmarks.length })}</h2>
        {bookmarks.length === 0 ? (
          <p className="empty-text">{t('bm.empty')}</p>
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
