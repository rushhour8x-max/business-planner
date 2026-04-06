# Business Planner — Functional Specification

> Version: 1.1 | Cập nhật: 06/04/2026 | Trạng thái: **Production**

## Tài liệu chi tiết

| # | File | Nội dung |
|---|------|---------|
| 01 | [Tổng quan](docs/01-overview.md) | Giới thiệu, triển khai, công nghệ, cấu trúc thư mục |
| 02 | [Kiến trúc](docs/02-architecture.md) | Module dependencies, data flow, hybrid storage, routing |
| 03 | [Xác thực & Phân quyền](docs/03-auth-rbac.md) | Admin-managed auth, RBAC, RLS policies (WITH CHECK) |
| 04 | [Phương án KD](docs/04-business-plan.md) | 2 loại (SP/CN + Tư vấn/DV), auto-calc, multi-currency |
| 05 | [Hợp đồng](docs/05-contracts.md) | CRUD, trạng thái, cảnh báo hết hạn, DOCX export |
| 06 | [Kế hoạch](docs/06-planning.md) | Kanban drag-drop, Calendar, task linking |
| 07 | [UI, Export & Hạ tầng](docs/07-ui-export-infra.md) | Theme, i18n, PDF/Excel, Realtime, DB schema, security |

## Quick Info

| Hạng mục | Chi tiết |
|----------|---------|
| **URL** | https://lambent-lebkuchen-0ccb61.netlify.app |
| **Admin** | `rushhour.8x@gmail.com` / `BpAdmin2026!` |
| **Database** | Supabase `utqaztvjjecrtceqerxv` (Singapore) |
| **Repo** | https://github.com/rushhour8x/business-planner |
| **Deploy** | `git push origin master` → auto Netlify |
| **Version** | v1.1 (06/04/2026) |

## Changelog v1.1

| # | Feature | Chi tiết |
|---|---------|---------|
| 1 | **Realtime Sync** | Supabase Channels — auto-refresh cross-tab/device |
| 2 | **Font VN trong PDF** | Roboto Vietnamese từ CDN, Unicode đầy đủ |
| 3 | **Admin tạo tài khoản** | Modal + session preservation + fallback INSERT |
| 4 | **Ẩn signup công khai** | Login-only UI, admin-managed accounts |
| 5 | **RLS WITH CHECK** | Fix silent role update failure |
| 6 | **CSP WebSocket** | Thêm `wss://*.supabase.co` cho Realtime |
