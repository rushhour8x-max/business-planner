/* ============================================
   i18n — Internationalization Module
   ============================================ */
const I18n = (() => {
  let currentLang = 'vi';
  let translations = {};
  let loaded = false;

  async function loadTranslations(lang) {
    try {
      const res = await fetch(`locales/${lang}.json`);
      if (!res.ok) throw new Error(`Failed to load ${lang}.json`);
      translations[lang] = await res.json();
      return true;
    } catch (e) {
      console.error('i18n load error:', e);
      return false;
    }
  }

  async function init() {
    const saved = localStorage.getItem('bp_lang');
    if (saved && ['vi', 'en'].includes(saved)) {
      currentLang = saved;
    } else {
      const browserLang = navigator.language?.substring(0, 2);
      currentLang = browserLang === 'en' ? 'en' : 'vi';
    }
    await Promise.all([loadTranslations('vi'), loadTranslations('en')]);
    loaded = true;
    updateDOM();
  }

  function t(key, params = {}) {
    if (!loaded) return key;
    const keys = key.split('.');
    let value = translations[currentLang];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // fallback to key
      }
    }
    if (typeof value === 'string' && params) {
      Object.keys(params).forEach(p => {
        value = value.replace(`{${p}}`, params[p]);
      });
    }
    return value || key;
  }

  function setLang(lang) {
    if (!['vi', 'en'].includes(lang)) return;
    currentLang = lang;
    localStorage.setItem('bp_lang', lang);
    updateDOM();
    document.dispatchEvent(new CustomEvent('langChanged', { detail: { lang } }));
  }

  function getLang() {
    return currentLang;
  }

  function toggle() {
    setLang(currentLang === 'vi' ? 'en' : 'vi');
  }

  function updateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      if (text !== key) {
        el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = t(key);
      if (text !== key) {
        el.placeholder = text;
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const text = t(key);
      if (text !== key) {
        el.title = text;
      }
    });
    // Update lang toggle button
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
      langBtn.textContent = currentLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN';
    }
  }

  return { init, t, setLang, getLang, toggle, updateDOM };
})();
