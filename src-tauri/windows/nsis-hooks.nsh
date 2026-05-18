!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "LocalPDF Studio installed. Context menu registration is handled by scripts/windows/install-context-menu.ps1 during development."
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DetailPrint "LocalPDF Studio uninstalled. Remove HKCU context menu keys if custom installer integration is enabled."
!macroend
