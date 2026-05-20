import { useEffect, useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { PDFDocument } from 'pdf-lib';
import { readFileBytes, saveBinaryFile } from '../lib/tauriCommands';
import { maybeReveal } from '../lib/revealOutput';
import { t, useLocale } from '../i18n/messages';

interface MetadataFields {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}

const EMPTY: MetadataFields = {
  title: '',
  author: '',
  subject: '',
  keywords: '',
  creator: '',
  producer: '',
};

export function MetadataPanel({
  file,
  onStatus,
}: {
  file: { path: string; fileName: string } | null;
  onStatus: (msg: string) => void;
}) {
  useLocale();
  const [meta, setMeta] = useState<MetadataFields>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const b64 = await readFileBytes(file.path);
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        if (cancelled) return;
        setMeta({
          title: doc.getTitle() ?? '',
          author: doc.getAuthor() ?? '',
          subject: doc.getSubject() ?? '',
          keywords: (doc.getKeywords() ?? '') as string,
          creator: doc.getCreator() ?? '',
          producer: doc.getProducer() ?? '',
        });

        // C5: 서명/AcroForm 정보
        try {
          const jsonStr = await invoke<string>('read_pdf_metadata', { inputFile: file.path });
          const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
          const text = JSON.stringify(parsed).toLowerCase();
          setHasSignature(text.includes('/sig') || text.includes('"sig"') || text.includes('signed'));
          if (typeof parsed.version === 'string') setVersion(parsed.version);
        } catch {
          // ignore — 메타데이터 추가 검사 실패는 비치명적
        }
      } catch (err) {
        onStatus(t('meta.loadFailed', { message: (err as Error).message ?? String(err) }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, onStatus]);

  function patch<K extends keyof MetadataFields>(key: K, value: string) {
    setMeta((m) => ({ ...m, [key]: value }));
  }

  async function handleSave() {
    if (!file) return;
    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, '_metadata.pdf'),
      filters: [{ name: t('meta.fileFilter'), extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setSaving(true);
    onStatus(t('meta.savingStatus'));
    try {
      const b64 = await readFileBytes(file.path);
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      doc.setTitle(meta.title || '');
      doc.setAuthor(meta.author || '');
      doc.setSubject(meta.subject || '');
      doc.setKeywords(meta.keywords ? meta.keywords.split(',').map((k) => k.trim()).filter(Boolean) : []);
      doc.setCreator(meta.creator || '');
      doc.setProducer(meta.producer || 'LocalPDF Studio');
      doc.setModificationDate(new Date());

      const out = await doc.save();
      let binary = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < out.length; i += CHUNK) {
        binary += String.fromCharCode(...out.subarray(i, i + CHUNK));
      }
      const outB64 = btoa(binary);
      await saveBinaryFile(outputPath, outB64);
      onStatus(t('meta.saveDone', { path: outputPath }));
      void maybeReveal(outputPath);
    } catch (err) {
      onStatus(t('meta.saveFailed', { message: (err as Error).message ?? String(err) }));
    } finally {
      setSaving(false);
    }
  }

  if (!file) {
    return <p className="empty-text">{t('meta.emptyClosed')}</p>;
  }
  if (loading) {
    return <p className="empty-text">{t('meta.loading')}</p>;
  }

  return (
    <div className="metadata-panel">
      <section className="panel">
        <h2>{t('meta.docInfo')}</h2>
        {version && <p className="muted">{t('meta.pdfVersion', { version })}</p>}
        <p className={hasSignature ? 'sig-badge signed' : 'sig-badge unsigned'}>
          {hasSignature ? t('meta.signed') : t('meta.unsigned')}
        </p>
      </section>
      <section className="panel">
        <h2>{t('meta.editTitle')}</h2>
        <label className="form-label">
          {t('meta.fTitle')}
          <input className="form-input" value={meta.title} onChange={(e) => patch('title', e.target.value)} />
        </label>
        <label className="form-label">
          {t('meta.fAuthor')}
          <input className="form-input" value={meta.author} onChange={(e) => patch('author', e.target.value)} />
        </label>
        <label className="form-label">
          {t('meta.fSubject')}
          <input className="form-input" value={meta.subject} onChange={(e) => patch('subject', e.target.value)} />
        </label>
        <label className="form-label">
          {t('meta.fKeywords')}
          <input className="form-input" value={meta.keywords} onChange={(e) => patch('keywords', e.target.value)} />
        </label>
        <label className="form-label">
          {t('meta.fCreator')}
          <input className="form-input" value={meta.creator} onChange={(e) => patch('creator', e.target.value)} />
        </label>
        <label className="form-label">
          {t('meta.fProducer')}
          <input className="form-input" value={meta.producer} onChange={(e) => patch('producer', e.target.value)} />
        </label>
        <button className="primary" disabled={saving} onClick={handleSave}>
          {saving ? t('meta.savingBtn') : t('meta.saveBtn')}
        </button>
      </section>
    </div>
  );
}
