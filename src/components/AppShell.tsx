import type { ReactNode } from 'react';

export function AppShell({ sidebar, toolbar, children, statusbar }: {
  sidebar: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
  statusbar: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">{sidebar}</aside>
      <main className="main-pane">
        <header className="toolbar">{toolbar}</header>
        <section className="viewer-stage">{children}</section>
        <footer className="statusbar">{statusbar}</footer>
      </main>
    </div>
  );
}
