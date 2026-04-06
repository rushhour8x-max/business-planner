# 07 — Giao diện, Export & Hạ tầng

## Giao diện & UX

### Theme System

| Theme | Chi tiết |
|-------|---------|
| **Dark Mode** (mặc định) | Background gradient tối, accent tím-xanh |
| **Light Mode** | Background sáng, text tối |
| **Toggle** | Nút chuyển trong sidebar |
| **Persistence** | Lưu vào localStorage (`bp_theme`) |

### Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| Desktop (>1024px) | Sidebar cố định 260px + Main content |
| Tablet (768-1024px) | Sidebar thu gọn, có thể mở |
| Mobile (<768px) | Sidebar ẩn, hamburger menu ☰ |

### UI Components

| Component | File | Mô tả |
|-----------|------|-------|
| Toast | `app.js` | Thông báo popup (success/error/warning/info), tự hide |
| Modal | Mỗi module | Dialog overlay cho form CRUD |
| Data Table | Mỗi module | Bảng dữ liệu responsive |
| Stat Cards | Dashboard, Admin | Thẻ icon + số + label |
| Kanban Board | `planning.js` | 3 cột drag-drop |
| Calendar Grid | `planning.js` | Lịch tháng |
| Status Badges | CSS | Màu theo trạng thái |
| Priority Tags | CSS | High=đỏ, Medium=vàng, Low=xanh |
| User Avatar | Admin | 2 ký tự initials, nền gradient |

---

## Song ngữ (i18n)

| Ngôn ngữ | File | Sections |
|----------|------|----------|
| Tiếng Việt | `locales/vi.json` | app, auth, nav, dashboard, businessPlan, contracts, planning, common, admin |
| English | `locales/en.json` | (tương tự) |

**Cơ chế:**
- Load cả 2 file JSON khi khởi động
- `I18n.t('key.path')` → lấy text theo ngôn ngữ hiện tại
- Hỗ trợ params: `I18n.t('contracts.expiryWarning', { days: 5 })`
- Auto-detect ngôn ngữ trình duyệt lần đầu
- Toggle: `I18n.toggle()` — chuyển vi↔en
- DOM auto-update: elements với `data-i18n`, `data-i18n-placeholder`

---

## Export

### PDF (jsPDF + jspdf-autotable)

| Báo cáo | Module | Orientation |
|---------|--------|-------------|
| Dashboard Report | Dashboard | Portrait |
| Business Plans | Phương án KD | Landscape |
| Contracts | Hợp đồng | Landscape |
| Tasks | Kế hoạch | Portrait |

**Đặc điểm PDF:**
- Header gradient bar (indigo + purple)
- Stat summary cards (nếu có)
- Auto-paginated tables
- Footer: tên báo cáo + page number
- Filename: `{module}_{YYYY-MM-DD}.pdf`

### Excel (SheetJS/xlsx)

- Auto column widths
- Header row
- Tất cả modules đều xuất được
- Filename: `{module}_{YYYY-MM-DD}.xlsx`

---

## Database Schema (Supabase)

| Bảng | Cột chính | RLS |
|------|----------|-----|
| `profiles` | id, email, full_name, role, created_at | ✅ |
| `business_plans` | id, user_id, name, plan_type, status, data (JSONB) | ✅ |
| `contracts` | id, user_id, number, partner, type, value, sign_date, expiry_date, status, terms | ✅ |
| `tasks` | id, user_id, title, description, category, priority, deadline, assignee, assigned_to, status, linked_to | ✅ |

### RLS chung

```sql
-- Mỗi user chỉ thấy data của mình
CREATE POLICY "Users see own data" ON {table}
  FOR ALL USING (auth.uid() = user_id);
```

---

## Security Headers (Netlify)

```toml
Content-Security-Policy:
  default-src 'self';
  script-src  'self' 'unsafe-inline' 'unsafe-eval'
              https://cdn.jsdelivr.net
              https://cdnjs.cloudflare.com
              https://unpkg.com;
  style-src   'self' 'unsafe-inline'
              https://cdn.jsdelivr.net
              https://fonts.googleapis.com;
  font-src    'self' https://fonts.gstatic.com;
  connect-src 'self'
              https://*.supabase.co
              https://open.er-api.com;
  img-src     'self' data: blob:;
```

---

## Backup & Restore

| Tính năng | Chi tiết |
|-----------|---------|
| **Download Backup** | Xuất toàn bộ `localStorage` → file JSON |
| **Restore Backup** | Chọn file JSON → ghi đè localStorage |
| **Cloud users** | Data tự động lưu trên Supabase, backup là bổ sung |

---

## Hạn chế & Phát triển

### Hạn chế hiện tại

| # | Hạn chế |
|---|---------|
| 1 | Manager role chưa khác biệt Staff (đã đổi role được) |
| 2 | Chưa upload file đính kèm cho hợp đồng |
| 3 | Chưa có push notification cho task deadline |

### Đã khắc phục (v1.1)

| # | Feature | Chi tiết |
|---|---------|----------|
| 1 | **Realtime Sync** | Supabase Channels — auto-refresh khi data thay đổi từ thiết bị/tab khác |
| 2 | **Font tiếng Việt PDF** | Roboto Vietnamese từ CDN, hỗ trợ Unicode đầy đủ |
| 3 | **Admin tạo tài khoản** | Modal trong Admin Panel, session preservation |
| 4 | **RLS WITH CHECK** | Fix silent update failure cho role change |

### Định hướng mở rộng

| Feature | Ưu tiên |
|---------|---------|
| Manager role — quản lý team | Trung bình |
| File upload (Supabase Storage) | Trung bình |
| Email notification cho deadline | Trung bình |
| Admin xem data nhân viên | Trung bình |
| PWA (Progressive Web App) | Thấp |
| Custom domain | Thấp |
| Audit log | Thấp |
| Search toàn cục | Thấp |
| Dashboard nâng cao | Thấp |

---

## Deploy & Vận hành

```bash
# Chạy local
npx serve . -l 3000

# Deploy production
git add -A
git commit -m "feat: ..."
git push origin master
# → Netlify tự động build & deploy
```

---

*Business Planner v1.0 — 06/04/2026*
