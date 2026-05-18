import type { ReactNode } from 'react';
import type { SidebarTab } from '../types';

export function Sidebar({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  children: ReactNode;
}) {
  const tabs: { key: SidebarTab; label: string }[] = [
    { key: 'document', label: '문서' },
    { key: 'thumbnails', label: '썸네일' },
    { key: 'outline', label: '목차' },
    { key: 'search', label: '검색' },
    { key: 'merge', label: '병합' },
    { key: 'tools', label: '도구' },
    { key: 'advanced', label: '고급' },
  ];

  return (
    <div className="sidebar-wrapper">
      <div className="sidebar-header">
        <h1>LocalPDF Studio</h1>
        <p className="muted">로컬 우선 PDF 데스크톱 앱</p>
      </div>
      <div className="sidebar-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`sidebar-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => onTabChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="sidebar-content">{children}</div>
    </div>
  );
}
