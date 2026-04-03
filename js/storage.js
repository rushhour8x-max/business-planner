/* ============================================
   Storage — Encrypted localStorage Manager
   ============================================ */
const Storage = (() => {
  const PREFIX = 'bp_';

  // For demo mode, use plain localStorage (no encryption key)
  function save(key, data) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Storage save error:', e);
      return false;
    }
  }

  function load(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Storage load error:', e);
      return null;
    }
  }

  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  function clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }

  // CRUD helpers for collections
  function getCollection(name) {
    return load(name) || [];
  }

  function saveCollection(name, items) {
    return save(name, items);
  }

  function addItem(collection, item) {
    const items = getCollection(collection);
    item.id = item.id || generateId();
    item.createdAt = item.createdAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    items.push(item);
    saveCollection(collection, items);
    return item;
  }

  function updateItem(collection, id, updates) {
    const items = getCollection(collection);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    saveCollection(collection, items);
    return items[idx];
  }

  function deleteItem(collection, id) {
    let items = getCollection(collection);
    items = items.filter(i => i.id !== id);
    saveCollection(collection, items);
    return true;
  }

  function getItem(collection, id) {
    const items = getCollection(collection);
    return items.find(i => i.id === id) || null;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Backup / Restore
  function exportAll() {
    const data = {};
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => {
        data[k.replace(PREFIX, '')] = JSON.parse(localStorage.getItem(k));
      });
    return data;
  }

  function importAll(data) {
    Object.keys(data).forEach(k => {
      save(k, data[k]);
    });
  }

  function downloadBackup() {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-planner-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function restoreBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          importAll(data);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }

  return {
    save, load, remove, clear,
    getCollection, saveCollection, addItem, updateItem, deleteItem, getItem,
    generateId, exportAll, importAll, downloadBackup, restoreBackup
  };
})();
