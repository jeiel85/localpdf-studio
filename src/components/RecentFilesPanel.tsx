import { useEffect, useState } from 'react';
import type { RecentFileEntry } from '../types';
import { getRecentFiles } from '../lib/tauriCommands';

export function RecentFilesPanel({
  onOpen,
  currentPath,
}: {
  onOpen: (path: string) => void;
  currentPath: string | null;
}) {
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
    return <p className="empty-text">최근 문서 불러오는 중...</p>;
  }

  if (files.length === 0) {
    return <p className="empty-text">최근에 열어본 PDF가 없습니다.</p>;
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
