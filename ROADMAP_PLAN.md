# 🗺️ T-Drop Development Roadmap & Execution Plan

Bản kế hoạch chi tiết các giai đoạn phát triển tính năng cho **T-Drop** — Trình quản lý clipboard thông minh trên Windows.

---

## 📌 Tổng quan tiến độ (Roadmap Overview)

| Giai đoạn | Nội dung chính | Trạng thái | Phiên bản |
| :--- | :--- | :---: | :---: |
| **Giai đoạn 1** | Quick Actions & Tiện ích Văn bản, Link, Màu sắc | ✅ **Đã hoàn thành** | `v0.1.3` |
| **Giai đoạn 2** | Tiện ích Ảnh & Tệp tin (Image Converter, Compressor & OCR) | ⏳ **Sẵn sàng triển khai** | `v0.2.0` |
| **Giai đoạn 3** | QR Drop (Chia sẻ nội mạng LAN giữa PC ⇄ Điện thoại) | 📋 **Kế hoạch** | `v0.3.0` |
| **Giai đoạn 4** | Smart Snippets & Tự động hóa Mẫu văn bản (Quick Templates) | 📋 **Kế hoạch** | `v0.4.0` |
| **Giai đoạn 5** | AI Clipboard Assistant & Tìm kiếm Ngữ nghĩa (Semantic Search) | 📋 **Kế hoạch** | `v0.5.0` |

---

## ✅ Giai đoạn 1: Quick Actions & Tiện ích Văn bản, Link, Màu sắc (v0.1.3)
> **Trạng thái:** Hoàn tất 100% · Đã kiểm thử 45/45 suites (449 tests pass) · Đóng gói bộ cài `T-Drop-Setup-0.1.3.exe`.

### 1.1 Tẩy Link Rác (URL Tracking Stripper)
* [x] Tạo module dùng chung `shared/urlTracking.ts` lọc tham số tracking: `utm_*`, `fbclid`, `gclid`, `mc_eid`, Shopee (`sp_atk`, `xptdk`), Twitter/TikTok share tokens (`s`, `t`, `_t`).
* [x] Bảo toàn thông minh mốc thời gian YouTube (`t=120s`) trong khi vẫn gỡ bỏ `si` và `feature`.
* [x] Nút bấm 1-click **Clean URL** (icon cây chổi 🧹 nổi bật màu cyan) trên thanh công cụ hover (Action Pill) và Preview Flyout.
* [x] Huy hiệu `🧹 Clean` vĩnh viễn ở footer thẻ link (không bị thanh hover đè lên), bấm vào để làm sạch ngay.
* [x] Toggle cấu hình *"Auto-clean tracking URLs"* trong Cài đặt (cả giao diện kệ ngang và ngăn kéo dọc).

### 1.2 Color Swatch & Bộ chuyển đổi định dạng màu
* [x] Nhận diện đa định dạng màu: HEX (`#3b82f6`), RGB/RGBA (`rgb(...)`), HSL/HSLA (`hsl(...)`).
* [x] Format chips tương tác trực tiếp (`HEX` \| `RGB` \| `HSL`) ngay trên thẻ màu: 1-click chuyển đổi và sao chép.
* [x] Nút xoay vòng nhanh định dạng (Convert Color) trên action bar.
* [x] Color Inspector chi tiết trong Preview Flyout: live swatch phản chiếu, bảng sao chép từng định dạng, thanh đo kênh RGB.

### 1.3 Tối ưu UI/UX & Khắc phục lỗi
* [x] Mở rộng bề ngang panel từ `270px` lên `320px` (+50px không gian ngang, window width `430px`), thẻ clip rộng rãi và dễ nhìn hơn.
* [x] Sửa lỗi menu **Xóa sạch** (ClearMenu) bị rỗng hộp đen do thiếu translation keys: bổ sung đầy đủ bản dịch 31 ngôn ngữ và safe fallbacks.

### 1.4 Bản vá khẩn cấp: Tự động tải cập nhật & Quyền quản trị UAC (v0.1.4)
* [x] Sửa lỗi tự động tải cập nhật bị treo ở 0% ("Đang kết nối..."): tự động kích hoạt tiến trình download trong chế độ auto mode.
* [x] Cấu hình `perMachine` & `allowElevation` trong NSIS installer: yêu cầu quyền Administrator qua UAC (`elevate.exe`), ngăn lỗi gỡ cài đặt tự xóa app khi cập nhật trong `Program Files`.
* [x] Nạp an toàn module gốc `koffi` (dynamic try/catch require): ngăn chặn lỗi crash `ENOENT koffi/package.json` (Issue #2).

---

### 1.5 Tối ưu hóa bộ nhớ RAM toàn diện (RAM & Working-Set Trimmer)
* [x] **Win32 Working-Set Trimmer:** Tích hợp `SetProcessWorkingSetSize(hProc, -1, -1)` & `K32EmptyWorkingSet` qua dynamic Win32 API binding trên `kernel32.dll`. Thu hồi và giải phóng physical memory pages khi đóng kệ đồ hoặc sau 3.5s idle.
* [x] **Renderer Process Trimming:** Duyệt qua các cửa sổ (`webContents.getOSProcessId()`), mở handle an toàn và giải phóng Working Set của renderer process.
* [x] **V8 Heap Compaction & Cache Flush:** Thiết lập giới hạn V8 heap `--max-old-space-size=256`, dọn sạch cache ảnh thumbnail ngầm và dọn bộ nhớ tự động định kỳ 4 phút.
* [x] Giảm mức tiêu thụ RAM ở chế độ chờ (Idle) từ **~120-180 MB xuống chỉ còn ~15-35 MB**!

---

## ⏳ Giai đoạn 2: Tiện ích Ảnh & Tệp tin (Image & File Power-Ups)
> **Dự kiến phiên bản:** `v0.2.0`  
> **Mục tiêu:** Tối ưu hóa xử lý ảnh chụp màn hình và ảnh copy trước khi gửi/sử dụng.

### 2.1 Bộ chuyển đổi định dạng ảnh nhanh (Image Format Converter)
* [x] Chuyển đổi định dạng 1-click: **PNG ⇄ JPEG ⇄ WebP** xử lý native trên Canvas Chromium (không cần sharp cồng kềnh).
* [x] Cho phép sao chép lại clipboard dưới định dạng mới (`image:copy-dataurl`) hoặc lưu file ra máy tính với định dạng đã chọn (`image:save-file`).
* [x] Hiển thị chip định dạng trên thẻ ảnh (`PNG` | `JPG` | `WEBP`), bấm để convert và chép vào clipboard ngay lập tức.
* [x] Image Studio Panel đầy đủ trong Preview Flyout với bộ tùy chọn chất lượng và preview tương tác.

### 2.2 Nén ảnh nhanh (Quick Image Compressor)
* [x] Nút nén nhanh giảm dung lượng ảnh (Quick Compress WebP ~75-80% quality mà không làm giảm độ nét mắt thường).
* [x] Nút Quick Compress tích hợp trực tiếp trên action bar hover của thẻ ảnh và thanh công cụ thẻ.
* [x] Tiết kiệm 50% - 80% dung lượng ảnh chụp màn hình, tối ưu cho việc gửi qua chat/email/Discord.
* [x] Bảng thống kê dung lượng trực quan trong Flyout: hiển thị dung lượng gốc ➔ dung lượng sau nén và phần trăm tiết kiệm (ví dụ: `2.4 MB ➔ 620 KB · -74%`).

### 2.3 Bóc tách chữ từ ảnh (OCR Text Extraction)
* [x] Tích hợp engine AI OCR client-side (`tesseract.js` WebAssembly) nhận diện văn bản tiếng Việt (`vie`) và tiếng Anh (`eng`) mượt mà, bảo mật 100% trên máy người dùng.
* [x] Nút **"Trích chữ (OCR)"** tiện ích trực tiếp trên thanh tác vụ nhanh của thẻ ảnh và tab OCR bên trong **Image Studio Panel**.
* [x] Thống kê độ chính xác, số dòng, số từ; cho phép sao chép 1-click hoặc đưa trực tiếp vào lịch sử clipboard của T-Drop.

### 2.4 Hệ thống Bản quyền TxaLicense & Supabase Activation
* [x] Format mã kích hoạt ngắn gọn, thẩm mỹ: `TDR_[hwHash]_[random5]` (~16 ký tự, vd: `TDR_A8B9C1_X8K2M`).
* [x] Tích hợp trực tiếp vào dự án Supabase chứa `Quantumshift` & `ShieldBlock` (Project: `camnragrlqzmcxtgvukj`), bảng `public.tdrop_licenses`.
* [x] Hỗ trợ đúng 3 loại gói:
  - `FREE`: Mặc định, miễn phí vĩnh viễn.
  - `VIP`: Có hạn 30 ngày từ lúc kích hoạt (không cộng dồn nếu nhập nhiều key).
  - `PREMIUM`: Có hạn 60 ngày từ lúc kích hoạt (không cộng dồn nếu nhập nhiều key).
* [x] Gắn chặt bản quyền với Hardware ID + PC Name; chống sao chép key sang máy khác; RPC `public.activate_tdrop_license` tự động kiểm tra hạn và gia hạn theo mốc mới.
* [x] Giao diện quản lý bản quyền chuyên nghiệp trong **Cài đặt**: hiển thị mã máy, trạng thái gói, số ngày còn lại, nút hủy kích hoạt và bộ sinh mã mẫu để test nhanh.

---

## 📋 Giai đoạn 3: QR Drop (LAN PC ⇄ Mobile)
> **Dự kiến phiên bản:** `v0.3.0`  
> **Mục tiêu:** Chia sẻ clip tức thì giữa máy tính và điện thoại không cần dây cáp hay internet.

### 3.1 QR Drop Engine
* [ ] Khởi chạy micro HTTP server tạm thời trên máy tính qua mạng Wi-Fi cục bộ (LAN).
* [ ] Nút **"Share to Phone" (Mã QR)** trên từng thẻ clip (text, link, ảnh, file).
* [ ] Quét mã QR bằng camera điện thoại để mở ngay giao diện web tải về / xem trước mà không cần cài thêm app trên điện thoại.

### 3.2 Nhận nội dung từ điện thoại lên PC (Reverse Drop)
* [ ] Trang web trên điện thoại có nút "Gửi lên PC": cho phép điện thoại tải ảnh hoặc dán văn bản để nhảy thẳng vào T-Drop trên máy tính.
* [ ] Cơ chế mã hóa một lần (token xác thực OTP ngẫu nhiên) đảm bảo chỉ người quét QR mới truyền nhận được.

---

## 📋 Giai đoạn 4: Smart Snippets & Mẫu văn bản (Quick Templates)
> **Dự kiến phiên bản:** `v0.4.0`  
> **Mục tiêu:** Biến T-Drop thành trợ lý gõ nhanh các mẫu văn bản lặp lại.

### 4.1 Tab / Thư viện Snippets
* [ ] Phân loại thẻ ghim thành "Snippets" (Mẫu trả lời email, code snippet, thông tin chuyển khoản ngân hàng, thông tin cá nhân).
* [ ] Hỗ trợ phím tắt dán nhanh (Quick Paste Slots: `Alt + 1`..`Alt + 9`).

### 4.2 Dynamic Variables (Biến động)
* [ ] Cho phép định nghĩa biến trong mẫu: `{date}`, `{time}`, `{clipboard}`, `{input:Tên khách hàng}`.
* [ ] Tự động điền ngày giờ hoặc hỏi nhanh giá trị biến khi chọn mẫu để dán.

---

## 📋 Giai đoạn 5: AI Clipboard Assistant & Tìm kiếm Ngữ nghĩa
> **Dự kiến phiên bản:** `v0.5.0`  
> **Mục tiêu:** Trí tuệ nhân tạo hỗ trợ dịch thuật, tóm tắt và tìm kiếm thông minh.

* [ ] **Quick AI Actions:** Tóm tắt văn bản dài, sửa lỗi chính tả ngữ pháp, dịch nhanh văn bản clipboard sang tiếng Anh/tiếng Việt.
* [ ] **Semantic Search:** Tìm kiếm ngữ nghĩa trong lịch sử bảng tạm (tìm "hóa đơn tiền điện" sẽ ra ảnh hoặc tin nhắn chứa hóa đơn dù không có từ khóa chính xác).
* [ ] **Local LLM / API Key linh hoạt:** Hỗ trợ nhập Google Gemini API Key cá nhân hoặc mô hình AI cục bộ bảo mật 100%.
