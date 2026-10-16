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

  'toast.shortcutUpdated': { en: 'Shortcut updated: {shortcut}', vi: 'Đã cập nhật phím tắt: {shortcut}' },
  'toast.deleteFailed': { en: 'Failed to delete item', vi: 'Không thể xóa mục' },
  'toast.clearFailed': { en: 'Failed to clear items', vi: 'Không thể dọn dẹp mục' },

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
  'item.extractText': { en: 'Extract Text (OCR)', vi: 'Trích xuất chữ (OCR)' },
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
  'imageStudio.saved': { en: 'Image saved successfully', vi: 'Đã lưu ảnh thành công' }
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
