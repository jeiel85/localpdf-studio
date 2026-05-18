import type { ReactNode } from 'react';

export function AppShell({ tabBar, sidebar, toolbar, children, statusbar, sidebarCollapsed, onToggleSidebar }: {
  tabBar: ReactNode;
  sidebar: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
  statusbar: ReactNode;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="sidebar">{sidebar}</aside>
      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={onToggleSidebar}
        title={sidebarCollapsed ? '사이드바 열기 (Ctrl+B)' : '사이드바 닫기 (Ctrl+B)'}
        aria-label={sidebarCollapsed ? '사이드바 열기' : '사이드바 닫기'}
      >
        {sidebarCollapsed ? '\u25B6' : '\u25C0'}
      </button>
      <main className="main-pane">
        <div className="tab-bar-wrapper">{tabBar}</div>
        <header className="toolbar">{toolbar}</header>
        <section className="viewer-stage">{children}</section>
        <footer className="statusbar">{statusbar}</footer>
      </main>
    </div>
  );
}
