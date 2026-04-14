/* ============================================
   Catalog Module
   Manage supplier equipment catalog
   Import from Excel, export template
   ============================================ */
const Catalog = (() => {
  const COLLECTION = 'equipment_catalog';

  function getAll() {
    return Storage.load(COLLECTION) || [];
  }

  function saveAll(items) {
    Storage.save(COLLECTION, items);
  }

  // ── Render catalog list page ──
  function renderList(container) {
    const t = I18n.t.bind(I18n);
    const items = getAll();

    // Group by supplier
    const grouped = {};
    items.forEach(item => {
      const key = item.supplier || 'Unknown';
      if (!grouped[key]) grouped[key] = { origin: item.origin || '', currency: item.currency || 'USD', items: [] };
      grouped[key].items.push(item);
    });

    let html = `
      <div class="page-header">
        <h1 class="page-title">${t('catalog.title')}</h1>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="Catalog.downloadTemplate()">📥 ${t('catalog.downloadTemplate')}</button>
          <button class="btn btn-secondary" onclick="Catalog.importExcel()">📤 ${t('catalog.importExcel')}</button>
          <button class="btn btn-primary" onclick="Catalog.openAddModal()">+ ${t('catalog.addItem')}</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid" style="margin-bottom:var(--space-2xl)">
        <div class="stat-card">
          <div class="stat-icon purple">🏭</div>
          <div>
            <div class="stat-value">${Object.keys(grouped).length}</div>
            <div class="stat-label">${t('catalog.totalSuppliers')}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📦</div>
          <div>
            <div class="stat-value">${items.length}</div>
            <div class="stat-label">${t('catalog.totalItems')}</div>
          </div>
        </div>
      </div>
    `;

    if (items.length === 0) {
      html += `
        <div class="card" style="text-align:center;padding:var(--space-3xl)">
          <div style="font-size:3rem;margin-bottom:var(--space-lg)">📦</div>
          <h3 style="margin-bottom:var(--space-md)">${t('catalog.emptyTitle')}</h3>
          <p class="text-sm text-muted" style="margin-bottom:var(--space-xl)">${t('catalog.emptyDesc')}</p>
          <div style="display:flex;gap:var(--space-md);justify-content:center;flex-wrap:wrap">
            <button class="btn btn-secondary" onclick="Catalog.downloadTemplate()">📥 ${t('catalog.downloadTemplate')}</button>
            <button class="btn btn-primary" onclick="Catalog.importExcel()">📤 ${t('catalog.importExcel')}</button>
          </div>
        </div>
      `;
    } else {
      // Render grouped tables
      Object.keys(grouped).sort().forEach(supplier => {
        const group = grouped[supplier];
        html += `
          <details class="collapsible-section" open style="margin-bottom:var(--space-xl)">
            <summary class="section-title collapsible-toggle">
              <span>🏭 ${supplier} <span class="text-sm text-muted" style="font-weight:400">(${group.origin || ''} · ${group.items.length} ${t('catalog.items')})</span></span>
            </summary>
            <div class="collapsible-content" style="padding:0;overflow-x:auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width:40px">#</th>
                    <th>${t('catalog.col.name')}</th>
                    <th>${t('catalog.col.partNumber')}</th>
                    <th>${t('catalog.col.price')}</th>
                    <th>${t('catalog.col.currency')}</th>
                    <th>${t('catalog.col.unit')}</th>
                    <th>${t('catalog.col.notes')}</th>
                    <th style="width:80px"></th>
                  </tr>
                </thead>
                <tbody>
                  ${group.items.map((item, i) => `
                    <tr>
                      <td class="text-muted">${i + 1}</td>
                      <td><strong>${item.name || ''}</strong></td>
                      <td><code style="color:var(--accent-primary)">${item.partNumber || ''}</code></td>
                      <td style="text-align:right;font-weight:600">${item.price ? Number(item.price).toLocaleString('vi-VN') : '-'}</td>
                      <td>${item.currency || ''}</td>
                      <td>${item.unit || ''}</td>
                      <td class="text-sm text-muted">${item.notes || ''}</td>
                      <td>
                        <div style="display:flex;gap:var(--space-xs)">
                          <button class="btn btn-ghost btn-sm" onclick="Catalog.editItem('${item.id}')" title="Edit">✏️</button>
                          <button class="btn btn-ghost btn-sm" onclick="Catalog.deleteItem('${item.id}')" title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </details>
        `;
      });
    }

    // Sync info
    html += `
      <div style="margin-top:var(--space-xl);text-align:center">
        <button class="btn btn-secondary" onclick="Catalog.syncToPlan()">🔄 ${t('catalog.syncToPlan')}</button>
        <p class="text-xs text-muted" style="margin-top:var(--space-sm)">${t('catalog.syncDesc')}</p>
      </div>
    `;

    container.innerHTML = html;
  }

  // ── Download Excel Template ──
  function downloadTemplate() {
    const t = I18n.t.bind(I18n);
    if (!window.XLSX) {
      Toast.show('SheetJS library not loaded', 'error');
      return;
    }

    const headers = [
      t('catalog.col.supplier'),
      t('catalog.col.origin'),
      t('catalog.col.name'),
      t('catalog.col.partNumber'),
      t('catalog.col.price'),
      t('catalog.col.currency'),
      t('catalog.col.unit'),
      t('catalog.col.notes'),
    ];

    // Sample data
    const sampleData = [
      ['Aqualabo', 'Pháp', 'ACTEON 5000', 'PF-FIX-C-00085', 15000, 'EUR', 'Bộ', 'Bao gồm cáp 10m'],
      ['Aqualabo', 'Pháp', 'StacSense', 'PF-CAP-C-00368', 12000, 'EUR', 'Bộ', ''],
      ['Aqualabo', 'Pháp', 'pH-ORP SENSOR', 'PF-CAP-C-00172', 800, 'EUR', 'Cái', 'Phụ kiện: CARTRIDGE FOR pH-ORP SENSOR PF-CAP-C-00155'],
      ['Insitu', 'Mỹ', '7300 Monitor', '226974', 4500, 'USD', 'Bộ', ''],
      ['Insitu', 'Mỹ', 'Aqua TROLL 500, Non-Vented 0-30m', '0050730', 7500, 'USD', 'Bộ', ''],
      ['Insitu', 'Mỹ', 'Aqua TROLL 500/600 Maintenance Kit', '0078940', 850, 'USD', 'Bộ', 'Includes sponges, O-rings, tools, grease'],
      ['', '', '', '', '', '', '', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

    // Column widths
    ws['!cols'] = [
      { wch: 18 }, // Supplier
      { wch: 12 }, // Origin
      { wch: 40 }, // Name
      { wch: 18 }, // Part Number
      { wch: 14 }, // Price
      { wch: 10 }, // Currency
      { wch: 10 }, // Unit
      { wch: 30 }, // Notes
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipment Catalog');

    // Add instruction sheet
    const instrData = [
      ['HƯỚNG DẪN SỬ DỤNG / INSTRUCTIONS'],
      [''],
      ['1. Điền thông tin thiết bị theo các cột đã định sẵn'],
      ['2. Mỗi dòng là 1 thiết bị / linh kiện'],
      ['3. Cột "Nhà cung cấp" và "Tên thiết bị" là bắt buộc'],
      ['4. Giá (Price) là giá FOB/EXW chưa thuế'],
      ['5. Đơn vị tiền tệ: USD, EUR, VND'],
      ['6. Sau khi NCC điền giá, import file này vào Business Planner'],
      [''],
      ['Liên hệ: Business Planner App'],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
    wsInstr['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Hướng dẫn');

    const fileName = `Equipment_Catalog_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    Toast.show(t('catalog.templateDownloaded'), 'success');
  }

  // ── Import Excel ──
  function importExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      parseExcelFile(file);
    };
    input.click();
  }

  function parseExcelFile(file) {
    const t = I18n.t.bind(I18n);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]]; // First sheet
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
          Toast.show(t('catalog.importEmpty'), 'warning');
          return;
        }

        // Detect headers (first row)
        const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
        const colMap = detectColumns(headers);

        if (!colMap.name) {
          Toast.show(t('catalog.importNoName'), 'error');
          return;
        }

        const existingItems = getAll();
        let imported = 0;
        let skipped = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const name = String(row[colMap.name] || '').trim();
          if (!name) { skipped++; continue; }

          const item = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
            supplier: String(row[colMap.supplier] || '').trim(),
            origin: String(row[colMap.origin] || '').trim(),
            name: name,
            partNumber: String(row[colMap.partNumber] || '').trim(),
            price: parseFloat(String(row[colMap.price] || '0').replace(/,/g, '')) || 0,
            currency: String(row[colMap.currency] || 'USD').trim().toUpperCase(),
            unit: String(row[colMap.unit] || '').trim(),
            notes: String(row[colMap.notes] || '').trim(),
            importedAt: new Date().toISOString(),
          };

          // Check for duplicate (same supplier + partNumber)
          const exists = existingItems.find(
            ex => ex.supplier === item.supplier && ex.partNumber === item.partNumber && item.partNumber
          );
          if (exists) {
            // Update price and notes
            Object.assign(exists, { price: item.price, currency: item.currency, notes: item.notes, unit: item.unit, importedAt: item.importedAt });
            imported++;
          } else {
            existingItems.push(item);
            imported++;
          }
        }

        saveAll(existingItems);
        Toast.show(`${t('catalog.importSuccess')}: ${imported} ${t('catalog.items')}${skipped > 0 ? ` (${skipped} ${t('catalog.skipped')})` : ''}`, 'success');
        App.navigate('catalog');
      } catch (err) {
        console.error('Excel import error:', err);
        Toast.show(t('catalog.importError') + ': ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function detectColumns(headers) {
    // Flexible column detection — supports Vietnamese and English headers
    const map = { supplier: null, origin: null, name: null, partNumber: null, price: null, currency: null, unit: null, notes: null };

    headers.forEach((h, idx) => {
      const lc = h.toLowerCase();
      if (lc.includes('nhà cung cấp') || lc.includes('hãng') || lc.includes('ncc') || lc.includes('supplier') || lc.includes('vendor') || lc.includes('manufacturer')) {
        map.supplier = idx;
      } else if (lc.includes('xuất xứ') || lc.includes('nguồn') || lc.includes('origin') || lc.includes('country')) {
        map.origin = idx;
      } else if (lc.includes('tên') || lc.includes('thiết bị') || lc.includes('name') || lc.includes('device') || lc.includes('equipment') || lc.includes('description') || lc.includes('model')) {
        if (map.name === null) map.name = idx; // first match
      } else if (lc.includes('part') || lc.includes('mã') || lc.includes('sku') || lc.includes('code') || lc.includes('catalog')) {
        map.partNumber = idx;
      } else if (lc.includes('giá') || lc.includes('price') || lc.includes('cost') || lc.includes('unit price') || lc.includes('đơn giá')) {
        map.price = idx;
      } else if (lc.includes('tiền') || lc.includes('currency') || lc.includes('ngoại tệ')) {
        map.currency = idx;
      } else if (lc.includes('đơn vị') || lc.includes('unit') || lc.includes('uom') || lc.includes('đvt')) {
        map.unit = idx;
      } else if (lc.includes('ghi chú') || lc.includes('note') || lc.includes('remark') || lc.includes('comment')) {
        map.notes = idx;
      }
    });

    // Fallback: if no name found, try column index 2 (standard template)
    if (map.name === null && headers.length >= 3) map.name = 2;
    if (map.supplier === null && headers.length >= 1) map.supplier = 0;
    if (map.origin === null && headers.length >= 2) map.origin = 1;
    if (map.partNumber === null && headers.length >= 4) map.partNumber = 3;
    if (map.price === null && headers.length >= 5) map.price = 4;
    if (map.currency === null && headers.length >= 6) map.currency = 5;
    if (map.unit === null && headers.length >= 7) map.unit = 6;
    if (map.notes === null && headers.length >= 8) map.notes = 7;

    return map;
  }

  // ── Add/Edit Item Modal ──
  function openAddModal(editId = null) {
    const t = I18n.t.bind(I18n);
    const items = getAll();
    const item = editId ? items.find(i => i.id === editId) : {};

    const modalHTML = `
      <div class="modal-overlay active" onclick="Catalog.closeModal()">
        <div class="modal" onclick="event.stopPropagation()" style="max-width:600px">
          <div class="modal-header">
            <h2>${editId ? t('catalog.editItem') : t('catalog.addItem')}</h2>
            <button class="btn btn-ghost" onclick="Catalog.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">${t('catalog.col.supplier')} *</label>
                <input type="text" class="form-input" id="cat_supplier" value="${item?.supplier || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">${t('catalog.col.origin')}</label>
                <input type="text" class="form-input" id="cat_origin" value="${item?.origin || ''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">${t('catalog.col.name')} *</label>
                <input type="text" class="form-input" id="cat_name" value="${item?.name || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">${t('catalog.col.partNumber')}</label>
                <input type="text" class="form-input" id="cat_partNumber" value="${item?.partNumber || ''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">${t('catalog.col.price')}</label>
                <input type="text" class="form-input" id="cat_price" value="${item?.price || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">${t('catalog.col.currency')}</label>
                <select class="form-select" id="cat_currency">
                  <option value="USD" ${(item?.currency || 'USD') === 'USD' ? 'selected' : ''}>USD</option>
                  <option value="EUR" ${item?.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                  <option value="VND" ${item?.currency === 'VND' ? 'selected' : ''}>VND</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${t('catalog.col.unit')}</label>
                <input type="text" class="form-input" id="cat_unit" value="${item?.unit || ''}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('catalog.col.notes')}</label>
              <textarea class="form-textarea" id="cat_notes" rows="2">${item?.notes || ''}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Catalog.closeModal()">${t('common.cancel')}</button>
            <button class="btn btn-primary" onclick="Catalog.saveItem('${editId || ''}')">${t('common.save')}</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;
  }

  function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
  }

  function saveItem(editId) {
    const t = I18n.t.bind(I18n);
    const supplier = document.getElementById('cat_supplier')?.value?.trim();
    const name = document.getElementById('cat_name')?.value?.trim();

    if (!supplier || !name) {
      Toast.show(t('catalog.requiredFields'), 'warning');
      return;
    }

    const items = getAll();
    const itemData = {
      supplier,
      origin: document.getElementById('cat_origin')?.value?.trim() || '',
      name,
      partNumber: document.getElementById('cat_partNumber')?.value?.trim() || '',
      price: parseFloat(document.getElementById('cat_price')?.value?.replace(/,/g, '') || '0') || 0,
      currency: document.getElementById('cat_currency')?.value || 'USD',
      unit: document.getElementById('cat_unit')?.value?.trim() || '',
      notes: document.getElementById('cat_notes')?.value?.trim() || '',
    };

    if (editId) {
      const idx = items.findIndex(i => i.id === editId);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...itemData, updatedAt: new Date().toISOString() };
      }
    } else {
      itemData.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
      itemData.createdAt = new Date().toISOString();
      items.push(itemData);
    }

    saveAll(items);
    closeModal();
    Toast.show(t('common.success'), 'success');
    App.navigate('catalog');
  }

  function editItem(id) {
    openAddModal(id);
  }

  function deleteItem(id) {
    const t = I18n.t.bind(I18n);
    if (!confirm(t('common.confirmDelete'))) return;
    const items = getAll().filter(i => i.id !== id);
    saveAll(items);
    Toast.show(t('common.deleted'), 'success');
    App.navigate('catalog');
  }

  // ── Sync catalog to BusinessPlan.IMPORT_CATALOG ──
  function syncToPlan() {
    const t = I18n.t.bind(I18n);
    const items = getAll();
    if (items.length === 0) {
      Toast.show(t('catalog.noDataToSync'), 'warning');
      return;
    }

    // Group by supplier → generate catalog structure
    const catalogData = {};
    items.forEach(item => {
      const supplier = item.supplier;
      if (!supplier) return;
      if (!catalogData[supplier]) {
        catalogData[supplier] = {
          origin: item.origin || '',
          currency: item.currency || 'USD',
          equipment: [],
        };
      }
      catalogData[supplier].equipment.push({
        name: item.name,
        partNumber: item.partNumber || '',
      });
    });

    // Update BusinessPlan's IMPORT_CATALOG via exposed method
    if (typeof BusinessPlan.updateCatalog === 'function') {
      BusinessPlan.updateCatalog(catalogData);
      Toast.show(t('catalog.syncSuccess'), 'success');
    } else {
      Toast.show(t('catalog.syncNotAvailable'), 'warning');
    }
  }

  return {
    renderList, downloadTemplate, importExcel, openAddModal, closeModal,
    saveItem, editItem, deleteItem, syncToPlan, getAll
  };
})();
