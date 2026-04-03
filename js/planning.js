/* ============================================
   Planning Module — Kanban + Calendar
   ============================================ */
const Planning = (() => {
  const COLLECTION = 'tasks';
  let editingId = null;
  let currentView = 'kanban'; // 'kanban' | 'calendar'
  let calendarDate = new Date();

  function getAll() { return Storage.getCollection(COLLECTION); }
  function getById(id) { return Storage.getItem(COLLECTION, id); }
  function save(item) {
    if (item.id) return Storage.updateItem(COLLECTION, item.id, item);
    return Storage.addItem(COLLECTION, item);
  }
  function remove(id) { return Storage.deleteItem(COLLECTION, id); }

  function renderList(container) {
    const t = I18n.t.bind(I18n);

    let html = `
      <div class="page-header">
        <h1 class="page-title">${t('planning.title')}</h1>
        <div class="page-actions">
          <div class="tabs" style="border:none;margin:0">
            <button class="tab ${currentView === 'kanban' ? 'active' : ''}" onclick="Planning.setView('kanban')">${t('planning.kanban')}</button>
            <button class="tab ${currentView === 'calendar' ? 'active' : ''}" onclick="Planning.setView('calendar')">${t('planning.calendar')}</button>
          </div>
          <button class="btn btn-primary" onclick="Planning.openModal()">+ ${t('planning.newTask')}</button>
        </div>
      </div>`;

    if (currentView === 'kanban') {
      html += renderKanban();
    } else {
      html += renderCalendar();
    }

    container.innerHTML = html;

    // Setup drag & drop after render
    if (currentView === 'kanban') {
      setupDragDrop();
    }
  }

  function renderKanban() {
    const t = I18n.t.bind(I18n);
    const tasks = getAll();
    const columns = {
      todo: tasks.filter(t => t.status === 'todo'),
      inProgress: tasks.filter(t => t.status === 'inProgress'),
      done: tasks.filter(t => t.status === 'done'),
    };

    let html = '<div class="kanban-board">';
    ['todo', 'inProgress', 'done'].forEach(status => {
      const col = columns[status];
      html += `
        <div class="kanban-column" data-status="${status}">
          <div class="kanban-column-header">
            <span class="kanban-column-title"><span class="dot"></span> ${t('planning.columns.' + status)}</span>
            <span class="kanban-count">${col.length}</span>
          </div>
          <div class="kanban-cards" data-status="${status}">`;

      if (col.length === 0) {
        html += `<div class="empty-state" style="padding:var(--space-xl)"><div class="empty-icon" style="font-size:1.5rem">📝</div><div class="text-xs text-muted">${t('common.noData')}</div></div>`;
      } else {
        col.forEach(task => {
          const isOverdue = task.deadline && new Date(task.deadline) < new Date() && status !== 'done';
          html += `
            <div class="kanban-card" draggable="true" data-id="${task.id}" onclick="Planning.openModal('${task.id}')">
              <div class="kanban-card-title">${task.title || ''}</div>
              ${task.description ? `<div class="kanban-card-desc">${task.description}</div>` : ''}
              <div class="kanban-card-meta">
                <span class="priority-tag ${task.priority || 'medium'}">${t('planning.priorities.' + (task.priority || 'medium'))}</span>
                ${task.deadline ? `<span class="kanban-card-deadline ${isOverdue ? 'overdue' : ''}">📅 ${task.deadline}</span>` : ''}
              </div>
              ${task.category ? `<div style="margin-top:var(--space-sm)"><span class="category-tag">${t('planning.categories.' + task.category)}</span></div>` : ''}
              ${task.assignee ? `<div class="text-xs text-muted" style="margin-top:var(--space-xs)">👤 ${task.assignee}</div>` : ''}
            </div>`;
        });
      }

      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function renderCalendar() {
    const t = I18n.t.bind(I18n);
    const tasks = getAll();
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const monthNames = I18n.getLang() === 'vi'
      ? ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = I18n.getLang() === 'vi'
      ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let html = `
      <div class="calendar-nav">
        <button class="btn btn-ghost" onclick="Planning.prevMonth()">◀</button>
        <span class="calendar-month">${monthNames[month]} ${year}</span>
        <button class="btn btn-ghost" onclick="Planning.nextMonth()">▶</button>
      </div>
      <div class="calendar-grid">`;

    // Headers
    dayNames.forEach(d => {
      html += `<div class="calendar-header-cell">${d}</div>`;
    });

    // Cells
    const prevMonthDays = new Date(year, month, 0).getDate();
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      let day, isOtherMonth = false;
      if (i < firstDay) {
        day = prevMonthDays - firstDay + i + 1;
        isOtherMonth = true;
      } else if (i >= firstDay + daysInMonth) {
        day = i - firstDay - daysInMonth + 1;
        isOtherMonth = true;
      } else {
        day = i - firstDay + 1;
      }

      const isToday = !isOtherMonth && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const dateStr = isOtherMonth ? '' : `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = isOtherMonth ? [] : tasks.filter(t => t.deadline === dateStr);

      html += `<div class="calendar-cell ${isToday ? 'today' : ''} ${isOtherMonth ? 'other-month' : ''}">
        <div class="calendar-date">${day}</div>`;
      dayTasks.slice(0, 3).forEach(task => {
        html += `<div class="calendar-event ${task.priority || 'medium'}" onclick="Planning.openModal('${task.id}')" title="${task.title}">${task.title}</div>`;
      });
      if (dayTasks.length > 3) {
        html += `<div class="text-xs text-muted">+${dayTasks.length - 3} more</div>`;
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function setupDragDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-cards');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        columns.forEach(col => col.classList.remove('drag-over'));
      });
    });

    columns.forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });
      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = col.dataset.status;
        if (taskId && newStatus) {
          Storage.updateItem(COLLECTION, taskId, { status: newStatus });
          App.navigate('planning');
        }
      });
    });
  }

  function openModal(id = null) {
    editingId = id;
    const task = id ? getById(id) : null;
    const t = I18n.t.bind(I18n);

    // Get business plans and contracts for linking
    const plans = BusinessPlan.getAll();
    const contracts = Contracts.getAll();

    let html = `<div class="modal-overlay" onclick="if(event.target===this) Planning.closeModal()">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">${id ? t('planning.editTask') : t('planning.newTask')}</h2>
          <button class="modal-close" onclick="Planning.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">${t('planning.taskTitle')} *</label>
            <input type="text" class="form-input" id="task_title" value="${task?.title || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('planning.taskDesc')}</label>
            <textarea class="form-textarea" id="task_desc" rows="2">${task?.description || ''}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('planning.category')}</label>
              <select class="form-select" id="task_category">
                <option value="business" ${task?.category === 'business' ? 'selected' : ''}>${t('planning.categories.business')}</option>
                <option value="technical" ${task?.category === 'technical' ? 'selected' : ''}>${t('planning.categories.technical')}</option>
                <option value="admin" ${task?.category === 'admin' ? 'selected' : ''}>${t('planning.categories.admin')}</option>
                <option value="other" ${task?.category === 'other' ? 'selected' : ''}>${t('planning.categories.other')}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('planning.priority')}</label>
              <select class="form-select" id="task_priority">
                <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>${t('planning.priorities.high')}</option>
                <option value="medium" ${task?.priority === 'medium' || !task?.priority ? 'selected' : ''}>${t('planning.priorities.medium')}</option>
                <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>${t('planning.priorities.low')}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('planning.deadline')}</label>
              <input type="date" class="form-input" id="task_deadline" value="${task?.deadline || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('planning.assignee')}</label>
              <input type="text" class="form-input" id="task_assignee" value="${task?.assignee || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('planning.columns.todo')}</label>
            <select class="form-select" id="task_status">
              <option value="todo" ${task?.status === 'todo' || !task?.status ? 'selected' : ''}>${t('planning.columns.todo')}</option>
              <option value="inProgress" ${task?.status === 'inProgress' ? 'selected' : ''}>${t('planning.columns.inProgress')}</option>
              <option value="done" ${task?.status === 'done' ? 'selected' : ''}>${t('planning.columns.done')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('planning.linkedTo')}</label>
            <select class="form-select" id="task_linkedTo">
              <option value="">— ${t('common.all')} —</option>
              ${plans.map(p => `<option value="plan:${p.id}" ${task?.linkedTo === 'plan:' + p.id ? 'selected' : ''}>📋 ${p.name}</option>`).join('')}
              ${contracts.map(c => `<option value="contract:${c.id}" ${task?.linkedTo === 'contract:' + c.id ? 'selected' : ''}>📄 ${c.number} — ${c.partner}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          ${id ? `<button class="btn btn-danger" onclick="Planning.confirmDelete('${id}')" style="margin-right:auto">🗑️ ${t('common.delete')}</button>` : ''}
          <button class="btn btn-secondary" onclick="Planning.closeModal()">${t('common.cancel')}</button>
          <button class="btn btn-primary" onclick="Planning.saveTask()">${t('common.save')}</button>
        </div>
      </div>
    </div>`;

    document.getElementById('modalContainer').innerHTML = html;
  }

  function saveTask() {
    const el = (id) => document.getElementById(id)?.value;
    const title = el('task_title');
    if (!title) {
      Toast.show(I18n.t('common.error'), 'error');
      return;
    }

    const task = {
      title,
      description: el('task_desc'),
      category: el('task_category'),
      priority: el('task_priority'),
      deadline: el('task_deadline'),
      assignee: el('task_assignee'),
      status: el('task_status'),
      linkedTo: el('task_linkedTo'),
    };

    if (editingId) task.id = editingId;
    save(task);
    closeModal();
    Toast.show(I18n.t('common.success'), 'success');
    App.navigate('planning');
  }

  function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
    editingId = null;
  }

  function confirmDelete(id) {
    if (confirm(I18n.t('common.confirmDelete'))) {
      remove(id);
      closeModal();
      Toast.show(I18n.t('common.success'), 'success');
      App.navigate('planning');
    }
  }

  function setView(view) {
    currentView = view;
    App.navigate('planning');
  }

  function prevMonth() {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    App.navigate('planning');
  }

  function nextMonth() {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    App.navigate('planning');
  }

  function getStats() {
    const all = getAll();
    return {
      total: all.length,
      todo: all.filter(t => t.status === 'todo').length,
      inProgress: all.filter(t => t.status === 'inProgress').length,
      done: all.filter(t => t.status === 'done').length,
      overdue: all.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length,
    };
  }

  return {
    renderList, openModal, closeModal, saveTask, confirmDelete,
    setView, prevMonth, nextMonth, getStats, getAll
  };
})();
