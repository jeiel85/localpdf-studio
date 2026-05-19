export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const shortcuts: { key: string; action: string }[] = [
    { key: 'Ctrl+O', action: 'PDF 열기' },
    { key: 'Ctrl+P', action: '인쇄' },
    { key: 'Ctrl+W', action: '현재 탭 닫기' },
    { key: 'Ctrl+Tab', action: '다음 탭으로 전환' },
    { key: 'Ctrl+Shift+Tab', action: '이전 탭으로 전환' },
    { key: 'Ctrl+B', action: '사이드바 접기/열기' },
    { key: 'Ctrl+F', action: '검색 패널 열기' },
    { key: 'Ctrl+1', action: '문서 정보 탭' },
    { key: 'Ctrl+2', action: '썸네일 탭' },
    { key: 'Ctrl+3', action: '목차 탭' },
    { key: 'Ctrl+4', action: '검색 탭' },
    { key: 'Ctrl+5', action: '병합 탭' },
    { key: 'Ctrl+6', action: '도구 탭' },
    { key: 'Ctrl+7', action: '고급 기능 탭' },
    { key: 'Alt+← / Alt+→', action: '이전/다음 페이지' },
    { key: 'Home / End', action: '첫 페이지 / 마지막 페이지' },
    { key: 'Ctrl+G', action: '특정 페이지로 이동' },
    { key: 'Ctrl+= / Ctrl+-', action: '확대 / 축소' },
    { key: 'Ctrl+0', action: '실제 크기 (100%)' },
    { key: 'Ctrl+L', action: '단일/연속 레이아웃 토글' },
    { key: 'F1', action: '이 도움말 보기' },
  ];

  return (
    <div className="shortcut-help-overlay" onClick={onClose}>
      <div className="shortcut-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-help-header">
          <h2>키보드 단축키</h2>
          <button type="button" className="shortcut-help-close" onClick={onClose} aria-label="닫기">
            &times;
          </button>
        </div>
        <table className="shortcut-help-table">
          <thead>
            <tr>
              <th>단축키</th>
              <th>동작</th>
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
