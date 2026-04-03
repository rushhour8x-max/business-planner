# Business Planner

Ứng dụng web quản lý **phương án kinh doanh**, **hợp đồng**, và **kế hoạch dự án** — bảo mật, song ngữ Việt-Anh.

## Tính năng

- 📋 **Phương án KD** — 2 loại (Sản phẩm/CN + Tư vấn/DV), multi-currency, tỷ giá real-time
- 📄 **Hợp đồng** — CRUD, cảnh báo hết hạn, tìm kiếm/lọc
- 📌 **Kế hoạch** — Kanban board (drag & drop) + Calendar view
- 🔐 **Bảo mật** — Netlify Identity + Web Crypto API (AES-GCM 256-bit)
- 🌐 **Song ngữ** — Tiếng Việt / English
- 🌙 **Dark/Light mode**
- 📱 **Responsive** — Desktop, Tablet, Mobile
- 💾 **Backup/Restore** dữ liệu

## Công nghệ

- HTML / CSS / Vanilla JavaScript
- Chart.js (biểu đồ dashboard)
- Netlify Identity (xác thực)
- Web Crypto API (mã hóa dữ liệu)

## Chạy local

```bash
npx serve . -l 3000
```

## Deploy

Push lên GitHub → Kết nối Netlify → Bật Netlify Identity.
