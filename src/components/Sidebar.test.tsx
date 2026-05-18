import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renders all tabs including the settings tab', () => {
    render(
      <Sidebar activeTab="document" onTabChange={() => {}}>
        <div>content</div>
      </Sidebar>,
    );
    expect(screen.getByRole('button', { name: '문서' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '썸네일' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '목차' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '병합' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '도구' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '고급' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '설정' })).toBeInTheDocument();
  });

  it('marks active tab and emits change on click', async () => {
    const onTabChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Sidebar activeTab="document" onTabChange={onTabChange}>
        <div>content</div>
      </Sidebar>,
    );

    const documentTab = screen.getByRole('button', { name: '문서' });
    expect(documentTab.className).toContain('active');

    const settingsTab = screen.getByRole('button', { name: '설정' });
    expect(settingsTab.className).not.toContain('active');

    await user.click(settingsTab);
    expect(onTabChange).toHaveBeenCalledWith('settings');
  });
});
