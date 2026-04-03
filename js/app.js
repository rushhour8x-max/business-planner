/* ============================================
   App — Main Router, Dashboard, Toast, Demo Data
   ============================================ */

// ── Toast System ──
const Toast = (() => {
  function show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  return { show };
})();

// ── Main App ──
const App = (() => {
  let currentPage = 'dashboard';
  let sidebarCollapsed = false;

  async function init() {
    // Init i18n
    await I18n.init();

    // Init auth
    Auth.init();

    // Listen for auth changes
    document.addEventListener('authStateChanged', (e) => {
      if (e.detail.authenticated) {
        showApp();
      } else {
        showLogin();
      }
    });

    // Listen for language changes
    document.addEventListener('langChanged', () => {
      if (Auth.isAuthenticated()) {
        renderSidebar();
        navigate(currentPage);
      }
    });

    // Check initial auth state
    if (Auth.isAuthenticated()) {
      showApp();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    const t = I18n.t.bind(I18n);
    document.getElementById('appContainer').innerHTML = `
      <div class="login-screen">
        <div class="login-container">
          <div class="login-card">
            <div class="login-logo">📊</div>
            <h1 class="login-title">${t('app.title')}</h1>
            <p class="login-subtitle">${t('app.subtitle')}</p>
            <div class="login-actions">
              <button class="btn btn-primary btn-lg btn-block" onclick="Auth.openLogin()" id="netlifyLoginBtn">
                🔐 ${t('auth.login')}
              </button>
              <div class="login-divider">hoặc / or</div>
              <button class="btn btn-secondary btn-lg btn-block" onclick="Auth.loginDemo()">
                🎮 ${t('auth.demoMode')}
              </button>
              <p class="text-xs text-muted" style="margin-top:var(--space-sm)">${t('auth.demoDesc')}</p>
            </div>
            <div style="margin-top:var(--space-xl)">
              <button class="btn btn-ghost btn-sm" onclick="I18n.toggle()" id="loginLangToggle">
                ${I18n.getLang() === 'vi' ? '🇬🇧 English' : '🇻🇳 Tiếng Việt'}
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function showApp() {
    const user = Auth.getUser();
    document.getElementById('appContainer').innerHTML = `
      <div class="app-shell">
        <nav class="sidebar ${sidebarCollapsed ? 'collapsed' : ''}" id="sidebar"></nav>
        <div class="mobile-menu-overlay" id="mobileOverlay" onclick="App.closeMobileMenu()"></div>
        <main class="main-content">
          <header class="app-header" id="appHeader"></header>
          <div class="page-content" id="pageContent"></div>
        </main>
      </div>`;

    renderSidebar();
    renderHeader();
    loadDemoDataIfNeeded();
    navigate('dashboard');
  }

  function renderSidebar() {
    const t = I18n.t.bind(I18n);
    const taskStats = Planning.getStats();
    const contractStats = Contracts.getStats();

    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo">📊</div>
        <div class="sidebar-brand">
          <h2>${t('app.title')}</h2>
          <p>${t('app.subtitle')}</p>
        </div>
      </div>
      <div class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-title">MENU</div>
          <div class="nav-item ${currentPage === 'dashboard' ? 'active' : ''}" onclick="App.navigate('dashboard')">
            <span class="nav-icon">📈</span>
            <span class="nav-label">${t('nav.dashboard')}</span>
          </div>
          <div class="nav-item ${currentPage === 'business-plan' ? 'active' : ''}" onclick="App.navigate('business-plan')">
            <span class="nav-icon">📋</span>
            <span class="nav-label">${t('nav.businessPlan')}</span>
          </div>
          <div class="nav-item ${currentPage === 'contracts' ? 'active' : ''}" onclick="App.navigate('contracts')">
            <span class="nav-icon">📄</span>
            <span class="nav-label">${t('nav.contracts')}</span>
            ${contractStats.expiring > 0 ? `<span class="nav-badge">${contractStats.expiring}</span>` : ''}
          </div>
          <div class="nav-item ${currentPage === 'planning' ? 'active' : ''}" onclick="App.navigate('planning')">
            <span class="nav-icon">📌</span>
            <span class="nav-label">${t('nav.planning')}</span>
            ${taskStats.overdue > 0 ? `<span class="nav-badge">${taskStats.overdue}</span>` : ''}
          </div>
        </div>
        <div class="nav-section">
          <div class="nav-section-title">SYSTEM</div>
          <div class="nav-item" onclick="App.toggleTheme()">
            <span class="nav-icon">🌙</span>
            <span class="nav-label" id="themeLabel">${document.documentElement.getAttribute('data-theme') === 'light' ? t('common.darkMode') : t('common.lightMode')}</span>
          </div>
          <div class="nav-item" onclick="Storage.downloadBackup()">
            <span class="nav-icon">💾</span>
            <span class="nav-label">${t('nav.backup')}</span>
          </div>
          <div class="nav-item" onclick="App.restoreBackup()">
            <span class="nav-icon">📥</span>
            <span class="nav-label">${t('common.restore')}</span>
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        <button class="sidebar-toggle" onclick="App.toggleSidebar()">
          ${sidebarCollapsed ? '▶' : '◀'}
        </button>
      </div>`;
  }

  function renderHeader() {
    const t = I18n.t.bind(I18n);
    const user = Auth.getUser();
    const initials = (user?.name || 'U').substring(0, 2).toUpperCase();

    document.getElementById('appHeader').innerHTML = `
      <div class="header-left">
        <button class="header-btn" onclick="App.toggleMobileMenu()" style="display:none" id="mobileMenuBtn">☰</button>
        <h2 class="header-title" id="headerTitle">${t('nav.' + (currentPage === 'business-plan' ? 'businessPlan' : currentPage))}</h2>
      </div>
      <div class="header-right">
        <button class="header-btn lang-toggle" onclick="I18n.toggle()" id="langToggle">
          ${I18n.getLang() === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
        </button>
        <div class="user-info">
          <div class="user-avatar">${initials}</div>
          <div>
            <div class="user-name">${user?.name || 'User'}</div>
            <div class="user-role">${user?.email || ''}</div>
          </div>
        </div>
        <button class="header-btn" onclick="Auth.logout()" title="${t('auth.logout')}">🚪</button>
      </div>`;

    // Show mobile menu btn on small screens
    if (window.innerWidth <= 1024) {
      document.getElementById('mobileMenuBtn').style.display = 'flex';
    }
    window.addEventListener('resize', () => {
      const btn = document.getElementById('mobileMenuBtn');
      if (btn) btn.style.display = window.innerWidth <= 1024 ? 'flex' : 'none';
    });
  }

  function navigate(page) {
    currentPage = page;
    const content = document.getElementById('pageContent');
    if (!content) return;

    // Update sidebar active
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    // Update header
    const t = I18n.t.bind(I18n);
    const headerTitle = document.getElementById('headerTitle');
    const pageKeyMap = {
      'dashboard': 'nav.dashboard',
      'business-plan': 'nav.businessPlan',
      'contracts': 'nav.contracts',
      'planning': 'nav.planning'
    };
    if (headerTitle) headerTitle.textContent = t(pageKeyMap[page] || page);

    // Close mobile menu
    closeMobileMenu();

    // Render page
    content.className = 'page-content animate-in';
    switch (page) {
      case 'dashboard':
        renderDashboard(content);
        break;
      case 'business-plan':
        BusinessPlan.renderList(content);
        break;
      case 'contracts':
        Contracts.renderList(content);
        break;
      case 'planning':
        Planning.renderList(content);
        break;
      default:
        renderDashboard(content);
    }

    // Re-render sidebar to update active state and badges
    renderSidebar();
  }

  function renderDashboard(container) {
    const t = I18n.t.bind(I18n);
    const bpStats = BusinessPlan.getStats();
    const ctStats = Contracts.getStats();
    const planStats = Planning.getStats();
    const formatVND = BusinessPlan.formatVND;

    let html = `
      <div class="page-header">
        <h1 class="page-title">${t('dashboard.title')}</h1>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card" onclick="App.navigate('business-plan')">
          <div class="stat-icon purple">📋</div>
          <div>
            <div class="stat-value">${bpStats.total}</div>
            <div class="stat-label">${t('dashboard.totalPlans')}</div>
          </div>
        </div>
        <div class="stat-card" onclick="App.navigate('contracts')">
          <div class="stat-icon green">📄</div>
          <div>
            <div class="stat-value">${ctStats.active}</div>
            <div class="stat-label">${t('dashboard.activeContracts')}</div>
            ${ctStats.expiring > 0 ? `<div class="stat-change down">⚠️ ${ctStats.expiring} sắp hết hạn</div>` : ''}
          </div>
        </div>
        <div class="stat-card" onclick="App.navigate('planning')">
          <div class="stat-icon amber">📌</div>
          <div>
            <div class="stat-value">${planStats.todo + planStats.inProgress}</div>
            <div class="stat-label">${t('dashboard.pendingTasks')}</div>
            ${planStats.overdue > 0 ? `<div class="stat-change down">⚠️ ${planStats.overdue} quá hạn</div>` : ''}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">💰</div>
          <div>
            <div class="stat-value">${bpStats.totalRevenue > 0 ? formatVND(bpStats.totalRevenue) : '0'}</div>
            <div class="stat-label">${t('dashboard.totalRevenue')}</div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-grid">
        <div class="chart-card">
          <div class="card-header"><h3 class="card-title">${t('dashboard.tasksByStatus')}</h3></div>
          <canvas id="taskChart"></canvas>
        </div>
        <div class="chart-card">
          <div class="card-header"><h3 class="card-title">${t('dashboard.revenueByType')}</h3></div>
          <canvas id="revenueChart"></canvas>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header"><h3 class="card-title">${t('dashboard.recentActivity')}</h3></div>
        ${renderRecentActivity()}
      </div>
    `;

    container.innerHTML = html;

    // Render charts (after DOM)
    setTimeout(() => renderCharts(planStats, bpStats), 100);
  }

  function renderRecentActivity() {
    const t = I18n.t.bind(I18n);
    const allItems = [
      ...BusinessPlan.getAll().map(p => ({ ...p, _type: 'plan', _icon: '📋' })),
      ...Contracts.getAll().map(c => ({ ...c, _type: 'contract', _icon: '📄' })),
      ...Planning.getAll().map(t => ({ ...t, _type: 'task', _icon: '📌' })),
    ];

    allItems.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    const recent = allItems.slice(0, 8);

    if (recent.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">📭</div><div class="text-sm text-muted">${t('common.noData')}</div></div>`;
    }

    let html = '<div style="padding:0">';
    recent.forEach(item => {
      const name = item.name || item.title || item.number || '';
      const date = item.updatedAt || item.createdAt || '';
      const dateStr = date ? new Date(date).toLocaleDateString(I18n.getLang() === 'vi' ? 'vi-VN' : 'en-US') : '';

      html += `<div class="flex items-center justify-between" style="padding:var(--space-md) var(--space-lg);border-bottom:1px solid var(--border-color)">
        <div class="flex items-center gap-md">
          <span>${item._icon}</span>
          <span class="text-sm">${name}</span>
        </div>
        <span class="text-xs text-muted">${dateStr}</span>
      </div>`;
    });
    html += '</div>';
    return html;
  }

  function renderCharts(planStats, bpStats) {
    // Task status chart
    const taskCtx = document.getElementById('taskChart');
    if (taskCtx && window.Chart) {
      new Chart(taskCtx, {
        type: 'doughnut',
        data: {
          labels: [I18n.t('planning.columns.todo'), I18n.t('planning.columns.inProgress'), I18n.t('planning.columns.done')],
          datasets: [{
            data: [planStats.todo, planStats.inProgress, planStats.done],
            backgroundColor: ['#6366f1', '#f59e0b', '#10b981'],
            borderWidth: 0,
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(), padding: 16, font: { family: 'Inter' } }
            }
          },
          cutout: '65%'
        }
      });
    }

    // Revenue chart
    const revCtx = document.getElementById('revenueChart');
    if (revCtx && window.Chart) {
      const plans = BusinessPlan.getAll();
      const type1Plans = plans.filter(p => p.planType === 'type1');
      const type2Plans = plans.filter(p => p.planType === 'type2');
      const type1Revenue = type1Plans.reduce((sum, p) => sum + BusinessPlan.calcRevenue(p), 0);
      const type2Revenue = type2Plans.reduce((sum, p) => sum + BusinessPlan.calcRevenue(p), 0);

      new Chart(revCtx, {
        type: 'bar',
        data: {
          labels: [I18n.t('businessPlan.type1'), I18n.t('businessPlan.type2')],
          datasets: [{
            label: I18n.t('dashboard.totalRevenue'),
            data: [type1Revenue / 1000000, type2Revenue / 1000000],
            backgroundColor: ['rgba(99, 102, 241, 0.6)', 'rgba(139, 92, 246, 0.6)'],
            borderColor: ['#6366f1', '#8b5cf6'],
            borderWidth: 1,
            borderRadius: 8,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
                callback: v => v + 'M'
              },
              grid: { color: 'rgba(255,255,255,0.05)' }
            },
            x: {
              ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() },
              grid: { display: false }
            }
          }
        }
      });
    }
  }

  // ── Theme ──
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('bp_theme', next);
    renderSidebar();
  }

  // ── Sidebar ──
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed', sidebarCollapsed);
    renderSidebar();
  }

  function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    sidebar?.classList.toggle('mobile-open');
    overlay?.classList.toggle('active');
  }

  function closeMobileMenu() {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('mobileOverlay')?.classList.remove('active');
  }

  // ── Backup Restore ──
  function restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          await Storage.restoreBackup(file);
          Toast.show(I18n.t('common.success'), 'success');
          navigate('dashboard');
        } catch {
          Toast.show(I18n.t('common.error'), 'error');
        }
      }
    };
    input.click();
  }

  // ── Demo Data ──
  function loadDemoDataIfNeeded() {
    if (Storage.load('demo_loaded')) return;

    // Demo business plans
    const demoPlans = [
      {
        name: 'Trạm quan trắc nước thải KCN Bắc Ninh',
        planType: 'type1',
        subtype: 'tech',
        status: 'active',
        description: 'Cung cấp và lắp đặt trạm quan trắc nước thải tự động liên tục cho KCN Yên Phong, Bắc Ninh',
        importEquipment: [
          { name: 'Cảm biến COD - Aqualabo', supplier: 'Aqualabo (Pháp)', currency: 'EUR', exchangeRate: 27500, exchangeDate: '2026-04-01', fob: 12000, accessories: 1500, shipping: 800, importTax: 5, vat: 10, totalLdp: 470437500 },
          { name: 'Cảm biến Ammonia - In-Situ', supplier: 'In-Situ (Mỹ)', currency: 'USD', exchangeRate: 25300, exchangeDate: '2026-04-01', fob: 8500, accessories: 950, shipping: 600, importTax: 5, vat: 10, totalLdp: 292050375 },
        ],
        domesticEquipment: [
          { name: 'Tủ điện điều khiển PLC', supplier: 'Schneider VN', quantity: 1, unitPrice: 45000000 },
          { name: 'Bơm lấy mẫu tự động', supplier: 'Hach VN', quantity: 2, unitPrice: 15000000 },
          { name: 'Nhà trạm container 10ft', supplier: 'Container VN', quantity: 1, unitPrice: 85000000 },
        ],
        services: { transportation: 15000000, insurance: 8000000, inspection: 5000000, installation: 80000000, translation: 12000000, bankFees: 10000000, warranty: 25000000, consumables: 18000000, management: 35000000, contingency: 20000000 },
        sellingPrice: 1800000000,
        quantity: 1,
        tax: 50000000,
        startDate: '2026-03-01',
        endDate: '2026-09-30',
        notes: 'Dự án trọng điểm Q2/2026. Đã ký MOU với chủ đầu tư.',
      },
      {
        name: 'Tư vấn lập ĐTM Nhà máy giấy Phương Nam',
        planType: 'type2',
        subtype: 'consulting',
        status: 'active',
        description: 'Tư vấn lập báo cáo đánh giá tác động môi trường cho nhà máy giấy công suất 50.000 tấn/năm',
        client: 'Công ty CP Giấy Phương Nam',
        workDesc: 'Khảo sát hiện trạng, thu thập số liệu, mô hình hóa phát tán, viết báo cáo ĐTM, trình thẩm định',
        workers: 4,
        workDays: 45,
        dailyRate: 1500000,
        extras: 25000000,
        contractValue: 450000000,
        startDate: '2026-02-15',
        endDate: '2026-05-15',
        notes: 'Giai đoạn 1 đã hoàn thành. Đang chờ phê duyệt.',
      },
      {
        name: 'Hệ thống xử lý khí thải lò hơi',
        planType: 'type1',
        subtype: 'trading',
        status: 'draft',
        description: 'Thiết kế, cung cấp và lắp đặt hệ thống xử lý khí thải cho 2 lò hơi 10 tấn/h',
        importEquipment: [
          { name: 'Hệ thống lọc bụi tĩnh điện ESP', supplier: 'FLSmidth (Đan Mạch)', currency: 'EUR', exchangeRate: 27500, fob: 45000, accessories: 5000, shipping: 3000, importTax: 3, vat: 10, totalLdp: 1648925000 },
        ],
        domesticEquipment: [
          { name: 'Quạt hút công nghiệp', supplier: 'Việt Á', quantity: 2, unitPrice: 35000000 },
          { name: 'Ống khói inox', supplier: 'Inox Đại Phát', quantity: 2, unitPrice: 28000000 },
        ],
        services: { transportation: 20000000, insurance: 10000000, installation: 120000000, management: 40000000, contingency: 30000000 },
        sellingPrice: 2500000000,
        quantity: 1,
        tax: 75000000,
        startDate: '2026-06-01',
        endDate: '2026-12-31',
      }
    ];

    demoPlans.forEach(p => Storage.addItem('business_plans', p));

    // Demo contracts
    const demoContracts = [
      { number: 'HĐ-2026/001', partner: 'KCN Yên Phong - Bắc Ninh', type: 'service', value: 1800000000, signDate: '2026-02-20', effectiveDate: '2026-03-01', expiryDate: '2026-09-30', status: 'active', terms: 'Thanh toán 3 đợt: 30-40-30. Bảo hành 24 tháng.' },
      { number: 'HĐ-2026/002', partner: 'Công ty CP Giấy Phương Nam', type: 'service', value: 450000000, signDate: '2026-02-10', effectiveDate: '2026-02-15', expiryDate: '2026-05-15', status: 'active', terms: 'Thanh toán 2 đợt: 50-50. Hồ sơ giao bản cứng + mềm.' },
      { number: 'HĐ-2025/018', partner: 'Nhà máy Dệt Thành Công', type: 'trading', value: 320000000, signDate: '2025-11-15', effectiveDate: '2025-12-01', expiryDate: '2026-04-30', status: 'active', terms: 'Bảo hành 12 tháng. Cung cấp vật tư thay thế trọn gói.' },
      { number: 'HĐ-2025/015', partner: 'Công ty TNHH Hóa chất Minh Đức', type: 'service', value: 180000000, signDate: '2025-09-01', effectiveDate: '2025-09-10', expiryDate: '2026-03-10', status: 'completed', terms: 'Đã nghiệm thu. Thanh lý HĐ.' },
    ];

    demoContracts.forEach(c => Storage.addItem('contracts', c));

    // Demo tasks
    const demoTasks = [
      { title: 'Hoàn thiện bản vẽ thiết kế trạm QT', description: 'Cập nhật bản vẽ As-built cho trạm quan trắc nước thải KCN Bắc Ninh', category: 'technical', priority: 'high', status: 'inProgress', deadline: '2026-04-10', assignee: 'Minh', linkedTo: '' },
      { title: 'Đặt hàng cảm biến COD Aqualabo', description: 'Liên hệ đại lý Aqualabo, xác nhận giá và thời gian giao', category: 'business', priority: 'high', status: 'todo', deadline: '2026-04-08', assignee: 'Hùng' },
      { title: 'Nộp hồ sơ ĐTM cho Sở TNMT', description: 'Chuẩn bị 10 bộ hồ sơ, nộp Sở TNMT Bình Dương', category: 'admin', priority: 'medium', status: 'todo', deadline: '2026-04-15', assignee: 'Linh' },
      { title: 'Khảo sát hiện trạng nhà máy dệt', description: 'Đo đạc, lấy mẫu khí thải tại nhà máy Dệt Thành Công', category: 'technical', priority: 'medium', status: 'todo', deadline: '2026-04-20', assignee: 'Minh' },
      { title: 'Báo cáo tài chính Q1/2026', description: 'Tổng hợp doanh thu, chi phí Q1/2026', category: 'admin', priority: 'low', status: 'inProgress', deadline: '2026-04-30', assignee: 'Mai' },
      { title: 'Gia hạn bảo hiểm xe', description: 'Gia hạn bảo hiểm cho 2 xe ô tô công ty', category: 'admin', priority: 'low', status: 'done', deadline: '2026-03-28', assignee: 'Mai' },
      { title: 'Nghiệm thu HĐ Hóa chất Minh Đức', description: 'Lên lịch nghiệm thu và thanh lý hợp đồng', category: 'business', priority: 'medium', status: 'done', deadline: '2026-03-15', assignee: 'Hùng' },
    ];

    demoTasks.forEach(t => Storage.addItem('tasks', t));
    Storage.save('demo_loaded', true);
  }

  return {
    init, navigate, toggleTheme, toggleSidebar, toggleMobileMenu, closeMobileMenu, restoreBackup
  };
})();

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('bp_theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

  App.init();
});
