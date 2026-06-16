# Rentify - Quản lý Villa & Booking

Hệ thống quản lý cho thuê villa nhiều chủ (multi-tenant) với Supabase. Cho phép chủ villa quản lý đặt phòng, khách hàng và doanh thu.

## Tính năng

- **Đa chủ (Multi-tenant)** — Mỗi chủ sở hữu nhiều villa, có tài khoản riêng biệt
- **Quản lý Villa** — Thêm, sửa, xoá villa; quản lý thông tin, giá cả, lịch
- **Đặt phòng (Booking)** — Xem lịch rảnh, đặt phòng, quản lý trạng thái
- **Người dùng & Phân quyền** — Owner, Admin, Staff với quyền hạn khác nhau
- **Báo cáo** — Xuất báo cáo doanh thu, thống kê đặt phòng (Word, PDF)
- **Giao diện responsive** — Hỗ trợ mobile & desktop

## Công nghệ sử dụng

| Frontend | Backend / Database |
|----------|-------------------|
| Next.js 14 (App Router) | Supabase (PostgreSQL) |
| TypeScript | Row Level Security (RLS) |
| Tailwind CSS | realtime subscriptions |
| Mermaid (ER diagram) | Multi-tenant schema |

## Cấu trúc thư mục

```
src/
├── app/               # Next.js App Router pages
│   ├── bookings/      # Trang quản lý booking
│   ├── villas/        # Trang quản lý villa
│   ├── login/         # Đăng nhập
│   ├── register/      # Đăng ký tài khoản
│   ├── settings/      # Cài đặt hệ thống
│   ├── calendar/      # Xem lịch
│   └── pricing/       # Quản lý giá
├── components/        # Shared components
├── context/           # React context (auth, theme, notification)
├── lib/               # Utilities & helpers
├── data/              # Dữ liệu mẫu & seed
└── types/             # TypeScript types
```

## Cài đặt

```bash
# 1. Clone repo
git clone https://github.com/jymmy779/quanlyvilla.git
cd rentify

# 2. Cài dependencies
npm install

# 3. Tạo file .env.local
cp .env.example .env.local
# Điền SUPABASE_URL và SUPABASE_ANON_KEY

# 4. Chạy migration database
# Import supabase_setup.sql vào Supabase SQL Editor

# 5. Chạy dev server
npm run dev
```

## Database

Sơ đồ ER (Entity-Relationship):

![ER Diagram](public/Screenshot%202026-05-27%20230649.png)

Hoặc mở `render-erd.html` trong trình duyệt để xem tương tác (có thanh trượt phóng to và nút tải PNG).

### Entities chính

| Table | Mô tả |
|-------|-------|
| `TENANTS` | Chủ sở hữu (mỗi tenant là một chủ villa) |
| `PROFILES` | Hồ sơ người dùng (liên kết với auth.users) |
| `VILLAS` | Các villa / căn hộ cho thuê |
| `BOOKINGS` | Đặt phòng |
| `SETTINGS` | Cài đặt (key-value theo tenant) |

## API Routes

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Đăng ký chủ villa mới |
| GET/POST | `/api/bookings` | Danh sách / tạo booking |
| GET/PUT/DELETE | `/api/bookings/[id]` | Chi tiết / sửa / xoá booking |
| GET/POST | `/api/villas` | Danh sách / tạo villa |
| GET/PUT/DELETE | `/api/villas/[id]` | Chi tiết / sửa / xoá villa |

## Biên dịch & Triển khai

```bash
# Build production
npm run build

# Start production server
npm start

# Export static site
npm run export
```

## Scripts

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Dev server |
| `npm run build` | Build production |
| `npm run lint` | Kiểm tra lint |

## License

MIT
