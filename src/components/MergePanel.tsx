import { useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { PdfFilePayload } from '../types';
import { t, useLocale } from '../i18n/messages';

export function MergePanel({
  currentFile,
  onStatus,
}: {
  currentFile: PdfFilePayload | null;
  onStatus: (message: string) => void;
}) {
  useLocale();
  const [inputFiles, setInputFiles] = useState<string[]>([]);
  const [outputPath, setOutputPath] = useState('');
  const [running, setRunning] = useState(false);

  async function handleAddFiles() {
    const selected = await open({
      multiple: true,
      directory: false,
      filters: [{ name: t('merge.fileFilter'), extensions: ['pdf'] }],
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
      filters: [{ name: t('merge.fileFilter'), extensions: ['pdf'] }],
    });

    if (typeof selected === 'string') {
      setOutputPath(selected);
    }
  }

  async function handleMerge() {
    if (inputFiles.length < 2) {
      onStatus(t('merge.needTwo'));
      return;
    }

    if (!outputPath) {
      onStatus(t('merge.needOutput'));
      return;
    }

    setRunning(true);
    onStatus(t('merge.running'));

    try {
      const result = await invoke<{ outputPath: string; inputCount: number }>('merge_pdfs', {
        inputFiles,
        outputPath,
      });
      onStatus(t('merge.done', { count: result.inputCount, output: result.outputPath }));
    } catch (error) {
      onStatus(t('merge.failed', { error: String(error) }));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="merge-panel">
      <section className="panel">
        <h2>{t('merge.title')}</h2>
        <button type="button" onClick={handleAddFiles} disabled={running}>
          {t('merge.addBtn')}
        </button>
        {inputFiles.length > 0 && (
          <div className="merge-file-list">
            <p className="empty-text">{t('merge.selectedCount', { count: inputFiles.length })}</p>
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
            {t('merge.addCurrent')}
          </button>
        )}
      </section>

      <section className="panel">
        <h2>{t('merge.outputTitle')}</h2>
        <button type="button" onClick={handleSelectOutput} disabled={running}>
          {t('merge.outputBtn')}
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
        {running ? t('merge.runningBtn') : t('merge.runBtn', { count: inputFiles.length })}
      </button>
    </div>
  );
}
