# Business Planner — Functional Specification
> Version: 1.0 | Cập nhật: 06/04/2026 | Trạng thái: **Production**

## 1. Tổng quan

**Business Planner** là ứng dụng web quản lý kinh doanh nội bộ, hỗ trợ lập phương án kinh doanh, quản lý hợp đồng, phân công việc, và quản lý người dùng. Dữ liệu được lưu trữ trên cloud (Supabase) và hỗ trợ đa thiết bị.

### 1.1 Thông tin triển khai

| Hạng mục | Chi tiết |
|----------|---------|
| **URL Production** | https://lambent-lebkuchen-0ccb61.netlify.app |
| **Hosting** | Netlify (auto-deploy từ GitHub) |
| **Database** | Supabase — Region: Singapore (ap-southeast-1) |
| **Project Supabase** | `utqaztvjjecrtceqerxv` |
| **Repository** | https://github.com/rushhour8x/business-planner |
| **Branch** | `master` |

### 1.2 Tài khoản Admin mặc định

| Field | Value |
|-------|-------|
| Email | `rushhour.8x@gmail.com` |
| Password | `BpAdmin2026!` |
| Vai trò | Admin |

---

## 2. Công nghệ sử dụng

### 2.1 Frontend
| Công nghệ | Mục đích |
|-----------|----------|
| HTML5 / CSS3 / Vanilla JavaScript | Core framework |
| CSS Custom Properties (Design Tokens) | Theming system (Dark/Light) |
| Chart.js 4.x | Biểu đồ dashboard (Doughnut, Bar) |
| jsPDF + jspdf-autotable | Xuất báo cáo PDF |
| SheetJS (xlsx) | Xuất dữ liệu Excel |
| Supabase JS SDK v2 | Cloud auth + database |

### 2.2 Backend / Infrastructure
| Công nghệ | Mục đích |
|-----------|----------|
| Supabase Auth | Đăng ký/Đăng nhập (Email/Password) |
| Supabase PostgreSQL | Cloud database + Row Level Security |
| Netlify | Static hosting + CI/CD |
| Open Exchange Rate API | Tỷ giá ngoại tệ real-time |

---

## 3. Kiến trúc ứng dụng

### 3.1 Module Structure

```
business-planner/
├── index.html              # Entry point + CDN imports
├── netlify.toml            # Deploy config + CSP headers
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

### 3.2 Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  User Action │────▶│ Storage.js   │────▶│ localStorage │ (instant)
│  (UI Event)  │     │ (Hybrid)     │────▶│ Supabase DB  │ (async)
└─────────────┘     └──────────────┘     └──────────────┘
                           ▲
                    On Login│
                           │
                    ┌──────┴───────┐
                    │ pullFromCloud │
                    │ Supabase → LS │
                    └──────────────┘
```

- **Demo users**: Chỉ dùng `localStorage` (mất khi xóa browser)
- **Cloud users**: `localStorage` làm cache + Supabase làm source of truth
- **On login**: `pullFromCloud()` tải dữ liệu từ Supabase → ghi vào localStorage
- **On write**: Ghi localStorage (UI instant) + push Supabase (async, non-blocking)

---

## 4. Hệ thống Xác thực (Authentication)

### 4.1 Phương thức đăng nhập

| Phương thức | Chi tiết |
|-------------|---------|
| **Email/Password** | Supabase Auth — đăng ký, đăng nhập, quên mật khẩu |
| **Demo Mode** | Vào app với dữ liệu mẫu, không cần tài khoản |

### 4.2 Luồng xác thực

```
1. Mở app → Kiểm tra Supabase session
2. Có session → Auto-login → Pull cloud data → Dashboard
3. Không có session → Hiển thị Login form
4. Đăng nhập thành công → Pull cloud data → Dashboard
5. Đăng ký → Tự động tạo profile (role: staff) → Auto-login
6. Quên mật khẩu → Gửi email reset
```

### 4.3 Bảo mật

| Tính năng | Chi tiết |
|-----------|---------|
| Auto-lock | Tự động logout sau **30 phút** không hoạt động |
| Session persistence | Token lưu trong Supabase SDK (auto-refresh) |
| CSP Headers | Content-Security-Policy cho phép *.supabase.co |
| RLS | Row Level Security — mỗi user chỉ thấy data của mình |

---

## 5. Hệ thống Phân quyền (RBAC)

### 5.1 Vai trò

| Vai trò | Quyền hạn |
|---------|-----------|
| **Admin** (👑) | Xem tất cả user, đổi vai trò, giao task, full CRUD |
| **Manager** (📋) | Tương tự Staff (mở rộng sau) |
| **Staff** (👤) | CRUD dữ liệu của mình, xem task được giao |

### 5.2 Database — Bảng `profiles`

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Auto-profile Trigger

Khi user đăng ký → trigger `handle_new_user()` tự động tạo profile:
- User đầu tiên → role: `admin`
- Các user sau → role: `staff`

---

## 6. Modules chức năng

### 6.1 Dashboard (Tổng quan)

| Tính năng | Chi tiết |
|-----------|---------|
| **Stat Cards** | 4 thẻ: Phương án KD, HĐ đang thực hiện, Việc cần làm, Doanh thu mục tiêu |
| **Biểu đồ** | Doughnut chart (Công việc theo trạng thái), Bar chart (Doanh thu theo loại) |
| **HĐ sắp hết hạn** | Danh sách hợp đồng hết hạn trong 30 ngày |
| **Hoạt động gần đây** | Timeline các thay đổi mới nhất |
| **Xuất PDF** | Xuất báo cáo tổng hợp (Dashboard Report) |

---

### 6.2 Phương án Kinh doanh

#### 6.2.1 Phân loại

| Loại | Mô tả | Subtypes |
|------|--------|----------|
| **Type 1** | Sản phẩm / Công nghệ | Mua bán, Phát triển SP, Chuyển giao CN |
| **Type 2** | Tư vấn / Dịch vụ | Tư vấn, Làm hồ sơ, Dịch vụ khác |

#### 6.2.2 Cấu trúc dữ liệu — Type 1 (Sản phẩm)

| Section | Các trường |
|---------|-----------|
| **Thông tin chung** | Tên, Loại, Phụ loại, Trạng thái, Mô tả |
| **Thiết bị NK** | Tên, Hãng/NCC, Loại ngoại tệ, Tỷ giá, Ngày quy đổi, FOB, Phụ kiện, Vận chuyển, CIF, CIF(VND), Thuế NK%, VAT%, Tổng LDP(VND) |
| **Thiết bị Nội địa** | Tên, NCC, Số lượng, Đơn giá, Thành tiền |
| **CP Dịch vụ & Logistics** | Giao nhận, Bảo hiểm, Kiểm định, Lắp đặt, Phiên dịch, Lãi vay, Ngân hàng, Bảo hành, Vật tư, CP quản lý, CP dự phòng |
| **Tổng kết** | Tổng CP NK, Tổng CP nội địa, Tổng CP DV, **TỔNG CHI PHÍ ĐẦU VÀO**, Giá bán, SL dự kiến, Doanh thu, Lợi nhuận, Biên LN% |

#### 6.2.3 Cấu trúc dữ liệu — Type 2 (Tư vấn)

| Trường | Mô tả |
|--------|-------|
| Khách hàng / Đối tác | Tên KH |
| Mô tả công việc | Chi tiết |
| Số người tham gia | Nhân sự |
| Thời gian (ngày công) | Duration |
| CP nhân công / người / ngày | Unit cost |
| Tổng CP nhân công | Auto-calc |
| CP phát sinh | In ấn, đi lại... |
| **Tổng chi phí** | Auto-calc |
| Giá trị HĐ / Phí dịch vụ | Revenue |
| **Lợi nhuận** | Auto-calc |
| **Biên LN (%)** | Auto-calc |

#### 6.2.4 Tính năng

| Tính năng | Chi tiết |
|-----------|---------|
| CRUD | Tạo, sửa, xóa phương án |
| Tìm kiếm | Search by name |
| Lọc | Theo loại (Type 1/2) và trạng thái |
| **Tỷ giá real-time** | Fetch từ Open Exchange Rate API (USD, EUR, JPY, GBP, CNY, KRW, SGD, THB) |
| **Auto-calc** | Tự động tính CIF, LDP, tổng CP, lợi nhuận, biên LN |
| **Multi-currency** | Hỗ trợ nhập giá bằng ngoại tệ + quy đổi VND |
| So sánh | So sánh 2+ phương án side-by-side |
| Xuất PDF | Báo cáo chi tiết từng phương án |
| Xuất Excel | Danh sách phương án + số liệu |
| Trạng thái | Nháp → Đang thực hiện → Hoàn thành / Hủy |

---

### 6.3 Quản lý Hợp đồng

#### 6.3.1 Cấu trúc dữ liệu

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| number | Text | Số hợp đồng |
| partner | Text | Đối tác / Khách hàng |
| type | Enum | Mua bán / Dịch vụ / Thuê / Khác |
| value | Number | Giá trị HĐ (VND) |
| signDate | Date | Ngày ký kết |
| effectiveDate | Date | Ngày hiệu lực |
| expiryDate | Date | Ngày hết hạn |
| status | Enum | Đang soạn / Đã ký / Đang thực hiện / Hoàn thành / Hết hạn |
| terms | Text | Điều khoản quan trọng |

#### 6.3.2 Tính năng

| Tính năng | Chi tiết |
|-----------|---------|
| CRUD | Tạo, sửa, xóa hợp đồng |
| Tìm kiếm | Search by number, partner |
| Lọc | Theo loại và trạng thái |
| **Cảnh báo hết hạn** | Tự động notify HĐ hết hạn trong 30 ngày (badge + panel) |
| Xuất PDF / Excel | Danh sách + chi tiết hợp đồng |
| Trạng thái | 5 trạng thái với màu sắc phân biệt |

---

### 6.4 Kế hoạch (Planning / Task Management)

#### 6.4.1 Cấu trúc dữ liệu

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| title | Text | Tiêu đề công việc |
| description | Text | Mô tả |
| category | Enum | Kinh doanh / Kỹ thuật / Hành chính / Khác |
| priority | Enum | Cao / Trung bình / Thấp |
| deadline | Date | Hạn hoàn thành |
| assignee | Text | Người phụ trách (tên) |
| assignedTo | UUID | User ID (khi admin giao việc) |
| status | Enum | Cần làm / Đang làm / Hoàn thành |
| linkedTo | Text | Liên kết với Phương án hoặc Hợp đồng |

#### 6.4.2 Views

| View | Mô tả |
|------|-------|
| **Kanban Board** | 3 cột drag-and-drop: Cần làm → Đang làm → Hoàn thành |
| **Calendar** | Lịch tháng hiển thị task theo deadline |

#### 6.4.3 Tính năng

| Tính năng | Chi tiết |
|-----------|---------|
| CRUD | Tạo, sửa, xóa task |
| **Drag & Drop** | Kéo thả task giữa các cột Kanban |
| **Overdue detection** | Highlight task quá hạn bằng màu đỏ |
| **Liên kết** | Gắn task với Phương án KD hoặc Hợp đồng cụ thể |
| Xuất PDF / Excel | Danh sách task kèm trạng thái |

---

### 6.5 Admin Panel (Quản lý Người dùng)

> **Chỉ Admin mới truy cập được**

#### 6.5.1 Giao diện

| Thành phần | Chi tiết |
|------------|---------|
| **Stat Cards** | 3 thẻ: Số Admin, Manager, Staff |
| **User Table** | Tên, Email, Vai trò (dropdown), Số task, Ngày tham gia, Thao tác |

#### 6.5.2 Tính năng

| Tính năng | Chi tiết |
|-----------|---------|
| **Xem tất cả user** | Bảng danh sách toàn bộ người dùng đã đăng ký |
| **Phân quyền** | Dropdown thay đổi vai trò (Admin/Manager/Staff) |
| **Giao việc** | Modal tạo task gắn trực tiếp cho user cụ thể |
| **Xem tasks** | Xem danh sách tất cả task đã giao cho 1 user |
| **Bảo vệ** | Admin không thể thay đổi role của chính mình |

---

## 7. Song ngữ (i18n)

| Ngôn ngữ | File | Mặc định |
|----------|------|----------|
| Tiếng Việt | `locales/vi.json` | ✅ Mặc định |
| English | `locales/en.json` | — |

- Chuyển đổi ngôn ngữ bất kỳ lúc nào (nút toggle trên header)
- Lưu preference vào `localStorage`
- Tự động detect ngôn ngữ trình duyệt lần đầu
- Hỗ trợ template strings với params: `{days}`, `{name}`...

---

## 8. Giao diện & UX

### 8.1 Theme System

| Theme | Chi tiết |
|-------|---------|
| **Dark Mode** (mặc định) | Background gradient tối, accent tím-xanh |
| **Light Mode** | Background sáng, text tối |
| Toggle | Nút chuyển trong sidebar |
| Persistence | Lưu preference vào localStorage |

### 8.2 Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| Desktop (>1024px) | Sidebar cố định + Main content |
| Tablet (768-1024px) | Sidebar thu gọn, có thể mở |
| Mobile (<768px) | Sidebar ẩn, hiện qua hamburger menu |

### 8.3 UI Components

| Component | Mô tả |
|-----------|-------|
| **Toast** | Thông báo success/error/warning/info (tự biến mất) |
| **Modal** | Dialog cho form tạo/sửa dữ liệu |
| **Data Table** | Bảng dữ liệu với sort/filter |
| **Stat Cards** | Thẻ thống kê với icon + số liệu |
| **Kanban Board** | Board drag-and-drop 3 cột |
| **Calendar Grid** | Lịch tháng với task markers |
| **Form Controls** | Input, Select, Textarea, Date picker |
| **Status Badges** | Tags trạng thái với màu sắc |
| **Priority Tags** | High (đỏ), Medium (vàng), Low (xanh) |

---

## 9. Xuất dữ liệu (Export)

### 9.1 PDF Export (jsPDF)

| Báo cáo | Nội dung |
|---------|---------|
| **Dashboard Report** | Tổng hợp tất cả modules + stat cards + tables |
| **Business Plans** | Danh sách phương án + statistics |
| **Contracts** | Danh sách hợp đồng + cảnh báo |
| **Tasks** | Danh sách công việc + trạng thái |

Đặc điểm PDF:
- Header gradient bar (indigo/purple)
- Stat summary cards
- Auto-paginated tables
- Footer với page number
- Filename tự động: `{module}_{date}.pdf`

### 9.2 Excel Export (SheetJS)

- Auto column widths
- Tất cả modules đều xuất được Excel
- Filename tự động: `{module}_{date}.xlsx`

---

## 10. Database Schema (Supabase)

### 10.1 Bảng dữ liệu

| Bảng | Cột chính | RLS |
|------|----------|-----|
| `profiles` | id, email, full_name, role, avatar_url, created_at | ✅ |
| `business_plans` | id, user_id, name, plan_type, subtype, status, data (JSONB), description | ✅ |
| `contracts` | id, user_id, number, partner, type, value, sign_date, effective_date, expiry_date, status, terms | ✅ |
| `tasks` | id, user_id, title, description, category, priority, deadline, assignee, assigned_to, status, linked_to | ✅ |

### 10.2 Row Level Security

```sql
-- Users chỉ thấy dữ liệu của mình
CREATE POLICY "Users see own data" ON business_plans
  FOR ALL USING (auth.uid() = user_id);

-- Tương tự cho contracts và tasks

-- Profiles: tất cả user đã đăng nhập có thể xem
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

-- Admin có quyền quản lý tất cả profiles
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (auth.jwt()->>'email' = 'rushhour.8x@gmail.com');
```

---

## 11. Backup & Restore

| Tính năng | Chi tiết |
|-----------|---------|
| **Download Backup** | Xuất toàn bộ localStorage thành file JSON |
| **Restore Backup** | Import file JSON → ghi đè localStorage |
| **Cloud Sync** | Với cloud user, data tự động lưu trên Supabase |

---

## 12. Security Headers (Netlify)

```toml
[headers]
  [[headers.values]]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://open.er-api.com; img-src 'self' data: blob:;"
```

---

## 13. Hạn chế & Định hướng phát triển

### 13.1 Hạn chế hiện tại

| Hạn chế | Mô tả |
|---------|-------|
| Chưa có realtime sync | Data không auto-refresh giữa 2 tab/device |
| Manager role chưa khác Staff | Chức năng giống nhau |
| Chưa có file attachment | HĐ chưa upload file đính kèm |
| Không có notification | Chưa push notification cho task deadline |
| Font tiếng Việt trong PDF | jsPDF không hỗ trợ Unicode font natively |

### 13.2 Định hướng mở rộng

| Feature | Priority |
|---------|----------|
| Realtime subscription (Supabase Channels) | High |
| Manager role — quản lý team | Medium |
| File upload (Supabase Storage) | Medium |
| Email notification cho deadline | Medium |
| PWA (Progressive Web App) | Low |
| Custom domain | Low |
| Audit log | Low |

---

## 14. Script chạy dự án

```bash
# Local development
npx serve . -l 3000

# Deploy (auto)
git add -A
git commit -m "feat: ..."
git push origin master
# → Netlify auto-build & deploy
```

---

*Document generated: 06/04/2026 — Business Planner v1.0*
