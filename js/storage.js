/* ============================================
   Storage — Hybrid localStorage + Supabase
   Strategy:
     - Demo users: localStorage only
     - Cloud users: localStorage (cache) + Supabase (source of truth)
     - On login: pull from Supabase → populate localStorage
     - On write: update localStorage (instant) + push to Supabase (async)
   ============================================ */
const Storage = (() => {
  const PREFIX = 'bp_';

  // Collection name → Supabase table mapping
  const TABLE_MAP = {
    'business_plans': 'business_plans',
    'contracts': 'contracts',
    'tasks': 'tasks'
  };

  // ── localStorage helpers ──
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

  // ════════════════════════════════════════════
  //  CRUD — works with both localStorage and Supabase
  // ════════════════════════════════════════════

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

    // Async push to Supabase
    if (Auth.isCloudUser() && TABLE_MAP[collection]) {
      _supabaseInsert(collection, item);
    }

    return item;
  }

  function updateItem(collection, id, updates) {
    const items = getCollection(collection);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    saveCollection(collection, items);

    // Async push to Supabase
    if (Auth.isCloudUser() && TABLE_MAP[collection]) {
      _supabaseUpdate(collection, id, items[idx]);
    }

    return items[idx];
  }

  function deleteItem(collection, id) {
    let items = getCollection(collection);
    items = items.filter(i => i.id !== id);
    saveCollection(collection, items);

    // Async push to Supabase
    if (Auth.isCloudUser() && TABLE_MAP[collection]) {
      _supabaseDelete(collection, id);
    }

    return true;
  }

  function getItem(collection, id) {
    const items = getCollection(collection);
    return items.find(i => i.id === id) || null;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ════════════════════════════════════════════
  //  Supabase Sync Layer (async, non-blocking)
  // ════════════════════════════════════════════

  // Convert local item → Supabase row
  function _toRow(collection, item) {
    const user = Auth.getUser();
    const base = {
      id: item.id,
      user_id: user.id,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    };

    if (collection === 'business_plans') {
      return {
        ...base,
        name: item.name || '',
        plan_type: item.planType || 'type1',
        subtype: item.subtype || null,
        status: item.status || 'draft',
        description: item.description || null,
        start_date: item.startDate || null,
        end_date: item.endDate || null,
        notes: item.notes || null,
        data: JSON.stringify(_extractPlanData(item))
      };
    }

    if (collection === 'contracts') {
      return {
        ...base,
        number: item.number || '',
        partner: item.partner || '',
        type: item.type || 'other',
        value: parseInt(item.value) || 0,
        sign_date: item.signDate || null,
        effective_date: item.effectiveDate || null,
        expiry_date: item.expiryDate || null,
        status: item.status || 'drafting',
        terms: item.terms || null
      };
    }

    if (collection === 'tasks') {
      return {
        ...base,
        title: item.title || '',
        description: item.description || null,
        category: item.category || 'other',
        priority: item.priority || 'medium',
        deadline: item.deadline || null,
        assignee: item.assignee || null,
        status: item.status || 'todo',
        linked_to: item.linkedTo || null
      };
    }

    return base;
  }

  // Extract complex plan data into JSONB field
  function _extractPlanData(item) {
    const data = {};
    const skipKeys = ['id', 'name', 'planType', 'subtype', 'status', 'description',
      'startDate', 'endDate', 'notes', 'createdAt', 'updatedAt'];
    Object.keys(item).forEach(k => {
      if (!skipKeys.includes(k)) data[k] = item[k];
    });
    return data;
  }

  // Convert Supabase row → local item
  function _toLocalItem(collection, row) {
    const base = {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    if (collection === 'business_plans') {
      const extraData = typeof row.data === 'string' ? JSON.parse(row.data || '{}') : (row.data || {});
      return {
        ...base,
        name: row.name,
        planType: row.plan_type,
        subtype: row.subtype,
        status: row.status,
        description: row.description,
        startDate: row.start_date,
        endDate: row.end_date,
        notes: row.notes,
        ...extraData
      };
    }

    if (collection === 'contracts') {
      return {
        ...base,
        number: row.number,
        partner: row.partner,
        type: row.type,
        value: row.value,
        signDate: row.sign_date,
        effectiveDate: row.effective_date,
        expiryDate: row.expiry_date,
        status: row.status,
        terms: row.terms
      };
    }

    if (collection === 'tasks') {
      return {
        ...base,
        title: row.title,
        description: row.description,
        category: row.category,
        priority: row.priority,
        deadline: row.deadline,
        assignee: row.assignee,
        status: row.status,
        linkedTo: row.linked_to
      };
    }

    return base;
  }

  // ── Supabase CRUD (async, fire-and-forget) ──
  async function _supabaseInsert(collection, item) {
    try {
      const sb = SupabaseClient.getClient();
      if (!sb) return;
      const row = _toRow(collection, item);
      const { error } = await sb.from(TABLE_MAP[collection]).insert(row);
      if (error) console.error('Supabase insert error:', error.message);
    } catch (e) {
      console.error('Supabase insert exception:', e);
    }
  }

  async function _supabaseUpdate(collection, id, item) {
    try {
      const sb = SupabaseClient.getClient();
      if (!sb) return;
      const row = _toRow(collection, item);
      delete row.id; // Don't update PK
      delete row.user_id; // Don't update owner
      const { error } = await sb.from(TABLE_MAP[collection]).update(row).eq('id', id);
      if (error) console.error('Supabase update error:', error.message);
    } catch (e) {
      console.error('Supabase update exception:', e);
    }
  }

  async function _supabaseDelete(collection, id) {
    try {
      const sb = SupabaseClient.getClient();
      if (!sb) return;
      const { error } = await sb.from(TABLE_MAP[collection]).delete().eq('id', id);
      if (error) console.error('Supabase delete error:', error.message);
    } catch (e) {
      console.error('Supabase delete exception:', e);
    }
  }

  // ── Pull all data from Supabase on login ──
  async function pullFromCloud() {
    const sb = SupabaseClient.getClient();
    if (!sb || !Auth.isCloudUser()) return;

    try {
      for (const [collection, table] of Object.entries(TABLE_MAP)) {
        const { data, error } = await sb.from(table).select('*').order('created_at', { ascending: true });
        if (error) {
          console.error(`Pull ${table} error:`, error.message);
          continue;
        }
        if (data) {
          const localItems = data.map(row => _toLocalItem(collection, row));
          saveCollection(collection, localItems);
        }
      }
      console.log('✅ Cloud data synced to localStorage');
    } catch (e) {
      console.error('Pull from cloud error:', e);
    }
  }

  // ── Push all localStorage to Supabase (for migration) ──
  async function pushToCloud() {
    const sb = SupabaseClient.getClient();
    if (!sb || !Auth.isCloudUser()) return;

    try {
      for (const [collection, table] of Object.entries(TABLE_MAP)) {
        const items = getCollection(collection);
        if (items.length === 0) continue;

        const rows = items.map(item => _toRow(collection, item));
        const { error } = await sb.from(table).upsert(rows, { onConflict: 'id' });
        if (error) {
          console.error(`Push ${table} error:`, error.message);
        }
      }
      Toast.show('☁️ Data synced to cloud', 'success');
    } catch (e) {
      console.error('Push to cloud error:', e);
    }
  }

  // ── Backup / Restore (keep for offline use) ──
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
    a.download = `business-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

  // ── Realtime Sync (Supabase Channels) ──
  let _realtimeChannel = null;

  function subscribeRealtime() {
    const sb = SupabaseClient.getClient();
    if (!sb || !Auth.isCloudUser()) return;

    // Unsubscribe previous if exists
    unsubscribeRealtime();

    const user = Auth.getUser();
    if (!user?.id) return;

    // Reverse table → collection mapping
    const REVERSE_MAP = {};
    for (const [col, table] of Object.entries(TABLE_MAP)) {
      REVERSE_MAP[table] = col;
    }

    _realtimeChannel = sb
      .channel('storage-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'business_plans',
        filter: `user_id=eq.${user.id}`
      }, (payload) => _handleRealtimeEvent('business_plans', payload))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contracts',
        filter: `user_id=eq.${user.id}`
      }, (payload) => _handleRealtimeEvent('contracts', payload))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${user.id}`
      }, (payload) => _handleRealtimeEvent('tasks', payload))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🔄 Realtime sync active');
        }
      });
  }

  function _handleRealtimeEvent(collection, payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    console.log(`🔄 Realtime ${eventType} on ${collection}`);

    let items = getCollection(collection);
    let changed = false;

    if (eventType === 'INSERT') {
      // Only add if not already exists (prevent duplicate from own writes)
      if (!items.find(i => i.id === newRow.id)) {
        const localItem = _toLocalItem(collection, newRow);
        items.push(localItem);
        changed = true;
      }
    } else if (eventType === 'UPDATE') {
      const idx = items.findIndex(i => i.id === newRow.id);
      if (idx !== -1) {
        const localItem = _toLocalItem(collection, newRow);
        // Only update if remote is newer
        if (localItem.updatedAt > items[idx].updatedAt) {
          items[idx] = localItem;
          changed = true;
        }
      }
    } else if (eventType === 'DELETE') {
      const before = items.length;
      items = items.filter(i => i.id !== oldRow.id);
      changed = items.length !== before;
    }

    if (changed) {
      saveCollection(collection, items);
      // Dispatch event so UI can re-render
      document.dispatchEvent(new CustomEvent('realtimeSync', {
        detail: { collection, eventType }
      }));
    }
  }

  function unsubscribeRealtime() {
    if (_realtimeChannel) {
      const sb = SupabaseClient.getClient();
      if (sb) sb.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }
  }

  return {
    save, load, remove, clear,
    getCollection, saveCollection, addItem, updateItem, deleteItem, getItem,
    generateId, exportAll, importAll, downloadBackup, restoreBackup,
    pullFromCloud, pushToCloud, subscribeRealtime, unsubscribeRealtime
  };
})();
