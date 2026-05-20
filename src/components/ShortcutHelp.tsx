import { t, useLocale } from '../i18n/messages';

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  useLocale();
  const shortcuts: { key: string; action: string }[] = [
    { key: 'Ctrl+O', action: t('shortcut.openPdf') },
    { key: 'Ctrl+P', action: t('shortcut.print') },
    { key: 'Ctrl+W', action: t('shortcut.closeTab') },
    { key: 'Ctrl+Tab', action: t('shortcut.nextTab') },
    { key: 'Ctrl+Shift+Tab', action: t('shortcut.prevTab') },
    { key: 'Ctrl+B', action: t('shortcut.toggleSidebar') },
    { key: 'Ctrl+F', action: t('shortcut.openSearch') },
    { key: 'Ctrl+1', action: t('shortcut.tabInfo') },
    { key: 'Ctrl+2', action: t('shortcut.tabThumb') },
    { key: 'Ctrl+3', action: t('shortcut.tabOutline') },
    { key: 'Ctrl+4', action: t('shortcut.tabSearch') },
    { key: 'Ctrl+5', action: t('shortcut.tabMerge') },
    { key: 'Ctrl+6', action: t('shortcut.tabTools') },
    { key: 'Ctrl+7', action: t('shortcut.tabAdvanced') },
    { key: 'Alt+← / Alt+→', action: t('shortcut.pageNav') },
    { key: 'Home / End', action: t('shortcut.firstLast') },
    { key: 'Ctrl+G', action: t('shortcut.gotoPage') },
    { key: 'Ctrl+= / Ctrl+-', action: t('shortcut.zoomInOut') },
    { key: 'Ctrl+0', action: t('shortcut.actualSize') },
    { key: 'Ctrl+L', action: t('shortcut.toggleLayout') },
    { key: 'F1', action: t('shortcut.showHelp') },
  ];

  return (
    <div className="shortcut-help-overlay" onClick={onClose}>
      <div className="shortcut-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-help-header">
          <h2>{t('shortcut.title')}</h2>
          <button type="button" className="shortcut-help-close" onClick={onClose} aria-label={t('common.close')}>
            &times;
          </button>
        </div>
        <table className="shortcut-help-table">
          <thead>
            <tr>
              <th>{t('shortcut.colKey')}</th>
              <th>{t('shortcut.colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {shortcuts.map((s) => (
              <tr key={s.key}>
                <td>
                  <kbd>{s.key}</kbd>
                </td>
                <td>{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
