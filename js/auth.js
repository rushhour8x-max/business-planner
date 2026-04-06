/* ============================================
   Auth — Supabase Authentication Module
   Supports: Supabase Auth / Demo Mode
   ============================================ */
const Auth = (() => {
  let currentUser = null;
  let inactivityTimer = null;
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  async function init() {
    const sb = SupabaseClient.getClient();
    if (sb) {
      // Check for existing session
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        onLoginSuccess();
      }

      // Listen for auth state changes (login, logout, token refresh)
      sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          onLoginSuccess();
        } else if (event === 'SIGNED_OUT') {
          clearUser();
          onLogout();
        }
      });
    }

    // Start inactivity monitor
    setupInactivityMonitor();

    // Check for demo session
    const demoSession = sessionStorage.getItem('bp_demo');
    if (demoSession) {
      currentUser = JSON.parse(demoSession);
      onLoginSuccess();
    }
  }

  function setUser(supabaseUser) {
    currentUser = {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      provider: 'supabase'
    };
  }

  function clearUser() {
    currentUser = null;
    sessionStorage.removeItem('bp_demo');
  }

  // ── Login with email/password ──
  async function loginWithEmail(email, password) {
    const sb = SupabaseClient.getClient();
    if (!sb) {
      Toast.show('Supabase not available', 'error');
      return { error: 'Supabase not available' };
    }

    // Show loading state
    const btn = document.getElementById('authSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span>';
    }

    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `🔐 ${I18n.t('auth.login')}`;
    }

    if (error) {
      Toast.show(error.message, 'error');
      return { error: error.message };
    }

    return { data };
  }

  // ── Sign up with email/password ──
  async function signupWithEmail(email, password, fullName) {
    const sb = SupabaseClient.getClient();
    if (!sb) {
      Toast.show('Supabase not available', 'error');
      return { error: 'Supabase not available' };
    }

    const btn = document.getElementById('authSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span>';
    }

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || email.split('@')[0] }
      }
    });

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `📝 ${I18n.t('auth.signup')}`;
    }

    if (error) {
      Toast.show(error.message, 'error');
      return { error: error.message };
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      Toast.show(I18n.t('auth.confirmEmail'), 'info', 6000);
      return { data, needsConfirmation: true };
    }

    return { data };
  }

  // ── Logout ──
  async function logout() {
    const sb = SupabaseClient.getClient();
    if (sb && currentUser?.provider === 'supabase') {
      await sb.auth.signOut();
    }
    // Clear local data cache for cloud users
    if (currentUser?.provider === 'supabase') {
      Storage.clear();
    }
    clearUser();
    onLogout();
  }

  // ── Demo Mode ──
  function loginDemo() {
    currentUser = {
      id: 'demo-user',
      email: 'demo@business-planner.app',
      name: 'Demo User',
      provider: 'demo'
    };
    sessionStorage.setItem('bp_demo', JSON.stringify(currentUser));
    onLoginSuccess();
  }

  // ── Forgot password ──
  async function resetPassword(email) {
    const sb = SupabaseClient.getClient();
    if (!sb) return;

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    if (error) {
      Toast.show(error.message, 'error');
    } else {
      Toast.show(I18n.t('auth.resetSent'), 'success', 5000);
    }
  }

  function isAuthenticated() {
    return currentUser !== null;
  }

  function getUser() {
    return currentUser;
  }

  function isCloudUser() {
    return currentUser?.provider === 'supabase';
  }

  function onLoginSuccess() {
    document.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { authenticated: true, user: currentUser }
    }));
    resetInactivityTimer();
  }

  function onLogout() {
    clearInactivityTimer();
    document.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { authenticated: false, user: null }
    }));
  }

  // ── Inactivity auto-lock ──
  function setupInactivityMonitor() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(e => {
      document.addEventListener(e, () => {
        if (currentUser) resetInactivityTimer();
      }, { passive: true });
    });
  }

  function resetInactivityTimer() {
    clearInactivityTimer();
    inactivityTimer = setTimeout(() => {
      if (currentUser) {
        Toast.show(I18n.t('auth.autoLock'), 'warning');
        logout();
      }
    }, TIMEOUT_MS);
  }

  function clearInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }

  return {
    init, loginWithEmail, signupWithEmail, logout, loginDemo,
    resetPassword, isAuthenticated, getUser, isCloudUser
  };
})();
