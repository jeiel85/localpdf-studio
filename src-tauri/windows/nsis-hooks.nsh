!macro NSIS_HOOK_POSTINSTALL
  StrCpy $0 "$INSTDIR\localpdf-studio.exe"

  ; HKCU 루트 키 등록
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio" "MUIVerb" "LocalPDF Studio"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio" "SubCommands" ""
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio" "Icon" "$0"

  ; Open
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\Open" "MUIVerb" "Open in LocalPDF Studio"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\Open\command" "" '"$0" --context-action open --files "%1"'

  ; Merge
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\Merge" "MUIVerb" "Merge PDFs..."
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\Merge\command" "" '"$0" --context-action merge --files "%1"'

  ; Split
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\Split" "MUIVerb" "Split PDF..."
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\Split\command" "" '"$0" --context-action split --files "%1"'

  ; Compress
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\Compress" "MUIVerb" "Compress PDF..."
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\Compress\command" "" '"$0" --context-action compress --files "%1"'

  ; OCR
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\OCR" "MUIVerb" "OCR PDF..."
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\OCR\command" "" '"$0" --context-action ocr --files "%1"'

  ; Metadata
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\Metadata" "MUIVerb" "Properties / Metadata..."
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\Metadata\command" "" '"$0" --context-action metadata --files "%1"'

  DetailPrint "LocalPDF Studio context menu registered under HKCU."
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio"
  DetailPrint "LocalPDF Studio context menu removed from HKCU."
!macroend
