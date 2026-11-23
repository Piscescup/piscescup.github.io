(() => {
  'use strict';

  const root = document.querySelector('[data-lab-order]');
  if (!root) return;

  const STORAGE_KEY = 'piscescup.tools.labOrder.v1';
  const LAST_REQUESTER_KEY = 'piscescup.tools.labOrder.lastRequester';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  const dateDisplay = root.querySelector('[data-lab-date-display]');
  const weekdayEl = root.querySelector('[data-lab-weekday]');
  const todayBadge = root.querySelector('[data-lab-today-badge]');
  const dateInput = root.querySelector('[data-lab-date-input]');
  const prevBtn = root.querySelector('[data-lab-prev-day]');
  const nextBtn = root.querySelector('[data-lab-next-day]');
  const todayBtn = root.querySelector('[data-lab-today-btn]');
  const historyWrap = root.querySelector('[data-lab-date-history]');
  const historyChips = root.querySelector('[data-lab-history-chips]');
  const form = root.querySelector('[data-lab-form]');
  const formDateTag = root.querySelector('[data-lab-form-date]');
  const formError = root.querySelector('[data-lab-error]');
  const unitList = root.querySelector('[data-lab-unit-list]');
  const requesterList = root.querySelector('[data-lab-requester-list]');
  const viewButtons = [...root.querySelectorAll('[data-lab-view]')];
  const searchInput = root.querySelector('[data-lab-search]');
  const exportDayBtn = root.querySelector('[data-lab-export-day]');
  const exportAllBtn = root.querySelector('[data-lab-export-all]');
  const clearDayBtn = root.querySelector('[data-lab-clear-day]');
  const statItems = root.querySelector('[data-lab-stat-items]');
  const statQty = root.querySelector('[data-lab-stat-qty]');
  const statPeople = root.querySelector('[data-lab-stat-people]');
  const listContainer = root.querySelector('[data-lab-list]');
  const toastEl = root.querySelector('[data-lab-toast]');
  const toastText = root.querySelector('[data-lab-toast-text]');
  const toastUndo = root.querySelector('[data-lab-toast-undo]');

  const t = (key, fallback = '') => window.siteI18n?.t(key) || fallback || key;
  const lang = () => window.siteI18n?.language || document.documentElement.lang || 'zh-CN';

  function localToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function shiftDate(dateStr, deltaDays) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + deltaDays);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  function formatWeekday(dateStr) {
    if (!DATE_RE.test(dateStr)) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    try {
      return new Intl.DateTimeFormat(lang() === 'en' ? 'en-US' : 'zh-CN', { weekday: 'long' }).format(dt);
    } catch {
      return '';
    }
  }

  function formatQty(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    return String(Math.round(num * 10000) / 10000);
  }

  function makeId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const clean = {};
      for (const [date, items] of Object.entries(parsed)) {
        if (!DATE_RE.test(date) || !Array.isArray(items)) continue;
        const valid = items
          .filter((item) => item && typeof item.name === 'string' && item.name.trim())
          .map((item) => ({
            id: typeof item.id === 'string' && item.id ? item.id : makeId(),
            name: item.name.trim(),
            unit: String(item.unit || '').trim() || '瓶',
            quantity: Number(item.quantity) > 0 ? Math.round(Number(item.quantity) * 10000) / 10000 : 1,
            requester: String(item.requester || '').trim() || '-'
          }));
        if (valid.length) clean[date] = valid;
      }
      return clean;
    } catch {
      return {};
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ordersByDate));
    } catch { /* storage quota or private mode */ }
  }

  function loadLastRequester() {
    try {
      return localStorage.getItem(LAST_REQUESTER_KEY) || '';
    } catch {
      return '';
    }
  }

  function saveLastRequester(name) {
    try {
      localStorage.setItem(LAST_REQUESTER_KEY, name);
    } catch { /* optional */ }
  }

  let ordersByDate = loadStore();
  let knownToday = localToday();
  let selectedDate = knownToday;
  let viewMode = 'day'; // 'day' | 'all'
  let searchQuery = '';
  let editingTarget = null; // { date, id }
  let undoState = null; // { snapshot, timer }
  let confirmClearTimer = null;

  const requesterInput = form.elements.requester;
  if (requesterInput && !requesterInput.value) {
    const saved = loadLastRequester();
    if (saved) requesterInput.value = saved;
  }

  function showToast(message, undoSnapshot = null) {
    if (undoState?.timer) clearTimeout(undoState.timer);
    toastText.textContent = message;
    toastUndo.hidden = !undoSnapshot;
    toastEl.hidden = false;
    const timer = setTimeout(() => {
      toastEl.hidden = true;
      undoState = null;
    }, undoSnapshot ? 6000 : 3200);
    undoState = { snapshot: undoSnapshot, timer };
  }

  toastUndo.addEventListener('click', () => {
    if (!undoState?.snapshot) return;
    clearTimeout(undoState.timer);
    ordersByDate = undoState.snapshot;
    undoState = null;
    toastEl.hidden = true;
    editingTarget = null;
    saveStore();
    render();
    showToast(t('labOrder.toast.restored', '已撤销上一步操作'));
  });

  function cloneStore() {
    return JSON.parse(JSON.stringify(ordersByDate));
  }

  function recordedDatesDesc() {
    return Object.keys(ordersByDate)
      .filter((date) => (ordersByDate[date] || []).length > 0)
      .sort((a, b) => b.localeCompare(a));
  }

  function recordedDatesAsc() {
    return recordedDatesDesc().reverse();
  }

  function allRequesters() {
    const set = new Set();
    for (const items of Object.values(ordersByDate)) {
      for (const item of items) {
        if (item.requester && item.requester !== '-') set.add(item.requester);
      }
    }
    return [...set];
  }

  function matchesSearch(item) {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.unit.toLowerCase().includes(q) ||
      item.requester.toLowerCase().includes(q)
    );
  }

  function resetClearConfirm() {
    if (confirmClearTimer) {
      clearTimeout(confirmClearTimer);
      confirmClearTimer = null;
    }
    clearDayBtn.classList.remove('is-confirm');
    clearDayBtn.textContent = t('labOrder.action.clearDay', '清空当天');
  }

  function setSelectedDate(nextDate) {
    if (!DATE_RE.test(nextDate)) return;
    selectedDate = nextDate;
    editingTarget = null;
    resetClearConfirm();
    render();
  }

  function syncCalendarDay() {
    const current = localToday();
    if (current !== knownToday) {
      const wasFollowingToday = selectedDate === knownToday;
      knownToday = current;
      if (wasFollowingToday) {
        selectedDate = current;
      }
      render();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncCalendarDay();
  });
  setInterval(syncCalendarDay, 60000);

  function renderDateSection() {
    const today = localToday();
    knownToday = today;
    const isToday = selectedDate === today;

    dateDisplay.textContent = selectedDate;
    dateDisplay.setAttribute('datetime', selectedDate);
    weekdayEl.textContent = formatWeekday(selectedDate);
    todayBadge.hidden = !isToday;
    dateInput.value = selectedDate;
    todayBtn.disabled = isToday;
    formDateTag.textContent = selectedDate;

    const dates = recordedDatesDesc();
    historyWrap.hidden = dates.length === 0;
    if (dates.length) {
      historyChips.innerHTML = dates
        .map((date) => {
          const count = ordersByDate[date].length;
          const active = date === selectedDate ? ' is-active' : '';
          return `<button type="button" class="lab-date-chip${active}" data-lab-jump-date="${date}" role="listitem">${date}<span>${count}</span></button>`;
        })
        .join('');
    }
  }

  function renderUnitSuggestions() {
    if (!unitList) return;
    const units = lang() === 'en'
      ? ['bottle', 'g', 'mg', 'kg', 'mL', 'L', 'box', 'vial', 'bag', 'set', 'pcs']
      : ['瓶', 'g', 'mg', 'kg', 'mL', 'L', '盒', '支', '袋', '套', '件'];
    unitList.innerHTML = units.map((unit) => `<option value="${escapeHtml(unit)}"></option>`).join('');
  }

  function renderRequesterSuggestions() {
    const people = allRequesters();
    requesterList.innerHTML = people.map((person) => `<option value="${escapeHtml(person)}"></option>`).join('');
  }

  function renderStats(visibleItems) {
    const totalCount = visibleItems.length;
    const totalQty = visibleItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const peopleCount = new Set(visibleItems.map((item) => item.requester)).size;
    const isEn = lang() === 'en';

    statItems.innerHTML = isEn
      ? `<strong>${totalCount}</strong> ${totalCount === 1 ? 'item' : 'items'}`
      : `共 <strong>${totalCount}</strong> 项药品`;
    statQty.innerHTML = isEn
      ? `Total qty <strong>${formatQty(totalQty)}</strong>`
      : `合计数量 <strong>${formatQty(totalQty)}</strong>`;
    statPeople.innerHTML = isEn
      ? `<strong>${peopleCount}</strong> ${peopleCount === 1 ? 'requester' : 'requesters'}`
      : `涉及 <strong>${peopleCount}</strong> 位订购人`;
  }

  function renderTableRows(date, items) {
    const editLabel = escapeHtml(t('labOrder.action.edit', '编辑'));
    const delLabel = escapeHtml(t('labOrder.action.delete', '删除'));
    const saveLabel = escapeHtml(t('labOrder.action.save', '保存'));
    const cancelLabel = escapeHtml(t('labOrder.action.cancel', '取消'));
    const decLabel = escapeHtml(t('labOrder.action.decrease', '减少数量'));
    const incLabel = escapeHtml(t('labOrder.action.increase', '增加数量'));

    return items
      .map((item, idx) => {
        const isEditing = editingTarget && editingTarget.date === date && editingTarget.id === item.id;
        if (isEditing) {
          return `<tr data-row-date="${date}" data-row-id="${item.id}" data-editing="true">
            <td>${idx + 1}</td>
            <td><input class="lab-inline-input" type="text" name="name" value="${escapeHtml(item.name)}" required /></td>
            <td><input class="lab-inline-input" type="text" name="unit" list="lab-unit-presets" value="${escapeHtml(item.unit)}" required /></td>
            <td><input class="lab-inline-input" type="number" name="quantity" min="0.01" step="any" value="${escapeHtml(formatQty(item.quantity))}" required /></td>
            <td><input class="lab-inline-input" type="text" name="requester" list="lab-requester-history" value="${escapeHtml(item.requester)}" required /></td>
            <td>
              <div class="lab-row-actions">
                <button type="button" class="lab-row-btn lab-row-btn-save" data-lab-save>${saveLabel}</button>
                <button type="button" class="lab-row-btn" data-lab-cancel>${cancelLabel}</button>
              </div>
            </td>
          </tr>`;
        }
        return `<tr data-row-date="${date}" data-row-id="${item.id}">
          <td>${idx + 1}</td>
          <td class="lab-cell-name">${escapeHtml(item.name)}</td>
          <td><span class="lab-cell-unit">${escapeHtml(item.unit)}</span></td>
          <td>
            <span class="lab-qty-control">
              <button type="button" class="lab-qty-step" data-lab-step="-1" aria-label="${decLabel}">−</button>
              <span class="lab-qty-val">${escapeHtml(formatQty(item.quantity))}</span>
              <button type="button" class="lab-qty-step" data-lab-step="1" aria-label="${incLabel}">+</button>
            </span>
          </td>
          <td class="lab-cell-requester">${escapeHtml(item.requester)}</td>
          <td>
            <div class="lab-row-actions">
              <button type="button" class="lab-row-btn" data-lab-edit>${editLabel}</button>
              <button type="button" class="lab-row-btn lab-row-btn-danger" data-lab-delete>${delLabel}</button>
            </div>
          </td>
        </tr>`;
      })
      .join('');
  }

  function renderTable(date, items) {
    const colIndex = escapeHtml(t('labOrder.col.index', '序号'));
    const colName = escapeHtml(t('labOrder.field.name', '药剂名称'));
    const colUnit = escapeHtml(t('labOrder.field.unit', '单位'));
    const colQty = escapeHtml(t('labOrder.field.quantity', '数量'));
    const colReq = escapeHtml(t('labOrder.field.requester', '订购人'));
    const colAct = escapeHtml(t('labOrder.col.actions', '操作'));

    return `<div class="lab-table-wrap">
      <table class="lab-table">
        <thead>
          <tr>
            <th scope="col">${colIndex}</th>
            <th scope="col">${colName}</th>
            <th scope="col">${colUnit}</th>
            <th scope="col">${colQty}</th>
            <th scope="col">${colReq}</th>
            <th scope="col">${colAct}</th>
          </tr>
        </thead>
        <tbody>${renderTableRows(date, items)}</tbody>
      </table>
    </div>`;
  }

  function render() {
    renderDateSection();
    renderUnitSuggestions();
    renderRequesterSuggestions();

    viewButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.labView === viewMode));
    });

    const dayItems = ordersByDate[selectedDate] || [];
    const allDates = recordedDatesDesc();
    const totalAllCount = allDates.reduce((sum, d) => sum + ordersByDate[d].length, 0);

    exportDayBtn.disabled = dayItems.length === 0;
    exportAllBtn.disabled = totalAllCount === 0;
    clearDayBtn.disabled = dayItems.length === 0;

    if (viewMode === 'day') {
      const filtered = dayItems.filter(matchesSearch);
      renderStats(filtered);
      if (!dayItems.length) {
        const isEn = lang() === 'en';
        listContainer.innerHTML = `<div class="lab-empty">
          <div class="lab-empty-icon" aria-hidden="true">Rx</div>
          <h4>${escapeHtml(isEn ? `No orders recorded for ${selectedDate}` : `${selectedDate} 暂无药品订购记录`)}</h4>
          <p>${escapeHtml(t('labOrder.empty.dayHint', '请在上方表单填写药剂名称、单位、数量与订购人，添加到当日清单。'))}</p>
        </div>`;
      } else if (!filtered.length) {
        listContainer.innerHTML = `<div class="lab-empty">
          <div class="lab-empty-icon" aria-hidden="true">?</div>
          <h4>${escapeHtml(t('labOrder.empty.searchTitle', '没有匹配的记录'))}</h4>
          <p>${escapeHtml(t('labOrder.empty.searchHint', '尝试更换搜索关键词，或清空筛选框查看全部条目。'))}</p>
        </div>`;
      } else {
        listContainer.innerHTML = renderTable(selectedDate, filtered);
      }
      return;
    }

    // All dates view
    const groups = [];
    const flatVisible = [];
    for (const date of allDates) {
      const filtered = (ordersByDate[date] || []).filter(matchesSearch);
      if (!filtered.length) continue;
      groups.push({ date, items: filtered });
      flatVisible.push(...filtered);
    }
    renderStats(flatVisible);

    if (!totalAllCount) {
      listContainer.innerHTML = `<div class="lab-empty">
        <div class="lab-empty-icon" aria-hidden="true">Rx</div>
        <h4>${escapeHtml(t('labOrder.empty.allTitle', '尚未记录任何日期的药品订购'))}</h4>
        <p>${escapeHtml(t('labOrder.empty.dayHint', '请在上方表单填写药剂名称、单位、数量与订购人，添加到当日清单。'))}</p>
      </div>`;
      return;
    }
    if (!groups.length) {
      listContainer.innerHTML = `<div class="lab-empty">
        <div class="lab-empty-icon" aria-hidden="true">?</div>
        <h4>${escapeHtml(t('labOrder.empty.searchTitle', '没有匹配的记录'))}</h4>
        <p>${escapeHtml(t('labOrder.empty.searchHint', '尝试更换搜索关键词，或清空筛选框查看全部条目。'))}</p>
      </div>`;
      return;
    }

    const selectBtnLabel = escapeHtml(t('labOrder.action.selectDate', '切换到该日'));
    const exportSingleLabel = escapeHtml(t('labOrder.action.exportSingle', '导出该日 .xlsx'));
    const isEn = lang() === 'en';

    listContainer.innerHTML = groups
      .map(({ date, items }) => {
        const weekday = formatWeekday(date);
        const countText = isEn
          ? `${items.length} ${items.length === 1 ? 'item' : 'items'}`
          : `${items.length} 项`;
        return `<div class="lab-date-group">
          <div class="lab-group-header">
            <div class="lab-group-title">
              <span>${date}</span>
              <span class="lab-group-meta">${escapeHtml(weekday)} · ${escapeHtml(countText)}</span>
            </div>
            <div class="lab-group-actions">
              <button type="button" class="lab-mini-btn" data-lab-switch-date="${date}">${selectBtnLabel}</button>
              <button type="button" class="lab-mini-btn" data-lab-export-specific="${date}">${exportSingleLabel}</button>
            </div>
          </div>
          ${renderTable(date, items)}
        </div>`;
      })
      .join('');
  }

  /* ---------- Event handlers ---------- */

  prevBtn.addEventListener('click', () => setSelectedDate(shiftDate(selectedDate, -1)));
  nextBtn.addEventListener('click', () => setSelectedDate(shiftDate(selectedDate, 1)));
  todayBtn.addEventListener('click', () => setSelectedDate(localToday()));
  dateInput.addEventListener('change', () => {
    if (DATE_RE.test(dateInput.value)) setSelectedDate(dateInput.value);
  });

  historyChips.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-lab-jump-date]');
    if (!chip) return;
    viewMode = 'day';
    setSelectedDate(chip.dataset.labJumpDate);
  });

  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.labView;
      editingTarget = null;
      render();
    });
  });

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    render();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameEl = form.elements.name;
    const unitEl = form.elements.unit;
    const qtyEl = form.elements.quantity;
    const reqEl = form.elements.requester;

    [nameEl, unitEl, qtyEl, reqEl].forEach((el) => el.classList.remove('is-invalid'));
    formError.hidden = true;

    const name = nameEl.value.trim();
    const unit = unitEl.value.trim();
    const quantity = Number(qtyEl.value);
    const requester = reqEl.value.trim();

    let firstInvalid = null;
    if (!name) { nameEl.classList.add('is-invalid'); firstInvalid = firstInvalid || nameEl; }
    if (!unit) { unitEl.classList.add('is-invalid'); firstInvalid = firstInvalid || unitEl; }
    if (!Number.isFinite(quantity) || quantity <= 0) { qtyEl.classList.add('is-invalid'); firstInvalid = firstInvalid || qtyEl; }
    if (!requester) { reqEl.classList.add('is-invalid'); firstInvalid = firstInvalid || reqEl; }

    if (firstInvalid) {
      formError.textContent = t('labOrder.error.required', '请完整填写药剂名称、单位、大于 0 的数量以及订购人。');
      formError.hidden = false;
      firstInvalid.focus();
      return;
    }

    if (!ordersByDate[selectedDate]) ordersByDate[selectedDate] = [];
    ordersByDate[selectedDate].push({
      id: makeId(),
      name,
      unit,
      quantity: Math.round(quantity * 10000) / 10000,
      requester
    });
    saveStore();
    saveLastRequester(requester);
    resetClearConfirm();

    nameEl.value = '';
    qtyEl.value = '1';
    nameEl.focus();

    render();
    const isEn = lang() === 'en';
    showToast(isEn ? `Added "${name}" to ${selectedDate}` : `已将「${name}」加入 ${selectedDate} 清单`);
  });

  function commitInlineEdit(row) {
    const date = row.dataset.rowDate;
    const id = row.dataset.rowId;
    const name = row.querySelector('input[name="name"]').value.trim();
    const unit = row.querySelector('input[name="unit"]').value.trim();
    const quantity = Number(row.querySelector('input[name="quantity"]').value);
    const requester = row.querySelector('input[name="requester"]').value.trim();

    if (!name || !unit || !Number.isFinite(quantity) || quantity <= 0 || !requester) {
      showToast(t('labOrder.error.required', '请完整填写药剂名称、单位、大于 0 的数量以及订购人。'));
      return;
    }
    const items = ordersByDate[date] || [];
    const target = items.find((item) => item.id === id);
    if (target) {
      target.name = name;
      target.unit = unit;
      target.quantity = Math.round(quantity * 10000) / 10000;
      target.requester = requester;
      saveStore();
      saveLastRequester(requester);
    }
    editingTarget = null;
    render();
  }

  listContainer.addEventListener('click', (event) => {
    const switchBtn = event.target.closest('[data-lab-switch-date]');
    if (switchBtn) {
      viewMode = 'day';
      setSelectedDate(switchBtn.dataset.labSwitchDate);
      return;
    }
    const exportSpecificBtn = event.target.closest('[data-lab-export-specific]');
    if (exportSpecificBtn) {
      exportSingleDate(exportSpecificBtn.dataset.labExportSpecific);
      return;
    }

    const row = event.target.closest('tr[data-row-id]');
    if (!row) return;
    const date = row.dataset.rowDate;
    const id = row.dataset.rowId;
    const items = ordersByDate[date] || [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;

    if (event.target.closest('[data-lab-edit]')) {
      editingTarget = { date, id };
      render();
      const input = listContainer.querySelector(`tr[data-row-id="${id}"] input[name="name"]`);
      input?.focus();
      input?.select();
      return;
    }

    if (event.target.closest('[data-lab-cancel]')) {
      editingTarget = null;
      render();
      return;
    }

    if (event.target.closest('[data-lab-save]')) {
      commitInlineEdit(row);
      return;
    }

    const stepBtn = event.target.closest('[data-lab-step]');
    if (stepBtn) {
      const delta = Number(stepBtn.dataset.labStep);
      const next = Math.round((items[index].quantity + delta) * 10000) / 10000;
      if (next <= 0) return;
      items[index].quantity = next;
      saveStore();
      render();
      return;
    }

    if (event.target.closest('[data-lab-delete]')) {
      const snapshot = cloneStore();
      const removed = items[index];
      items.splice(index, 1);
      if (!items.length) delete ordersByDate[date];
      if (editingTarget?.id === id) editingTarget = null;
      saveStore();
      render();
      const isEn = lang() === 'en';
      showToast(
        isEn ? `Removed "${removed.name}"` : `已删除「${removed.name}」`,
        snapshot
      );
    }
  });

  listContainer.addEventListener('keydown', (event) => {
    const row = event.target.closest('tr[data-editing="true"]');
    if (!row) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      commitInlineEdit(row);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      editingTarget = null;
      render();
    }
  });

  clearDayBtn.addEventListener('click', () => {
    const items = ordersByDate[selectedDate] || [];
    if (!items.length) return;
    if (!clearDayBtn.classList.contains('is-confirm')) {
      clearDayBtn.classList.add('is-confirm');
      clearDayBtn.textContent = t('labOrder.action.confirmClear', '再次点击确认清空');
      confirmClearTimer = setTimeout(resetClearConfirm, 4000);
      return;
    }
    resetClearConfirm();
    const snapshot = cloneStore();
    const count = items.length;
    delete ordersByDate[selectedDate];
    editingTarget = null;
    saveStore();
    render();
    const isEn = lang() === 'en';
    showToast(
      isEn ? `Cleared ${count} items from ${selectedDate}` : `已清空 ${selectedDate} 的 ${count} 项记录`,
      snapshot
    );
  });

  /* ---------- Excel (.xlsx) Export ---------- */

  function buildDailySheet(date, items) {
    const isEn = lang() === 'en';
    const totalQty = Math.round(items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) * 10000) / 10000;
    const startRow = 3; // Row 1: Title, Row 2: Column headers
    const endRow = startRow + items.length - 1;

    return {
      name: date,
      title: isEn ? `Lab Reagent Order (${date})` : `实验室药品订购单（${date}）`,
      columns: [
        { header: isEn ? 'No.' : '序号', align: 'center', minWidth: 8 },
        { header: isEn ? 'Reagent Name' : '药剂名称', align: 'left', minWidth: 26, maxWidth: 48 },
        { header: isEn ? 'Unit' : '单位', align: 'center', minWidth: 10 },
        { header: isEn ? 'Quantity' : '数量', align: 'right', minWidth: 12 },
        { header: isEn ? 'Requester' : '订购人', align: 'center', minWidth: 16 }
      ],
      rows: [
        ...items.map((item, idx) => [idx + 1, item.name, item.unit, item.quantity, item.requester]),
        {
          summary: true,
          cells: [
            isEn ? 'Total' : '合计',
            isEn ? `${items.length} items` : `共 ${items.length} 项`,
            '',
            { formula: `SUM(D${startRow}:D${endRow})`, value: totalQty },
            ''
          ]
        }
      ]
    };
  }

  function exportSingleDate(date) {
    const items = ordersByDate[date] || [];
    if (!items.length || !window.siteXlsx) return;
    const isEn = lang() === 'en';
    const filename = isEn ? `Lab_Reagent_Order_${date}.xlsx` : `实验室药品订购_${date}.xlsx`;
    window.siteXlsx.downloadXlsx(filename, [buildDailySheet(date, items)]);
    showToast(isEn ? `Exported ${filename}` : `已导出 ${filename}`);
  }

  function exportAllDates() {
    const dates = recordedDatesAsc();
    if (!dates.length || !window.siteXlsx) return;
    const isEn = lang() === 'en';
    const allRows = [];
    let totalQty = 0;
    let index = 1;
    for (const date of dates) {
      for (const item of ordersByDate[date]) {
        allRows.push([date, index++, item.name, item.unit, item.quantity, item.requester]);
        totalQty += Number(item.quantity || 0);
      }
    }
    totalQty = Math.round(totalQty * 10000) / 10000;
    const startRow = 3;
    const endRow = startRow + allRows.length - 1;

    const summarySheet = {
      name: isEn ? 'All Orders' : '全部汇总',
      title: isEn
        ? `Lab Reagent Orders Summary (${dates[0]} to ${dates[dates.length - 1]})`
        : `实验室药品订购汇总（${dates[0]} 至 ${dates[dates.length - 1]}）`,
      columns: [
        { header: isEn ? 'Order Date' : '订购日期', align: 'center', minWidth: 14 },
        { header: isEn ? 'No.' : '序号', align: 'center', minWidth: 8 },
        { header: isEn ? 'Reagent Name' : '药剂名称', align: 'left', minWidth: 26, maxWidth: 48 },
        { header: isEn ? 'Unit' : '单位', align: 'center', minWidth: 10 },
        { header: isEn ? 'Quantity' : '数量', align: 'right', minWidth: 12 },
        { header: isEn ? 'Requester' : '订购人', align: 'center', minWidth: 16 }
      ],
      rows: [
        ...allRows,
        {
          summary: true,
          cells: [
            isEn ? 'Total' : '合计',
            '',
            isEn ? `${allRows.length} items · ${dates.length} days` : `共 ${allRows.length} 项 · ${dates.length} 天`,
            '',
            { formula: `SUM(E${startRow}:E${endRow})`, value: totalQty },
            ''
          ]
        }
      ]
    };

    const dailySheets = dates.slice(-30).map((date) => buildDailySheet(date, ordersByDate[date]));
    const today = localToday();
    const filename = isEn
      ? `Lab_Reagent_Orders_All_${today}.xlsx`
      : `实验室药品订购_全部汇总_${today}.xlsx`;
    window.siteXlsx.downloadXlsx(filename, [summarySheet, ...dailySheets]);
    showToast(isEn ? `Exported ${filename}` : `已导出 ${filename}`);
  }

  exportDayBtn.addEventListener('click', () => exportSingleDate(selectedDate));
  exportAllBtn.addEventListener('click', exportAllDates);

  document.addEventListener('languagechange', () => {
    resetClearConfirm();
    render();
  });

  render();
})();
