# Telegram Account Shop on Vercel

MVP bot Telegram ban tai khoan so, chay bang webhook serverless tren Vercel.

## Tinh nang

- User xem san pham, tao don hang, xem don hang.
- Admin tao san pham, nap kho tai khoan, xem don pending, xac nhan thanh toan.
- Cap tai khoan tu dong bang transaction va `for update skip locked` de tranh cap trung.
- Ticket ho tro co ban.

## Bien moi truong

Copy `.env.example` thanh `.env` khi chay local, va cau hinh cac bien nay tren Vercel:

```env
TELEGRAM_BOT_TOKEN=123456:telegram-token
TELEGRAM_WEBHOOK_SECRET=change-this-long-random-secret
ADMIN_TELEGRAM_IDS=123456789,987654321
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
SHOP_BANK_NAME=Your Bank
SHOP_BANK_ACCOUNT=0000000000
SHOP_BANK_OWNER=YOUR NAME
```

## Cai dat

```bash
npm install
```

Khoi tao database:

```bash
npm run init-db
```

Chay local bang Vercel CLI:

```bash
npm run dev
```

## Deploy Vercel

Neu muon script hoi tung bien va deploy tu dong:

```powershell
vercel login
.\scripts\deploy-vercel.ps1
```

Hoac lam thu cong:

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

Tren PowerShell:

```powershell
$env:APP_URL="https://your-project.vercel.app"
npm run set-webhook
```

## Lenh Telegram

User:

```text
/start
/ticket Noi dung can ho tro
```

Admin:

```text
/admin
/addproduct Ten goi | 100000 | Mo ta
/import 1
username1|password1
username2|password2
/confirm DHxxxx
```

## Ghi chu van hanh

Vercel khong phu hop voi Telegram long polling 24/24. Project nay dung webhook nen phu hop Vercel: Telegram goi `/api/telegram` khi co update moi.
