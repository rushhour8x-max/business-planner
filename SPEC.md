# Business Planner — Functional Specification

> Version: 1.2 | Cập nhật: 14/04/2026 | Trạng thái: **Production**

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
| **Version** | v1.2 (14/04/2026) |

## Modules

| Module | File | Chức năng |
|--------|------|-----------|
| **App** | `js/app.js` | Router, Dashboard, Toast, Demo Data, Theme |
| **Auth** | `js/auth.js` | Login, Demo mode, Supabase auth |
| **BusinessPlan** | `js/business-plan.js` | Phương án KD, import/domestic equipment, cost calc |
| **Catalog** | `js/catalog.js` | 📦 Quản lý catalog thiết bị NCC, Excel import/export |
| **Contracts** | `js/contracts.js` | Quản lý hợp đồng, DOCX export |
| **Planning** | `js/planning.js` | Kanban board, Calendar view |
| **Export** | `js/export.js` | PDF/Excel export |
| **Storage** | `js/storage.js` | Hybrid localStorage + Supabase |
| **I18n** | `js/i18n.js` | Song ngữ Việt-Anh |
| **Admin** | `js/admin.js` | Quản lý users, tạo tài khoản |

## Changelog v1.2 (14/04/2026)

| # | Feature | Chi tiết |
|---|---------|---------|
| 1 | **Collapsible Sections** | 3 section (Thiết bị NK, Nội địa, Dịch vụ) đóng/mở bằng `<details>/<summary>` |
| 2 | **Supplier Dropdown Linked** | Chọn hãng (Aqualabo/Insitu/Custom) → auto dropdown tên TB, auto-fill xuất xứ + ngoại tệ |
| 3 | **Part Number Bidirectional** | Chọn tên TB → auto fill Part Number và ngược lại (linked 2 chiều) |
| 4 | **Dark Theme Select** | `color-scheme: dark` + option styling cho native `<select>` dropdown |
| 5 | **Tỷ giá Vietcombank** | Lấy tỷ giá Bán ra từ VCB XML (`portal.vietcombank.com.vn`), fallback Open ER API |
| 6 | **Catalog Module** | Module mới: quản lý danh mục thiết bị NCC với Excel template/import, CRUD, sync vào Phương án |

## Import Equipment Catalog

Dữ liệu catalog mặc định trong `IMPORT_CATALOG` (business-plan.js):

| Hãng | Xuất xứ | Ngoại tệ | Số thiết bị |
|------|---------|-----------|-------------|
| Aqualabo | Pháp | EUR | 7 (ACTEON, KAPTA, STAC SEN, PONSEL, DIGISENS, BUBSENS, COND SEN) |
| Insitu | Mỹ | USD | 7 (Aqua TROLL 600/500/200, RDO PRO-X, Level TROLL, Tube 300R, HydroVu) |

Mỗi thiết bị có `name` + `partNumber`. Có thể mở rộng qua module **Catalog TB**.

## Catalog TB — Quy trình

```
1. 📥 Tải mẫu Excel → gửi NCC xin báo giá
2. NCC trả file đã điền giá
3. 📤 Import Excel → hệ thống parse & lưu
4. ✏️ Sửa/xóa thủ công nếu cần
5. 🔄 Đồng bộ vào Phương án → dropdown thiết bị được cập nhật
```

## Changelog v1.1

| # | Feature | Chi tiết |
|---|---------|---------|
| 1 | **Realtime Sync** | Supabase Channels — auto-refresh cross-tab/device |
| 2 | **Font VN trong PDF** | Roboto Vietnamese từ CDN, Unicode đầy đủ |
| 3 | **Admin tạo tài khoản** | Modal + session preservation + fallback INSERT |
| 4 | **Ẩn signup công khai** | Login-only UI, admin-managed accounts |
| 5 | **RLS WITH CHECK** | Fix silent role update failure |
| 6 | **CSP WebSocket** | Thêm `wss://*.supabase.co` cho Realtime |
