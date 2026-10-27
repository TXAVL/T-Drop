import { useStore } from '../store/appStore'
import { LANGUAGES, TRANSLATIONS, en } from './translations'

/**
 * Resolves the active language code.
 * If 'system', automatically matches navigator.language (e.g. 'es-ES' -> 'es').
 */
export function getResolvedLanguage(settingLang?: string): string {
  const code = settingLang || useStore.getState().settings.language || 'system'
  if (code !== 'system') return code

  const g = globalThis as any
  if (!g.window || !g.window.navigator) return 'en'
  const navLang = ((g.window.navigator.language as string) || '').toLowerCase()
  const navLangs = Array.isArray(g.window.navigator.languages) ? (g.window.navigator.languages as string[]) : []

  // Check if browser/OS has Vietnamese in languages list
  if (navLang.startsWith('vi') || navLangs.some((l) => (l || '').toLowerCase().startsWith('vi'))) {
    return 'vi'
  }

  // Check timezone for Vietnam / Indochina (Asia/Ho_Chi_Minh, Asia/Saigon, GMT+7)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.includes('Ho_Chi_Minh') || tz.includes('Saigon') || tz.includes('Hanoi')) {
      return 'vi'
    }
    if (new Date().getTimezoneOffset() === -420) {
      return 'vi'
    }
  } catch {}

  if (navLang.startsWith('zh-tw') || navLang.startsWith('zh-hk')) return 'zh-TW'
  if (navLang.startsWith('zh')) return 'zh-CN'
  if (navLang.startsWith('es')) return 'es'
  if (navLang.startsWith('fr')) return 'fr'
  if (navLang.startsWith('de')) return 'de'
  if (navLang.startsWith('hi')) return 'hi'
  if (navLang.startsWith('ja')) return 'ja'
  if (navLang.startsWith('ru')) return 'ru'
  if (navLang.startsWith('it')) return 'it'
  if (navLang.startsWith('pt')) return 'pt'
  if (navLang.startsWith('ko')) return 'ko'
  if (navLang.startsWith('ar')) return 'ar'
  if (navLang.startsWith('fa')) return 'fa'
  if (navLang.startsWith('bn')) return 'bn'
  if (navLang.startsWith('tr')) return 'tr'
  if (navLang.startsWith('vi')) return 'vi'
  if (navLang.startsWith('pl')) return 'pl'
  if (navLang.startsWith('nl')) return 'nl'
  if (navLang.startsWith('sv')) return 'sv'
  if (navLang.startsWith('id')) return 'id'
  if (navLang.startsWith('uk')) return 'uk'
  if (navLang.startsWith('el')) return 'el'
  if (navLang.startsWith('cs')) return 'cs'
  if (navLang.startsWith('ro')) return 'ro'
  if (navLang.startsWith('hu')) return 'hu'
  if (navLang.startsWith('da')) return 'da'
  if (navLang.startsWith('fi')) return 'fi'
  if (navLang.startsWith('th')) return 'th'
  if (navLang.startsWith('he')) return 'he'
  if (navLang.startsWith('no') || navLang.startsWith('nb') || navLang.startsWith('nn')) return 'no'

  return 'en'
}

/**
 * Retrieves a nested string property safely from a translation dictionary.
 */
function getNestedProp(obj: any, path: string): string | undefined {
  const parts = path.split('.')
  let curr = obj
  for (const part of parts) {
    if (!curr || typeof curr !== 'object') return undefined
    curr = curr[part]
  }
  return typeof curr === 'string' ? curr : undefined
}

/**
 * Built-in fallback dictionary for common UI groups, shortcuts, and general labels
 * so that missing keys NEVER leak raw paths like 'behaviour.toggleHotkeyTitle'.
 */
const BUILTIN_FALLBACKS: Record<string, { en: string; vi: string }> = {
  'renew.windowTitle': { en: 'T-Drop — Extend your license', vi: 'T-Drop — Gia hạn bản quyền' },
  'renew.title': { en: 'Extend your license', vi: 'Gia hạn bản quyền' },
  'renew.loading': { en: 'Loading your current license...', vi: 'Đang tải thông tin bản quyền hiện tại...' },
  'renew.noLicense': { en: 'No active license on this machine. You can buy a new plan below.', vi: 'Máy này chưa có bản quyền đang hoạt động. Bạn có thể mua gói mới bên dưới.' },
  'renew.currentPlan': { en: 'CURRENT PLAN', vi: 'GÓI HIỆN TẠI' },
  'renew.expiresOn': { en: 'Expires {date}', vi: 'Hạn đến {date}' },
  'renew.daysLeft': { en: '{days} days left', vi: 'còn {days} ngày' },
  'renew.choosePlan': { en: '1. CHOOSE HOW LONG TO EXTEND', vi: '1. CHỌN THỜI GIAN GIA HẠN' },
  'renew.planSub': { en: '+{days} days · {price} VND', vi: '+{days} ngày · {price}đ' },
  'renew.newExpiry': { en: 'New expiry after renewal: {date}', vi: 'Hạn mới sau khi gia hạn: {date}' },
  'renew.keepsPremium': { en: 'you keep PREMIUM', vi: 'bạn vẫn giữ gói PREMIUM' },
  'renew.emailPrefilled': { en: '✓ Filled in from your existing license', vi: '✓ Đã tự điền theo bản quyền hiện có của máy này' },
  'renew.createOrder': { en: 'Generate renewal QR code ({price})', vi: 'Tạo mã QR gia hạn {price}' },
  'renew.waitingPayment': { en: 'Waiting for your transfer... T-Drop activates automatically as soon as the payment arrives. You can keep this window open.', vi: 'Đang chờ chuyển khoản... T-Drop sẽ tự kích hoạt ngay khi nhận được tiền. Bạn cứ để cửa sổ này mở.' },
  'renew.success': { en: '🎉 Renewed! New expiry: {date}', vi: '🎉 Gia hạn thành công! Hạn mới: {date}' },
  'behaviour.whatsNew': { en: "What's new", vi: 'Có gì mới' },
  'behaviour.retry': { en: 'Retry', vi: 'Thử lại' },
  'behaviour.updateDownloadFailed': { en: 'Update download failed', vi: 'Tải bản cập nhật thất bại' },
  'behaviour.updateInstallFailed': { en: 'Could not start the installer', vi: 'Không khởi chạy được trình cài đặt' },
  'behaviour.updateEta': { en: '{eta} left', vi: 'còn {eta}' },
  'groups.keyboardShortcut': { en: 'Keyboard Shortcut', vi: 'Phím tắt bàn phím' },
  'groups.toggleHotkeyPressDesc': { en: 'Press anywhere to toggle T-Drop', vi: 'Nhấn tổ hợp phím bất kỳ lúc nào để đóng/mở T-Drop' },
  'groups.fullscreenProtection': { en: 'Fullscreen Protection', vi: 'Bảo vệ toàn màn hình' },
  'groups.general': { en: 'General', vi: 'Chung' },
  'groups.languageSelectDesc': { en: 'Select your preferred language', vi: 'Chọn ngôn ngữ giao diện' },
  'groups.startup': { en: 'Startup', vi: 'Khởi động' },
  'groups.privacy': { en: 'Privacy', vi: 'Quyền riêng tư' },
  'groups.hoverActivation': { en: 'Hover Activation', vi: 'Kích hoạt rê chuột' },
  'groups.clipboardBehaviour': { en: 'Clipboard Rules', vi: 'Quy tắc bộ nhớ tạm' },
  'groups.restartCleanup': { en: 'Restart Cleanup', vi: 'Dọn dẹp khi khởi động lại' },
  'groups.linkPrivacy': { en: 'Link Privacy', vi: 'Bảo mật liên kết' },
  'groups.storageCapacity': { en: 'Storage Capacity', vi: 'Dung lượng lưu trữ' },
  'groups.autoDelete': { en: 'Auto Delete', vi: 'Tự động xóa' },
  'groups.updates': { en: 'Updates', vi: 'Cập nhật' },
  'groups.placement': { en: 'Placement', vi: 'Vị trí hiển thị' },
  'groups.displayMonitor': { en: 'Display Monitor', vi: 'Màn hình hiển thị' },
  'groups.locationHint': { en: 'Location Hint', vi: 'Gợi ý vị trí' },
  'groups.edgeHintPulseDesc': { en: 'Subtle illumination along screen edge', vi: 'Hiệu ứng nhấp nháy định vị mép màn hình' },
  'groups.hoverZoneLength': { en: 'Hover Zone Length', vi: 'Độ dài vùng rê chuột' },
  'groups.triggerThickness': { en: 'Trigger Thickness', vi: 'Độ dày vùng kích hoạt' },
  'groups.copyBeacon': { en: 'Copy Beacon', vi: 'Hiệu ứng sao chép' },
  'groups.beaconStyle': { en: 'Beacon Style', vi: 'Kiểu hiệu ứng' },
  'groups.textSize': { en: 'Text Size', vi: 'Cỡ chữ' },
  'groups.audioFeedback': { en: 'Audio Feedback', vi: 'Âm thanh phản hồi' },
  'groups.alignment': { en: 'Alignment', vi: 'Căn lề' },
  'groups.triggerPosition': { en: 'Trigger Position', vi: 'Vị trí kích hoạt' },
  'groups.panelHeight': { en: 'Panel Height', vi: 'Chiều cao bảng điều khiển' },
  'groups.aboutEdgeDrop': { en: 'About T-Drop', vi: 'Về T-Drop' },
  'groups.feedback': { en: 'Feedback', vi: 'Góp ý & Phản hồi' },

  'behaviour.toggleHotkeyTitle': { en: 'Global Toggle Shortcut', vi: 'Phím tắt toàn cục' },
  'behaviour.toggleHotkeyDesc': { en: 'Press anywhere to quickly open or close the clipboard shelf', vi: 'Nhấn tổ hợp phím bất kỳ lúc nào để đóng/mở nhanh bảng nhớ tạm' },
  'behaviour.hotkeyEdit': { en: 'Edit', vi: 'Chỉnh sửa' },
  'behaviour.hotkeyRecording': { en: 'Press key combination...', vi: 'Nhấn tổ hợp phím...' },
  'behaviour.hotkeyCancel': { en: 'Cancel', vi: 'Hủy' },
  'behaviour.hotkeyReset': { en: 'Reset to default ({shortcut})', vi: 'Đặt lại mặc định ({shortcut})' },
  'behaviour.updateModeAuto': { en: 'Automatic', vi: 'Tự động' },
  'behaviour.updateModeNotify': { en: 'Notification Only', vi: 'Chỉ thông báo' },
  'behaviour.updateModeOff': { en: 'Disabled', vi: 'Tắt cập nhật' },
  'behaviour.updateModeNotifyDesc': { en: 'Notify when updates are available without downloading', vi: 'Chỉ thông báo khi có bản mới, không tự tải ngầm' },
  'behaviour.updateLabelReady': { en: 'Update Ready', vi: 'Bản cập nhật đã sẵn sàng' },
  'behaviour.updateLabelDownloading': { en: 'Downloading Update', vi: 'Đang tải bản cập nhật' },
  'behaviour.updateLabelAvailable': { en: 'Update Available', vi: 'Có bản cập nhật mới' },
  'behaviour.update': { en: 'Update', vi: 'Cập nhật' },

  'common.close': { en: 'Close', vi: 'Đóng' },
  'common.dismiss': { en: 'Dismiss', vi: 'Bỏ qua' },
  'common.undo': { en: 'Undo', vi: 'Hoàn tác' },

  'toast.shortcutUpdated': { en: 'Shortcut updated: {shortcut}', vi: 'Đã cập nhật phím tắt: {shortcut}' },
  'toast.itemDeleted': { en: 'Item deleted', vi: 'Đã xóa mục' },
  'toast.deleteFailed': { en: 'Failed to delete item', vi: 'Không thể xóa mục' },
  'toast.clearFailed': { en: 'Failed to clear items', vi: 'Không thể dọn dẹp mục' },

  'appearance.soundVolumeTitle': { en: 'Sound Volume', vi: 'Âm lượng hiệu ứng' },
  'appearance.showQuickKeysTitle': { en: 'Quick Number Paste (1–9)', vi: 'Phím số dán nhanh (1–9)' },
  'appearance.showQuickKeysDesc': { en: 'Display 1–9 badges on recent items to paste instantly with number keys', vi: 'Hiển thị huy hiệu số 1–9 trên các mục gần nhất để dán nhanh tức thì' },
  'item.quickBadgeTitle': { en: 'Press {index} to paste', vi: 'Nhấn {index} để dán' },

  'tabs.generalStartup': { en: 'General & Startup', vi: 'Cài đặt chung & Khởi động' },
  'tabs.activationShortcuts': { en: 'Activation & Shortcuts', vi: 'Kích hoạt & Phím tắt' },
  'tabs.clipboardRules': { en: 'Clipboard Rules', vi: 'Quy tắc bộ nhớ tạm' },
  'tabs.storageRetention': { en: 'Storage & History', vi: 'Dung lượng & Lưu trữ' },
  'tabs.updates': { en: 'Updates', vi: 'Cập nhật' },

  'position.left': { en: 'Left', vi: 'Trái' },
  'position.right': { en: 'Right', vi: 'Phải' },
  'position.top': { en: 'Top', vi: 'Trên' },
  'position.bottom': { en: 'Bottom', vi: 'Dưới' },
  'position.center': { en: 'Center', vi: 'Giữa' },
  'position.topEdge': { en: 'Top Edge', vi: 'Mép trên' },
  'position.loadingDisplays': { en: 'Detecting displays...', vi: 'Đang phát hiện màn hình...' },
  'position.horizontalPositionTitle': { en: 'Horizontal Position', vi: 'Vị trí ngang' },
  'position.horizontalPositionDesc': { en: 'Adjust horizontal alignment along screen edge', vi: 'Điều chỉnh vị trí theo mép trên màn hình' },

  'filters.colors': { en: 'Colors', vi: 'Màu sắc' },

  'item.copied': { en: 'Copied!', vi: 'Đã sao chép!' },
  'item.copiedTimes': { en: 'Copied {count} times', vi: 'Đã sao chép {count} lần' },
  'item.imagePlaceholder': { en: 'Image', vi: 'Hình ảnh' },
  'item.extractText': { en: 'Image Studio (Convert, Compress, OCR)', vi: 'Xử lý hình ảnh (Đổi đuôi, Nén, OCR)' },
  'item.convertTo': { en: 'Convert to...', vi: 'Chuyển đổi sang...' },
  'item.compressBtn': { en: 'Compress', vi: 'Nén ảnh' },
  'item.quickCompress': { en: 'Quick Compress', vi: 'Nén nhanh' },

  'flyout.selectItem': { en: 'Select item', vi: 'Chọn mục' },
  'flyout.deselectItem': { en: 'Deselect item', vi: 'Bỏ chọn mục' },
  'flyout.clickToSelect': { en: 'Click to select', vi: 'Bấm để chọn' },
  'flyout.clickToDeselect': { en: 'Click to deselect', vi: 'Bấm để bỏ chọn' },
  'flyout.copied': { en: 'Copied!', vi: 'Đã sao chép!' },
  'flyout.clickToPasteImageDrag': { en: 'Click to copy · Drag to move', vi: 'Bấm để sao chép · Kéo để di chuyển' },

  'appearance.openStyleSelector': { en: 'Choose style', vi: 'Chọn kiểu' },
  'appearance.closeStyleSelector': { en: 'Close style selector', vi: 'Đóng bảng chọn kiểu' },

  'backup.securityLabel': { en: 'Security', vi: 'Bảo mật' },
  'backup.zeroItemsWarning': { en: 'No items in backup archive', vi: 'Không có mục nào trong tệp sao lưu' },

  'footer.donateTitle': { en: 'Support T-Drop', vi: 'Ủng hộ T-Drop' },
  'footer.donateNote': { en: 'Scan QR code to donate via bank transfer / MoMo', vi: 'Quét mã QR để ủng hộ qua chuyển khoản / MoMo' },
  'footer.bankName': { en: 'Bank', vi: 'Ngân hàng' },
  'footer.accountNumber': { en: 'Account Number', vi: 'Số tài khoản' },
  'footer.accountHolder': { en: 'Account Holder', vi: 'Chủ tài khoản' },
  'footer.supportTagline': { en: 'Free & Open Source forever', vi: 'Miễn phí & Mã nguồn mở mãi mãi' },
  'footer.copied': { en: 'Copied to clipboard', vi: 'Đã sao chép vào bộ nhớ tạm' },

  'emoji.open': { en: 'Emoji & Symbols', vi: 'Biểu tượng cảm xúc & Ký tự' },
  'emoji.categories': { en: 'Categories', vi: 'Danh mục' },
  'emoji.clearRecents': { en: 'Clear recents', vi: 'Xóa lịch sử gần đây' },
  'emoji.emptyRecents': { en: 'No recent emojis', vi: 'Chưa có biểu tượng gần đây' },
  'emoji.loadFailed': { en: 'Failed to load emojis', vi: 'Không thể tải biểu tượng' },
  'emoji.skinTone': { en: 'Skin tone', vi: 'Tông màu da' },

  'imageStudio.tabConvert': { en: 'Convert', vi: 'Chuyển đổi' },
  'imageStudio.tabCompress': { en: 'Compress', vi: 'Nén ảnh' },
  'imageStudio.tabOcr': { en: 'Extract Text', vi: 'Trích xuất chữ' },
  'imageStudio.targetFormat': { en: 'Target Format', vi: 'Định dạng đích' },
  'imageStudio.compressMode': { en: 'Compression Mode', vi: 'Chế độ nén' },
  'imageStudio.quality': { en: 'Quality', vi: 'Chất lượng' },
  'imageStudio.compressHint': { en: 'Smaller file size with balanced quality', vi: 'Dung lượng nhỏ hơn với chất lượng cân đối' },
  'imageStudio.convertCopy': { en: 'Convert & Copy', vi: 'Chuyển đổi & Sao chép' },
  'imageStudio.copyCompressed': { en: 'Copy Compressed', vi: 'Sao chép ảnh đã nén' },
  'imageStudio.saveAs': { en: 'Save As...', vi: 'Lưu dưới dạng...' },
  'imageStudio.saveCompressed': { en: 'Save Compressed...', vi: 'Lưu ảnh đã nén...' },
  'imageStudio.copied': { en: 'Image copied to clipboard', vi: 'Đã sao chép ảnh vào bộ nhớ tạm' },
  'imageStudio.saved': { en: 'Image saved successfully', vi: 'Đã lưu ảnh thành công' },
  'imageStudio.ocrProTitle': { en: 'VIP & PREMIUM Feature: AI Text OCR', vi: 'Tính năng VIP & PREMIUM: Trích chữ AI (OCR)' },
  'imageStudio.ocrProDesc': { en: 'Extract Vietnamese & English text from images using private, fast client-side AI.', vi: 'Tự động nhận diện chữ tiếng Việt & tiếng Anh từ hình ảnh bằng mô hình AI client-side nhanh chóng và bảo mật.' },
  'imageStudio.ocrProBtn': { en: 'Activate License in Settings', vi: 'Kích hoạt mã bản quyền trong Cài đặt' },
  'imageStudio.ocrLangLabel': { en: 'Language:', vi: 'Ngôn ngữ nhận diện:' },
  'imageStudio.ocrStartBtn': { en: 'Extract Text Now', vi: 'Bắt đầu trích xuất chữ' },
  'imageStudio.ocrExtracting': { en: 'Extracting text...', vi: 'Đang nhận diện chữ...' },
  'imageStudio.ocrPreparing': { en: 'Preparing AI model...', vi: 'Đang chuẩn bị mô hình nhận diện...' },
  'imageStudio.ocrResultSummary': { en: 'Extracted: {count} words ({conf}% confidence)', vi: 'Trích xuất: {count} từ ({conf}% tin cậy)' },
  'imageStudio.ocrRefresh': { en: 'Reset', vi: 'Làm mới' },
  'imageStudio.ocrCopyText': { en: 'Copy Text', vi: 'Sao chép văn bản' },
  'imageStudio.ocrCopiedText': { en: 'Copied text!', vi: 'Đã sao chép chữ!' },
  'imageStudio.ocrCopyMarkdown': { en: 'Copy Markdown', vi: 'Sao chép Markdown' },
  'imageStudio.ocrCopiedMarkdown': { en: 'Copied Markdown!', vi: 'Đã sao chép Markdown!' },
  'imageStudio.ocrSaveTxt': { en: 'Save .TXT', vi: 'Lưu file .TXT' },
  'imageStudio.ocrSavedTxt': { en: 'Saved .TXT!', vi: 'Đã lưu .TXT!' },
  'imageStudio.ocrUnwrap': { en: 'Clean Lines', vi: 'Bỏ ngắt dòng thừa' },
  'imageStudio.ocrUnwrapped': { en: 'Cleaned into smooth paragraphs!', vi: 'Đã nối dòng thành đoạn văn!' },
  'imageStudio.ocrAddToHistory': { en: 'Add to History', vi: 'Thêm vào danh sách' },
  'imageStudio.ocrAddedToHistory': { en: 'Added to history!', vi: 'Đã thêm vào lịch sử!' },
  'imageStudio.ocrNotFound': { en: 'No clear text detected in image.', vi: 'Không tìm thấy văn bản rõ ràng trong ảnh.' },
  'imageStudio.autoOcr': { en: 'Auto-OCR on open', vi: 'Tự động trích chữ' },
  'imageStudio.premiumExclusive': { en: 'Exclusive PREMIUM Feature', vi: 'Đặc quyền gói PREMIUM' },
  'imageStudio.premiumRequired': { en: 'This advanced feature requires a PREMIUM license.', vi: 'Tính năng nâng cao này yêu cầu gói bản quyền PREMIUM.' },
  'imageStudio.vipActive': { en: 'VIP License Active', vi: 'Gói VIP đang hoạt động' },
  'imageStudio.premiumActive': { en: 'PREMIUM Suite Active', vi: 'Gói PREMIUM đang hoạt động' },

  // License & Pro Management
  'license.title': { en: 'LICENSE & PRO FEATURES', vi: 'BẢN QUYỀN & TÍNH NĂNG PRO' },
  'license.freeBadge': { en: 'FREE (Default)', vi: 'FREE (Mặc định)' },
  'license.vipBadge': { en: 'VIP (30 days)', vi: 'VIP (30 ngày)' },
  'license.premiumBadge': { en: 'PREMIUM (60 days)', vi: 'PREMIUM (60 ngày)' },
  'license.activeStatus': { en: '{role} Account: Active', vi: 'Tài khoản {role}: Đang hoạt động' },
  'license.freeStatus': { en: 'Free Plan (Unlock more features with VIP & Premium)', vi: 'Gói Free (Mở khóa thêm tính năng với VIP & Premium)' },
  'license.ownerInfo': { en: 'Owner: {name} · {time}', vi: 'Chủ sở hữu: {name} · {time}' },
  'license.freeDesc': { en: 'Activate VIP (30 days) or PREMIUM (60 days) to use AI Text OCR and advanced tools.', vi: 'Kích hoạt VIP (hạn 30 ngày) hoặc PREMIUM (hạn 60 ngày) để dùng tính năng AI OCR trích chữ từ hình ảnh.' },
  'license.expiresAt': { en: 'Expires on:', vi: 'Hạn đến:' },
  'license.duration': { en: 'Duration:', vi: 'Thời hạn:' },
  'license.machineId': { en: 'Machine ID:', vi: 'Mã máy (Machine ID):' },
  'license.copy': { en: 'Copy', vi: 'Sao chép' },
  'license.copied': { en: 'Copied', vi: 'Đã chép' },
  'license.copiedMachineId': { en: 'Copied Machine ID!', vi: 'Đã sao chép mã máy!' },
  'license.extend': { en: '✨ Extend License', vi: '✨ Gia hạn thêm gói' },
  'license.deactivate': { en: 'Deactivate (Revert to Free)', vi: 'Hủy kích hoạt (Về Free)' },
  'license.deactivateSuccess': { en: 'License deactivated, reverted to FREE plan', vi: 'Đã hủy kích hoạt bản quyền, chuyển về gói FREE' },
  'license.keyPlaceholder': { en: 'Enter key: TDR_XXXXXX_XXXXX', vi: 'Nhập mã key: TDR_XXXXXX_XXXXX' } ,
  'license.activateBtn': { en: 'Activate', vi: 'Kích hoạt' },
  'license.activating': { en: 'Checking...', vi: 'Đang kiểm tra...' },
  'license.pasteBtn': { en: 'Paste Key', vi: 'Dán mã' },
  'license.pasteSuccess': { en: 'Pasted key from clipboard!', vi: 'Đã dán mã từ bộ nhớ tạm!' },
  'license.pasteEmpty': { en: 'No valid license key found in clipboard', vi: 'Không có mã key hợp lệ trong bộ nhớ tạm' },
  'license.pastePrompt': { en: 'Please enter or paste a license key before activating!', vi: 'Vui lòng nhập hoặc bấm "Dán mã" trước khi xác minh!' },
  'license.activateSuccess': { en: '🎉 Successfully activated {role} license!', vi: '🎉 Kích hoạt thành công gói {role}!' },
  'license.activateFailed': { en: 'Invalid or expired license key!', vi: 'Mã bản quyền không hợp lệ hoặc đã hết hạn!' },
  'license.connectionError': { en: 'Connection error: {error}', vi: 'Lỗi kết nối: {error}' },
  'license.changeDeviceOrUpgrade': { en: 'Change device or upgrade plan?', vi: 'Đổi máy khác hoặc nâng cấp gói mới?' },
  'license.buyOrGetKey': { en: 'Get / Buy License Key', vi: 'Mua / Nhận mã' },

  'license.verify': { en: 'Verify', vi: 'Xác minh' },
  'license.verifying': { en: 'Verifying...', vi: 'Đang xác minh...' },
  'license.buyUpgrade': { en: '✨ Buy License / Upgrade VIP & PREMIUM (VietQR)', vi: '✨ Mua bản quyền / Nâng cấp VIP & PREMIUM (VietQR)' },
  'license.viewLogs': { en: '📋 View System Logs & Diagnostics', vi: '📋 Xem Nhật ký & Gỡ lỗi (System Logs)' },
  'license.copiedKey': { en: 'Pasted key from clipboard!', vi: 'Đã dán mã key từ clipboard!' },
  'license.emptyClipboard': { en: 'Clipboard is empty or contains no text', vi: 'Clipboard trống hoặc không có văn bản' },
  'license.cannotReadClipboard': { en: 'Cannot read clipboard', vi: 'Không thể đọc clipboard' },
  'license.diagSuccess': { en: 'Deep system & license diagnostics complete!', vi: 'Đã hoàn tất chẩn đoán sâu hệ thống & bản quyền Windows!' },
  'license.diagFailed': { en: 'Diagnostics error: {error}', vi: 'Lỗi chẩn đoán: {error}' },

  // Purchase Modal & VietQR
  'purchase.title': { en: 'Upgrade T-Drop VIP & PREMIUM', vi: 'Nâng cấp T-Drop VIP & PREMIUM' },
  'purchase.choosePlan': { en: '1. CHOOSE LICENSE PLAN', vi: '1. CHỌN GÓI BẢN QUYỀN' },
  'purchase.vipTitle': { en: 'VIP PLAN', vi: 'GÓI VIP' },
  'purchase.vipSub': { en: '30 Days · 29,000 VND', vi: '30 Ngày · 29.000đ' },
  'purchase.premiumTitle': { en: 'PREMIUM PLAN', vi: 'GÓI PREMIUM' },
  'purchase.premiumSub': { en: '60 Days · 49,000 VND', vi: '60 Ngày · 49.000đ' },
  'purchase.machineIdLabel': { en: '2. YOUR MACHINE ID', vi: '2. MÃ MÁY CỦA BẠN (MACHINE ID)' },
  'purchase.gettingMachineId': { en: 'Getting machine ID...', vi: 'Đang lấy mã máy...' },
  'purchase.copy': { en: 'Copy', vi: 'Sao chép' },
  'purchase.copied': { en: '✓ Copied', vi: '✓ Đã chép' },
  'purchase.pasteClipboard': { en: 'Paste from clipboard', vi: 'Dán từ clipboard' },
  'purchase.emailInputPlaceholder': { en: 'Enter email: e.g. name@gmail.com', vi: 'Nhập email: ví dụ tenban@gmail.com' },
  'purchase.emailHelp': { en: 'Accepted domains: @gmail.com, @icloud.com, @outlook.com, @hotmail.com', vi: 'Hệ thống chấp nhận: @gmail.com, @icloud.com, @outlook.com, @hotmail.com' },
  'purchase.benefit1': { en: '✓ Unlock AI OCR text extraction for Vietnamese & English from images.', vi: '✓ Mở khóa AI OCR trích xuất chữ Tiếng Việt & Tiếng Anh từ ảnh.' },
  'purchase.benefit2': { en: '✓ Unlimited usage during the active license period.', vi: '✓ Không giới hạn số lần sử dụng trong thời gian hiệu lực.' },
  'purchase.benefit3': { en: '✓ Activates automatically as soon as your payment arrives; the key is also emailed to you.', vi: '✓ Tự kích hoạt ngay khi nhận được tiền, mã bản quyền cũng được gửi về email.' },
  'purchase.createOrder': { en: 'Generate VietQR Payment Code ({price})', vi: 'Tạo mã QR thanh toán {price}' },
  'purchase.creatingOrder': { en: 'Generating order...', vi: 'Đang tạo đơn hàng...' },
  'purchase.scanQrHint': { en: 'Scan QR with any banking app to automatically fill info', vi: 'Quét mã bằng app ngân hàng bất kỳ để tự động điền STK & số tiền' },
  'purchase.bank': { en: 'Bank:', vi: 'Ngân hàng:' },
  'purchase.accountNumber': { en: 'Account Number:', vi: 'Số tài khoản:' },
  'purchase.accountHolder': { en: 'Account Holder:', vi: 'Chủ tài khoản:' },
  'purchase.amount': { en: 'Amount:', vi: 'Số tiền:' },
  'purchase.transferContent': { en: 'Transfer Content (Exact):', vi: 'Nội dung chuyển khoản (bắt buộc đúng):' },
  'purchase.transferNotice': { en: 'Payment not detected automatically yet. If you have transferred, your key will be emailed to you after review; you can also enter it below.', vi: 'Chưa tự xác nhận được thanh toán. Nếu bạn đã chuyển khoản, mã bản quyền sẽ được gửi về email sau khi duyệt; bạn cũng có thể nhập mã bên dưới.' },
  'purchase.back': { en: '← Back to choose plan', vi: '← Quay lại chọn gói' },
  'purchase.hasKeyLabel': { en: 'HAVE A LICENSE KEY? ACTIVATE NOW:', vi: 'ĐÃ CÓ MÃ LICENSE? KÍCH HOẠT NGAY:' },
  'purchase.keyPlaceholder': { en: 'Paste key: TDR_XXXXXX_XXXXX', vi: 'Dán mã: TDR_XXXXXX_XXXXX' },
  'purchase.activateBtn': { en: 'Activate', vi: 'Kích hoạt' },
  'purchase.activatedSuccess': { en: '🎉 Successfully activated {role} plan!', vi: '🎉 Kích hoạt thành công gói {role}!' },
  'purchase.activatedDesc': { en: 'All pro features unlocked. Closing window...', vi: 'Đã mở khóa toàn bộ tính năng cao cấp. Đang tự động đóng cửa sổ...' },
  'purchase.startUsing': { en: '🚀 Start Using Now', vi: '🚀 Bắt đầu sử dụng ngay' },
  'purchase.closeWindow': { en: 'Close Window', vi: 'Đóng cửa sổ' },
  'purchase.emailLabel': { en: '3. EMAIL TO RECEIVE LICENSE KEY', vi: '3. EMAIL NHẬN MÃ BẢN QUYỀN' },
  'purchase.emailRequired': { en: 'Please enter your email address', vi: 'Vui lòng nhập địa chỉ email' },
  'purchase.emailInvalid': { en: 'Only accepts: @gmail.com, @icloud.com, @outlook.com, @hotmail.com', vi: 'Chỉ chấp nhận email: @gmail.com, @icloud.com, @outlook.com, @hotmail.com' },
  'purchase.createOrderBtn': { en: 'Generate VietQR Payment Code', vi: 'Tạo mã thanh toán VietQR' },
  'purchase.orderSuccess': { en: 'Order created! Scan QR code to complete payment.', vi: 'Đã tạo đơn hàng thành công! Quét mã QR để hoàn tất thanh toán.' },
  'purchase.orderFailed': { en: 'Failed to create order on server. Please try again!', vi: 'Không thể tạo đơn hàng trên máy chủ. Vui lòng thử lại!' },

  // Instant QR Code & Text Studio
  'qr.title': { en: 'Share via QR Code', vi: 'Chia sẻ mã QR' },
  'qr.scanTip': { en: 'Open camera on your phone (iOS / Android) to scan and receive content instantly without cables.', vi: 'Mở camera trên điện thoại (iOS / Android) để quét và nhận nội dung tức thì không cần dây cáp.' },
  'qr.copyImage': { en: 'Copy Image', vi: 'Chép ảnh' },
  'qr.imageCopied': { en: 'QR Code image copied to clipboard!', vi: 'Đã sao chép ảnh mã QR vào clipboard!' },
  'qr.download': { en: 'Save PNG', vi: 'Tải ảnh PNG' },
  'qr.downloadSuccess': { en: 'Saved QR Code image (.PNG)!', vi: 'Đã lưu ảnh mã QR (.PNG)!' },
  'text.chars': { en: 'chars', vi: 'ký tự' },
  'text.words': { en: 'words', vi: 'từ' },
  'text.lines': { en: 'lines', vi: 'dòng' },
  'text.upperTip': { en: 'Convert to UPPERCASE and copy', vi: 'Chuyển sang IN HOA và sao chép' },
  'text.lowerTip': { en: 'Convert to lowercase and copy', vi: 'Chuyển sang chữ thường và sao chép' },
  'text.titleTip': { en: 'Convert to Title Case and copy', vi: 'Chuyển sang In Hoa Đầu Từ và sao chép' },
  'text.camelTip': { en: 'Convert to camelCase and copy', vi: 'Chuyển sang camelCase và sao chép' },
  'text.cleanSpaceTip': { en: 'Clean spaces and redundant blank lines', vi: 'Làm sạch khoảng trắng thừa, xóa dòng trống thừa' },
  'text.copiedUpper': { en: 'Copied UPPERCASE text!', vi: 'Đã sao chép chữ IN HOA!' },
  'text.copiedLower': { en: 'Copied lowercase text!', vi: 'Đã sao chép chữ thường!' },
  'text.copiedTitle': { en: 'Copied Title Case text!', vi: 'Đã sao chép In Hoa Đầu Từ!' },
  'text.copiedCamel': { en: 'Copied camelCase text!', vi: 'Đã sao chép dạng camelCase!' },
  'text.copiedClean': { en: 'Cleaned spaces and copied text!', vi: 'Đã làm sạch khoảng trắng và sao chép!' }
}

/**
 * Main translation function.
 * E.g., t('header.searchPlaceholder')
 * E.g., t('behaviour.updateAvailableTitle', { version: '0.3.1' })
 */
export function t(
  path: string,
  params?: Record<string, string | number> | string,
  fallback?: string
): string {
  const actualFallback = typeof params === 'string' ? params : fallback
  const actualParams = typeof params === 'object' && params !== null ? params : undefined

  const settingsLang = useStore.getState().settings.language
  const langCode = getResolvedLanguage(settingsLang)
  const dict = TRANSLATIONS[langCode]

  let val = dict ? getNestedProp(dict, path) : undefined
  if (!val) {
    val = getNestedProp(en, path)
  }
  if (!val && BUILTIN_FALLBACKS[path]) {
    val = langCode === 'vi' ? BUILTIN_FALLBACKS[path].vi : BUILTIN_FALLBACKS[path].en
  }
  if (!val) {
    if (actualFallback !== undefined) return actualFallback
    // Never leak raw dotted keys like 'behaviour.toggleHotkeyTitle' to the UI!
    return ''
  }

  if (actualParams) {
    for (const [k, v] of Object.entries(actualParams)) {
      val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }

  return val
}

/**
 * Hook that subscribes to settings.language changes and returns the translation function t.
 */
export function useTranslation() {
  const language = useStore((s) => s.settings.language)
  const resolvedLang = getResolvedLanguage(language)

  // Update text direction for RTL languages like Arabic, Persian & Hebrew
  const g = globalThis as any
  if (g.document && g.document.documentElement) {
    const isRtl = resolvedLang === 'ar' || resolvedLang === 'fa' || resolvedLang === 'he'
    g.document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
  }

  return {
    t,
    language,
    resolvedLang,
    languages: LANGUAGES
  }
}
