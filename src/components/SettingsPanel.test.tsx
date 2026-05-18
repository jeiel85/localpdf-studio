import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_SETTINGS, type AppSettings } from '../types';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue(null),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openPath: vi.fn().mockResolvedValue(undefined),
}));

import { SettingsPanel } from './SettingsPanel';

function setupRouter(initial: AppSettings = DEFAULT_SETTINGS) {
  let current: AppSettings = { ...initial };
  invokeMock.mockImplementation(async (cmd: string, args?: Record<string, unknown>) => {
    if (cmd === 'get_settings') return current;
    if (cmd === 'get_app_data_path') return 'C:/Users/test/AppData/Roaming/LocalPDF Studio';
    if (cmd === 'update_settings') {
      current = args!.next as AppSettings;
      return current;
    }
    if (cmd === 'reset_settings') {
      current = { ...DEFAULT_SETTINGS };
      return current;
    }
    if (cmd === 'clear_recent_files') return undefined;
    throw new Error(`unmocked command: ${cmd}`);
  });
  return {
    get current() {
      return current;
    },
  };
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('loads settings on mount and shows defaults', async () => {
    setupRouter();
    render(<SettingsPanel onStatus={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('settings-panel')).toBeInTheDocument());
    expect(invokeMock).toHaveBeenCalledWith('get_settings', undefined);
    expect(screen.getByText(/사용자 지정 배율 \(1\.20x\)/)).toBeInTheDocument();
    expect(screen.getByText(/최근 파일 최대 개수 \(20\)/)).toBeInTheDocument();
    expect(screen.getByText(/임계값 \(250 MB\)/)).toBeInTheDocument();
  });

  it('persists viewer scale change via update_settings', async () => {
    const router = setupRouter();
    const user = userEvent.setup();
    const onStatus = vi.fn();
    render(<SettingsPanel onStatus={onStatus} />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    const slider = screen.getByLabelText(/사용자 지정 배율/);
    // change to 2.0
    await user.click(slider);
    // fireEvent via userEvent isn't great for range; set value directly
    slider.setAttribute('value', '2');
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    // Direct change event simulation: use fireEvent.change since userEvent doesn't fully support range
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(slider, { target: { value: '2' } });

    await waitFor(() => {
      expect(router.current.viewer.initialScale).toBe(2);
    });
    expect(onStatus).toHaveBeenCalledWith('설정을 저장했습니다.');
  });

  it('toggles record recent files and persists', async () => {
    const router = setupRouter();
    const user = userEvent.setup();
    render(<SettingsPanel onStatus={() => {}} />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    const checkbox = screen.getByLabelText('최근 파일 기록');
    expect(checkbox).toBeChecked();
    await user.click(checkbox);

    await waitFor(() => expect(router.current.privacy.recordRecentFiles).toBe(false));
  });

  it('changes OCR default language', async () => {
    const router = setupRouter();
    const user = userEvent.setup();
    render(<SettingsPanel onStatus={() => {}} />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    const input = screen.getByPlaceholderText('kor+eng');
    await user.clear(input);
    await user.type(input, 'eng');

    await waitFor(() => expect(router.current.ocr.defaultLanguage).toBe('eng'));
  });

  it('resets settings via reset_settings', async () => {
    const router = setupRouter({
      ...DEFAULT_SETTINGS,
      viewer: { ...DEFAULT_SETTINGS.viewer, initialScale: 3.0 },
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<SettingsPanel onStatus={() => {}} />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    await user.click(screen.getByRole('button', { name: '모든 설정 기본값으로 되돌리기' }));

    await waitFor(() => expect(router.current.viewer.initialScale).toBe(1.2));
    confirmSpy.mockRestore();
  });

  it('shows error status when save fails', async () => {
    invokeMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_settings') return DEFAULT_SETTINGS;
      if (cmd === 'get_app_data_path') return '';
      if (cmd === 'update_settings') throw new Error('disk full');
      throw new Error('unmocked');
    });
    const onStatus = vi.fn();
    const user = userEvent.setup();
    render(<SettingsPanel onStatus={onStatus} />);
    await waitFor(() => screen.getByTestId('settings-panel'));

    const checkbox = screen.getByLabelText('시작 시 자동 업데이트 확인');
    await user.click(checkbox);

    await waitFor(() =>
      expect(onStatus).toHaveBeenCalledWith(expect.stringContaining('설정 저장 실패')),
    );
  });
});
