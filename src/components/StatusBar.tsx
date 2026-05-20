import type { AppInfo } from '../types';
import { t, useLocale } from '../i18n/messages';

export function StatusBar({ appInfo, message }: { appInfo: AppInfo | null; message: string }) {
  useLocale();
  return (
    <div className="statusbar-inner">
      <span>{message}</span>
      <span>{appInfo ? `${appInfo.appName} v${appInfo.version} · ${appInfo.target}` : t('status.initializing')}</span>
    </div>
  );
}
