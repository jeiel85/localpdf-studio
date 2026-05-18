import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { SearchResult } from '../types';

export function SearchPanel({
  document,
  pageCount,
  onPageSelect,
}: {
  document: PDFDocumentProxy | null;
  pageCount: number;
  onPageSelect: (page: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef(0);

  const doSearch = useCallback(
    async (searchQuery: string) => {
      if (!document || !searchQuery.trim() || pageCount === 0) {
        setResults([]);
        setError(null);
        return;
      }

      const searchId = ++searchRef.current;
      setSearching(true);
      setError(null);
      setResults([]);

      const found: SearchResult[] = [];
      const lowerQuery = searchQuery.toLowerCase();

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

          if (found.length > 0 && searchId === searchRef.current) {
            setResults([...found]);
          }
        }
      } catch (e) {
        if (searchId === searchRef.current) {
          setError((e as Error).message ?? '검색 중 오류가 발생했습니다.');
        }
      } finally {
        if (searchId === searchRef.current) {
          setSearching(false);
        }
      }
    },
    [document, pageCount],
  );

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
    return <p className="empty-text">PDF를 열면 텍스트 검색이 가능합니다.</p>;
  }

  return (
    <div className="search-panel">
      <input
        type="text"
        className="search-input"
        placeholder="텍스트 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {searching && <p className="empty-text">검색 중...</p>}
      {error && <p className="empty-text" style={{ color: '#f2c66a' }}>{error}</p>}
      {!searching && query.trim() && results.length === 0 && (
        <p className="empty-text">검색 결과가 없습니다.</p>
      )}
      {results.length > 0 && (
        <p className="empty-text" style={{ margin: '4px 0' }}>
          {results.length}개 결과
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
