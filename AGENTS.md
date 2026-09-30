# AGENTS.md — luật làm việc trong repo này

## 1. Nhật ký thay đổi: CHỈ MỘT FILE DUY NHẤT

Mọi thay đổi — thêm/xoá/sửa file, commit, push, tạo nhánh, đổi remote, cài/gỡ phần mềm —
**kể cả thao tác thất bại hoặc bị bỏ qua** — đều **bắt buộc** ghi vào:

```text
C:\Users\phupu\.codex\NHAT_KY_THAY_DOI.txt
```

- **KHÔNG** tạo file nhật ký thứ hai ở bất kỳ đâu (trong repo, Desktop, OneDrive, thư mục dự án).
  Repo này chỉ được **trỏ về** file trên.
- Đọc khối **“LUẬT BẮT BUỘC VỀ NHẬT KÝ THAY ĐỔI”** ở đầu file đó trước khi làm bất cứ việc gì.
- Chèn mục mới **ngay dưới** dòng dẫn chèn mục (mới nhất nằm trên cùng).
- Mỗi mục phải có: mốc thời gian `yyyy-MM-dd HH:mm:ss +07:00`, đường dẫn **tuyệt đối**, hành động
  (THÊM/SỬA/XOÁ/COMMIT/PUSH/CÀI/GỠ), lý do, kết quả kiểm chứng, việc còn lại.
- **KHÔNG** xoá, sửa, ghi đè hay đảo thứ tự mục của người/agent khác.
- Mọi nội dung tiếng Việt phải viết **CÓ DẤU**, rõ ràng, rành mạch.

## 2. Phạm vi repo này

Bot Telegram bán tài khoản số, chạy webhook serverless trên Vercel. Hai chế độ: `retail` và
`reseller`; catalog đồng bộ từ `https://patricktechmedia.store/api/products` (Zalo API là nguồn dự phòng).
Không đụng tới các dự án khác trong máy.

## 3. Lệnh kiểm chứng trước khi commit

```powershell
npm run lint     # node --check toàn bộ file
npm test         # 11/11 PASS
```

Không commit file `.env*` thật; `.env.runtime` (do Vercel CLI tạo) đã được chặn từ 2026-10-01.
