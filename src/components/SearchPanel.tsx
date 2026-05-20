import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { SearchResult } from '../types';
import { t, useLocale } from '../i18n/messages';

export function SearchPanel({
  document,
  pageCount,
  onPageSelect,
  onQueryChange,
}: {
  document: PDFDocumentProxy | null;
  pageCount: number;
  onPageSelect: (page: number) => void;
  onQueryChange?: (query: string) => void;
}) {
  useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const searchRef = useRef(0);

  useEffect(() => {
    onQueryChange?.(query.trim());
  }, [query, onQueryChange]);

  const doSearch = useCallback(
    async (searchQuery: string) => {
      if (!document || !searchQuery.trim() || pageCount === 0) {
        setResults([]);
        setError(null);
        setProgress(null);
        return;
      }

      const searchId = ++searchRef.current;
      setSearching(true);
      setError(null);
      setResults([]);
      setProgress({ done: 0, total: pageCount });

      const found: SearchResult[] = [];
      const lowerQuery = searchQuery.toLowerCase();
      const CHUNK = 25;

      try {
        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
          if (searchId !== searchRef.current) return;

          const page = await document.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: unknown) => {
              const ti = item as { str?: string };
              return ti.str ?? '';
            })
            .join(' ');

          const lowerText = pageText.toLowerCase();
          let idx = 0;
          let matchCount = 0;
          while ((idx = lowerText.indexOf(lowerQuery, idx)) !== -1) {
            found.push({
              pageNumber: pageNum,
              text: pageText.slice(Math.max(0, idx - 20), idx + searchQuery.length + 20),
              matchIndex: matchCount++,
            });
            idx += 1;
          }

          if (searchId === searchRef.current) {
            setProgress({ done: pageNum, total: pageCount });
            if (pageNum % CHUNK === 0 || pageNum === pageCount) {
              setResults([...found]);
              // UI 이벤트가 처리되도록 양보
              await new Promise((r) => setTimeout(r, 0));
            }
          }
        }
        if (searchId === searchRef.current) {
          setResults([...found]);
        }
      } catch (e) {
        if (searchId === searchRef.current) {
          setError((e as Error).message ?? t('search.error'));
        }
      } finally {
        if (searchId === searchRef.current) {
          setSearching(false);
          setProgress(null);
        }
      }
    },
    [document, pageCount],
  );

  function cancelSearch() {
    searchRef.current += 1;
    setSearching(false);
    setProgress(null);
  }

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      doSearch(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  if (!document) {
    return <p className="empty-text">{t('search.emptyClosed')}</p>;
  }

  return (
    <div className="search-panel">
      <input
        type="text"
        className="search-input"
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {searching && (
        <div className="search-progress-row">
          <span className="empty-text">
            {progress
              ? t('search.progress', { done: progress.done, total: progress.total })
              : t('search.progressNoTotal')}
          </span>
          <button type="button" className="btn-small" onClick={cancelSearch}>{t('search.cancelBtn')}</button>
        </div>
      )}
      {error && <p className="empty-text" style={{ color: '#f2c66a' }}>{error}</p>}
      {!searching && query.trim() && results.length === 0 && (
        <p className="empty-text">{t('search.noResults')}</p>
      )}
      {results.length > 0 && (
        <p className="empty-text" style={{ margin: '4px 0' }}>
          {t('search.resultCount', { count: results.length })}
        </p>
      )}
      <div className="search-results">
        {results.map((r, i) => (
          <button
            key={`${r.pageNumber}-${r.matchIndex}`}
            type="button"
            className="search-result-item"
            onClick={() => onPageSelect(r.pageNumber)}
          >
            <span className="search-result-page">{r.pageNumber}</span>
            <span className="search-result-text">{r.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
