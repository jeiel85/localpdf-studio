import { useEffect, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { OutlineItem } from '../types';
import { t, useLocale } from '../i18n/messages';

function extractOutlineItems(outline: unknown[]): OutlineItem[] {
  return outline.map((item: unknown) => {
    const entry = item as Record<string, unknown>;
    const children = Array.isArray(entry.items) ? extractOutlineItems(entry.items as unknown[]) : [];
    return {
      title: String(entry.title ?? ''),
      dest: typeof entry.dest === 'string' ? entry.dest : undefined,
      pageNumber: undefined,
      children,
    };
  });
}

async function resolvePageNumbers(
  items: OutlineItem[],
  document: PDFDocumentProxy,
): Promise<OutlineItem[]> {
  const resolved: OutlineItem[] = [];
  for (const item of items) {
    let pageNumber: number | undefined;
    if (item.dest) {
      try {
        const dest = await document.getDestination(item.dest);
        if (dest) {
          const pageIndex = await document.getPageIndex(dest[0] as never);
          pageNumber = pageIndex + 1;
        }
      } catch {
        // ignore
      }
    }
    resolved.push({
      ...item,
      pageNumber,
      children: await resolvePageNumbers(item.children, document),
    });
  }
  return resolved;
}

export function OutlinePanel({
  document,
  onPageSelect,
}: {
  document: PDFDocumentProxy | null;
  onPageSelect: (page: number) => void;
}) {
  useLocale();
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!document) {
      setOutline([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadOutline() {
      try {
        const raw = await (document as PDFDocumentProxy).getOutline();
        if (!raw || raw.length === 0) {
          if (!cancelled) {
            setOutline([]);
            setLoading(false);
          }
          return;
        }
        const items = extractOutlineItems(raw);
        const resolved = await resolvePageNumbers(items, document as PDFDocumentProxy);
        if (!cancelled) {
          setOutline(resolved);
          setExpanded(new Set(resolved.map((_, i) => String(i))));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setOutline([]);
          setLoading(false);
        }
      }
    }

    loadOutline();

    return () => {
      cancelled = true;
    };
  }, [document]);

  if (!document) {
    return <p className="empty-text">{t('outline.emptyClosed')}</p>;
  }

  if (loading) {
    return <p className="empty-text">{t('outline.loading')}</p>;
  }

  if (outline.length === 0) {
    return <p className="empty-text">{t('outline.none')}</p>;
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function renderItems(items: OutlineItem[], depth: number, parentKey: string) {
    return items.map((item, i) => {
      const key = `${parentKey}-${i}`;
      const hasChildren = item.children.length > 0;
      const isExpanded = expanded.has(key);

      return (
        <div key={key} className="outline-group">
          <div
            className={`outline-item depth-${Math.min(depth, 4)}`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {hasChildren && (
              <button
                type="button"
                className="outline-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(key);
                }}
              >
                {isExpanded ? '▾' : '▸'}
              </button>
            )}
            <span
              className="outline-title"
              onClick={() => {
                if (item.pageNumber) onPageSelect(item.pageNumber);
              }}
            >
              {item.title || t('outline.untitled')}
            </span>
            {item.pageNumber && <span className="outline-page">{item.pageNumber}</span>}
          </div>
          {hasChildren && isExpanded && renderItems(item.children, depth + 1, key)}
        </div>
      );
    });
  }

  return <div className="outline-tree">{renderItems(outline, 0, 'root')}</div>;
}
