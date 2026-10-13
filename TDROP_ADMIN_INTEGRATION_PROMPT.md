# Hướng Dẫn Tích Hợp Module Quản Trị T-Drop Vào Portal (QuantumShift & ShieldBlock)

Prompt dưới đây được dùng để gửi sang AI phụ trách dự án Portal Quản trị (nơi đang quản lý 2 project QuantumShift và ShieldBlock) để yêu cầu bổ sung giao diện duyệt đơn VietQR và cấp phát bản quyền T-Drop.

---

```markdown
Chào bạn, chúng ta đang sử dụng chung cơ sở dữ liệu Supabase (Project ID: `camnragrlqzmcxtgvukj`) với dự án ứng dụng Desktop **T-Drop** (ứng dụng Clipboard & AI OCR). 

Hiện tại, phần mềm T-Drop đã hoàn thiện hệ thống thanh toán VietQR và xác thực bản quyền, nhưng toàn bộ giao diện quản trị Admin được tách biệt hoàn toàn khỏi client app T-Drop để bảo mật. 

👉 **Yêu cầu:** Hãy tích hợp thêm một module/tab mới trong trang Quản trị hiện tại (cùng hệ thống với QuantumShift & ShieldBlock): **"Quản lý Bản quyền & Đơn hàng T-Drop"**.

Dưới đây là toàn bộ đặc tả kỹ thuật, schema CSDL và các API/RPC đã có sẵn trên Supabase:

---

### 1. Cấu trúc CSDL đã có sẵn trên Supabase:
1. **Bảng `public.tdrop_licenses`:**
   - `id`: uuid (Primary Key)
   - `key`: text (Format chuẩn: `TDR_{hardware_hash}_{rand5}`, ví dụ: `TDR_A8B9C1_X8K2M`)
   - `role`: text (`VIP` | `PREMIUM`)
   - `hardware_id`: text (Mã máy cố định của người dùng)
   - `device_name`: text
   - `status`: text (`active` | `revoked`)
   - `expires_at`: timestamptz (VIP: 30 ngày, PREMIUM: 60 ngày, **KHÔNG cộng dồn** nếu mua thêm)
   - `created_at`, `updated_at`: timestamptz

2. **Bảng `public.tdrop_orders` (Đơn hàng VietQR):**
   - `id`: uuid
   - `order_code`: text (Ví dụ: `TDR-1791854611-X7K2`)
   - `machine_id`: text (Mã máy của khách gửi lên)
   - `email`: text (Chỉ nhận gmail, icloud, outlook)
   - `role`: text (`VIP` - 29.000đ | `PREMIUM` - 49.000đ)
   - `amount`: numeric (29000 hoặc 49000)
   - `transfer_content`: text (`Thanh toan VIP cho machine ID: ...`)
   - `status`: text (`pending` | `approved` | `rejected`)
   - `license_key`: text (Mã key được cấp phát sau khi duyệt)
   - `created_at`, `approved_at`: timestamptz

3. **Bảng `public.txa_system_configs`:**
   - Chứa cấu hình PIN Admin: `config_key = 'admin_portal_pin'`, `config_value = '888888'` (hoặc session admin hiện tại của dự án).

---

### 2. Các hàm Database RPC đã tạo sẵn (Gọi qua Supabase REST API):
Bạn có thể gọi trực tiếp các RPC này từ client/backend:

1. **`admin_list_orders(p_pin text, p_status text DEFAULT 'all')`**
   - Lấy danh sách đơn hàng VietQR từ `tdrop_orders`.
2. **`admin_approve_order(p_pin text, p_order_code text)`**
   - Tự động kiểm tra đơn, sinh mã key format `TDR_{hwHash}_{rand5}` gắn đúng `machine_id` của khách, lưu vào `tdrop_licenses`, đổi trạng thái đơn thành `approved` và trả về `{ ok: true, license_key: '...' }`.
3. **`admin_list_licenses(p_pin text, p_search text DEFAULT '', p_role text DEFAULT 'all')`**
   - Lấy danh sách toàn bộ license key T-Drop, tìm kiếm theo Key hoặc Machine ID.
4. **`create_tdrop_license_key(p_pin text, p_hardware_id text, p_role text, p_device_name text)`**
   - Tạo thủ công key VIP (30 ngày) hoặc PREMIUM (60 ngày) cho 1 mã máy cụ thể.
5. **`admin_revoke_license(p_pin text, p_target_key text)`**
   - Thu hồi (Revoke) một mã key.

---

### 3. Giao diện yêu cầu triển khai:
Thêm một trang/tab **"T-Drop Manager"** gồm 2 khu vực:
1. **Tab Đơn hàng VietQR (Orders):**
   - Hiển thị danh sách đơn `pending` và `approved`.
   - Với đơn `pending`: Nút **"Duyệt & Tạo Key"** -> gọi `admin_approve_order`.
   - Với đơn đã duyệt: Nút **"Gửi Email (1-Click)"** mở link `mailto:{email}` có sẵn tiêu đề và nội dung gửi key + hướng dẫn kích hoạt cho khách.
2. **Tab Quản lý Bản quyền (Licenses):**
   - Bảng xem toàn bộ mã key T-Drop, hạn dùng còn lại, trạng thái.
   - Form tạo mã key thủ công: Nhập Machine ID, chọn gói (VIP / PREMIUM), tên thiết bị -> bấm tạo key.
   - Nút thu hồi (Revoke) key khi cần.

Hãy tích hợp module này vào hệ thống Admin hiện tại giúp tôi.
```
