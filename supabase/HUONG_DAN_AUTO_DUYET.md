# Hướng dẫn: Tự duyệt đơn T-Drop (SePay) + Gửi email miễn phí (Resend)

Sau khi làm xong, quy trình sẽ là:

1. Khách bấm **Mua** hoặc **Gia hạn** trong T-Drop → app tạo đơn và hiện mã QR.
2. Khách chuyển khoản. Nội dung chuyển khoản có mã đơn, ví dụ `TDRMVQRQBX0 MUA VIP`.
3. Ngân hàng báo có tiền → **SePay** gọi webhook `sepay-webhook` trên Supabase.
4. Webhook khớp mã đơn và số tiền rồi tự cấp key (mua mới) hoặc cộng thêm ngày vào key cũ (gia hạn).
5. App của khách đang chờ sẽ tự kích hoạt trong vòng ~5 giây. Khách cũng nhận email kèm key.

**Admin không cần duyệt tay nữa.** Trang admin chỉ còn dùng để xem đơn và xử lý trường hợp đặc biệt.

> Phần database và webhook **đã được deploy sẵn**. Bạn chỉ cần làm các bước cấu hình dưới đây. Trước khi có `SEPAY_API_KEY`, webhook từ chối mọi request (an toàn).

---

## Bước 1 — Đăng ký SePay và liên kết tài khoản MB

1. Vào <https://sepay.vn>, đăng ký tài khoản.
2. Vào **Ngân hàng → Kết nối tài khoản**, chọn **MBBank** và liên kết số tài khoản `2211231106`.
3. Kiểm tra giới hạn giao dịch/tháng của gói đang dùng trên trang **Gói dịch vụ** của SePay.
   Gói miễn phí có giới hạn; nếu bán nhiều thì nâng gói.

## Bước 2 — Tạo webhook trên SePay

Vào **Tích hợp WebHooks → Thêm webhooks** và điền:

| Mục | Giá trị |
|---|---|
| Sự kiện | **Có tiền vào** |
| Tài khoản ngân hàng | MB `2211231106` |
| Gọi đến URL | `https://camnragrlqzmcxtgvukj.supabase.co/functions/v1/sepay-webhook` |
| Là WebHooks xác thực thanh toán? | **Đúng** |
| Bỏ qua nếu nội dung giao dịch không có Code thanh toán? | **Không** |
| Kiểu chứng thực | **API Key** |
| API Key | Tự tạo một chuỗi ngẫu nhiên dài (≥ 32 ký tự) và **giữ lại** để dùng ở Bước 3 |
| Request Content type | `application/json` |

Bấm **Thêm**.

> Mẹo tạo key ngẫu nhiên trong PowerShell:
> `-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | % {[char]$_})`

## Bước 3 — Lưu secret trên Supabase

Vào Supabase Dashboard → project **camnragrlqzmcxtgvukj** → **Edge Functions → Secrets** → **Add new secret**:

| Tên | Giá trị | Bắt buộc |
|---|---|---|
| `SEPAY_API_KEY` | đúng chuỗi API Key bạn đặt ở Bước 2 | ✅ |
| `SEPAY_ACCOUNT_NUMBER` | `2211231106` | Nên có (chặn tiền vào tài khoản khác) |
| `RESEND_API_KEY` | xem Bước 4 | Để gửi email |
| `MAIL_FROM` | `T-Drop <noreply@txastudio.click>` | Không bắt buộc |

Secret có hiệu lực ngay, không cần deploy lại.

## Bước 4 — Gửi email miễn phí với Resend

**Vì sao trước đây không gửi được mail:** hệ thống chưa từng tự gửi mail. Nút "Gửi Email" trên trang admin chỉ mở ứng dụng mail trên điện thoại của bạn (`mailto:`), và bạn phải tự bấm gửi.

**Resend** miễn phí **3.000 email/tháng (100/ngày)**, gửi bằng tên miền riêng nên ít bị vào Spam.

1. Đăng ký tại <https://resend.com>.
2. Vào **Domains → Add Domain**, nhập `txastudio.click`.
3. Resend hiện ra vài bản ghi DNS (TXT/MX cho SPF và DKIM). Thêm đúng các bản ghi đó ở nơi bạn quản lý tên miền `txastudio.click` (Cloudflare, Tenten, Namecheap…).
4. Quay lại Resend bấm **Verify**. Thường mất vài phút đến vài giờ.
5. Vào **API Keys → Create API Key** (quyền *Sending access*), rồi copy key bắt đầu bằng `re_`.
6. Dán vào secret `RESEND_API_KEY` ở Bước 3.

Nếu chưa có `RESEND_API_KEY`, hệ thống vẫn tự duyệt và app vẫn tự kích hoạt, chỉ là không gửi email.

**Phương án miễn phí khác** (nếu không muốn dùng Resend):

- **Brevo** (300 email/ngày): có thể xác minh một địa chỉ Gmail làm người gửi mà không cần tên miền, nhưng mail dễ vào Spam hơn. Cần sửa `mail.ts` sang API của Brevo.
- **Gmail SMTP**: không khuyến nghị, vì Supabase Edge Functions chặn các cổng SMTP thông dụng.

## Bước 5 — Thử toàn bộ quy trình

1. Mở T-Drop (bản mới) → **Cài đặt → Bản quyền → Mua** → chọn VIP, nhập email của bạn → **Tạo mã QR**.
2. Chuyển khoản **đúng số tiền** với **đúng nội dung** hiện trên màn hình.
3. Trong vòng ~5–30 giây app sẽ hiện **"Kích hoạt thành công"**, và email về hộp thư.

Xem kết quả xử lý từng giao dịch trong Supabase → **Table Editor → `tdrop_payments`**, cột `result`:

| `result` | Ý nghĩa |
|---|---|
| `approved` / `renewed` | Đã cấp key / đã gia hạn |
| `unmatched` | Không tìm thấy mã đơn trong nội dung CK → duyệt tay trên trang admin |
| `underpaid_X_of_Y` | Khách chuyển thiếu tiền |
| `already_approved` | Đơn đã duyệt trước đó (SePay gửi lại) |
| `ignored_account` | Tiền vào tài khoản khác |

Log chi tiết xem ở **Edge Functions → sepay-webhook → Logs**.

---

## Bước 6 — Cập nhật trang admin (txastudio.click): bỏ PIN, dùng vai trò tài khoản

Đã **bỏ hẳn mã PIN**. Giờ chỉ tài khoản có `role = 'admin'` trong bảng `txa_web_users` mới gọi được các hàm admin T-Drop. Database kiểm tra vai trò ở **từng lần gọi**, nên hạ quyền một tài khoản là có hiệu lực ngay.

Trang admin cần sửa **2 chỗ**:

```js
// 1) Khi đăng nhập: txa_web_login giờ trả thêm session_token (hạn 7 ngày)
const { data } = await supabase.rpc('txa_web_login', { p_email, p_password })
if (data.success) localStorage.setItem('txa_session', data.session_token)

// 2) Mọi hàm admin T-Drop: truyền token vào p_pin (thay cho mã PIN cũ)
const token = localStorage.getItem('txa_session')
await supabase.rpc('admin_list_orders',    { p_pin: token, p_status: 'all' })
await supabase.rpc('admin_list_licenses',  { p_pin: token, p_search: '', p_role: 'all' })
await supabase.rpc('admin_approve_order',  { p_pin: token, p_order_code })
await supabase.rpc('admin_revoke_license', { p_pin: token, p_target_key })
await supabase.rpc('admin_create_tdrop_license', { p_pin: token, p_hardware_id, p_role, p_device_name })

// Đăng xuất (thu hồi token)
await supabase.rpc('txa_web_logout', { p_token: token })
```

Nếu nhận `{ ok: false, message: 'Mã PIN Admin không chính xác' }` thì token hết hạn hoặc tài khoản không phải admin. Khi đó cho đăng nhập lại.

**Cho đến khi sửa trang admin**, tab T-Drop trên trang admin sẽ báo lỗi quyền. Việc bán hàng không bị ảnh hưởng vì đã tự duyệt.

**Thăng cấp admin:** `txa_promote_to_admin` không còn gọi được từ trình duyệt (trước đây ai cũng tự lên admin được). Muốn thêm admin, chạy trong Supabase **SQL Editor**:

```sql
select public.txa_promote_to_admin('email@gmail.com');
```

---

## Các lỗ hổng đã vá (27/10/2026)

| Trước | Sau |
|---|---|
| `verify_admin_pin` luôn trả `true` → ai có key public của app cũng duyệt đơn, tạo/thu hồi key | Bắt buộc session token của tài khoản `role = 'admin'` |
| Các hàm admin bản không PIN và `create_tdrop_license_key` gọi được ẩn danh → tạo key miễn phí | Thu hồi quyền ẩn danh |
| `txa_promote_to_admin` gọi được ẩn danh → ai cũng tự lên admin | Chỉ chạy được từ Dashboard/SQL |
| Bảng `tdrop_orders` đọc công khai → lộ email + key của mọi khách | Chỉ đọc được đơn vừa tạo trong 30 giây (để app cũ còn chạy) |
| Có thể chèn đơn giả trạng thái `approved` | Đơn mới bắt buộc `pending`, chưa có key |

**Còn lại (không thuộc T-Drop, chưa sửa):** các hàm của app khác vẫn gọi được ẩn danh mà không kiểm tra quyền, gồm `admin_set_user_ban`, `admin_unlock_device`, `admin_delete_leaderboard_entry` và `txa_admin_*` (trong đó có `txa_admin_create_app`, `txa_admin_delete_app`). Nên khoá theo cùng cách (kiểm tra `verify_admin_pin(p_token)`).

## File liên quan

- `supabase/migrations/20261027_tdrop_renewal_and_auto_approval.sql`: gia hạn cộng dồn, `tdrop_fulfill_order`, RPC cho app
- `supabase/migrations/20261027_tdrop_security_lockdown.sql`: session token, khoá quyền
- `supabase/migrations/20261027_tdrop_pin_search_path.sql`: cố định `search_path`
- `supabase/functions/sepay-webhook/`: webhook (`index.ts`) và email (`mail.ts`)
