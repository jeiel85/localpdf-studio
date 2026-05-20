import { useCallback, useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { check } from '@tauri-apps/plugin-updater';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { UpdateNotification, type UpdateStatus } from './components/UpdateNotification';
import { AdvancedPanel } from './components/AdvancedPanel';
import { AppShell } from './components/AppShell';
import { BookmarksPanel } from './components/BookmarksPanel';
import { ComparePanel } from './components/ComparePanel';
import { FormFillPanel } from './components/FormFillPanel';
import { SignPanel } from './components/SignPanel';
import { MergePanel } from './components/MergePanel';
import { MetadataPanel } from './components/MetadataPanel';
import { OutlinePanel } from './components/OutlinePanel';
import { PageEditorPanel } from './components/PageEditorPanel';
import { PdfCanvas } from './components/PdfCanvas';
import { RecentFilesPanel } from './components/RecentFilesPanel';
import { SearchPanel } from './components/SearchPanel';
import { PrintDialog } from './components/PrintDialog';
import { ShortcutHelp } from './components/ShortcutHelp';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { ThumbnailPanel } from './components/ThumbnailPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ToolsPanel } from './components/ToolsPanel';
import { Toolbar } from './components/Toolbar';
import { initLocale } from './i18n/messages';
import { base64ToUint8Array } from './lib/base64';
import { pdfjsLib } from './lib/pdfjs';
import { printPdf, type PrintOptions } from './lib/printPdf';
import { setRevealEnabled } from './lib/revealOutput';
import { captureCurrentSelection, type PageSelection } from './lib/textSelection';
import {
  addRecentFile,
  checkExternalTools,
  getAppInfo,
  getSettings,
  getStartupContext,
  getTabState,
  loadPdfBase64,
  runPdfOperation,
  saveTabState,
} from './lib/tauriCommands';
import { DEFAULT_SETTINGS, type AppInfo, type AppSettings, type DocTab, type ExternalToolStatus, type SidebarTab, type ViewerState, type RedactionArea, type StampElement, type SignTool, type SavedSignature } from './types';

const DEFAULT_VIEWER: ViewerState = {
  currentPage: 1,
  pageCount: 0,
  scale: 1.2,
  rotation: 0,
  layout: 'single',
  fitMode: 'custom',
};

initLocale();

let tabCounter = 0;
function nextTabId(): string {
  tabCounter += 1;
  return `tab-${tabCounter}`;
}

export default function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [tools, setTools] = useState<ExternalToolStatus[]>([]);
  const [tabs, setTabs] = useState<DocTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [status, setStatus] = useState('준비됨');
  const [activeTab, setActiveTab] = useState<SidebarTab>('document');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ kind: 'idle' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [lastSelection, setLastSelection] = useState<PageSelection[] | null>(null);
  const [redactions, setRedactions] = useState<RedactionArea[]>([]);
  const [redactModeEnabled, setRedactModeEnabled] = useState(false);
  const [stamps, setStamps] = useState<StampElement[]>([]);
  const [signModeEnabled, setSignModeEnabled] = useState(false);
  const [selectedSignTool, setSelectedSignTool] = useState<SignTool | null>(null);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>(() => {
    try {
      const raw = localStorage.getItem('localpdf.savedSignatures.v1');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);
  const [stampFontSize, setStampFontSize] = useState(14);
  const [stampColor, setStampColor] = useState('#1f1f1f');

  const documentsRef = useRef<Map<string, PDFDocumentProxy>>(new Map());
  const lastOpenPathRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showShortcutHelpRef = useRef(showShortcutHelp);
  showShortcutHelpRef.current = showShortcutHelp;
  const updateStatusRef = useRef(updateStatus);
  updateStatusRef.current = updateStatus;

  const activeDocTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const activeDocument = activeTabId ? documentsRef.current.get(activeTabId) ?? null : null;

  const loadPath = useCallback(
    async (path: string, restore?: Partial<ViewerState>): Promise<string | null> => {
      const existing = tabs.find((t) => t.file.path === path);
      if (existing) {
        setActiveTabId(existing.id);
        setStatus(`${existing.file.fileName} (이미 열려 있음)`);
        return existing.id;
      }

      const tabId = nextTabId();
      setStatus('PDF 파일을 읽는 중...');
      setLoadProgress({ loaded: 0, total: 0 });
      setRedactions([]);
      setRedactModeEnabled(false);
      setStamps([]);
      setSignModeEnabled(false);
      setSelectedSignTool(null);
      setSelectedStampId(null);

      try {
        const payload = await loadPdfBase64(path);
        let pdf: PDFDocumentProxy;

        const onPdfProgress = (data: { loaded: number; total: number }) => {
          setLoadProgress({ loaded: data.loaded, total: data.total ?? 0 });
        };

        if (payload.url) {
          const loadingTask = pdfjsLib.getDocument({
            url: payload.url,
            disableAutoFetch: false,
            disableStream: false,
            cMapUrl: undefined,
            cMapPacked: true,
            useSystemFonts: true,
            // @ts-expect-error isEvalSupported is supported at runtime
            isEvalSupported: false,
          });
          loadingTask.onProgress = onPdfProgress;
          pdf = await loadingTask.promise;
        } else {
          const bytes = base64ToUint8Array(payload.base64Data);
          const loadingTask = pdfjsLib.getDocument({
            data: bytes,
            useSystemFonts: true,
            // @ts-expect-error isEvalSupported is supported at runtime
            isEvalSupported: false,
          });
          loadingTask.onProgress = onPdfProgress;
          pdf = await loadingTask.promise;
        }

        const baseViewer: ViewerState = {
          ...DEFAULT_VIEWER,
          pageCount: pdf.numPages,
          scale: settings.viewer.initialScale,
          layout: settings.viewer.pageLayout,
          fitMode: settings.viewer.defaultFitMode,
        };

        const viewer: ViewerState = restore
          ? {
              ...baseViewer,
              currentPage: clamp(restore.currentPage ?? 1, 1, pdf.numPages),
              scale: restore.scale ?? baseViewer.scale,
              rotation: restore.rotation ?? 0,
              layout: restore.layout ?? baseViewer.layout,
              fitMode: restore.fitMode ?? baseViewer.fitMode,
            }
          : baseViewer;

        const newTab: DocTab = {
          id: tabId,
          file: payload,
          viewer,
        };

        documentsRef.current.set(tabId, pdf);
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(tabId);
        lastOpenPathRef.current = path;

        const mode = payload.url ? '스트리밍' : '';
        setStatus(`${payload.fileName} 열림${mode ? ` (${mode})` : ''}`);

        void addRecentFile(payload.path, payload.fileName).catch(() => {});
        return tabId;
      } catch (error) {
        setStatus((error as Error).message ?? 'PDF를 열 수 없습니다.');
        return null;
      } finally {
        setLoadProgress(null);
      }
    },
    [tabs, settings.viewer.initialScale, settings.viewer.pageLayout, settings.viewer.defaultFitMode],
  );

  const openFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });

    if (typeof selected !== 'string') return;

    try {
      await loadPath(selected);
    } catch (error) {
      setStatus((error as Error).message ?? 'PDF를 열 수 없습니다.');
    }
  }, [loadPath]);

  const closeTab = useCallback(
    (tabId: string) => {
      const doc = documentsRef.current.get(tabId);
      if (doc) {
        try {
          doc.destroy();
        } catch {
          // ignore
        }
        documentsRef.current.delete(tabId);
      }

      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          const idx = prev.findIndex((t) => t.id === tabId);
          const next = remaining[Math.min(idx, remaining.length - 1)] ?? null;
          setActiveTabId(next?.id ?? null);
        }
        return remaining;
      });
    },
    [activeTabId],
  );

  const updateViewer = useCallback(
    (updater: (prev: ViewerState) => ViewerState) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, viewer: updater(t.viewer) } : t,
        ),
      );
    },
    [activeTabId],
  );

  const handlePageChange = useCallback(
    (page: number) =>
      updateViewer((v) => (v.currentPage === page ? v : { ...v, currentPage: page })),
    [updateViewer],
  );

  const handleFittedScale = useCallback(
    (s: number) =>
      updateViewer((v) => (Math.abs(v.scale - s) < 0.001 ? v : { ...v, scale: s })),
    [updateViewer],
  );

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // PDF 텍스트 선택을 글로벌하게 캡처해 두면, 사이드바 패널에서 즉시 사용 가능
  useEffect(() => {
    function onMouseUp() {
      // selection이 셋업되도록 한 틱 기다림
      setTimeout(() => {
        const sel = captureCurrentSelection();
        if (sel) setLastSelection(sel);
      }, 0);
    }
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  useEffect(() => {
    setRevealEnabled(settings.output.openFolderAfterJob);
  }, [settings.output.openFolderAfterJob]);

  useEffect(() => {
    const theme = settings.ui.theme;
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      document.documentElement.setAttribute('data-theme', mq.matches ? 'light' : 'dark');
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'light' : 'dark');
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [settings.ui.theme]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showShortcutHelpRef.current) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setShowShortcutHelp(false);
          return;
        }
        const st = updateStatusRef.current;
        if (st.kind !== 'idle' && st.kind !== 'downloading') {
          e.preventDefault();
          e.stopImmediatePropagation();
          setUpdateStatus({ kind: 'idle' });
          return;
        }
      }

      const isInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isInput) return;

      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      } else if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcutHelp((prev) => !prev);
      } else if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        openFile();
      } else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setActiveTab('search');
      } else if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        setActiveTab('thumbnails');
      } else if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setActiveTab('document');
      } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setActiveTab('thumbnails');
      } else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setActiveTab('outline');
      } else if (e.ctrlKey && e.key === '4') {
        e.preventDefault();
        setActiveTab('search');
      } else if (e.ctrlKey && e.key === '5') {
        e.preventDefault();
        setActiveTab('merge');
      } else if (e.ctrlKey && e.key === '6') {
        e.preventDefault();
        setActiveTab('tools');
      } else if (e.ctrlKey && e.key === '7') {
        e.preventDefault();
        setActiveTab('advanced');
      } else if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault();
        updateViewer((v) => ({ ...v, currentPage: Math.max(1, v.currentPage - 1) }));
      } else if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault();
        updateViewer((v) => ({
          ...v,
          currentPage: Math.min(v.pageCount, v.currentPage + 1),
        }));
      } else if (e.key === 'Home' && !e.ctrlKey && !e.altKey) {
        if (activeTabId) {
          e.preventDefault();
          updateViewer((v) => ({ ...v, currentPage: 1 }));
        }
      } else if (e.key === 'End' && !e.ctrlKey && !e.altKey) {
        if (activeTabId) {
          e.preventDefault();
          updateViewer((v) => ({ ...v, currentPage: v.pageCount }));
        }
      } else if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        updateViewer((v) => ({ ...v, scale: Math.min(4, v.scale + 0.1), fitMode: 'custom' }));
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        updateViewer((v) => ({ ...v, scale: Math.max(0.25, v.scale - 0.1), fitMode: 'custom' }));
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        updateViewer((v) => ({ ...v, scale: 1, fitMode: 'actual' }));
      } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        updateViewer((v) => ({ ...v, layout: v.layout === 'single' ? 'continuous' : 'single' }));
      } else if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        const input = window.prompt('이동할 페이지 번호:');
        if (input) {
          const n = parseInt(input, 10);
          if (!Number.isNaN(n) && n > 0) {
            updateViewer((v) => ({ ...v, currentPage: Math.min(Math.max(1, n), v.pageCount) }));
          }
        }
      } else if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      } else if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        if (activeTabId) {
          setShowPrintDialog(true);
        }
      } else if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          const idx = tabs.findIndex((t) => t.id === activeTabId);
          const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
          if (prev) setActiveTabId(prev.id);
        } else {
          const idx = tabs.findIndex((t) => t.id === activeTabId);
          const next = tabs[(idx + 1) % tabs.length];
          if (next) setActiveTabId(next.id);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openFile, closeTab, activeTabId, tabs, updateViewer]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [info, externalTools, startup, loadedSettings] = await Promise.all([
          getAppInfo(),
          checkExternalTools(),
          getStartupContext(),
          getSettings().catch(() => DEFAULT_SETTINGS),
        ]);
        setAppInfo(info);
        setTools(externalTools);
        setSettings(loadedSettings);

        const firstPdf = startup.files.find((file) => file.toLowerCase().endsWith('.pdf'));
        if (firstPdf) {
          const action = startup.action ?? 'open';
          const actionLabel: Record<string, string> = {
            open: '열기',
            merge: '병합',
            split: '분할',
            compress: '압축',
            ocr: 'OCR',
            metadata: '메타데이터',
          };
          setStatus(`우클릭 메뉴 요청: ${actionLabel[action] ?? action}`);

          await loadPath(firstPdf);

          if (action === 'merge') setActiveTab('merge');
          else if (['metadata', 'split', 'compress', 'ocr'].includes(action)) setActiveTab('tools');
        } else if (loadedSettings.session.restoreTabs) {
          try {
            const tabState = await getTabState();
            if (tabState.tabs.length > 0) {
              setStatus('이전 세션 복원 중...');
              const loadedTabIds: (string | null)[] = [];
              for (const persisted of tabState.tabs) {
                try {
                  const tabId = await loadPath(persisted.path, {
                    currentPage: persisted.currentPage,
                    scale: persisted.scale,
                    rotation: persisted.rotation,
                    layout: persisted.layout as ViewerState['layout'],
                    fitMode: persisted.fitMode as ViewerState['fitMode'],
                  });
                  loadedTabIds.push(tabId);
                } catch {
                  loadedTabIds.push(null);
                }
              }
              if (
                tabState.activeIndex != null &&
                loadedTabIds[tabState.activeIndex]
              ) {
                setActiveTabId(loadedTabIds[tabState.activeIndex]!);
              }
              setStatus('이전 세션을 복원했습니다.');
            }
          } catch {
            // tab state load failure is non-fatal
          }
        }
      } catch (error) {
        setStatus((error as Error).message ?? '앱 초기화 중 오류가 발생했습니다.');
      }
    }

    void bootstrap();
  }, [loadPath]);

  const autoUpdateChecked = useRef(false);
  useEffect(() => {
    if (autoUpdateChecked.current) return;
    if (!settings.update.checkOnStartup) return;
    autoUpdateChecked.current = true;
    let cancelled = false;
    (async () => {
      try {
        const update = await check();
        if (cancelled || !update) return;
        setUpdateStatus({ kind: 'available', update });
        setStatus(`업데이트 가능: ${update.version}`);
      } catch {
        // silent fail on auto-check; manual check will surface errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.update.checkOnStartup]);

  useEffect(() => {
    if (!settings.session.restoreTabs || tabs.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const activeIndex = tabs.findIndex((t) => t.id === activeTabId);
      const tabState = {
        tabs: tabs.map((t) => ({
          path: t.file.path,
          currentPage: t.viewer.currentPage,
          scale: t.viewer.scale,
          rotation: t.viewer.rotation,
          layout: t.viewer.layout,
          fitMode: t.viewer.fitMode,
        })),
        activeIndex: activeIndex >= 0 ? activeIndex : null,
      };
      void saveTabState(tabState).catch(() => {});
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [tabs, activeTabId, settings.session.restoreTabs]);

  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === 'drop') {
        const pdfPath = event.payload.paths.find((p) => p.toLowerCase().endsWith('.pdf'));
        if (pdfPath) {
          void loadPath(pdfPath);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadPath]);

  async function handleOperation(operation: string) {
    if (!activeDocTab) return;
    try {
      const result = await runPdfOperation(operation, [activeDocTab.file.path]);
      setStatus(result);
    } catch (error) {
      setStatus((error as Error).message ?? `${operation} 작업을 실행할 수 없습니다.`);
    }
  }

  async function handleCheckUpdates() {
    try {
      setStatus('업데이트 확인 중...');
      const update = await check();
      if (!update) {
        setStatus('사용 가능한 업데이트가 없습니다.');
        setUpdateStatus({ kind: 'idle' });
        return;
      }
      setStatus(`업데이트 가능: ${update.version}`);
      setUpdateStatus({ kind: 'available', update });
    } catch (error) {
      const message = (error as Error).message ?? '업데이트 확인 중 오류가 발생했습니다.';
      setStatus(message);
      setUpdateStatus({ kind: 'error', message });
    }
  }

  async function printActivePdf(options: PrintOptions = {}) {
    const doc = activeTabId ? documentsRef.current.get(activeTabId) : null;
    if (!doc) return;
    const page = activeDocTab?.viewer.currentPage ?? 1;
    try {
      setStatus('인쇄 준비 중...');
      await printPdf(
        doc,
        page,
        (loaded, total) => setStatus(`인쇄 준비 중... ${loaded} / ${total} 페이지`),
        options,
      );
      setStatus('인쇄 대화상자가 열렸습니다.');
    } catch (error) {
      setStatus((error as Error).message ?? '인쇄할 수 없습니다.');
    }
  }

  function renderSidebarContent() {
    switch (activeTab) {
      case 'document':
        return (
          <div className="sidebar-inner">
            <section className="panel">
              <h2>문서 정보</h2>
              {activeDocTab ? (
                <div className="doc-card">
                  <strong>{activeDocTab.file.fileName}</strong>
                  <span>{formatBytes(activeDocTab.file.sizeBytes)}</span>
                  <small title={activeDocTab.file.path}>{activeDocTab.file.path}</small>
                  {activeDocTab.file.url && <small className="stream-badge">스트리밍 모드</small>}
                </div>
              ) : (
                <p className="empty-text">PDF를 열면 문서 정보가 표시됩니다.</p>
              )}
            </section>
            <section className="panel">
              <h2>열린 문서 ({tabs.length})</h2>
              {tabs.length === 0 ? (
                <p className="empty-text">열린 문서가 없습니다.</p>
              ) : (
                <div className="open-tabs-list">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`open-tab-item ${t.id === activeTabId ? 'active' : ''}`}
                      onClick={() => setActiveTabId(t.id)}
                      onDoubleClick={() => closeTab(t.id)}
                    >
                      {t.file.fileName}
                    </button>
                  ))}
                </div>
              )}
            </section>
            <section className="panel">
              <h2>최근 문서</h2>
              <RecentFilesPanel
                onOpen={(p) => loadPath(p)}
                currentPath={activeDocTab?.file.path ?? null}
              />
            </section>
          </div>
        );
      case 'thumbnails':
        return (
          <div className="sidebar-inner">
            <h2>페이지 썸네일</h2>
            <ThumbnailPanel
              document={activeDocument}
              pageCount={activeDocTab?.viewer.pageCount ?? 0}
              currentPage={activeDocTab?.viewer.currentPage ?? 1}
              onPageSelect={(p) => updateViewer((v) => ({ ...v, currentPage: p }))}
            />
          </div>
        );
      case 'outline':
        return (
          <div className="sidebar-inner">
            <h2>목차</h2>
            <OutlinePanel
              document={activeDocument}
              onPageSelect={(p) => updateViewer((v) => ({ ...v, currentPage: p }))}
            />
          </div>
        );
      case 'search':
        return (
          <div className="sidebar-inner">
            <h2>텍스트 검색</h2>
            <SearchPanel
              document={activeDocument}
              pageCount={activeDocTab?.viewer.pageCount ?? 0}
              onPageSelect={(p) => updateViewer((v) => ({ ...v, currentPage: p }))}
              onQueryChange={setSearchQuery}
            />
          </div>
        );
      case 'merge':
        return (
          <div className="sidebar-inner">
            <h2>PDF 병합</h2>
            <MergePanel currentFile={activeDocTab?.file ?? null} onStatus={setStatus} />
          </div>
        );
      case 'tools':
        return (
          <div className="sidebar-inner">
            <h2>PDF 도구</h2>
            <ToolsPanel
              currentFile={activeDocTab?.file ?? null}
              tools={tools}
              onStatus={setStatus}
              onToolsChange={setTools}
            />
          </div>
        );
      case 'advanced':
        return (
          <div className="sidebar-inner">
            <h2>고급 기능</h2>
            <AdvancedPanel
              document={activeDocument}
              file={activeDocTab?.file ? { path: activeDocTab.file.path, fileName: activeDocTab.file.fileName } : null}
              onStatus={setStatus}
              lastSelection={lastSelection}
              redactions={redactions}
              setRedactions={setRedactions}
              redactModeEnabled={redactModeEnabled}
              setRedactModeEnabled={setRedactModeEnabled}
            />
          </div>
        );
      case 'editor':
        return (
          <div className="sidebar-inner">
            <h2>페이지 편집</h2>
            <PageEditorPanel
              document={activeDocument}
              file={activeDocTab?.file ? { path: activeDocTab.file.path, fileName: activeDocTab.file.fileName } : null}
              pageCount={activeDocTab?.viewer.pageCount ?? 0}
              onPageSelect={(p) => updateViewer((v) => ({ ...v, currentPage: p }))}
              onStatus={setStatus}
            />
          </div>
        );
      case 'metadata':
        return (
          <div className="sidebar-inner">
            <h2>메타데이터</h2>
            <MetadataPanel
              file={activeDocTab?.file ? { path: activeDocTab.file.path, fileName: activeDocTab.file.fileName } : null}
              onStatus={setStatus}
            />
          </div>
        );
      case 'form':
        return (
          <div className="sidebar-inner">
            <h2>PDF 폼 작성</h2>
            <FormFillPanel
              file={activeDocTab?.file ? { path: activeDocTab.file.path, fileName: activeDocTab.file.fileName } : null}
              onStatus={setStatus}
            />
          </div>
        );
      case 'sign':
        return (
          <div className="sidebar-inner">
            <h2>Fill &amp; Sign</h2>
            <SignPanel
              file={activeDocTab?.file ? { path: activeDocTab.file.path, fileName: activeDocTab.file.fileName } : null}
              stamps={stamps}
              setStamps={setStamps}
              signModeEnabled={signModeEnabled}
              setSignModeEnabled={setSignModeEnabled}
              selectedTool={selectedSignTool}
              setSelectedTool={setSelectedSignTool}
              savedSignatures={savedSignatures}
              setSavedSignatures={setSavedSignatures}
              defaultFontSize={stampFontSize}
              setDefaultFontSize={setStampFontSize}
              defaultColor={stampColor}
              setDefaultColor={setStampColor}
              selectedStampId={selectedStampId}
              onStatus={setStatus}
            />
          </div>
        );
      case 'bookmarks':
        return (
          <div className="sidebar-inner">
            <h2>책갈피</h2>
            <BookmarksPanel
              file={activeDocTab?.file ? { path: activeDocTab.file.path, fileName: activeDocTab.file.fileName } : null}
              currentPage={activeDocTab?.viewer.currentPage ?? 1}
              onPageSelect={(p) => updateViewer((v) => ({ ...v, currentPage: p }))}
              onStatus={setStatus}
            />
          </div>
        );
      case 'compare':
        return (
          <div className="sidebar-inner">
            <h2>분할 뷰 비교</h2>
            <ComparePanel
              currentFile={activeDocTab?.file ? { path: activeDocTab.file.path, fileName: activeDocTab.file.fileName } : null}
              onStatus={setStatus}
            />
          </div>
        );
      case 'settings':
        return (
          <div className="sidebar-inner">
            <h2>설정</h2>
            <SettingsPanel
              onStatus={(message) => {
                setStatus(message);
                if (message === '설정을 저장했습니다.' || message === '설정을 기본값으로 되돌렸습니다.') {
                  void getSettings().then(setSettings).catch(() => {});
                  void checkExternalTools().then(setTools).catch(() => {});
                }
              }}
            />
          </div>
        );
    }
  }

  const hasDocument = Boolean(activeDocument);

  return (
    <AppShell
      tabBar={
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={setActiveTabId}
          onClose={closeTab}
          onOpen={openFile}
        />
      }
      sidebar={
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab}>
          {renderSidebarContent()}
        </Sidebar>
      }
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
      toolbar={
        <Toolbar
          hasDocument={hasDocument}
          viewer={activeDocTab?.viewer ?? DEFAULT_VIEWER}
          tabCount={tabs.length}
          onOpen={openFile}
          onPrev={() =>
            updateViewer((v) => ({ ...v, currentPage: Math.max(1, v.currentPage - 1) }))
          }
          onNext={() =>
            updateViewer((v) => ({
              ...v,
              currentPage: Math.min(v.pageCount, v.currentPage + 1),
            }))
          }
          onZoomOut={() =>
            updateViewer((v) => ({ ...v, scale: Math.max(0.25, v.scale - 0.1) }))
          }
          onZoomIn={() =>
            updateViewer((v) => ({ ...v, scale: Math.min(4, v.scale + 0.1) }))
          }
          onRotate={() =>
            updateViewer((v) => ({ ...v, rotation: (v.rotation + settings.viewer.rotationStep) % 360 }))
          }
          onCheckUpdates={handleCheckUpdates}
          onHelp={() => setShowShortcutHelp(true)}
          onLayoutChange={(layout) => updateViewer((v) => ({ ...v, layout }))}
          onFitChange={(fitMode) => updateViewer((v) => ({ ...v, fitMode }))}
        />
      }
      statusbar={<StatusBar appInfo={appInfo} message={status} />}
    >
      <PdfCanvas
        document={activeDocument}
        pageNumber={activeDocTab?.viewer.currentPage ?? 1}
        scale={activeDocTab?.viewer.scale ?? 1.2}
        rotation={activeDocTab?.viewer.rotation ?? 0}
        layout={activeDocTab?.viewer.layout ?? 'single'}
        fitMode={activeDocTab?.viewer.fitMode ?? 'custom'}
        renderQuality={settings.viewer.renderQuality}
        loadProgress={loadProgress}
        highlightQuery={searchQuery}
        onPageChange={handlePageChange}
        onFittedScale={handleFittedScale}
        redactions={redactions}
        onAddRedaction={(r) => setRedactions((prev) => [...prev, r])}
        onRemoveRedaction={(id) => setRedactions((prev) => prev.filter((x) => x.id !== id))}
        redactModeEnabled={redactModeEnabled}
        stamps={stamps}
        selectedTool={selectedSignTool}
        savedSignatures={savedSignatures}
        signModeEnabled={signModeEnabled}
        defaultStampFontSize={stampFontSize}
        defaultStampColor={stampColor}
        selectedStampId={selectedStampId}
        onSelectStamp={setSelectedStampId}
        onAddStamp={(s) => setStamps((prev) => [...prev, s])}
        onUpdateStamp={(id, patch) =>
          setStamps((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
        }
        onRemoveStamp={(id) => setStamps((prev) => prev.filter((x) => x.id !== id))}
      />
      <UpdateNotification
        status={updateStatus}
        onStatusChange={setUpdateStatus}
        onDismiss={() => setUpdateStatus({ kind: 'idle' })}
        onStatus={setStatus}
      />
      {showShortcutHelp && <ShortcutHelp onClose={() => setShowShortcutHelp(false)} />}
      {showPrintDialog && activeDocTab && (
        <PrintDialog
          currentPage={activeDocTab.viewer.currentPage}
          pageCount={activeDocTab.viewer.pageCount}
          onConfirm={(options) => {
            setShowPrintDialog(false);
            void printActivePdf(options);
          }}
          onCancel={() => setShowPrintDialog(false)}
        />
      )}
    </AppShell>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}
