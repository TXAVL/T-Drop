# Privacy Policy for T-Drop

**Last Updated:** October 2026  
**Applicable Versions:** T-Drop 0.1.x and newer (Windows Direct Exe & Microsoft Store)

T-Drop was built from day one on a strict **Offline-First, Zero-Telemetry, and Privacy-by-Default** philosophy. We believe your clipboard data belongs solely to you and must never be monitored, monetized, or transmitted to external servers.

---

## 1. Core Principles

1. **Zero Tracking & Telemetry**: T-Drop contains no Google Analytics, Mixpanel, Sentry, telemetry SDKs, or third-party advertising SDKs.
2. **Local Execution**: All clipboard indexing, search querying, image filtering, optical character recognition (OCR), and file staging occur entirely on your local Windows system.
3. **No External Account Required**: You can use every core feature of T-Drop without logging into any third-party account or cloud service.

---

## 2. Clipboard Data & Password Manager Security

T-Drop monitors your system clipboard to allow quick access, searching, and organizing of your copied history. However, we employ strict safety guards to protect your sensitive information:

### Automatic Exclusion of Sensitive Data
T-Drop automatically detects and ignores clipboard entries containing privacy-sensitive or password-manager flags, including:
- **Windows System Privacy Flags**:
  - `ExcludeClipboardContentFromMonitorProcessing`
  - `ClipboardViewerIgnore`
  - `CanIncludeInClipboardHistory` (when set to 0 or denied)
  - `CanUploadToCloudClipboard` (when set to 0 or denied)
- **Password Managers**:
  - **1Password** concealed clipboard formats (`application/x-vnd.agilebits.1password`)
  - **Bitwarden** and **KeePass** concealed clipboard formats and secure memory tokens
- **Transient Copies**: Internal short-lived copies and internal drag-drop gestures are rejected automatically to prevent self-duplication and accidental leaks.

---

## 3. Local Storage, Encryption & Backup Security

### At-Rest Storage Encryption (Windows DPAPI)
- All clipboard items, pinned items, and metadata are indexed in your user profile: `%LOCALAPPDATA%\T-Drop\`.
- Where supported, sensitive payload contents are encrypted at rest using **Windows DPAPI** (`safeStorage.encryptString`), binding the decryption keys securely to your current Windows user account.

### Encrypted Backups (`.txa` Files)
- When you use the **Backup & Export** feature, your clipboard cards are compressed and encrypted using **AES-256-GCM** with a key derived via **PBKDF2-HMAC-SHA256** (10,000 iterations).
- Backup files can only be decrypted when restored inside T-Drop on your machine or with your designated archive passphrase.

### In-Shelf AI OCR & Image Tools
- **AI Text Extraction (OCR)**: All optical character recognition is performed on-device. Images copied to your clipboard are never uploaded to any remote server or cloud vision API.
- **Image Conversion & Compression**: Resizing, converting (PNG/JPG/WebP), and compression tasks run entirely within the local process sandbox.

---

## 4. Network Connections & Transparency

T-Drop makes minimal, transparent network requests depending on your edition:

| Feature | Microsoft Store Edition | GitHub Direct Installer (.exe) | Data Transmitted |
| :--- | :--- | :--- | :--- |
| **Auto-Updater** | ❌ **Disabled** (Managed natively by Microsoft Store) | ✅ Checks `https://api.github.com/repos/TXAVL/T-Drop/releases/latest` | No personal data. Only standard HTTP User-Agent (`T-Drop-App`). |
| **Web URL Previews** | Optional rich link titles & favicons | Optional rich link titles & favicons | Standard HTTP GET to fetch publicly accessible Open Graph metadata. No clipboard content is sent. |
| **Analytics / Tracking** | ❌ None | ❌ None | None |

---

## 5. Windows Permissions & Native OS APIs

T-Drop utilizes standard Windows APIs necessary to provide a smooth desktop utility experience:
- **Run at Startup**: Optional setting registering a lightweight startup helper (`TDropStartup.exe` on Direct Exe or `windows.startupTask` on Store AppX). dev builds never touch the Windows Registry.
- **OLE Drag-and-Drop**: Employs Win32 OLE pipelines (`IDataObject`, `IDropSource`) to allow seamless dragging of files and text into Microsoft Office, Photoshop, VS Code, and browsers.
- **Full-Screen Detection**: Queries `SHQueryUserNotificationState` via native Win32 bindings to automatically yield and hide the hover zone while you are gaming or presenting full-screen.

---

## 6. User Control & Data Deletion

You maintain complete ownership of your data at all times:
- **Instant Deletion**: Delete individual clipboard items or clear entire categories at any time with a single click.
- **Time-Scoped Cleanup**: Wipe history older than 1 hour, 24 hours, 7 days, or wipe all unpinned items.
- **Full Removal**: Uninstalling T-Drop removes the application binaries. You can also delete `%LOCALAPPDATA%\T-Drop` to erase every trace of historical data from your disk.

---

## 7. Contact & Security Reports

If you discover a potential privacy vulnerability or have questions regarding our data practices:
- **Open an Issue**: [https://github.com/TXAVL/T-Drop/issues](https://github.com/TXAVL/T-Drop/issues)
- **Author**: Tang Xuan Anh (TXAVL)
- **Project URL**: [https://github.com/TXAVL/T-Drop](https://github.com/TXAVL/T-Drop)
- **Docs & Policies**: [https://txavl.github.io/T-Drop/](https://txavl.github.io/T-Drop/)
