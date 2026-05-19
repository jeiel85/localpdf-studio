import { useEffect, useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from 'pdf-lib';
import { readFileBytes, saveBinaryFile } from '../lib/tauriCommands';
import { maybeReveal } from '../lib/revealOutput';

interface FormFieldEntry {
  name: string;
  kind: 'text' | 'check' | 'dropdown' | 'radio' | 'other';
  value: string;
  options?: string[];
}

export function FormFillPanel({
  file,
  onStatus,
}: {
  file: { path: string; fileName: string } | null;
  onStatus: (msg: string) => void;
}) {
  const [fields, setFields] = useState<FormFieldEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docBytes, setDocBytes] = useState<Uint8Array | null>(null);

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
        if (cancelled) return;
        setDocBytes(bytes);
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const form = doc.getForm();
        const result: FormFieldEntry[] = form.getFields().map((f) => {
          const name = f.getName();
          if (f instanceof PDFTextField) {
            return { name, kind: 'text', value: f.getText() ?? '' };
          }
          if (f instanceof PDFCheckBox) {
            return { name, kind: 'check', value: f.isChecked() ? 'true' : 'false' };
          }
          if (f instanceof PDFDropdown) {
            return {
              name,
              kind: 'dropdown',
              value: f.getSelected().join(', '),
              options: f.getOptions(),
            };
          }
          if (f instanceof PDFRadioGroup) {
            return {
              name,
              kind: 'radio',
              value: f.getSelected() ?? '',
              options: f.getOptions(),
            };
          }
          return { name, kind: 'other', value: '' };
        });
        if (!cancelled) setFields(result);
      } catch (err) {
        onStatus(`폼 필드 로드 실패: ${(err as Error).message ?? err}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, onStatus]);

  function patch(index: number, value: string) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)));
  }

  async function handleSave() {
    if (!file || !docBytes) return;
    const outputPath = await save({
      defaultPath: file.path.replace(/\.pdf$/i, '_filled.pdf'),
      filters: [{ name: 'PDF 문서', extensions: ['pdf'] }],
    });
    if (typeof outputPath !== 'string') return;

    setSaving(true);
    onStatus('폼 값 저장 중...');
    try {
      const doc = await PDFDocument.load(docBytes, { ignoreEncryption: true });
      const form = doc.getForm();
      for (const entry of fields) {
        const f = form.getField(entry.name);
        if (!f) continue;
        try {
          if (entry.kind === 'text' && f instanceof PDFTextField) {
            f.setText(entry.value);
          } else if (entry.kind === 'check' && f instanceof PDFCheckBox) {
            if (entry.value === 'true') f.check();
            else f.uncheck();
          } else if (entry.kind === 'dropdown' && f instanceof PDFDropdown) {
            if (entry.value) f.select(entry.value);
          } else if (entry.kind === 'radio' && f instanceof PDFRadioGroup) {
            if (entry.value) f.select(entry.value);
          }
        } catch {
          // 단일 필드 실패는 비치명적
        }
      }
      const out = await doc.save();
      let binary = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < out.length; i += CHUNK) {
        binary += String.fromCharCode(...out.subarray(i, i + CHUNK));
      }
      const outB64 = btoa(binary);
      await saveBinaryFile(outputPath, outB64);
      onStatus(`폼 저장 완료: ${outputPath}`);
      void maybeReveal(outputPath);
    } catch (err) {
      onStatus(`저장 실패: ${(err as Error).message ?? err}`);
    } finally {
      setSaving(false);
    }
  }

  if (!file) {
    return <p className="empty-text">PDF를 열면 폼 필드를 편집할 수 있습니다.</p>;
  }
  if (loading) {
    return <p className="empty-text">폼 필드 검색 중...</p>;
  }
  if (fields.length === 0) {
    return <p className="empty-text">이 PDF에는 작성 가능한 폼 필드가 없습니다.</p>;
  }

  return (
    <div className="form-fill-panel">
      <section className="panel">
        <h2>폼 필드 ({fields.length})</h2>
        {fields.map((f, idx) => (
          <label className="form-label" key={f.name + idx}>
            {f.name} <small className="muted">({f.kind})</small>
            {f.kind === 'check' ? (
              <input
                type="checkbox"
                checked={f.value === 'true'}
                onChange={(e) => patch(idx, e.target.checked ? 'true' : 'false')}
              />
            ) : f.kind === 'dropdown' || f.kind === 'radio' ? (
              <select
                className="form-input"
                value={f.value}
                onChange={(e) => patch(idx, e.target.value)}
              >
                <option value="">선택 안 함</option>
                {(f.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="form-input"
                value={f.value}
                onChange={(e) => patch(idx, e.target.value)}
                disabled={f.kind === 'other'}
              />
            )}
          </label>
        ))}
        <button className="primary" disabled={saving} onClick={handleSave}>
          {saving ? '저장 중...' : '폼 저장'}
        </button>
      </section>
    </div>
  );
}
