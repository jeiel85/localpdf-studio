import { useEffect, useState } from 'react';
import type { RecentFileEntry } from '../types';
import { getRecentFiles } from '../lib/tauriCommands';
import { t, useLocale } from '../i18n/messages';

export function RecentFilesPanel({
  onOpen,
  currentPath,
}: {
  onOpen: (path: string) => void;
  currentPath: string | null;
}) {
  useLocale();
  const [files, setFiles] = useState<RecentFileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const entries = await getRecentFiles();
        if (!cancelled) {
          setFiles(entries);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [currentPath]);

  if (loading) {
    return <p className="empty-text">{t('recent.loading')}</p>;
  }

  if (files.length === 0) {
    return <p className="empty-text">{t('recent.empty')}</p>;
  }

  return (
    <div className="recent-files">
      {files.map((f) => (
        <button
          key={f.path}
          type="button"
          className={`recent-file-item ${f.path === currentPath ? 'active' : ''}`}
          onClick={() => onOpen(f.path)}
          title={f.path}
        >
          <span className="recent-file-name">{f.fileName}</span>
          <span className="recent-file-path">{f.path}</span>
        </button>
      ))}
    </div>
  );
}
