import { useCallback, useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { AppShell } from './components/AppShell';
import { PdfCanvas } from './components/PdfCanvas';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { Toolbar } from './components/Toolbar';
import { base64ToUint8Array } from './lib/base64';
import { pdfjsLib } from './lib/pdfjs';
import { checkExternalTools, getAppInfo, getStartupContext, loadPdfBase64, runPdfOperation } from './lib/tauriCommands';
import type { AppInfo, ExternalToolStatus, PdfFilePayload, ViewerState } from './types';

const DEFAULT_VIEWER: ViewerState = {
  currentPage: 1,
  pageCount: 0,
  scale: 1.2,
  rotation: 0,
};

export default function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [tools, setTools] = useState<ExternalToolStatus[]>([]);
  const [pdfFile, setPdfFile] = useState<PdfFilePayload | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [viewer, setViewer] = useState<ViewerState>(DEFAULT_VIEWER);
  const [status, setStatus] = useState('준비됨');

  const loadPath = useCallback(async (path: string) => {
    setStatus('PDF 파일을 읽는 중...');
    const payload = await loadPdfBase64(path);
    const bytes = base64ToUint8Array(payload.base64Data);
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    setPdfFile(payload);
    setPdfDocument(pdf);
    setViewer({ ...DEFAULT_VIEWER, pageCount: pdf.numPages });
    setStatus(`${payload.fileName} 열림`);
  }, []);

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

  useEffect(() => {
    async function bootstrap() {
      try {
        const [info, externalTools, startup] = await Promise.all([
          getAppInfo(),
          checkExternalTools(),
          getStartupContext(),
        ]);
        setAppInfo(info);
        setTools(externalTools);

        const firstPdf = startup.files.find((file) => file.toLowerCase().endsWith('.pdf'));
        if (firstPdf) {
          setStatus(`우클릭 메뉴 요청 처리: ${startup.action ?? 'open'}`);
          await loadPath(firstPdf);
        }
      } catch (error) {
        setStatus((error as Error).message ?? '앱 초기화 중 오류가 발생했습니다.');
      }
    }

    void bootstrap();
  }, [loadPath]);

  async function handleOperation(operation: string) {
    if (!pdfFile) return;
    try {
      const result = await runPdfOperation(operation, [pdfFile.path]);
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
        return;
      }
      setStatus(`업데이트 ${update.version} 다운로드 및 설치 중...`);
      await update.downloadAndInstall();
      await relaunch();
    } catch (error) {
      setStatus((error as Error).message ?? '업데이트 확인 중 오류가 발생했습니다.');
    }
  }

  return (
    <AppShell
      sidebar={<Sidebar document={pdfFile} tools={tools} onOperation={handleOperation} />}
      toolbar={
        <Toolbar
          hasDocument={Boolean(pdfDocument)}
          viewer={viewer}
          onOpen={openFile}
          onPrev={() => setViewer((value) => ({ ...value, currentPage: Math.max(1, value.currentPage - 1) }))}
          onNext={() => setViewer((value) => ({ ...value, currentPage: Math.min(value.pageCount, value.currentPage + 1) }))}
          onZoomOut={() => setViewer((value) => ({ ...value, scale: Math.max(0.25, value.scale - 0.1) }))}
          onZoomIn={() => setViewer((value) => ({ ...value, scale: Math.min(4, value.scale + 0.1) }))}
          onRotate={() => setViewer((value) => ({ ...value, rotation: (value.rotation + 90) % 360 }))}
          onCheckUpdates={handleCheckUpdates}
        />
      }
      statusbar={<StatusBar appInfo={appInfo} message={status} />}
    >
      <PdfCanvas
        document={pdfDocument}
        pageNumber={viewer.currentPage}
        scale={viewer.scale}
        rotation={viewer.rotation}
      />
    </AppShell>
  );
}
