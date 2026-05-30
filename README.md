# Telegram Account Shop on Vercel

MVP bot Telegram bán tài khoản số, chạy bằng webhook serverless trên Vercel.

## Tính năng

- User xem sản phẩm, tạo đơn hàng, xem đơn hàng.
- Admin tạo sản phẩm, nạp kho tài khoản, xem đơn chờ thanh toán, xác nhận thanh toán.
- Cấp tài khoản tự động bằng transaction và `for update skip locked` để tránh cấp trùng.
- Nhập kho từ Google Sheet dạng CSV.
- Ticket hỗ trợ cơ bản.

## Biến môi trường

Copy `.env.example` thành `.env` khi chạy local, và cấu hình các biến này trên Vercel:

```env
TELEGRAM_BOT_TOKEN=123456:telegram-token
TELEGRAM_WEBHOOK_SECRET=change-this-long-random-secret
ADMIN_TELEGRAM_IDS=123456789,987654321
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
WAREHOUSE_ADMIN_TOKEN=long-random-admin-token
WAREHOUSE_PASSWORD_SALT=random-password-salt
WAREHOUSE_PASSWORD_HASH=pbkdf2-password-hash
WAREHOUSE_SESSION_SECRET=long-random-session-secret
GOOGLE_CLIENT_ID=google-oauth-client-id.apps.googleusercontent.com
SHOP_BANK_NAME=Your Bank
SHOP_BANK_ACCOUNT=0000000000
SHOP_BANK_OWNER=YOUR NAME
```

## Cài đặt

```bash
npm install
```

Khởi tạo database:

```bash
npm run init-db
```

Chạy local bằng Vercel CLI:

```bash
npm run dev
```

## Deploy Vercel

Nếu muốn script hỏi từng biến và deploy tự động:

```powershell
vercel login
.\scripts\deploy-vercel.ps1
```

Hoặc làm thủ công:

```bash
npm i -g vercel
vercel login
vercel
vercel env add TELEGRAM_BOT_TOKEN production
vercel env add TELEGRAM_WEBHOOK_SECRET production
vercel env add ADMIN_TELEGRAM_IDS production
vercel env add DATABASE_URL production
vercel env add SHOP_BANK_NAME production
vercel env add SHOP_BANK_ACCOUNT production
vercel env add SHOP_BANK_OWNER production
vercel --prod
```

Sau khi deploy production, set webhook:

```bash
APP_URL=https://your-project.vercel.app npm run set-webhook
```

Trên PowerShell:

```powershell
$env:APP_URL="https://your-project.vercel.app"
npm run set-webhook
```

Cấu hình menu lệnh trong Telegram:

```bash
npm run setup-telegram-ui
```

## Lệnh Telegram

User:

```text
/start
/language
/ticket Noi dung can ho tro
```

Lần đầu `/start`, bot sẽ hỏi chọn `Tiếng Việt` hoặc `English`. Người dùng có thể đổi lại bằng `/language`.

Admin:

```text
/admin
/addproduct Tên gói | 100000 | Mô tả
/import 1
username1|password1
username2|password2
/importsheet 1 https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0
/confirm DHxxxx
```

## Nhập hàng bằng Google Sheet

Postgres/Neon vẫn là database chính để bot khóa tài khoản khi bán và tránh cấp trùng. Google Sheet dùng như bảng nhập hàng dễ nhìn cho admin.

Sheet nên có một trong hai kiểu:

```text
data
gmail1@example.com|password1
gmail2@example.com|password2
```

Hoặc không cần header, chỉ cần cột đầu tiên:

```text
gmail1@example.com|password1
gmail2@example.com|password2
```

Cách lấy link CSV:

1. Mở Google Sheet.
2. Chọn `File` -> `Share` -> `Publish to web`.
3. Chọn tab cần xuất.
4. Chọn định dạng `Comma-separated values (.csv)`.
5. Copy link CSV.

Sau đó gửi cho bot:

```text
/importsheet 1 https://docs.google.com/spreadsheets/d/.../pub?gid=0&single=true&output=csv
```

## Ghi chú vận hành

Vercel không phù hợp với Telegram long polling 24/24. Project này dùng webhook nên phù hợp Vercel: Telegram gọi `/api/telegram` khi có update mới.

## Web Kho Tài Khoản

Web tool quản lý kho chạy cùng Vercel app:

```text
/warehouse.html
/manager.html
```

Tính năng:

- Quản lý danh mục.
- Quản lý sản phẩm/gói.
- Quản lý biến thể theo gói.
- Nhập kho tài khoản hàng loạt.
- Xem tồn kho, đơn hàng, lịch sử thao tác.
- Quản lý danh sách admin.

Web kho hỗ trợ đăng nhập bằng email + mật khẩu cho các email admin trong bảng `warehouse_admins`. Google login cần cấu hình thêm `GOOGLE_CLIENT_ID` trong Vercel.

Các secret đăng nhập không commit lên GitHub:

- `WAREHOUSE_PASSWORD_SALT`
- `WAREHOUSE_PASSWORD_HASH`
- `WAREHOUSE_SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
