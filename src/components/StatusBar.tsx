import type { AppInfo } from '../types';

export function StatusBar({ appInfo, message }: { appInfo: AppInfo | null; message: string }) {
  return (
    <div className="statusbar-inner">
      <span>{message}</span>
      <span>{appInfo ? `${appInfo.appName} v${appInfo.version} · ${appInfo.target}` : '초기화 중'}</span>
    </div>
  );
}
