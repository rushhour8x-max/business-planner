# Business Planner

Ứng dụng web quản lý **phương án kinh doanh**, **hợp đồng**, **kế hoạch dự án**, và **người dùng** — cloud-based, song ngữ Việt-Anh.

## 🌐 Live

> **https://lambent-lebkuchen-0ccb61.netlify.app**

## Tính năng

- 📋 **Phương án KD** — 2 loại (Sản phẩm/CN + Tư vấn/DV), multi-currency, tỷ giá real-time, auto-calc chi phí
- 📄 **Hợp đồng** — CRUD, cảnh báo hết hạn 30 ngày, tìm kiếm/lọc
- 📌 **Kế hoạch** — Kanban board (drag & drop) + Calendar view
- 👥 **Admin Panel** — Quản lý user, phân quyền (Admin/Manager/Staff), giao task
- 🔐 **Supabase Auth** — Đăng ký/nhập email, auto-lock 30 phút
- ☁️ **Cloud Database** — Supabase PostgreSQL + Row Level Security
- 🌐 **Song ngữ** — Tiếng Việt / English
- 🌙 **Dark/Light mode**
- 📱 **Responsive** — Desktop, Tablet, Mobile
- 📊 **Export** — PDF báo cáo + Excel dữ liệu
- 💾 **Backup/Restore** dữ liệu

## Công nghệ

- HTML / CSS / Vanilla JavaScript
- Supabase (Auth + PostgreSQL + RLS)
- Chart.js (biểu đồ dashboard)
- jsPDF + SheetJS (xuất PDF/Excel)
- Netlify (hosting + CI/CD)

## Chạy local

```bash
npx serve . -l 3000
```

## Deploy

Push lên GitHub → tự động deploy Netlify.

```bash
git add -A
git commit -m "feat: ..."
git push origin master
```

## Tài liệu

- [SPEC.md](SPEC.md) — Functional Specification đầy đủ
