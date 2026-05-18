import { useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { PdfFilePayload } from '../types';

export function MergePanel({
  currentFile,
  onStatus,
}: {
  currentFile: PdfFilePayload | null;
  onStatus: (message: string) => void;
}) {
  const [inputFiles, setInputFiles] = useState<string[]>([]);
  const [outputPath, setOutputPath] = useState('');
  const [running, setRunning] = useState(false);

  async function handleAddFiles() {
    const selected = await open({
      multiple: true,
      directory: false,
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });

    if (!selected) return;

    const paths = Array.isArray(selected) ? selected : [selected];
    setInputFiles((prev) => {
      const set = new Set([...prev, ...paths]);
      return Array.from(set);
    });
  }

  function handleRemoveFile(path: string) {
    setInputFiles((prev) => prev.filter((p) => p !== path));
  }

  async function handleSelectOutput() {
    const defaultName = inputFiles.length > 0
      ? inputFiles[0].replace(/\.pdf$/i, '_merged.pdf')
      : 'merged.pdf';

    const selected = await save({
      defaultPath: defaultName,
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });

    if (typeof selected === 'string') {
      setOutputPath(selected);
    }
  }

  async function handleMerge() {
    if (inputFiles.length < 2) {
      onStatus('병합할 PDF 파일을 2개 이상 선택하세요.');
      return;
    }

    if (!outputPath) {
      onStatus('저장할 파일 경로를 선택하세요.');
      return;
    }

    setRunning(true);
    onStatus('PDF 병합 중...');

    try {
      const result = await invoke<{ outputPath: string; inputCount: number }>('merge_pdfs', {
        inputFiles,
        outputPath,
      });
      onStatus(
        `병합 완료: ${result.inputCount}개 파일 → ${result.outputPath}`,
      );
    } catch (error) {
      onStatus(`병합 실패: ${error}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="merge-panel">
      <section className="panel">
        <h2>병합할 PDF 파일</h2>
        <button type="button" onClick={handleAddFiles} disabled={running}>
          PDF 파일 추가...
        </button>
        {inputFiles.length > 0 && (
          <div className="merge-file-list">
            <p className="empty-text">{inputFiles.length}개 파일 선택됨</p>
            {inputFiles.map((path) => (
              <div key={path} className="merge-file-row">
                <span className="merge-file-name" title={path}>
                  {path.split(/[/\\]/).pop()}
                </span>
                <button
                  type="button"
                  className="merge-remove-btn"
                  onClick={() => handleRemoveFile(path)}
                  disabled={running}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {currentFile && !inputFiles.includes(currentFile.path) && (
          <button
            type="button"
            className="primary"
            onClick={() => setInputFiles((prev) => [...prev, currentFile.path])}
            disabled={running}
          >
            현재 문서 추가
          </button>
        )}
      </section>

      <section className="panel">
        <h2>저장 위치</h2>
        <button type="button" onClick={handleSelectOutput} disabled={running}>
          저장 경로 선택...
        </button>
        {outputPath && (
          <small title={outputPath} className="output-path">
            {outputPath}
          </small>
        )}
      </section>

      <button
        type="button"
        className="primary merge-run-btn"
        disabled={inputFiles.length < 2 || !outputPath || running}
        onClick={handleMerge}
      >
        {running ? '병합 중...' : `PDF 병합 실행 (${inputFiles.length}개)`}
      </button>
    </div>
  );
}
