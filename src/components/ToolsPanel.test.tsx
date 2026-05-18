import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeTools } from '../test/mocks';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(null),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
  openPath: vi.fn().mockResolvedValue(undefined),
}));

import { ToolsPanel } from './ToolsPanel';
import { openUrl } from '@tauri-apps/plugin-opener';

describe('ToolsPanel', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    vi.clearAllMocks();
  });

  it('shows installed tool with version and path', () => {
    const tools = makeTools([
      { available: true, version: 'qpdf version 12.0.0', path: 'C:\\tools\\qpdf.exe' },
    ]);
    render(<ToolsPanel currentFile={null} tools={tools} onStatus={() => {}} />);
    expect(screen.getByText('qpdf version 12.0.0')).toBeInTheDocument();
    expect(screen.getByText('C:\\tools\\qpdf.exe')).toBeInTheDocument();
    expect(screen.getByText(/사용처: 병합, 분할/)).toBeInTheDocument();
  });

  it('shows install guide for unavailable tools', () => {
    const tools = makeTools(); // both unavailable
    render(<ToolsPanel currentFile={null} tools={tools} onStatus={() => {}} />);
    expect(screen.getAllByText('설치되지 않음 — 아래 안내로 설치 후 다시 확인을 누르세요.').length).toBeGreaterThan(0);
    expect(screen.getByText('https://github.com/qpdf/qpdf/releases')).toBeInTheDocument();
    expect(screen.getByText('https://github.com/UB-Mannheim/tesseract/wiki')).toBeInTheDocument();
  });

  it('calls openUrl when "다운로드 페이지 열기" is clicked', async () => {
    const user = userEvent.setup();
    const tools = makeTools();
    render(<ToolsPanel currentFile={null} tools={tools} onStatus={() => {}} />);
    const buttons = screen.getAllByText('다운로드 페이지 열기');
    await user.click(buttons[0]);
    expect(openUrl).toHaveBeenCalledWith('https://github.com/qpdf/qpdf/releases');
  });

  it('re-checks tools and reports status', async () => {
    const user = userEvent.setup();
    const onStatus = vi.fn();
    const onToolsChange = vi.fn();
    const tools = makeTools();
    const updated = makeTools([{ available: true, version: 'qpdf version 12', path: 'C:/qpdf.exe' }]);
    invokeMock.mockResolvedValue(updated);

    render(
      <ToolsPanel
        currentFile={null}
        tools={tools}
        onStatus={onStatus}
        onToolsChange={onToolsChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: '다시 확인' }));

    expect(invokeMock).toHaveBeenCalledWith('check_external_tools', undefined);
    expect(onToolsChange).toHaveBeenCalledWith(updated);
    expect(onStatus).toHaveBeenLastCalledWith('미설치: Tesseract OCR');
  });

  it('disables PDF action buttons when no file is open', () => {
    const tools = makeTools();
    render(<ToolsPanel currentFile={null} tools={tools} onStatus={() => {}} />);
    expect(screen.getByRole('button', { name: '암호 설정' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '페이지 추출' })).toBeDisabled();
  });

  it('enables PDF action buttons when a file is open', () => {
    const tools = makeTools();
    render(
      <ToolsPanel
        currentFile={{
          path: 'C:/doc.pdf',
          fileName: 'doc.pdf',
          sizeBytes: 1024,
          base64Data: '',
        }}
        tools={tools}
        onStatus={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: '암호 설정' })).toBeEnabled();
  });
});
