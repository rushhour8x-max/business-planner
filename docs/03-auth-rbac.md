# 03 — Xác thực & Phân quyền

## Xác thực (Authentication)

### Phương thức đăng nhập

| Phương thức | Chi tiết |
|-------------|---------|
| **Email/Password** | Supabase Auth — đăng ký, đăng nhập, quên mật khẩu |
| **Demo Mode** | Vào app với dữ liệu mẫu, không cần tài khoản |

### Luồng xác thực

```
1. Mở app → Auth.init() → Kiểm tra Supabase session
2. Có session  → setUser() → pullFromCloud() → showApp()
3. Không session → showLogin()
4. Đăng nhập   → signInWithPassword() → onAuthStateChange → showApp()
5. Đăng ký     → signUp() → auto tạo profile (role: staff) → auto-login
6. Quên MK     → resetPasswordForEmail() → gửi email reset
7. Demo Mode   → loginDemo() → sessionStorage → showApp()
```

### Bảo mật

| Tính năng | Chi tiết |
|-----------|---------|
| **Auto-lock** | Tự động logout sau **30 phút** không hoạt động |
| **Session persistence** | Token lưu trong Supabase SDK (auto-refresh) |
| **CSP Headers** | Content-Security-Policy cho phép `*.supabase.co` |
| **RLS** | Row Level Security — mỗi user chỉ thấy data của mình |
| **Logout cleanup** | Xóa localStorage cache khi cloud user logout |

### API — `Auth` module

```javascript
Auth.init()                          // Kiểm tra session, setup listeners
Auth.loginWithEmail(email, password) // Đăng nhập
Auth.signupWithEmail(email, pw, name)// Đăng ký
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
| **Admin** | 👑 | Xem tất cả user, đổi vai trò, giao task, full CRUD dữ liệu |
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

### RLS Policies — Profiles

```sql
-- Tất cả user đã login có thể xem danh sách profiles
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin có quyền quản lý tất cả profiles
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (auth.jwt()->>'email' = 'rushhour.8x@gmail.com');

-- User chỉ update profile của mình
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

### API — `Admin` module

```javascript
Admin.isAdmin()                      // async Boolean — check role
Admin.getRole()                      // async 'admin'|'manager'|'staff'|'demo'
Admin.getAllUsers()                   // async — fetch all profiles
Admin.updateRole(userId, newRole)    // async — change role
Admin.renderPanel(container)         // async — render admin page
Admin.openAssignTask(userId, name)   // Mở modal giao task
Admin.viewUserTasks(userId, name)    // Mở modal xem tasks user
```
