## T-Drop v0.1.5 — Giai đoạn 2: Image Studio & AI OCR, Hệ thống Bản quyền VietQR & Siêu tối ưu RAM 15-35MB (13/10/2026)

### 🚀 Tính năng mới & Cải tiến trong bản phát hành v0.1.5:

#### 1. 🖼️ Studio Xử Lý Ảnh & Trích Xuất Chữ AI OCR WebAssembly (Image Studio & AI OCR)
- **Công cụ ảnh chuyên nghiệp:** Hỗ trợ chuyển đổi qua lại giữa các định dạng ảnh phổ biến (`PNG`, `JPG`, `WebP`) cùng thanh trượt nén ảnh thông minh (Smart Compression) tùy chỉnh mức chất lượng từ 10% đến 100%, tự động tính toán dung lượng tệp tiết kiệm theo thời gian thực.
- **Trí tuệ nhân tạo OCR Tesseract WebAssembly:** Tích hợp mô hình AI OCR chạy 100% cục bộ (client-side) trên máy tính người dùng, không gửi ảnh lên máy chủ bên thứ ba, bảo mật tuyệt đối. Hỗ trợ nhận diện chữ đa ngôn ngữ: **Tiếng Việt** (`vie`) và **Tiếng Anh** (`eng`).
- **Thao tác nhanh 1-Click:** Bổ sung nút Nén Nhanh (Compress) và nút Trích Chữ Nhanh (OCR) trực tiếp trên thanh công cụ hover của thẻ ảnh và giao diện chi tiết trong Preview Flyout.

#### 2. 💎 Hệ Thống Bản Quyền TxaLicense & Thanh Toán VietQR Tự Động
- **3 Cấp độ bản quyền chuẩn mực:**
  - `FREE` (Mặc định): Sử dụng vĩnh viễn toàn bộ tính năng quản lý clipboard cơ bản, tẩy link rác, chuyển đổi màu sắc.
  - `VIP` (29.000đ): Thời hạn 30 ngày, mở khóa Studio Xử Lý Ảnh & AI OCR. **Không cộng dồn ngày** nếu kích hoạt nhiều key cùng lúc.
  - `PREMIUM` (49.000đ): Thời hạn 60 ngày, mở khóa toàn bộ tính năng cao cấp không giới hạn. **Không cộng dồn ngày**.
- **Mã kích hoạt phần cứng an toàn:** Định dạng key thanh lịch `TDR_{hwHash}_{rand5}` (VD: `TDR_A8B9C1_X8K2M`, ~16 ký tự) gắn chặt với phần cứng thiết bị (Machine ID / Hardware Fingerprint).
- **Thanh toán VietQR tức thì:** Tự động tạo mã QR chuyển khoản MBBank (STK `2211231106`) với số tiền và nội dung chuyển khoản được điền sẵn chính xác cho từng máy. Kiểm tra email người mua nghiêm ngặt (`@gmail.com`, `@icloud.com`, `@outlook.com`). Đơn hàng được lưu tự động lên CSDL Supabase trước khi hiển thị mã QR.
- **Theo dõi thời hạn trực quan:** Hiển thị chi tiết hạn dùng còn lại (`Hạn đến: DD/MM/YYYY · Còn lại: X ngày`) trong Cài đặt và tự động chuyển về Free khi hết hạn.

#### 3. ⚡ Tối Ưu Hóa Bộ Nhớ RAM Đỉnh Cao (Win32 Working Set Trimmer — Chỉ còn 15-35MB RAM)
- **Cơ chế thu hồi bộ nhớ sâu:** Tích hợp hàm API gốc Windows `SetProcessWorkingSetSize` qua thư viện Koffi.
- **Tiết kiệm tài nguyên tuyệt đối:** Khi ứng dụng ở trạng thái rảnh rỗi (idle), hệ thống tự động dọn dẹp các trang bộ nhớ thừa và hoàn trả RAM cho Windows. Mức chiếm dụng RAM nền của T-Drop giảm ngoạn mục xuống chỉ còn **15MB - 35MB**, mang lại trải nghiệm siêu mượt mà và nhẹ nhàng cho máy tính.

#### 4. 🛡️ Bảo Mật Tách Rời Hoàn Toàn Giao Diện Quản Trị (Decoupled Client Security)
- **Bảo vệ mã nguồn mở:** Gỡ bỏ 100% mã nguồn và giao diện admin ra khỏi ứng dụng desktop client, loại bỏ hoàn toàn nguy cơ bị dịch ngược hoặc dò tìm cổng quản trị.
- **Quản trị độc lập:** Hệ thống duyệt đơn và cấp phát key được chuyển giao sang Portal quản lý độc lập, được bảo vệ nghiêm ngặt bằng Supabase Row Level Security (RLS) và Database RPC Functions.

---
### 📦 Tệp tải về đính kèm:
- `T-Drop-Setup-0.1.5.exe`: Trình cài đặt chính thức cho Windows 10/11 (64-bit) với phân quyền Administrator tự động.
- `T-Drop-Setup-0.1.5.exe.blockmap` & `latest.yml`: Siêu dữ liệu tự động cập nhật vi sai qua `electron-updater` (yêu cầu UAC).
