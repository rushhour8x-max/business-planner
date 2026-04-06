# 03 — Xác thực & Phân quyền

## Xác thực (Authentication)

### Mô hình: Admin-Managed (Closed Invitation)

> **Dự án nội bộ** — Không cho phép tự đăng ký tài khoản. Admin tạo tài khoản cho nhân viên.

| Phương thức | Chi tiết |
|-------------|---------|
| **Đăng nhập** | Email/Password qua Supabase Auth |
| **Tạo tài khoản** | Chỉ Admin — modal "Tạo tài khoản" trong Admin Panel |
| **Quên mật khẩu** | `resetPasswordForEmail()` → gửi email reset |
| **Demo Mode** | Vào app với dữ liệu mẫu, không cần tài khoản |

### Luồng xác thực

```
1. Mở app → Auth.init() → Kiểm tra Supabase session
2. Có session  → setUser() → pullFromCloud() → showApp()
3. Không session → showLogin() (chỉ login, KHÔNG có signup)
4. Đăng nhập   → signInWithPassword() → onAuthStateChange → showApp()
5. Quên MK     → resetPasswordForEmail() → gửi email reset
6. Demo Mode   → loginDemo() → sessionStorage → showApp()
```

### Luồng Admin tạo tài khoản

```
1. Admin vào Admin Panel → Click "+ Tạo tài khoản"
2. Điền form: Email, Mật khẩu (≥6 ký tự), Họ tên, Vai trò
3. Lưu admin session → sb.auth.signUp() → Supabase tạo auth user
4. Khôi phục admin session (tránh bị logout)
5. Kiểm tra profile: trigger tạo?
   - Có → update role nếu khác staff
   - Không → manual INSERT vào profiles
6. Toast thành công → reload danh sách
```

### Trang đăng nhập

- Chỉ hiển thị: Email, Mật khẩu, Nút "Đăng nhập"
- Thông báo: "Tài khoản được tạo bởi Admin. Liên hệ quản trị viên để được cấp."
- "Quên mật khẩu?"
- Nút "Chế độ Demo"

### Bảo mật

| Tính năng | Chi tiết |
|-----------|---------|
| **Admin-only signup** | UI ẩn signup form, API vẫn bật cho admin code |
| **Auto-lock** | Tự động logout sau **30 phút** không hoạt động |
| **Session preservation** | Admin session được lưu/khôi phục khi tạo user |
| **CSP Headers** | Content-Security-Policy cho phép `*.supabase.co` |
| **RLS** | Row Level Security — mỗi user chỉ thấy data của mình |
| **Logout cleanup** | Xóa localStorage cache khi cloud user logout |

### API — `Auth` module

```javascript
Auth.init()                          // Kiểm tra session, setup listeners
Auth.loginWithEmail(email, password) // Đăng nhập
Auth.logout()                        // Đăng xuất
Auth.loginDemo()                     // Vào Demo mode
Auth.resetPassword(email)            // Gửi email reset
Auth.isAuthenticated()               // Boolean
Auth.getUser()                       // { id, email, name, provider }
Auth.isCloudUser()                   // true nếu provider === 'supabase'
```

---

## Phân quyền (RBAC)

### Vai trò

| Vai trò | Icon | Quyền hạn |
|---------|------|-----------|
| **Admin** | 👑 | Xem tất cả user, đổi vai trò, giao task, tạo TK, full CRUD |
| **Manager** | 📋 | Giống Staff (mở rộng sau: quản lý team) |
| **Staff** | 👤 | CRUD dữ liệu của mình, nhận task từ admin |

### Database — Bảng `profiles`

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

### Auto-profile Trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin'
      ELSE 'staff'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> User đầu tiên đăng ký → tự động thành **Admin**. Các user sau → **Staff**.
> ⚠️ Trigger có thể fail nếu thiếu INSERT RLS policy → Admin code có fallback manual INSERT.

### RLS Policies — Profiles

```sql
-- Tất cả user đã login có thể xem danh sách profiles
CREATE POLICY "everyone_select" ON profiles
  FOR SELECT USING (true);

-- Admin có quyền quản lý tất cả profiles (bao gồm WITH CHECK)
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL
  USING (auth.jwt()->>'email' = 'rushhour.8x@gmail.com')
  WITH CHECK (auth.jwt()->>'email' = 'rushhour.8x@gmail.com');

-- Cho phép INSERT cho trigger và admin tạo user
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);
```

> **Lưu ý:** Policy `WITH CHECK` bắt buộc cho UPDATE/INSERT. Thiếu → Supabase trả `error = null` nhưng 0 rows affected (silent fail).

### API — `Admin` module

```javascript
Admin.isAdmin()                      // async Boolean — check role
Admin.getRole()                      // async 'admin'|'manager'|'staff'|'demo'
Admin.getAllUsers()                   // async — fetch all profiles
Admin.updateRole(userId, newRole)    // async — change role (with verification)
Admin.renderPanel(container)         // async — render admin page
Admin.changeRole(userId, newRole)    // UI handler cho role dropdown
Admin.openCreateUser()               // Mở modal tạo tài khoản
Admin.saveNewUser()                  // Xử lý tạo user + profile
Admin.openAssignTask(userId, name)   // Mở modal giao task
Admin.viewUserTasks(userId, name)    // Mở modal xem tasks user
```

---

*Cập nhật: 06/04/2026 — Phiên 2: Admin-managed account creation, RLS WITH CHECK fix*
