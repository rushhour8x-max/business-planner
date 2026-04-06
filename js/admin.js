/* ============================================
   Admin Panel — User Management & Task Assignment
   Requires: admin role in profiles table
   ============================================ */
const Admin = (() => {
  let usersCache = [];

  // ── Check if current user is admin ──
  async function isAdmin() {
    const user = Auth.getUser();
    if (!user || user.provider !== 'supabase') return false;
    const sb = SupabaseClient.getClient();
    if (!sb) return false;

    const { data } = await sb.from('profiles').select('role').eq('id', user.id).single();
    return data?.role === 'admin';
  }

  // ── Get current user's role ──
  async function getRole() {
    const user = Auth.getUser();
    if (!user || user.provider !== 'supabase') return 'demo';
    const sb = SupabaseClient.getClient();
    if (!sb) return 'staff';

    const { data } = await sb.from('profiles').select('role').eq('id', user.id).single();
    return data?.role || 'staff';
  }

  // ── Fetch all users (admin only) ──
  async function getAllUsers() {
    const sb = SupabaseClient.getClient();
    if (!sb) return [];

    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: true });
    if (error) {
      console.error('Fetch users error:', error.message);
      return [];
    }
    usersCache = data || [];
    return usersCache;
  }

  // ── Update user role (admin only) ──
  async function updateRole(userId, newRole) {
    const sb = SupabaseClient.getClient();
    if (!sb) return false;

    const { error } = await sb.from('profiles').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', userId);
    if (error) {
      Toast.show('Lỗi: ' + error.message, 'error');
      return false;
    }
    Toast.show(I18n.t('admin.roleUpdated'), 'success');
    return true;
  }

  // ── Render admin panel ──
  async function renderPanel(container) {
    const t = I18n.t.bind(I18n);

    // Check admin permission
    const admin = await isAdmin();
    if (!admin) {
      container.innerHTML = `
        <div class="empty-state" style="padding:var(--space-3xl)">
          <div class="empty-icon">🔒</div>
          <h3>${t('admin.accessDenied')}</h3>
          <p class="text-muted">${t('admin.adminOnly')}</p>
        </div>`;
      return;
    }

    // Show loading
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">👥 ${t('admin.title')}</h1>
      </div>
      <div style="text-align:center;padding:var(--space-3xl)">
        <div class="spinner" style="margin:0 auto"></div>
        <p class="text-sm text-muted" style="margin-top:var(--space-md)">${t('admin.loading')}</p>
      </div>`;

    // Fetch users
    const users = await getAllUsers();
    const currentUser = Auth.getUser();

    // Stats
    const adminCount = users.filter(u => u.role === 'admin').length;
    const managerCount = users.filter(u => u.role === 'manager').length;
    const staffCount = users.filter(u => u.role === 'staff').length;

    // Get task counts per user
    const tasks = Storage.getCollection('tasks');

    let html = `
      <div class="page-header">
        <h1 class="page-title">👥 ${t('admin.title')}</h1>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="Admin.openCreateUser()">+ ${t('admin.createUser')}</button>
          <span class="text-sm text-muted">${users.length} ${t('admin.totalUsers')}</span>
        </div>
      </div>

      <!-- Role Stats -->
      <div class="stats-grid" style="margin-bottom:var(--space-xl)">
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--gradient-danger)">👑</div>
          <div class="stat-number">${adminCount}</div>
          <div class="stat-label">Admin</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--gradient-warning)">📋</div>
          <div class="stat-number">${managerCount}</div>
          <div class="stat-label">Manager</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--gradient-primary)">👤</div>
          <div class="stat-number">${staffCount}</div>
          <div class="stat-label">Staff</div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="card" style="overflow-x:auto">
        <table class="data-table" style="width:100%">
          <thead>
            <tr>
              <th>${t('admin.user')}</th>
              <th>Email</th>
              <th>${t('admin.role')}</th>
              <th>${t('admin.tasks')}</th>
              <th>${t('admin.joined')}</th>
              <th>${t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>`;

    users.forEach(user => {
      const userTasks = tasks.filter(t => t.assignee === user.full_name || t.assignedTo === user.id);
      const isCurrentUser = user.id === currentUser?.id;
      const roleClass = user.role === 'admin' ? 'priority-tag high' : user.role === 'manager' ? 'priority-tag medium' : 'priority-tag low';
      const joined = user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '—';

      html += `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:var(--space-sm)">
                  <div class="user-avatar" style="width:32px;height:32px;font-size:0.75rem">${(user.full_name || 'U').substring(0, 2).toUpperCase()}</div>
                  <div>
                    <div style="font-weight:600">${user.full_name || 'Unknown'}</div>
                    ${isCurrentUser ? '<span class="text-xs text-muted">(you)</span>' : ''}
                  </div>
                </div>
              </td>
              <td class="text-sm">${user.email}</td>
              <td>
                <select class="form-select" style="min-width:120px;padding:4px 8px;font-size:0.8rem"
                  onchange="Admin.changeRole('${user.id}', this.value)"
                  ${isCurrentUser ? 'disabled title="' + t('admin.cantChangeSelf') + '"' : ''}>
                  <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                  <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>📋 Manager</option>
                  <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>👤 Staff</option>
                </select>
              </td>
              <td>
                <span class="text-sm">${userTasks.length} ${t('admin.taskCount')}</span>
                <button class="btn btn-ghost btn-sm" onclick="Admin.openAssignTask('${user.id}', '${user.full_name || user.email}')" title="${t('admin.assignTask')}">
                  ➕
                </button>
              </td>
              <td class="text-sm text-muted">${joined}</td>
              <td>
                <button class="btn btn-ghost btn-sm" onclick="Admin.viewUserTasks('${user.id}', '${user.full_name || user.email}')" title="${t('admin.viewTasks')}">
                  📋
                </button>
              </td>
            </tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>`;

    container.innerHTML = html;
  }

  // ── Change user role ──
  async function changeRole(userId, newRole) {
    const t = I18n.t.bind(I18n);
    if (!confirm(t('admin.confirmRoleChange'))) {
      App.navigate('admin');
      return;
    }
    const success = await updateRole(userId, newRole);
    if (success) {
      App.navigate('admin');
    }
  }

  // ── Assign task to user ──
  function openAssignTask(userId, userName) {
    const t = I18n.t.bind(I18n);

    const html = `<div class="modal-overlay" onclick="if(event.target===this) Admin.closeModal()">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">➕ ${t('admin.assignTaskTo')} ${userName}</h2>
          <button class="modal-close" onclick="Admin.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">${t('planning.taskTitle')} *</label>
            <input type="text" class="form-input" id="assign_title">
          </div>
          <div class="form-group">
            <label class="form-label">${t('planning.taskDesc')}</label>
            <textarea class="form-textarea" id="assign_desc" rows="2"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('planning.category')}</label>
              <select class="form-select" id="assign_category">
                <option value="business">${t('planning.categories.business')}</option>
                <option value="technical">${t('planning.categories.technical')}</option>
                <option value="admin">${t('planning.categories.admin')}</option>
                <option value="other">${t('planning.categories.other')}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('planning.priority')}</label>
              <select class="form-select" id="assign_priority">
                <option value="high">${t('planning.priorities.high')}</option>
                <option value="medium" selected>${t('planning.priorities.medium')}</option>
                <option value="low">${t('planning.priorities.low')}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('planning.deadline')}</label>
            <input type="date" class="form-input" id="assign_deadline">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="Admin.closeModal()">${t('common.cancel')}</button>
          <button class="btn btn-primary" onclick="Admin.saveAssignedTask('${userId}', '${userName}')">📌 ${t('admin.assign')}</button>
        </div>
      </div>
    </div>`;

    document.getElementById('modalContainer').innerHTML = html;
  }

  function saveAssignedTask(userId, userName) {
    const title = document.getElementById('assign_title')?.value?.trim();
    if (!title) {
      Toast.show(I18n.t('common.error'), 'error');
      return;
    }

    const task = {
      title,
      description: document.getElementById('assign_desc')?.value || '',
      category: document.getElementById('assign_category')?.value || 'other',
      priority: document.getElementById('assign_priority')?.value || 'medium',
      deadline: document.getElementById('assign_deadline')?.value || '',
      assignee: userName,
      assignedTo: userId,
      status: 'todo'
    };

    Storage.addItem('tasks', task);
    closeModal();
    Toast.show(I18n.t('admin.taskAssigned'), 'success');
    App.navigate('admin');
  }

  // ── View user's tasks ──
  function viewUserTasks(userId, userName) {
    const t = I18n.t.bind(I18n);
    const allTasks = Storage.getCollection('tasks');
    const userTasks = allTasks.filter(t => t.assignee === userName || t.assignedTo === userId);

    const statusIcon = { todo: '⬜', inProgress: '🔄', done: '✅' };

    let taskRows = '';
    if (userTasks.length === 0) {
      taskRows = `<tr><td colspan="4" class="text-center text-muted" style="padding:var(--space-xl)">${t('common.noData')}</td></tr>`;
    } else {
      userTasks.forEach(task => {
        taskRows += `
          <tr>
            <td style="font-weight:500">${statusIcon[task.status] || '⬜'} ${task.title}</td>
            <td><span class="priority-tag ${task.priority || 'medium'}">${t('planning.priorities.' + (task.priority || 'medium'))}</span></td>
            <td class="text-sm">${task.deadline || '—'}</td>
            <td class="text-sm">${t('planning.columns.' + (task.status || 'todo'))}</td>
          </tr>`;
      });
    }

    const html = `<div class="modal-overlay" onclick="if(event.target===this) Admin.closeModal()">
      <div class="modal" style="max-width:700px">
        <div class="modal-header">
          <h2 class="modal-title">📋 ${t('admin.tasksOf')} ${userName}</h2>
          <button class="modal-close" onclick="Admin.closeModal()">✕</button>
        </div>
        <div class="modal-body" style="max-height:60vh;overflow-y:auto">
          <table class="data-table" style="width:100%">
            <thead>
              <tr>
                <th>${t('planning.taskTitle')}</th>
                <th>${t('planning.priority')}</th>
                <th>${t('planning.deadline')}</th>
                <th>${t('planning.columns.todo')}</th>
              </tr>
            </thead>
            <tbody>${taskRows}</tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="Admin.openAssignTask('${userId}', '${userName}')">➕ ${t('admin.assignTask')}</button>
          <button class="btn btn-secondary" onclick="Admin.closeModal()">${t('common.cancel')}</button>
        </div>
      </div>
    </div>`;

    document.getElementById('modalContainer').innerHTML = html;
  }

  function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
  }

  // ── Get cached users for task assignment dropdown ──
  function getCachedUsers() {
    return usersCache;
  }

  // ── Create new user (admin only) ──
  function openCreateUser() {
    const t = I18n.t.bind(I18n);

    const html = `<div class="modal-overlay" onclick="if(event.target===this) Admin.closeModal()">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">👤 ${t('admin.createUser')}</h2>
          <button class="modal-close" onclick="Admin.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Email *</label>
            <input type="email" class="form-input" id="newUserEmail" placeholder="user@company.com">
          </div>
          <div class="form-group">
            <label class="form-label">${t('admin.password')} *</label>
            <input type="text" class="form-input" id="newUserPassword" placeholder="${t('admin.minPassword')}" minlength="6">
          </div>
          <div class="form-group">
            <label class="form-label">${t('admin.fullName')}</label>
            <input type="text" class="form-input" id="newUserName" placeholder="${t('admin.fullNamePlaceholder')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('admin.role')}</label>
            <select class="form-select" id="newUserRole">
              <option value="staff">👤 Staff</option>
              <option value="manager">📋 Manager</option>
              <option value="admin">👑 Admin</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="Admin.closeModal()">${t('common.cancel')}</button>
          <button class="btn btn-primary" id="createUserBtn" onclick="Admin.saveNewUser()">👤 ${t('admin.createUser')}</button>
        </div>
      </div>
    </div>`;

    document.getElementById('modalContainer').innerHTML = html;
  }

  async function saveNewUser() {
    const t = I18n.t.bind(I18n);
    const email = document.getElementById('newUserEmail')?.value?.trim();
    const password = document.getElementById('newUserPassword')?.value;
    const fullName = document.getElementById('newUserName')?.value?.trim();
    const role = document.getElementById('newUserRole')?.value || 'staff';

    if (!email || !password) {
      Toast.show(t('admin.fillRequired'), 'error');
      return;
    }
    if (password.length < 6) {
      Toast.show(t('admin.minPassword'), 'error');
      return;
    }

    const btn = document.getElementById('createUserBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span>';
    }

    const sb = SupabaseClient.getClient();
    if (!sb) {
      Toast.show('Supabase not available', 'error');
      return;
    }

    // Save admin session before signUp (signUp auto-logs in as the new user)
    const { data: { session: adminSession } } = await sb.auth.getSession();

    // Step 1: Create auth user via signUp
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || email.split('@')[0] }
      }
    });

    if (error) {
      Toast.show(t('admin.createError') + ': ' + error.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = `👤 ${t('admin.createUser')}`; }
      // Restore admin session
      if (adminSession) await sb.auth.setSession(adminSession);
      return;
    }

    const newUserId = data.user?.id;
    if (!newUserId) {
      Toast.show(t('admin.createError'), 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = `👤 ${t('admin.createUser')}`; }
      if (adminSession) await sb.auth.setSession(adminSession);
      return;
    }

    // Step 2: Restore admin session FIRST so we have admin privileges
    if (adminSession) {
      await sb.auth.setSession(adminSession);
    }

    // Step 3: Ensure profile exists with correct role
    await new Promise(r => setTimeout(r, 500));

    // Check if profile was auto-created by trigger
    const { data: existingProfile } = await sb.from('profiles').select('id').eq('id', newUserId).single();

    if (existingProfile) {
      // Profile exists from trigger — update role if needed
      if (role !== 'staff') {
        await sb.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', newUserId);
      }
    } else {
      // Trigger failed — manually insert profile
      const { error: insertErr } = await sb.from('profiles').insert({
        id: newUserId,
        email,
        full_name: fullName || email.split('@')[0],
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (insertErr) {
        console.error('Profile insert error:', insertErr.message);
        Toast.show(t('admin.profileWarning'), 'warning', 5000);
      }
    }

    closeModal();
    Toast.show(t('admin.userCreated') + ': ' + email, 'success', 5000);
    App.navigate('admin');
  }

  return {
    isAdmin, getRole, getAllUsers, renderPanel, changeRole,
    openAssignTask, saveAssignedTask, viewUserTasks, closeModal, getCachedUsers,
    openCreateUser, saveNewUser
  };
})();
