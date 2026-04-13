/* ============================================
   Business Plan Module
   Type 1: Product/Technology
   Type 2: Consulting/Service
   ============================================ */
const BusinessPlan = (() => {
  const COLLECTION = 'business_plans';
  let editingId = null;

  // Exchange rate cache
  let rateCache = {};

  // ── Import Equipment Catalog ──
  const IMPORT_CATALOG = {
    'Aqualabo': {
      origin: 'Pháp',
      currency: 'EUR',
      equipment: [
        { name: 'ACTEON 5000 - Đa thông số', partNumber: 'ACT-5000' },
        { name: 'KAPTA 3000-AC4 - Bộ phân tích Clo', partNumber: 'KAP-3000-AC4' },
        { name: 'STAC SEN - Cảm biến đo đục', partNumber: 'STAC-SEN-TU' },
        { name: 'PONSEL ODEON - Đo đa chỉ tiêu cầm tay', partNumber: 'PON-ODEON' },
        { name: 'DIGISENS - Module đo pH/ORP', partNumber: 'DIGI-PH-ORP' },
        { name: 'BUBSENS - Cảm biến DO quang học', partNumber: 'BUB-DO-OPT' },
        { name: 'COND SEN - Cảm biến độ dẫn điện', partNumber: 'COND-SEN-EC' },
      ]
    },
    'Insitu': {
      origin: 'Mỹ',
      currency: 'USD',
      equipment: [
        { name: 'Aqua TROLL 600 - Đa thông số', partNumber: '0063500' },
        { name: 'Aqua TROLL 500 - Đa thông số', partNumber: '0050730' },
        { name: 'Aqua TROLL 200 - Đo mực nước', partNumber: '0052050' },
        { name: 'RDO PRO-X - Đo oxy hòa tan', partNumber: '0078450' },
        { name: 'Level TROLL 700 - Đo mực nước + nhiệt độ', partNumber: '0071020' },
        { name: 'Tube 300R - Telemetry', partNumber: '0061860' },
        { name: 'HydroVu - Phần mềm giám sát', partNumber: 'HV-SW-001' },
      ]
    }
  };

  async function fetchExchangeRate(currency) {
    if (currency === 'VND') return { rate: 1, date: new Date().toISOString().slice(0, 10), source: 'VND' };
    const cacheKey = `${currency}_VND`;
    const cached = rateCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < 3600000)) { // 1h cache
      return cached;
    }

    // 1) Try Vietcombank XML (Sell/Bán ra rate)
    try {
      const vcbUrl = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx';
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(vcbUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const exrates = xmlDoc.querySelectorAll('Exrate');
      for (const ex of exrates) {
        if (ex.getAttribute('CurrencyCode') === currency) {
          const sellStr = ex.getAttribute('Sell');
          if (sellStr && sellStr !== '-') {
            const sellRate = parseFloat(sellStr.replace(/,/g, ''));
            if (!isNaN(sellRate) && sellRate > 0) {
              const dateEl = xmlDoc.querySelector('DateTime');
              const dateStr = dateEl?.textContent || new Date().toISOString().slice(0, 10);
              const result = { rate: sellRate, date: dateStr, source: 'Vietcombank', timestamp: Date.now() };
              rateCache[cacheKey] = result;
              return result;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Vietcombank rate fetch failed, trying fallback:', e.message);
    }

    // 2) Fallback: Open Exchange Rates API
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
      const data = await res.json();
      if (data.result === 'success' && data.rates?.VND) {
        const result = { rate: data.rates.VND, date: data.time_last_update_utc?.slice(0, 16) || new Date().toISOString().slice(0, 10), source: 'Open ER API', timestamp: Date.now() };
        rateCache[cacheKey] = result;
        return result;
      }
    } catch (e) {
      console.error('Exchange rate fetch error:', e);
    }
    return null;
  }

  function formatVND(num) {
    if (num == null || isNaN(num)) return '0';
    return Math.round(num).toLocaleString('vi-VN');
  }

  function parseNumber(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace(/[,.]/g, '')) || 0;
  }

  function getAll() {
    return Storage.getCollection(COLLECTION);
  }

  function getById(id) {
    return Storage.getItem(COLLECTION, id);
  }

  function save(plan) {
    if (plan.id) {
      return Storage.updateItem(COLLECTION, plan.id, plan);
    }
    return Storage.addItem(COLLECTION, plan);
  }

  function remove(id) {
    return Storage.deleteItem(COLLECTION, id);
  }

  // ── Render list view ──
  function renderList(container) {
    const plans = getAll();
    const t = I18n.t.bind(I18n);

    let html = `
      <div class="page-header">
        <h1 class="page-title">${t('businessPlan.title')}</h1>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="BusinessPlan.exportPDF()">📄 ${t('common.pdf')}</button>
          <button class="btn btn-secondary" onclick="BusinessPlan.exportExcel()">📊 ${t('common.excel')}</button>
          <button class="btn btn-primary" onclick="BusinessPlan.openModal()">+ ${t('businessPlan.newPlan')}</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="search-box">
          <input type="text" class="form-input" id="bpSearch" placeholder="${t('common.search')}" oninput="BusinessPlan.filterList()">
        </div>
        <div class="filter-group">
          <select class="form-select" id="bpFilterType" onchange="BusinessPlan.filterList()">
            <option value="">${t('common.all')}</option>
            <option value="type1">${t('businessPlan.type1')}</option>
            <option value="type2">${t('businessPlan.type2')}</option>
          </select>
          <select class="form-select" id="bpFilterStatus" onchange="BusinessPlan.filterList()">
            <option value="">${t('common.all')}</option>
            <option value="draft">${t('businessPlan.statuses.draft')}</option>
            <option value="active">${t('businessPlan.statuses.active')}</option>
            <option value="completed">${t('businessPlan.statuses.completed')}</option>
            <option value="cancelled">${t('businessPlan.statuses.cancelled')}</option>
          </select>
        </div>
      </div>
    `;

    if (plans.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">${t('common.noData')}</div>
          <div class="empty-desc">${t('businessPlan.title')}</div>
          <button class="btn btn-primary" onclick="BusinessPlan.openModal()">+ ${t('businessPlan.newPlan')}</button>
        </div>`;
    } else {
      html += `<div class="table-container"><table class="data-table" id="bpTable"><thead><tr>
        <th>${t('businessPlan.planName')}</th>
        <th>${t('businessPlan.type')}</th>
        <th>${t('businessPlan.status')}</th>
        <th class="number">${t('businessPlan.summary.totalCost')}</th>
        <th class="number">${t('businessPlan.summary.targetRevenue')}</th>
        <th class="number">${t('businessPlan.summary.margin')}</th>
        <th>${t('common.actions')}</th>
      </tr></thead><tbody>`;

      plans.forEach(p => {
        const totalCost = calcTotalCost(p);
        const revenue = calcRevenue(p);
        const profit = revenue - totalCost;
        const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
        const statusClass = p.status || 'draft';

        html += `<tr data-id="${p.id}" data-type="${p.planType}" data-status="${p.status}">
          <td><strong>${p.name || ''}</strong><br><span class="text-xs text-muted">${p.description?.substring(0, 60) || ''}</span></td>
          <td><span class="category-tag">${p.planType === 'type1' ? t('businessPlan.type1') : t('businessPlan.type2')}</span></td>
          <td><span class="status-badge ${statusClass}">${t('businessPlan.statuses.' + (p.status || 'draft'))}</span></td>
          <td class="number currency">${formatVND(totalCost)}</td>
          <td class="number currency">${formatVND(revenue)}</td>
          <td class="number"><span class="${profit >= 0 ? 'stat-change up' : 'stat-change down'}">${margin}%</span></td>
          <td class="actions">
            <button class="btn btn-ghost btn-sm" onclick="BusinessPlan.openModal('${p.id}')" title="${t('common.edit')}">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="BusinessPlan.confirmDelete('${p.id}')" title="${t('common.delete')}">🗑️</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }

    container.innerHTML = html;
  }

  // ── Calculate costs ──
  function calcTotalCost(plan) {
    if (plan.planType === 'type2') {
      const labor = (parseNumber(plan.workers) * parseNumber(plan.workDays) * parseNumber(plan.dailyRate)) || 0;
      return labor + parseNumber(plan.extras);
    }
    // Type 1
    let total = 0;
    // Import equipment
    (plan.importEquipment || []).forEach(eq => {
      total += parseNumber(eq.totalLdp);
    });
    // Domestic equipment
    (plan.domesticEquipment || []).forEach(eq => {
      total += parseNumber(eq.quantity) * parseNumber(eq.unitPrice);
    });
    // Services
    const svc = plan.services || {};
    ['transportation', 'insurance', 'inspection', 'installation', 'translation', 'bankFees', 'warranty', 'consumables', 'management', 'contingency'].forEach(k => {
      total += parseNumber(svc[k]);
    });
    // Interest
    total += parseNumber(svc.interestAmount);
    return total;
  }

  function calcRevenue(plan) {
    if (plan.planType === 'type2') {
      return parseNumber(plan.contractValue);
    }
    return parseNumber(plan.sellingPrice) * parseNumber(plan.quantity);
  }

  // ── Modal: Create/Edit ──
  function openModal(id = null) {
    editingId = id;
    const plan = id ? getById(id) : null;
    const t = I18n.t.bind(I18n);
    const isType2 = plan?.planType === 'type2';

    let html = `<div class="modal-overlay" onclick="if(event.target===this) BusinessPlan.closeModal()">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h2 class="modal-title">${id ? t('businessPlan.editPlan') : t('businessPlan.newPlan')}</h2>
          <button class="modal-close" onclick="BusinessPlan.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <!-- Plan Type Selection -->
          <div style="margin-bottom:var(--space-xl)">
            <label class="form-label">${t('businessPlan.type')}</label>
            <div class="plan-type-selector" id="bp_planType_selector">
              <button type="button" class="plan-type-card ${isType2 ? '' : 'selected'}" data-value="type1" onclick="BusinessPlan.selectType('type1')">
                <span class="plan-type-icon">📦</span>
                <span class="plan-type-label">${t('businessPlan.type1')}</span>
              </button>
              <button type="button" class="plan-type-card ${isType2 ? 'selected' : ''}" data-value="type2" onclick="BusinessPlan.selectType('type2')">
                <span class="plan-type-icon">🤝</span>
                <span class="plan-type-label">${t('businessPlan.type2')}</span>
              </button>
            </div>
            <input type="hidden" id="bp_planType" value="${isType2 ? 'type2' : 'type1'}">
          </div>

          <!-- General Info -->
          <h3 class="section-title">${t('businessPlan.general')}</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('businessPlan.planName')} *</label>
              <input type="text" class="form-input" id="bp_name" value="${plan?.name || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('businessPlan.planType')}</label>
              <select class="form-select" id="bp_subtype">
                ${isType2 ? `
                  <option value="consulting" ${plan?.subtype === 'consulting' ? 'selected' : ''}>${t('businessPlan.subtype.consulting')}</option>
                  <option value="documentation" ${plan?.subtype === 'documentation' ? 'selected' : ''}>${t('businessPlan.subtype.documentation')}</option>
                  <option value="otherService" ${plan?.subtype === 'otherService' ? 'selected' : ''}>${t('businessPlan.subtype.otherService')}</option>
                ` : `
                  <option value="trading" ${plan?.subtype === 'trading' ? 'selected' : ''}>${t('businessPlan.subtype.trading')}</option>
                  <option value="product" ${plan?.subtype === 'product' ? 'selected' : ''}>${t('businessPlan.subtype.product')}</option>
                  <option value="tech" ${plan?.subtype === 'tech' ? 'selected' : ''}>${t('businessPlan.subtype.tech')}</option>
                `}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('businessPlan.status')}</label>
              <select class="form-select" id="bp_status">
                <option value="draft" ${plan?.status === 'draft' ? 'selected' : ''}>${t('businessPlan.statuses.draft')}</option>
                <option value="active" ${plan?.status === 'active' ? 'selected' : ''}>${t('businessPlan.statuses.active')}</option>
                <option value="completed" ${plan?.status === 'completed' ? 'selected' : ''}>${t('businessPlan.statuses.completed')}</option>
                <option value="cancelled" ${plan?.status === 'cancelled' ? 'selected' : ''}>${t('businessPlan.statuses.cancelled')}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('businessPlan.description')}</label>
            <textarea class="form-textarea" id="bp_description" rows="2">${plan?.description || ''}</textarea>
          </div>

          <!-- Type-specific fields -->
          <div id="bp_type1_fields" class="${isType2 ? 'hidden' : ''}">
            ${renderType1Fields(plan)}
          </div>
          <div id="bp_type2_fields" class="${isType2 ? '' : 'hidden'}">
            ${renderType2Fields(plan)}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="BusinessPlan.closeModal()">${t('common.cancel')}</button>
          <button class="btn btn-primary" onclick="BusinessPlan.savePlan()">${t('common.save')}</button>
        </div>
      </div>
    </div>`;

    document.getElementById('modalContainer').innerHTML = html;
  }

  function renderType1Fields(plan) {
    const t = I18n.t.bind(I18n);
    const imports = plan?.importEquipment || [];
    const domestics = plan?.domesticEquipment || [];
    const svc = plan?.services || {};

    let html = `
      <!-- Import Equipment -->
      <details class="collapsible-section" open>
        <summary class="section-title collapsible-toggle" style="margin-top:var(--space-xl)">${t('businessPlan.equipment.title')}</summary>
        <div class="collapsible-content">
          <div id="importEquipmentList">
            ${imports.map((eq, i) => renderImportRow(eq, i)).join('')}
          </div>
          <div style="margin-top:var(--space-lg)">
            <button class="btn btn-secondary btn-sm" onclick="BusinessPlan.addImportRow()">${t('businessPlan.equipment.add')}</button>
          </div>
        </div>
      </details>

      <!-- Domestic Equipment -->
      <details class="collapsible-section">
        <summary class="section-title collapsible-toggle" style="margin-top:var(--space-xl)">${t('businessPlan.domestic.title')}</summary>
        <div class="collapsible-content">
          <div id="domesticEquipmentList">
            ${domestics.map((eq, i) => renderDomesticRow(eq, i)).join('')}
          </div>
          <div style="margin-top:var(--space-lg)">
            <button class="btn btn-secondary btn-sm" onclick="BusinessPlan.addDomesticRow()">${t('businessPlan.domestic.add')}</button>
          </div>
        </div>
      </details>

      <!-- Services & Logistics -->
      <details class="collapsible-section">
        <summary class="section-title collapsible-toggle" style="margin-top:var(--space-xl)">${t('businessPlan.services.title')}</summary>
        <div class="collapsible-content">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('businessPlan.services.transportation')}</label>
          <input type="text" class="form-input" id="svc_transportation" value="${svc.transportation || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.services.insurance')}</label>
          <input type="text" class="form-input" id="svc_insurance" value="${svc.insurance || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.services.inspection')}</label>
          <input type="text" class="form-input" id="svc_inspection" value="${svc.inspection || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('businessPlan.services.installation')}</label>
          <input type="text" class="form-input" id="svc_installation" value="${svc.installation || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.services.translation')}</label>
          <input type="text" class="form-input" id="svc_translation" value="${svc.translation || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('businessPlan.services.bankFees')}</label>
          <input type="text" class="form-input" id="svc_bankFees" value="${svc.bankFees || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.services.warranty')}</label>
          <input type="text" class="form-input" id="svc_warranty" value="${svc.warranty || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.services.consumables')}</label>
          <input type="text" class="form-input" id="svc_consumables" value="${svc.consumables || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('businessPlan.services.management')}</label>
          <input type="text" class="form-input" id="svc_management" value="${svc.management || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.services.contingency')}</label>
          <input type="text" class="form-input" id="svc_contingency" value="${svc.contingency || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
      </div>
        </div>
      </details>

      <!-- Summary -->
      <h3 class="section-title" style="margin-top:var(--space-xl)">${t('businessPlan.summary.title')}</h3>
      <div class="summary-box" id="type1Summary">
        <div class="summary-row"><span class="label">${t('businessPlan.summary.totalImport')}</span><span class="value" id="sum_import">0</span></div>
        <div class="summary-row"><span class="label">${t('businessPlan.summary.totalDomestic')}</span><span class="value" id="sum_domestic">0</span></div>
        <div class="summary-row"><span class="label">${t('businessPlan.summary.totalServices')}</span><span class="value" id="sum_services">0</span></div>
        <div class="summary-row total"><span class="label">${t('businessPlan.summary.totalCost')}</span><span class="value" id="sum_totalCost">0</span></div>
      </div>
      <div class="form-row mt-xl">
        <div class="form-group">
          <label class="form-label">${t('businessPlan.summary.sellingPrice')}</label>
          <input type="text" class="form-input" id="bp_sellingPrice" value="${plan?.sellingPrice || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.summary.quantity')}</label>
          <input type="number" class="form-input" id="bp_quantity" value="${plan?.quantity || 1}" min="1" oninput="BusinessPlan.recalcType1()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.summary.tax')}</label>
          <input type="text" class="form-input" id="bp_tax" value="${plan?.tax || ''}" oninput="BusinessPlan.recalcType1()">
        </div>
      </div>
      <div class="summary-box mt-lg" id="type1Profit">
        <div class="summary-row"><span class="label">${t('businessPlan.summary.targetRevenue')}</span><span class="value" id="sum_revenue">0</span></div>
        <div class="summary-row"><span class="label">${t('businessPlan.summary.grossProfit')}</span><span class="value" id="sum_gross">0</span></div>
        <div class="summary-row"><span class="label">${t('businessPlan.summary.netProfit')}</span><span class="value" id="sum_net">0</span></div>
        <div class="summary-row total"><span class="label">${t('businessPlan.summary.margin')}</span><span class="value" id="sum_margin">0%</span></div>
      </div>
      <div class="form-row mt-xl">
        <div class="form-group">
          <label class="form-label">${t('businessPlan.summary.startDate')}</label>
          <input type="date" class="form-input" id="bp_startDate" value="${plan?.startDate || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.summary.endDate')}</label>
          <input type="date" class="form-input" id="bp_endDate" value="${plan?.endDate || ''}">
        </div>
      </div>
      <div class="form-group mt-lg">
        <label class="form-label">${t('businessPlan.summary.notes')}</label>
        <textarea class="form-textarea" id="bp_notes" rows="2">${plan?.notes || ''}</textarea>
      </div>
    `;
    return html;
  }

  function renderType2Fields(plan) {
    const t = I18n.t.bind(I18n);
    return `
      <div class="form-row" style="margin-top:var(--space-xl)">
        <div class="form-group">
          <label class="form-label">${t('businessPlan.consulting.client')}</label>
          <input type="text" class="form-input" id="bp_client" value="${plan?.client || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('businessPlan.consulting.workDesc')}</label>
        <textarea class="form-textarea" id="bp_workDesc" rows="2">${plan?.workDesc || ''}</textarea>
      </div>
      <h3 class="section-subtitle">Nhân sự & Chi phí</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('businessPlan.consulting.workers')}</label>
          <input type="number" class="form-input" id="bp_workers" value="${plan?.workers || ''}" min="1" oninput="BusinessPlan.recalcType2()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.consulting.workDays')}</label>
          <input type="number" class="form-input" id="bp_workDays" value="${plan?.workDays || ''}" min="1" oninput="BusinessPlan.recalcType2()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.consulting.dailyRate')}</label>
          <input type="text" class="form-input" id="bp_dailyRate" value="${plan?.dailyRate || ''}" oninput="BusinessPlan.recalcType2()">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('businessPlan.consulting.extras')}</label>
          <input type="text" class="form-input" id="bp_extras" value="${plan?.extras || ''}" oninput="BusinessPlan.recalcType2()">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.consulting.contractValue')}</label>
          <input type="text" class="form-input" id="bp_contractValue" value="${plan?.contractValue || ''}" oninput="BusinessPlan.recalcType2()">
        </div>
      </div>
      <div class="summary-box mt-lg" id="type2Summary">
        <div class="summary-row"><span class="label">${t('businessPlan.consulting.totalLabor')}</span><span class="value" id="sum2_labor">0</span></div>
        <div class="summary-row"><span class="label">${t('businessPlan.consulting.totalCost')}</span><span class="value" id="sum2_totalCost">0</span></div>
        <div class="summary-row"><span class="label">${t('businessPlan.consulting.profit')}</span><span class="value" id="sum2_profit">0</span></div>
        <div class="summary-row total"><span class="label">${t('businessPlan.consulting.margin')}</span><span class="value" id="sum2_margin">0%</span></div>
      </div>
      <div class="form-row mt-xl">
        <div class="form-group">
          <label class="form-label">${t('businessPlan.summary.startDate')}</label>
          <input type="date" class="form-input" id="bp_startDate2" value="${plan?.startDate || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('businessPlan.summary.endDate')}</label>
          <input type="date" class="form-input" id="bp_endDate2" value="${plan?.endDate || ''}">
        </div>
      </div>
      <div class="form-group mt-lg">
        <label class="form-label">${t('businessPlan.summary.notes')}</label>
        <textarea class="form-textarea" id="bp_notes2" rows="2">${plan?.notes || ''}</textarea>
      </div>
    `;
  }

  function renderImportRow(eq = {}, idx) {
    const t = I18n.t.bind(I18n);
    const suppliers = Object.keys(IMPORT_CATALOG);
    const currentSupplier = eq.supplier || '';
    const equipmentList = IMPORT_CATALOG[currentSupplier]?.equipment || [];
    const isCustomSupplier = currentSupplier && !IMPORT_CATALOG[currentSupplier];

    return `
      <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-md)" id="importRow_${idx}">
        <div class="flex items-center justify-between mb-lg">
          <strong class="text-sm">#${idx + 1}</strong>
          <button class="btn btn-ghost btn-sm" onclick="BusinessPlan.removeImportRow(${idx})">🗑️</button>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.supplier')}</label>
            <select class="form-select imp-supplier" onchange="BusinessPlan.onSupplierChange(${idx})">
              <option value="">-- ${t('businessPlan.equipment.selectSupplier')} --</option>
              ${suppliers.map(s => `<option value="${s}" ${currentSupplier === s ? 'selected' : ''}>${s}</option>`).join('')}
              <option value="__custom__" ${isCustomSupplier ? 'selected' : ''}>✏️ ${t('businessPlan.equipment.customSupplier')}</option>
            </select></div>
          <div class="form-group imp-customSupplier-group" style="${isCustomSupplier ? '' : 'display:none'}"><label class="form-label">${t('businessPlan.equipment.customSupplierName')}</label>
            <input type="text" class="form-input imp-customSupplierName" value="${isCustomSupplier ? currentSupplier : ''}"></div>
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.name')}</label>
            ${(equipmentList.length > 0 && !isCustomSupplier) ? `
            <select class="form-select imp-name" onchange="BusinessPlan.onEquipmentChange(${idx})">
              <option value="">-- ${t('businessPlan.equipment.selectEquipment')} --</option>
              ${equipmentList.map(e => `<option value="${e.name}" ${eq.name === e.name ? 'selected' : ''}>${e.name}</option>`).join('')}
            </select>` : `
            <input type="text" class="form-input imp-name" value="${eq.name || ''}">`}
          </div>
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.partNumber')}</label>
            ${(equipmentList.length > 0 && !isCustomSupplier) ? `
            <select class="form-select imp-partNumber" onchange="BusinessPlan.onPartNumberChange(${idx})">
              <option value="">-- ${t('businessPlan.equipment.selectPartNumber')} --</option>
              ${equipmentList.map(e => `<option value="${e.partNumber}" ${eq.partNumber === e.partNumber ? 'selected' : ''}>${e.partNumber}</option>`).join('')}
            </select>` : `
            <input type="text" class="form-input imp-partNumber" value="${eq.partNumber || ''}">`}
          </div>
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.origin')}</label>
            <input type="text" class="form-input imp-origin" value="${eq.origin || (IMPORT_CATALOG[currentSupplier]?.origin || '')}" placeholder="${t('businessPlan.equipment.originPlaceholder')}"></div>
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.currency')}</label>
            <select class="form-select imp-currency" onchange="BusinessPlan.recalcImportRow(${idx})">
              <option value="USD" ${eq.currency === 'USD' || !eq.currency ? 'selected' : ''}>USD</option>
              <option value="EUR" ${eq.currency === 'EUR' ? 'selected' : ''}>EUR</option>
              <option value="VND" ${eq.currency === 'VND' ? 'selected' : ''}>VND</option>
            </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.exchangeRate')}</label>
            <div class="input-group">
              <input type="text" class="form-input imp-rate" value="${eq.exchangeRate || ''}" oninput="BusinessPlan.recalcImportRow(${idx})">
              <button class="btn btn-secondary btn-sm" onclick="BusinessPlan.fetchRate(${idx})" title="${t('businessPlan.equipment.fetchRate')}">📡</button>
            </div></div>
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.exchangeDate')}</label>
            <input type="text" class="form-input imp-rateDate" value="${eq.exchangeDate || ''}" readonly></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.fob')}</label>
            <input type="text" class="form-input imp-fob" value="${eq.fob || ''}" oninput="BusinessPlan.recalcImportRow(${idx})"></div>
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.accessories')}</label>
            <input type="text" class="form-input imp-accessories" value="${eq.accessories || ''}" oninput="BusinessPlan.recalcImportRow(${idx})"></div>
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.shipping')}</label>
            <input type="text" class="form-input imp-shipping" value="${eq.shipping || ''}" oninput="BusinessPlan.recalcImportRow(${idx})"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.importTax')}</label>
            <input type="number" class="form-input imp-importTax" value="${eq.importTax || 0}" min="0" max="100" oninput="BusinessPlan.recalcImportRow(${idx})"></div>
          <div class="form-group"><label class="form-label">${t('businessPlan.equipment.vat')}</label>
            <input type="number" class="form-input imp-vat" value="${eq.vat || 10}" min="0" max="100" oninput="BusinessPlan.recalcImportRow(${idx})"></div>
        </div>
        <div class="summary-box" style="margin-top:var(--space-md)">
          <div class="summary-row"><span class="label">${t('businessPlan.equipment.cif')}</span><span class="value imp-cifDisplay">0</span></div>
          <div class="summary-row"><span class="label">${t('businessPlan.equipment.cifVnd')}</span><span class="value imp-cifVndDisplay">0</span></div>
          <div class="summary-row total"><span class="label">${t('businessPlan.equipment.totalLdp')}</span><span class="value imp-ldpDisplay">0</span></div>
        </div>
        <input type="hidden" class="imp-totalLdp" value="${eq.totalLdp || 0}">
      </div>
    `;
  }

  function renderDomesticRow(eq = {}, idx) {
    const t = I18n.t.bind(I18n);
    return `
      <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-md)" id="domesticRow_${idx}">
        <div class="flex items-center justify-between mb-lg">
          <strong class="text-sm">#${idx + 1}</strong>
          <button class="btn btn-ghost btn-sm" onclick="BusinessPlan.removeDomesticRow(${idx})">🗑️</button>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">${t('businessPlan.domestic.name')}</label>
            <input type="text" class="form-input dom-name" value="${eq.name || ''}"></div>
          <div class="form-group"><label class="form-label">${t('businessPlan.domestic.supplier')}</label>
            <input type="text" class="form-input dom-supplier" value="${eq.supplier || ''}"></div>
          <div class="form-group"><label class="form-label">${t('businessPlan.domestic.quantity')}</label>
            <input type="number" class="form-input dom-quantity" value="${eq.quantity || 1}" min="1" oninput="BusinessPlan.recalcDomesticRow(${idx})"></div>
          <div class="form-group"><label class="form-label">${t('businessPlan.domestic.unitPrice')}</label>
            <input type="text" class="form-input dom-unitPrice" value="${eq.unitPrice || ''}" oninput="BusinessPlan.recalcDomesticRow(${idx})"></div>
          <div class="form-group"><label class="form-label">${t('businessPlan.domestic.subtotal')}</label>
            <div class="equipment-calculated dom-subtotal">${formatVND((eq.quantity || 0) * (eq.unitPrice || 0))}</div></div>
        </div>
      </div>
    `;
  }

  // ── Dynamic row management ──
  let importCount = 0;
  let domesticCount = 0;

  function addImportRow() {
    const list = document.getElementById('importEquipmentList');
    if (!list) return;
    const idx = list.children.length;
    list.insertAdjacentHTML('beforeend', renderImportRow({}, idx));
  }

  function removeImportRow(idx) {
    const row = document.getElementById(`importRow_${idx}`);
    if (row) { row.remove(); recalcType1(); }
  }

  function addDomesticRow() {
    const list = document.getElementById('domesticEquipmentList');
    if (!list) return;
    const idx = list.children.length;
    list.insertAdjacentHTML('beforeend', renderDomesticRow({}, idx));
  }

  function removeDomesticRow(idx) {
    const row = document.getElementById(`domesticRow_${idx}`);
    if (row) { row.remove(); recalcType1(); }
  }

  // ── Calculations ──
  function recalcImportRow(idx) {
    const row = document.getElementById(`importRow_${idx}`);
    if (!row) return;

    const fob = parseNumber(row.querySelector('.imp-fob')?.value);
    const accessories = parseNumber(row.querySelector('.imp-accessories')?.value);
    const shipping = parseNumber(row.querySelector('.imp-shipping')?.value);
    const rate = parseNumber(row.querySelector('.imp-rate')?.value);
    const importTax = parseNumber(row.querySelector('.imp-importTax')?.value) / 100;
    const vat = parseNumber(row.querySelector('.imp-vat')?.value) / 100;
    const currency = row.querySelector('.imp-currency')?.value;

    const cif = fob + accessories + shipping;
    const cifVnd = currency === 'VND' ? cif : cif * rate;
    const taxAmount = cifVnd * importTax;
    const vatAmount = (cifVnd + taxAmount) * vat;
    const totalLdp = cifVnd + taxAmount + vatAmount;

    row.querySelector('.imp-cifDisplay').textContent = `${cif.toLocaleString()} ${currency}`;
    row.querySelector('.imp-cifVndDisplay').textContent = formatVND(cifVnd) + ' VND';
    row.querySelector('.imp-ldpDisplay').textContent = formatVND(totalLdp) + ' VND';
    row.querySelector('.imp-totalLdp').value = totalLdp;

    recalcType1();
  }

  function recalcDomesticRow(idx) {
    const row = document.getElementById(`domesticRow_${idx}`);
    if (!row) return;
    const qty = parseNumber(row.querySelector('.dom-quantity')?.value);
    const price = parseNumber(row.querySelector('.dom-unitPrice')?.value);
    row.querySelector('.dom-subtotal').textContent = formatVND(qty * price);
    recalcType1();
  }

  function recalcType1() {
    // Total import
    let totalImport = 0;
    document.querySelectorAll('.imp-totalLdp').forEach(el => {
      totalImport += parseNumber(el.value);
    });

    // Total domestic
    let totalDomestic = 0;
    document.querySelectorAll('#domesticEquipmentList .dom-quantity').forEach((qtyEl, i) => {
      const row = qtyEl.closest('[id^="domesticRow"]');
      if (!row) return;
      const qty = parseNumber(qtyEl.value);
      const price = parseNumber(row.querySelector('.dom-unitPrice')?.value);
      totalDomestic += qty * price;
    });

    // Total services
    let totalServices = 0;
    ['transportation', 'insurance', 'inspection', 'installation', 'translation', 'bankFees', 'warranty', 'consumables', 'management', 'contingency'].forEach(k => {
      totalServices += parseNumber(document.getElementById(`svc_${k}`)?.value);
    });

    const totalCost = totalImport + totalDomestic + totalServices;

    // Update summary
    const el = (id) => document.getElementById(id);
    if (el('sum_import')) el('sum_import').textContent = formatVND(totalImport);
    if (el('sum_domestic')) el('sum_domestic').textContent = formatVND(totalDomestic);
    if (el('sum_services')) el('sum_services').textContent = formatVND(totalServices);
    if (el('sum_totalCost')) el('sum_totalCost').textContent = formatVND(totalCost);

    // Revenue & profit
    const price = parseNumber(el('bp_sellingPrice')?.value);
    const qty = parseNumber(el('bp_quantity')?.value) || 1;
    const tax = parseNumber(el('bp_tax')?.value);
    const revenue = price * qty;
    const gross = revenue - totalCost;
    const net = gross - tax;
    const margin = revenue > 0 ? ((net / revenue) * 100).toFixed(1) : 0;

    if (el('sum_revenue')) el('sum_revenue').textContent = formatVND(revenue);
    if (el('sum_gross')) {
      el('sum_gross').textContent = formatVND(gross);
      el('sum_gross').parentElement.className = `summary-row ${gross >= 0 ? 'profit' : 'loss'}`;
    }
    if (el('sum_net')) {
      el('sum_net').textContent = formatVND(net);
      el('sum_net').parentElement.className = `summary-row ${net >= 0 ? 'profit' : 'loss'}`;
    }
    if (el('sum_margin')) el('sum_margin').textContent = margin + '%';
  }

  function recalcType2() {
    const el = (id) => document.getElementById(id);
    const workers = parseNumber(el('bp_workers')?.value);
    const days = parseNumber(el('bp_workDays')?.value);
    const rate = parseNumber(el('bp_dailyRate')?.value);
    const extras = parseNumber(el('bp_extras')?.value);
    const contractVal = parseNumber(el('bp_contractValue')?.value);

    const labor = workers * days * rate;
    const totalCost = labor + extras;
    const profit = contractVal - totalCost;
    const margin = contractVal > 0 ? ((profit / contractVal) * 100).toFixed(1) : 0;

    if (el('sum2_labor')) el('sum2_labor').textContent = formatVND(labor);
    if (el('sum2_totalCost')) el('sum2_totalCost').textContent = formatVND(totalCost);
    if (el('sum2_profit')) {
      el('sum2_profit').textContent = formatVND(profit);
      el('sum2_profit').parentElement.className = `summary-row ${profit >= 0 ? 'profit' : 'loss'}`;
    }
    if (el('sum2_margin')) el('sum2_margin').textContent = margin + '%';
  }

  async function fetchRate(idx) {
    const row = document.getElementById(`importRow_${idx}`);
    if (!row) return;
    const currency = row.querySelector('.imp-currency')?.value;
    if (currency === 'VND') {
      row.querySelector('.imp-rate').value = 1;
      row.querySelector('.imp-rateDate').value = new Date().toISOString().slice(0, 10);
      recalcImportRow(idx);
      return;
    }
    Toast.show(`Đang lấy tỷ giá ${currency}/VND (Vietcombank - Bán ra)...`, 'info');
    const result = await fetchExchangeRate(currency);
    if (result) {
      row.querySelector('.imp-rate').value = result.rate;
      row.querySelector('.imp-rateDate').value = result.date;
      recalcImportRow(idx);
      Toast.show(`Tỷ giá ${currency}/VND: ${result.rate.toLocaleString('vi-VN')} (${result.source})`, 'success');
    } else {
      Toast.show(`Không lấy được tỷ giá ${currency}`, 'error');
    }
  }

  function selectType(type) {
    // Update hidden input
    const hiddenInput = document.getElementById('bp_planType');
    if (hiddenInput) hiddenInput.value = type;

    // Update card visual state
    document.querySelectorAll('.plan-type-card').forEach(card => {
      if (card.dataset.value === type) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    // Trigger field toggle
    onTypeChange();
  }

  function onTypeChange() {
    const t1 = document.getElementById('bp_type1_fields');
    const t2 = document.getElementById('bp_type2_fields');
    const type = document.getElementById('bp_planType')?.value;
    const subtypeSelect = document.getElementById('bp_subtype');

    if (type === 'type2') {
      t1?.classList.add('hidden');
      t2?.classList.remove('hidden');
      if (subtypeSelect) {
        subtypeSelect.innerHTML = `
          <option value="consulting">${I18n.t('businessPlan.subtype.consulting')}</option>
          <option value="documentation">${I18n.t('businessPlan.subtype.documentation')}</option>
          <option value="otherService">${I18n.t('businessPlan.subtype.otherService')}</option>
        `;
      }
    } else {
      t1?.classList.remove('hidden');
      t2?.classList.add('hidden');
      if (subtypeSelect) {
        subtypeSelect.innerHTML = `
          <option value="trading">${I18n.t('businessPlan.subtype.trading')}</option>
          <option value="product">${I18n.t('businessPlan.subtype.product')}</option>
          <option value="tech">${I18n.t('businessPlan.subtype.tech')}</option>
        `;
      }
    }
  }

  // ── Save plan ──
  function savePlan() {
    const el = (id) => document.getElementById(id)?.value;
    const planType = el('bp_planType');
    const name = el('bp_name');

    if (!name) {
      Toast.show(I18n.t('common.error') + ': ' + I18n.t('businessPlan.planName') + ' không được trống', 'error');
      return;
    }

    let plan = {
      name,
      planType,
      subtype: el('bp_subtype'),
      status: el('bp_status'),
      description: el('bp_description'),
    };

    if (editingId) plan.id = editingId;

    if (planType === 'type1') {
      // Collect import equipment
      plan.importEquipment = [];
      document.querySelectorAll('[id^="importRow_"]').forEach(row => {
        let supplier = row.querySelector('.imp-supplier')?.value || '';
        if (supplier === '__custom__') {
          supplier = row.querySelector('.imp-customSupplierName')?.value || '';
        }
        plan.importEquipment.push({
          name: row.querySelector('.imp-name')?.value || '',
          partNumber: row.querySelector('.imp-partNumber')?.value || '',
          supplier: supplier,
          origin: row.querySelector('.imp-origin')?.value || '',
          currency: row.querySelector('.imp-currency')?.value || 'USD',
          exchangeRate: row.querySelector('.imp-rate')?.value || '',
          exchangeDate: row.querySelector('.imp-rateDate')?.value || '',
          fob: row.querySelector('.imp-fob')?.value || '',
          accessories: row.querySelector('.imp-accessories')?.value || '',
          shipping: row.querySelector('.imp-shipping')?.value || '',
          importTax: row.querySelector('.imp-importTax')?.value || 0,
          vat: row.querySelector('.imp-vat')?.value || 10,
          totalLdp: row.querySelector('.imp-totalLdp')?.value || 0,
        });
      });
      // Collect domestic equipment
      plan.domesticEquipment = [];
      document.querySelectorAll('[id^="domesticRow_"]').forEach(row => {
        plan.domesticEquipment.push({
          name: row.querySelector('.dom-name')?.value || '',
          supplier: row.querySelector('.dom-supplier')?.value || '',
          quantity: row.querySelector('.dom-quantity')?.value || 1,
          unitPrice: row.querySelector('.dom-unitPrice')?.value || '',
        });
      });
      // Services
      plan.services = {};
      ['transportation', 'insurance', 'inspection', 'installation', 'translation', 'bankFees', 'warranty', 'consumables', 'management', 'contingency'].forEach(k => {
        plan.services[k] = document.getElementById(`svc_${k}`)?.value || '';
      });
      plan.sellingPrice = el('bp_sellingPrice');
      plan.quantity = el('bp_quantity');
      plan.tax = el('bp_tax');
      plan.startDate = el('bp_startDate');
      plan.endDate = el('bp_endDate');
      plan.notes = el('bp_notes');
    } else {
      plan.client = el('bp_client');
      plan.workDesc = el('bp_workDesc');
      plan.workers = el('bp_workers');
      plan.workDays = el('bp_workDays');
      plan.dailyRate = el('bp_dailyRate');
      plan.extras = el('bp_extras');
      plan.contractValue = el('bp_contractValue');
      plan.startDate = el('bp_startDate2');
      plan.endDate = el('bp_endDate2');
      plan.notes = el('bp_notes2');
    }

    save(plan);
    closeModal();
    Toast.show(I18n.t('common.success'), 'success');
    App.navigate('business-plan');
  }

  function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
    editingId = null;
  }

  function confirmDelete(id) {
    const plan = getById(id);
    if (confirm(I18n.t('common.confirmDelete') + `\n\n${plan?.name || ''}`)) {
      remove(id);
      Toast.show(I18n.t('common.success'), 'success');
      App.navigate('business-plan');
    }
  }

  function filterList() {
    const search = document.getElementById('bpSearch')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('bpFilterType')?.value || '';
    const statusFilter = document.getElementById('bpFilterStatus')?.value || '';
    const rows = document.querySelectorAll('#bpTable tbody tr');
    rows.forEach(tr => {
      const type = tr.dataset.type;
      const status = tr.dataset.status;
      const text = tr.textContent.toLowerCase();
      const show = (!search || text.includes(search)) &&
                   (!typeFilter || type === typeFilter) &&
                   (!statusFilter || status === statusFilter);
      tr.style.display = show ? '' : 'none';
    });
  }

  function exportExcel() {
    Export.exportBusinessPlansExcel();
  }

  function exportPDF() {
    Export.exportBusinessPlansPDF();
  }

  // ── Dashboard stats ──
  function getStats() {
    const plans = getAll();
    let totalRevenue = 0;
    plans.forEach(p => { totalRevenue += calcRevenue(p); });
    return {
      total: plans.length,
      active: plans.filter(p => p.status === 'active').length,
      totalRevenue
    };
  }

  // ── Supplier/Equipment linked dropdowns ──
  function _getEquipmentFields(row) {
    return {
      nameEl: row.querySelector('.imp-name'),
      partEl: row.querySelector('.imp-partNumber'),
    };
  }

  function _renderNameAndPartDropdowns(container, catalog, idx, selectedName, selectedPart) {
    const t = I18n.t.bind(I18n);
    // Find the name form-group and partNumber form-group
    const nameContainer = container.querySelector('.imp-name')?.closest('.form-group');
    const partContainer = container.querySelector('.imp-partNumber')?.closest('.form-group');

    if (nameContainer) {
      nameContainer.innerHTML = `<label class="form-label">${t('businessPlan.equipment.name')}</label>
        <select class="form-select imp-name" onchange="BusinessPlan.onEquipmentChange(${idx})">
          <option value="">-- ${t('businessPlan.equipment.selectEquipment')} --</option>
          ${catalog.equipment.map(e => `<option value="${e.name}" ${selectedName === e.name ? 'selected' : ''}>${e.name}</option>`).join('')}
        </select>`;
    }
    if (partContainer) {
      partContainer.innerHTML = `<label class="form-label">${t('businessPlan.equipment.partNumber')}</label>
        <select class="form-select imp-partNumber" onchange="BusinessPlan.onPartNumberChange(${idx})">
          <option value="">-- ${t('businessPlan.equipment.selectPartNumber')} --</option>
          ${catalog.equipment.map(e => `<option value="${e.partNumber}" ${selectedPart === e.partNumber ? 'selected' : ''}>${e.partNumber}</option>`).join('')}
        </select>`;
    }
  }

  function _renderNameAndPartTextInputs(container) {
    const t = I18n.t.bind(I18n);
    const nameContainer = container.querySelector('.imp-name')?.closest('.form-group');
    const partContainer = container.querySelector('.imp-partNumber')?.closest('.form-group');

    if (nameContainer) {
      nameContainer.innerHTML = `<label class="form-label">${t('businessPlan.equipment.name')}</label>
        <input type="text" class="form-input imp-name" value="">`;
    }
    if (partContainer) {
      partContainer.innerHTML = `<label class="form-label">${t('businessPlan.equipment.partNumber')}</label>
        <input type="text" class="form-input imp-partNumber" value="">`;
    }
  }

  function onSupplierChange(idx) {
    const row = document.getElementById(`importRow_${idx}`);
    if (!row) return;
    const supplierVal = row.querySelector('.imp-supplier')?.value || '';
    const customGroup = row.querySelector('.imp-customSupplier-group');
    const originInput = row.querySelector('.imp-origin');
    const currencySelect = row.querySelector('.imp-currency');

    if (supplierVal === '__custom__') {
      if (customGroup) customGroup.style.display = '';
      _renderNameAndPartTextInputs(row);
      if (originInput) originInput.value = '';
    } else if (supplierVal && IMPORT_CATALOG[supplierVal]) {
      if (customGroup) customGroup.style.display = 'none';
      const catalog = IMPORT_CATALOG[supplierVal];
      _renderNameAndPartDropdowns(row, catalog, idx, '', '');
      if (originInput) originInput.value = catalog.origin || '';
      if (currencySelect && catalog.currency) {
        currencySelect.value = catalog.currency;
      }
    } else {
      if (customGroup) customGroup.style.display = 'none';
      _renderNameAndPartTextInputs(row);
      if (originInput) originInput.value = '';
    }
  }

  function onEquipmentChange(idx) {
    const row = document.getElementById(`importRow_${idx}`);
    if (!row) return;
    const supplierVal = row.querySelector('.imp-supplier')?.value || '';
    const catalog = IMPORT_CATALOG[supplierVal];
    if (!catalog) return;

    const selectedName = row.querySelector('.imp-name')?.value || '';
    const match = catalog.equipment.find(e => e.name === selectedName);
    const partSelect = row.querySelector('.imp-partNumber');
    if (partSelect && match) {
      partSelect.value = match.partNumber;
    } else if (partSelect) {
      partSelect.value = '';
    }
  }

  function onPartNumberChange(idx) {
    const row = document.getElementById(`importRow_${idx}`);
    if (!row) return;
    const supplierVal = row.querySelector('.imp-supplier')?.value || '';
    const catalog = IMPORT_CATALOG[supplierVal];
    if (!catalog) return;

    const selectedPart = row.querySelector('.imp-partNumber')?.value || '';
    const match = catalog.equipment.find(e => e.partNumber === selectedPart);
    const nameSelect = row.querySelector('.imp-name');
    if (nameSelect && match) {
      nameSelect.value = match.name;
    } else if (nameSelect) {
      nameSelect.value = '';
    }
  }

  // ── Update catalog from Catalog module ──
  function updateCatalog(newCatalog) {
    Object.keys(newCatalog).forEach(key => {
      IMPORT_CATALOG[key] = newCatalog[key];
    });
    console.log('📦 IMPORT_CATALOG updated:', Object.keys(IMPORT_CATALOG));
  }

  return {
    renderList, openModal, closeModal, savePlan, confirmDelete, filterList,
    addImportRow, removeImportRow, addDomesticRow, removeDomesticRow,
    recalcImportRow, recalcDomesticRow, recalcType1, recalcType2,
    fetchRate, onTypeChange, selectType, exportExcel, exportPDF, getStats, getAll, formatVND, calcTotalCost, calcRevenue,
    onSupplierChange, onEquipmentChange, onPartNumberChange, updateCatalog
  };
})();
