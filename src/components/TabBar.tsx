import type { DocTab } from '../types';
import { t, useLocale } from '../i18n/messages';

export function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onOpen,
}: {
  tabs: DocTab[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onOpen: () => void;
}) {
  useLocale();
  if (tabs.length === 0) {
    return (
      <div className="tab-bar empty">
        <span className="tab-empty-text">{t('tab.noOpen')}</span>
        <button type="button" className="tab-new-btn" onClick={onOpen}>
          {t('tab.new')}
        </button>
      </div>
    );
  }

  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            <span className="tab-label" title={tab.file.path}>
              {tab.file.fileName}
            </span>
            <button
              type="button"
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="tab-new-btn" onClick={onOpen}>
          +
        </button>
      </div>
    </div>
  );
}
