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

## Lệnh Telegram

User:

```text
/start
/ticket Noi dung can ho tro
```

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
