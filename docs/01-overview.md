# 01 — Tổng quan dự án

## Giới thiệu

**Business Planner** là ứng dụng web quản lý kinh doanh nội bộ, hỗ trợ lập phương án kinh doanh, quản lý hợp đồng, phân công việc, và quản lý người dùng. Dữ liệu được lưu trữ trên cloud (Supabase) và hỗ trợ đa thiết bị.

## Thông tin triển khai

| Hạng mục | Chi tiết |
|----------|---------|
| **URL Production** | https://lambent-lebkuchen-0ccb61.netlify.app |
| **Hosting** | Netlify (auto-deploy từ GitHub) |
| **Database** | Supabase — Region: Singapore (ap-southeast-1) |
| **Project Supabase** | `utqaztvjjecrtceqerxv` |
| **Repository** | https://github.com/rushhour8x/business-planner |
| **Branch** | `master` |

## Tài khoản Admin mặc định

| Field | Value |
|-------|-------|
| Email | `rushhour.8x@gmail.com` |
| Password | `BpAdmin2026!` |
| Vai trò | Admin |

## Công nghệ sử dụng

### Frontend

| Công nghệ | Mục đích |
|-----------|----------|
| HTML5 / CSS3 / Vanilla JavaScript | Core framework |
| CSS Custom Properties (Design Tokens) | Theming system (Dark/Light) |
| Chart.js 4.x | Biểu đồ dashboard (Doughnut, Bar) |
| jsPDF + jspdf-autotable | Xuất báo cáo PDF |
| SheetJS (xlsx) | Xuất dữ liệu Excel |
| Supabase JS SDK v2 | Cloud auth + database |

### Backend / Infrastructure

| Công nghệ | Mục đích |
|-----------|----------|
| Supabase Auth | Đăng ký/Đăng nhập (Email/Password) |
| Supabase PostgreSQL | Cloud database + Row Level Security |
| Netlify | Static hosting + CI/CD |
| Open Exchange Rate API | Tỷ giá ngoại tệ real-time |

## Cấu trúc thư mục

```
business-planner/
├── index.html              # Entry point + CDN imports
├── netlify.toml            # Deploy config + CSP headers
├── SPEC.md                 # Spec tổng hợp (tham chiếu)
├── docs/                   # Spec tách theo module
├── css/
│   └── styles.css          # Design system + toàn bộ UI styles
├── js/
│   ├── i18n.js             # Song ngữ Việt-Anh
│   ├── supabase-client.js  # Supabase singleton client
│   ├── crypto.js           # AES-GCM 256-bit encryption (legacy)
│   ├── storage.js          # Hybrid localStorage + Supabase sync
│   ├── auth.js             # Supabase Auth + Demo mode
│   ├── business-plan.js    # Module Phương án KD
│   ├── contracts.js        # Module Hợp đồng
│   ├── planning.js         # Module Kế hoạch (Kanban + Calendar)
│   ├── export.js           # Xuất PDF / Excel
│   ├── admin.js            # Quản lý người dùng + phân quyền
│   └── app.js              # Router, Dashboard, Toast, Demo data
└── locales/
    ├── vi.json             # Tiếng Việt
    └── en.json             # English
```
