# 02 — Kiến trúc & Data Flow

## Kiến trúc tổng quan

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│  Browser │───▶│   Netlify    │───▶│  Static HTML │
│  (User)  │    │   (Hosting)  │    │  + JS + CSS  │
└──────────┘    └──────────────┘    └──────┬───────┘
                                          │
                    ┌─────────────────────┘
                    ▼
              ┌──────────┐     ┌──────────────────┐
              │ Supabase │◀───▶│  PostgreSQL DB   │
              │  Auth    │     │  (RLS Enabled)   │
              └──────────┘     └──────────────────┘
```

## Module Dependencies

```
index.html
  └── js/i18n.js              (1) Ngôn ngữ — không phụ thuộc module khác
  └── js/supabase-client.js   (2) Supabase SDK — không phụ thuộc module khác
  └── js/crypto.js            (3) Encryption — không phụ thuộc module khác
  └── js/storage.js           (4) Storage — phụ thuộc: Auth, SupabaseClient
  └── js/auth.js              (5) Auth — phụ thuộc: SupabaseClient, Storage, I18n
  └── js/business-plan.js     (6) BP — phụ thuộc: Storage, I18n
  └── js/contracts.js         (7) Contracts — phụ thuộc: Storage, I18n, BusinessPlan
  └── js/planning.js          (8) Planning — phụ thuộc: Storage, I18n, BusinessPlan, Contracts
  └── js/export.js            (9) Export — phụ thuộc: BusinessPlan, Contracts, Planning, I18n
  └── js/admin.js            (10) Admin — phụ thuộc: Auth, SupabaseClient, Storage, I18n
  └── js/app.js              (11) App — phụ thuộc: tất cả modules
```

> **Quan trọng**: Thứ tự load trong `index.html` phải đúng theo dependency order trên.

## Data Flow — Hybrid Storage

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

### Quy tắc storage

| Loại user | Read | Write |
|-----------|------|-------|
| **Demo** | localStorage only | localStorage only |
| **Cloud** (Supabase) | localStorage (cache) | localStorage (instant) + Supabase (async) |

### Luồng chi tiết

1. **Đăng nhập** → `Storage.pullFromCloud()` tải 3 bảng (business_plans, contracts, tasks) từ Supabase → ghi vào localStorage
2. **Tạo/Sửa/Xóa** → Ghi localStorage trước (UI phản hồi tức thì) → Push lên Supabase (non-blocking, fire-and-forget)
3. **Đăng xuất** → Xóa localStorage cache (bảo mật)
4. **Đăng nhập lại** → Pull lại từ Supabase (source of truth)

## Routing — SPA Navigation

```
App.navigate(page) → switch(page):
  'dashboard'     → renderDashboard()
  'business-plan' → BusinessPlan.renderList()
  'contracts'     → Contracts.renderList()
  'planning'      → Planning.renderList()
  'admin'         → Admin.renderPanel()      // async, admin only
```

- Tất cả render vào `#pageContent`
- Navigation qua sidebar click → `App.navigate()`
- Không dùng URL routing (SPA single-page)
