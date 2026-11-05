; -----------------------------------------------------------------------------
; T-Drop Modern NSIS Installer Customization Script
; Copyright (c) 2026 T-Drop by TXAVL
; -----------------------------------------------------------------------------

!macro customHeader
  ; Bottom branding text in classic NSIS status line
  BrandingText "T-Drop v${VERSION} • Trợ lý Bảng Tạm Thông Minh & AI OCR by TXAVL"
!macroend

!macro customWelcomePage
  ; Modern Welcome Page with Sidebar graphic
  !define MUI_WELCOMEPAGE_TITLE "Chào mừng bạn đến với bộ cài đặt T-Drop"
  !define MUI_WELCOMEPAGE_TEXT "T-Drop là tiện ích kẹp bảng tạm thông minh thế hệ mới kết hợp AI OCR trích xuất chữ và làm sạch liên kết chuyên nghiệp trên Windows 10 & 11.$\r$\n$\r$\n✨ Giao diện Glassmorphism Acrylic 3D mượt mà$\r$\n⚡ Phím 1–9 dán nhanh tức thì, Text Studio xoay kiểu chữ$\r$\n🧹 Tẩy link rác tracker & quét chữ từ ảnh AI OCR cực chuẩn$\r$\n💾 Sao lưu mã hóa .txa an toàn & đồng bộ bản quyền tự động$\r$\n$\r$\nNhấn [Tiếp tục] để bắt đầu quá trình cài đặt."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  ; Uninstaller Welcome Page
  !define MUI_WELCOMEPAGE_TITLE "Gỡ cài đặt ứng dụng T-Drop"
  !define MUI_WELCOMEPAGE_TEXT "Bạn có chắc chắn muốn gỡ cài đặt hoàn toàn T-Drop khỏi máy tính không?$\r$\n$\r$\nCác phím tắt và tiến trình nền sẽ được loại bỏ an toàn.$\r$\n$\r$\nNhấn [Gỡ cài đặt] để tiếp tục."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

!macro customInit
  ; Auto-close running T-Drop instances to prevent "File in use" errors during upgrade
  nsExec::Exec 'taskkill /IM T-Drop.exe /F'
!macroend

!macro customUnInit
  ; Close app before uninstallation
  nsExec::Exec 'taskkill /IM T-Drop.exe /F'
!macroend
