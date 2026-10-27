# Prompt gửi cho AI/dự án trang admin (txastudio.click)

Copy nguyên khối bên dưới, dán vào AI đang làm dự án trang admin (hoặc mở dự án đó trong Claude Code rồi dán).

---

```markdown
Database Supabase dùng chung (project `camnragrlqzmcxtgvukj`) vừa được vá bảo mật cho module T-Drop.
**Mã PIN admin đã bị bỏ.** Các hàm admin T-Drop giờ yêu cầu một session token của tài khoản có
`role = 'admin'` trong bảng `txa_web_users`. Hãy sửa trang admin cho khớp. Không đổi gì phía database.

## Thay đổi phía server (đã deploy)
- `rpc('txa_web_login', { p_email, p_password })` giờ trả thêm trường **`session_token`** (string, hạn 7 ngày).
  Các trường cũ (`success`, `user`, `error`) giữ nguyên.
- Mới: `rpc('txa_web_logout', { p_token })` để thu hồi token.
- Tham số **`p_pin`** của các hàm admin T-Drop giờ là **session token** chứ không còn là mã PIN.
  Gửi sai/hết hạn/không phải admin → trả `{ ok: false, message: 'Mã PIN Admin không chính xác' }`.
- Các bản **không có `p_pin`** (`admin_list_orders(p_status)`, `admin_list_licenses(p_search, p_role)`,
  `admin_approve_order(p_order_code)`, `admin_revoke_license(p_target_key)`,
  `admin_create_tdrop_license(p_hardware_id, p_role, p_device_name)`) đã bị **khoá**
  (lỗi `42501 permission denied`). Bắt buộc dùng bản có `p_pin`.
- `txa_promote_to_admin` không còn gọi được từ trình duyệt (chỉ chạy trong Supabase SQL Editor).
- Bảng `tdrop_orders` không còn đọc trực tiếp được (`from('tdrop_orders').select()` trả rỗng) → dùng `admin_list_orders`.

## Việc cần làm
1. **Đăng nhập:** khi `txa_web_login` thành công, lưu `data.session_token`
   (cùng chỗ đang lưu thông tin user, ví dụ localStorage `txa_session`).
2. **Tạo 1 helper** lấy token, rồi sửa **mọi** chỗ gọi các hàm sau để truyền `p_pin: token`
   (tìm trong code: `admin_list_orders`, `admin_list_licenses`, `admin_approve_order`,
   `admin_revoke_license`, `admin_create_tdrop_license`, `admin_create_license`):
   ```js
   const token = localStorage.getItem('txa_session')
   supabase.rpc('admin_list_orders',   { p_pin: token, p_status: 'all' })
   supabase.rpc('admin_list_licenses', { p_pin: token, p_search: '', p_role: 'all' })
   supabase.rpc('admin_approve_order', { p_pin: token, p_order_code })
   supabase.rpc('admin_revoke_license',{ p_pin: token, p_target_key })
   supabase.rpc('admin_create_tdrop_license', { p_pin: token, p_hardware_id, p_role, p_device_name })
   ```
   Xoá ô nhập PIN / hằng số PIN nếu có.
3. **Hết hạn:** nếu một hàm admin trả `ok: false` với message chứa "PIN", hoặc lỗi `42501`
   → xoá token đã lưu và chuyển về màn hình đăng nhập.
4. **Đăng xuất:** gọi `rpc('txa_web_logout', { p_token: token })` rồi xoá token.
5. **Nút "Gửi Email (mailto)"** trên đơn đã duyệt: giữ lại được, nhưng đơn thanh toán qua SePay
   giờ đã tự gửi email (cột `emailed_at` có giá trị) → hiện nhãn "Đã gửi tự động" khi `emailed_at` khác null.
6. (Nên có) Trong bảng đơn hàng hiển thị thêm cột mới: `renew_key` (đơn gia hạn),
   `paid_amount`, `payment_ref` (`sepay:...` = tự duyệt, `manual` = admin duyệt), `emailed_at`.

## Cách kiểm tra
- Đăng nhập tài khoản admin → tab T-Drop tải được danh sách đơn và license.
- Đăng nhập tài khoản thường → tab T-Drop báo không có quyền.
- Đăng xuất rồi gọi lại → bị đá về trang đăng nhập.
```

---

## Trong lúc chưa sửa trang admin

Việc bán hàng **không bị ảnh hưởng**: SePay tự duyệt, app tự kích hoạt. Nếu cần duyệt tay một đơn
(ví dụ khách ghi sai nội dung chuyển khoản), vào Supabase Dashboard → **SQL Editor** và chạy:

```sql
-- xem đơn đang chờ
select order_code, machine_id, role, amount, email, transfer_content, created_at
from tdrop_orders where status = 'pending' order by created_at desc;

-- duyệt (mua mới cấp key, gia hạn thì cộng ngày) — trả về license_key
select tdrop_fulfill_order('TDR-XXXXXXXX', null, 'manual');
```
