import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from './Toolbar';
import type { ViewerState } from '../types';

function makeViewer(overrides: Partial<ViewerState> = {}): ViewerState {
  return {
    currentPage: 1,
    pageCount: 10,
    scale: 1.2,
    rotation: 0,
    layout: 'single',
    fitMode: 'custom',
    ...overrides,
  };
}

function renderToolbar(overrides: Partial<Parameters<typeof Toolbar>[0]> = {}) {
  const props = {
    hasDocument: true,
    viewer: makeViewer(),
    tabCount: 1,
    onOpen: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onZoomOut: vi.fn(),
    onZoomIn: vi.fn(),
    onRotate: vi.fn(),
    onCheckUpdates: vi.fn(),
    onLayoutChange: vi.fn(),
    onFitChange: vi.fn(),
    onHelp: vi.fn(),
    ...overrides,
  };
  render(<Toolbar {...props} />);
  return props;
}

describe('Toolbar', () => {
  it('shows current page and zoom', () => {
    renderToolbar({ viewer: makeViewer({ currentPage: 3, pageCount: 12, scale: 1.5 }) });
    expect(screen.getByText('3 / 12')).toBeInTheDocument();
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('disables prev/next at boundaries', () => {
    renderToolbar({ viewer: makeViewer({ currentPage: 1, pageCount: 5 }) });
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
  });

  it('marks active layout toggle', () => {
    renderToolbar({ viewer: makeViewer({ layout: 'continuous' }) });
    expect(screen.getByRole('button', { name: '연속' }).className).toContain('active');
    expect(screen.getByRole('button', { name: '단일' }).className).not.toContain('active');
  });

  it('emits layout change on click', async () => {
    const user = userEvent.setup();
    const props = renderToolbar({ viewer: makeViewer({ layout: 'single' }) });
    await user.click(screen.getByRole('button', { name: '연속' }));
    expect(props.onLayoutChange).toHaveBeenCalledWith('continuous');
  });

  it('emits fit-mode change for ↔, ⤢, 1:1', async () => {
    const user = userEvent.setup();
    const props = renderToolbar();
    await user.click(screen.getByRole('button', { name: '↔' }));
    expect(props.onFitChange).toHaveBeenCalledWith('fit-width');
    await user.click(screen.getByRole('button', { name: '⤢' }));
    expect(props.onFitChange).toHaveBeenCalledWith('fit-page');
    await user.click(screen.getByRole('button', { name: '1:1' }));
    expect(props.onFitChange).toHaveBeenCalledWith('actual');
  });

  it('disables all viewer controls when no document is open', () => {
    renderToolbar({ hasDocument: false });
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '회전' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '단일' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '↔' })).toBeDisabled();
  });
});
