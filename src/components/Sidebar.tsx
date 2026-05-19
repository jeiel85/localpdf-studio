import type { ReactNode } from 'react';
import { t } from '../i18n/messages';
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
  const tabs: { key: SidebarTab; labelKey: string }[] = [
    { key: 'document', labelKey: 'sidebar.document' },
    { key: 'thumbnails', labelKey: 'sidebar.thumbnails' },
    { key: 'outline', labelKey: 'sidebar.outline' },
    { key: 'search', labelKey: 'sidebar.search' },
    { key: 'merge', labelKey: 'sidebar.merge' },
    { key: 'tools', labelKey: 'sidebar.tools' },
    { key: 'advanced', labelKey: 'sidebar.advanced' },
    { key: 'editor', labelKey: 'sidebar.editor' },
    { key: 'metadata', labelKey: 'sidebar.metadata' },
    { key: 'form', labelKey: 'sidebar.form' },
    { key: 'bookmarks', labelKey: 'sidebar.bookmarks' },
    { key: 'compare', labelKey: 'sidebar.compare' },
    { key: 'settings', labelKey: 'sidebar.settings' },
  ];

  return (
    <div className="sidebar-wrapper">
      <div className="sidebar-header">
        <h1>LocalPDF Studio</h1>
        <p className="muted">로컬 우선 PDF 데스크톱 앱</p>
      </div>
      <div className="sidebar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`sidebar-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      <div className="sidebar-content">{children}</div>
    </div>
  );
}
