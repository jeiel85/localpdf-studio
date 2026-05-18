import { useCallback, useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { check } from '@tauri-apps/plugin-updater';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { UpdateNotification, type UpdateStatus } from './components/UpdateNotification';
import { AdvancedPanel } from './components/AdvancedPanel';
import { AppShell } from './components/AppShell';
import { MergePanel } from './components/MergePanel';
import { OutlinePanel } from './components/OutlinePanel';
import { PdfCanvas } from './components/PdfCanvas';
import { RecentFilesPanel } from './components/RecentFilesPanel';
import { SearchPanel } from './components/SearchPanel';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { ThumbnailPanel } from './components/ThumbnailPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ToolsPanel } from './components/ToolsPanel';
import { Toolbar } from './components/Toolbar';
import { base64ToUint8Array } from './lib/base64';
import { pdfjsLib } from './lib/pdfjs';
import {
  addRecentFile,
  checkExternalTools,
  getAppInfo,
  getSettings,
  getStartupContext,
  loadPdfBase64,
  runPdfOperation,
} from './lib/tauriCommands';
import { DEFAULT_SETTINGS, type AppInfo, type AppSettings, type DocTab, type ExternalToolStatus, type SidebarTab, type ViewerState } from './types';

const DEFAULT_VIEWER: ViewerState = {
  currentPage: 1,
  pageCount: 0,
  scale: 1.2,
  rotation: 0,
  layout: 'single',
  fitMode: 'custom',
};

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

  const documentsRef = useRef<Map<string, PDFDocumentProxy>>(new Map());
  const lastOpenPathRef = useRef<string | null>(null);

  const activeDocTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const activeDocument = activeTabId ? documentsRef.current.get(activeTabId) ?? null : null;

  const loadPath = useCallback(
    async (path: string) => {
      const existing = tabs.find((t) => t.file.path === path);
      if (existing) {
        setActiveTabId(existing.id);
        setStatus(`${existing.file.fileName} (이미 열려 있음)`);
        return;
      }

      const tabId = nextTabId();
      setStatus('PDF 파일을 읽는 중...');
      setLoadProgress({ loaded: 0, total: 0 });

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
          });
          loadingTask.onProgress = onPdfProgress;
          pdf = await loadingTask.promise;
        } else {
          const bytes = base64ToUint8Array(payload.base64Data);
          const loadingTask = pdfjsLib.getDocument({
            data: bytes,
            useSystemFonts: true,
          });
          loadingTask.onProgress = onPdfProgress;
          pdf = await loadingTask.promise;
        }

        const newTab: DocTab = {
          id: tabId,
          file: payload,
          viewer: {
            ...DEFAULT_VIEWER,
            pageCount: pdf.numPages,
            scale: settings.viewer.initialScale,
            layout: settings.viewer.pageLayout,
            fitMode: settings.viewer.defaultFitMode,
          },
        };

        documentsRef.current.set(tabId, pdf);
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(tabId);
        lastOpenPathRef.current = path;

        const mode = payload.url ? '스트리밍' : '';
        setStatus(`${payload.fileName} 열림${mode ? ` (${mode})` : ''}`);

        void addRecentFile(payload.path, payload.fileName).catch(() => {});
      } catch (error) {
        setStatus((error as Error).message ?? 'PDF를 열 수 없습니다.');
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
    function handleKeyDown(e: KeyboardEvent) {
      const isInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isInput) return;

      if (e.ctrlKey && e.key === 'o') {
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
      } else if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
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
        onPageChange={handlePageChange}
        onFittedScale={handleFittedScale}
      />
      <UpdateNotification
        status={updateStatus}
        onStatusChange={setUpdateStatus}
        onDismiss={() => setUpdateStatus({ kind: 'idle' })}
        onStatus={setStatus}
      />
    </AppShell>
  );
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
