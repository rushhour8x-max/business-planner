/* ============================================
   Contracts Module — CRUD, Expiry Alerts
   ============================================ */
const Contracts = (() => {
  const COLLECTION = 'contracts';
  let editingId = null;

  function getAll() { return Storage.getCollection(COLLECTION); }
  function getById(id) { return Storage.getItem(COLLECTION, id); }
  function save(item) {
    if (item.id) return Storage.updateItem(COLLECTION, item.id, item);
    return Storage.addItem(COLLECTION, item);
  }
  function remove(id) { return Storage.deleteItem(COLLECTION, id); }

  function formatVND(n) { return BusinessPlan.formatVND(n); }

  function getExpiringContracts(days = 30) {
    const now = new Date();
    const limit = new Date(now.getTime() + days * 86400000);
    return getAll().filter(c => {
      if (!c.expiryDate) return false;
      const exp = new Date(c.expiryDate);
      return exp >= now && exp <= limit;
    });
  }

  function renderList(container) {
    const contracts = getAll();
    const t = I18n.t.bind(I18n);

    // Check for expiring contracts
    const expiring = getExpiringContracts();

    let html = `
      <div class="page-header">
        <h1 class="page-title">${t('contracts.title')}</h1>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="Contracts.exportPDF()">📄 ${t('common.pdf')}</button>
          <button class="btn btn-secondary" onclick="Contracts.exportExcel()">📊 ${t('common.excel')}</button>
          <button class="btn btn-secondary" onclick="Contracts.exportDocx()">📝 Word</button>
          <button class="btn btn-primary" onclick="Contracts.openModal()">+ ${t('contracts.new')}</button>
        </div>
      </div>`;

    // Expiry warnings
    if (expiring.length > 0) {
      html += `<div class="card" style="border-left:3px solid var(--warning);margin-bottom:var(--space-xl)">
        <div class="card-header"><h3 class="card-title">⚠️ ${t('dashboard.expiringContracts')}</h3></div>
        <div style="padding:0 var(--space-lg) var(--space-lg)">`;
      expiring.forEach(c => {
        const daysLeft = Math.ceil((new Date(c.expiryDate) - new Date()) / 86400000);
        html += `<div class="flex items-center justify-between" style="padding:var(--space-sm) 0;border-bottom:1px solid var(--border-color)">
          <span>${c.number} — ${c.partner}</span>
          <span class="status-badge expired">${t('contracts.expiryWarning', { days: daysLeft })}</span>
        </div>`;
      });
      html += '</div></div>';
    }

    html += `
      <div class="toolbar">
        <div class="search-box">
          <input type="text" class="form-input" id="contractSearch" placeholder="${t('contracts.search')}" oninput="Contracts.filterList()">
        </div>
        <div class="filter-group">
          <select class="form-select" id="contractFilterType" onchange="Contracts.filterList()">
            <option value="">${t('common.all')}</option>
            <option value="trading">${t('contracts.types.trading')}</option>
            <option value="service">${t('contracts.types.service')}</option>
            <option value="lease">${t('contracts.types.lease')}</option>
            <option value="other">${t('contracts.types.other')}</option>
          </select>
          <select class="form-select" id="contractFilterStatus" onchange="Contracts.filterList()">
            <option value="">${t('common.all')}</option>
            <option value="drafting">${t('contracts.statuses.drafting')}</option>
            <option value="signed">${t('contracts.statuses.signed')}</option>
            <option value="active">${t('contracts.statuses.active')}</option>
            <option value="completed">${t('contracts.statuses.completed')}</option>
            <option value="expired">${t('contracts.statuses.expired')}</option>
          </select>
        </div>
      </div>
    `;

    if (contracts.length === 0) {
      html += `<div class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-title">${t('common.noData')}</div>
        <button class="btn btn-primary mt-lg" onclick="Contracts.openModal()">+ ${t('contracts.new')}</button>
      </div>`;
    } else {
      html += `<div class="table-container"><table class="data-table" id="contractTable"><thead><tr>
        <th>${t('contracts.number')}</th>
        <th>${t('contracts.partner')}</th>
        <th>${t('contracts.type')}</th>
        <th class="number">${t('contracts.value')}</th>
        <th>${t('contracts.effectiveDate')}</th>
        <th>${t('contracts.expiryDate')}</th>
        <th>${t('contracts.status')}</th>
        <th>${t('common.actions')}</th>
      </tr></thead><tbody>`;

      contracts.forEach(c => {
        const statusClass = c.status || 'drafting';
        const isExpiring = expiring.some(e => e.id === c.id);

        html += `<tr data-id="${c.id}" data-type="${c.type}" data-status="${c.status}">
          <td><strong>${c.number || ''}</strong></td>
          <td>${c.partner || ''}</td>
          <td><span class="category-tag">${t('contracts.types.' + (c.type || 'other'))}</span></td>
          <td class="number currency">${formatVND(c.value)}</td>
          <td>${c.effectiveDate || ''}</td>
          <td>${isExpiring ? '<span style="color:var(--warning)">⚠️ </span>' : ''}${c.expiryDate || ''}</td>
          <td><span class="status-badge ${statusClass}">${t('contracts.statuses.' + statusClass)}</span></td>
          <td class="actions">
            <button class="btn btn-ghost btn-sm" onclick="Contracts.openModal('${c.id}')" title="${t('common.edit')}">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="Contracts.exportSingleDocx('${c.id}')" title="Word">📝</button>
            <button class="btn btn-ghost btn-sm" onclick="Contracts.confirmDelete('${c.id}')" title="${t('common.delete')}">🗑️</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }

    container.innerHTML = html;
  }

  function openModal(id = null) {
    editingId = id;
    const c = id ? getById(id) : null;
    const t = I18n.t.bind(I18n);

    let html = `<div class="modal-overlay" onclick="if(event.target===this) Contracts.closeModal()">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2 class="modal-title">${id ? t('contracts.edit') : t('contracts.new')}</h2>
          <button class="modal-close" onclick="Contracts.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('contracts.number')} *</label>
              <input type="text" class="form-input" id="ct_number" value="${c?.number || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('contracts.partner')} *</label>
              <input type="text" class="form-input" id="ct_partner" value="${c?.partner || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('contracts.type')}</label>
              <select class="form-select" id="ct_type">
                <option value="trading" ${c?.type === 'trading' ? 'selected' : ''}>${t('contracts.types.trading')}</option>
                <option value="service" ${c?.type === 'service' ? 'selected' : ''}>${t('contracts.types.service')}</option>
                <option value="lease" ${c?.type === 'lease' ? 'selected' : ''}>${t('contracts.types.lease')}</option>
                <option value="other" ${c?.type === 'other' ? 'selected' : ''}>${t('contracts.types.other')}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('contracts.value')}</label>
              <input type="text" class="form-input" id="ct_value" value="${c?.value || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('contracts.status')}</label>
              <select class="form-select" id="ct_status">
                <option value="drafting" ${c?.status === 'drafting' ? 'selected' : ''}>${t('contracts.statuses.drafting')}</option>
                <option value="signed" ${c?.status === 'signed' ? 'selected' : ''}>${t('contracts.statuses.signed')}</option>
                <option value="active" ${c?.status === 'active' ? 'selected' : ''}>${t('contracts.statuses.active')}</option>
                <option value="completed" ${c?.status === 'completed' ? 'selected' : ''}>${t('contracts.statuses.completed')}</option>
                <option value="expired" ${c?.status === 'expired' ? 'selected' : ''}>${t('contracts.statuses.expired')}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('contracts.signDate')}</label>
              <input type="date" class="form-input" id="ct_signDate" value="${c?.signDate || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('contracts.effectiveDate')}</label>
              <input type="date" class="form-input" id="ct_effectiveDate" value="${c?.effectiveDate || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('contracts.expiryDate')}</label>
              <input type="date" class="form-input" id="ct_expiryDate" value="${c?.expiryDate || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('contracts.terms')}</label>
            <textarea class="form-textarea" id="ct_terms" rows="3">${c?.terms || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="Contracts.closeModal()">${t('common.cancel')}</button>
          <button class="btn btn-primary" onclick="Contracts.saveContract()">${t('common.save')}</button>
        </div>
      </div>
    </div>`;

    document.getElementById('modalContainer').innerHTML = html;
  }

  function saveContract() {
    const el = (id) => document.getElementById(id)?.value;
    const number = el('ct_number');
    const partner = el('ct_partner');

    if (!number || !partner) {
      Toast.show(I18n.t('common.error'), 'error');
      return;
    }

    const contract = {
      number, partner,
      type: el('ct_type'),
      value: el('ct_value'),
      status: el('ct_status'),
      signDate: el('ct_signDate'),
      effectiveDate: el('ct_effectiveDate'),
      expiryDate: el('ct_expiryDate'),
      terms: el('ct_terms'),
    };

    if (editingId) contract.id = editingId;
    save(contract);
    closeModal();
    Toast.show(I18n.t('common.success'), 'success');
    App.navigate('contracts');
  }

  function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
    editingId = null;
  }

  function confirmDelete(id) {
    const c = getById(id);
    if (confirm(I18n.t('common.confirmDelete') + `\n\n${c?.number || ''}`)) {
      remove(id);
      Toast.show(I18n.t('common.success'), 'success');
      App.navigate('contracts');
    }
  }

  function filterList() {
    const search = document.getElementById('contractSearch')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('contractFilterType')?.value || '';
    const statusFilter = document.getElementById('contractFilterStatus')?.value || '';
    document.querySelectorAll('#contractTable tbody tr').forEach(tr => {
      const show = (!search || tr.textContent.toLowerCase().includes(search)) &&
                   (!typeFilter || tr.dataset.type === typeFilter) &&
                   (!statusFilter || tr.dataset.status === statusFilter);
      tr.style.display = show ? '' : 'none';
    });
  }

  function getStats() {
    const all = getAll();
    return {
      total: all.length,
      active: all.filter(c => c.status === 'active').length,
      expiring: getExpiringContracts().length
    };
  }

  function exportExcel() {
    Export.exportContractsExcel();
  }

  function exportPDF() {
    Export.exportContractsPDF();
  }

  function exportDocx() {
    Export.exportContractsListDocx();
  }

  function exportSingleDocx(id) {
    Export.exportContractDocx(id);
  }

  return {
    renderList, openModal, closeModal, saveContract, confirmDelete, filterList,
    exportExcel, exportPDF, exportDocx, exportSingleDocx, getStats, getAll, getExpiringContracts
  };
})();
