/* ============================================
   Auth — Authentication Module (Adapter Pattern)
   Supports: Netlify Identity / Demo Mode
   ============================================ */
const Auth = (() => {
  let currentUser = null;
  let inactivityTimer = null;
  const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  let netlifyIdentity = null;

  function init() {
    // Try to load Netlify Identity
    if (window.netlifyIdentity) {
      netlifyIdentity = window.netlifyIdentity;
      netlifyIdentity.on('init', user => {
        if (user) {
          setUser(user);
          onLoginSuccess();
        }
      });
      netlifyIdentity.on('login', user => {
        setUser(user);
        onLoginSuccess();
        netlifyIdentity.close();
      });
      netlifyIdentity.on('logout', () => {
        clearUser();
        onLogout();
      });
      netlifyIdentity.init();
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

  function setUser(netlifyUser) {
    currentUser = {
      id: netlifyUser.id || 'demo',
      email: netlifyUser.email || 'demo@example.com',
      name: netlifyUser.user_metadata?.full_name || netlifyUser.email?.split('@')[0] || 'User',
      provider: 'netlify'
    };
  }

  function clearUser() {
    currentUser = null;
    sessionStorage.removeItem('bp_demo');
  }

  function openLogin() {
    if (netlifyIdentity) {
      netlifyIdentity.open('login');
    }
  }

  function openSignup() {
    if (netlifyIdentity) {
      netlifyIdentity.open('signup');
    }
  }

  function logout() {
    if (netlifyIdentity && currentUser?.provider === 'netlify') {
      netlifyIdentity.logout();
    } else {
      clearUser();
      onLogout();
    }
  }

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

  function isAuthenticated() {
    return currentUser !== null;
  }

  function getUser() {
    return currentUser;
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

  // Inactivity auto-lock
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
    init, openLogin, openSignup, logout, loginDemo,
    isAuthenticated, getUser
  };
})();
