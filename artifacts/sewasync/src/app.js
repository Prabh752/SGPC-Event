// ─── Config ──────────────────────────────────────────────────────────────────
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const API  = '/api';

// ─── Auth session ─────────────────────────────────────────────────────────────
let authToken = sessionStorage.getItem('ss_token') || null;
let authUser  = JSON.parse(sessionStorage.getItem('ss_user') || 'null');

function saveSession(token, user) {
  authToken = token;
  authUser  = user;
  sessionStorage.setItem('ss_token', token);
  sessionStorage.setItem('ss_user', JSON.stringify(user));
}
function clearSession() {
  authToken = null;
  authUser  = null;
  sessionStorage.removeItem('ss_token');
  sessionStorage.removeItem('ss_user');
}

// ─── Role-based access control ────────────────────────────────────────────────
const ROLE_PAGES = {
  sewadar:       ['dashboard', 'calendar', 'events', 'volunteers'],
  event_manager: ['dashboard', 'calendar', 'events', 'volunteers', 'budget', 'notifications'],
  super_admin:   ['dashboard', 'calendar', 'events', 'volunteers', 'budget', 'notifications', 'admin'],
};
function canAccess(page) {
  const role = authUser?.role || 'sewadar';
  return (ROLE_PAGES[role] || ROLE_PAGES.sewadar).includes(page);
}
function canEdit() {
  return authUser?.role === 'event_manager' || authUser?.role === 'super_admin';
}
function isAdmin() {
  return authUser?.role === 'super_admin';
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function inr(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);
}
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) {
    clearSession();
    showLogin();
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => 'Error');
    throw new Error(text || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
const api = {
  get:    (p)       => apiFetch(p),
  post:   (p, body) => apiFetch(p, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (p, body) => apiFetch(p, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (p)       => apiFetch(p, { method: 'DELETE' }),
};

// ─── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '✗'}</span><span>${esc(msg)}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; el.style.transition = '.3s'; setTimeout(() => el.remove(), 350); }, 3000);
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
}
window.closeModal = (e) => closeModal(e);

// ─── Router ────────────────────────────────────────────────────────────────────
const PAGES = {
  dashboard:     { title: 'Dashboard',     render: renderDashboard },
  calendar:      { title: 'Calendar',       render: renderCalendar },
  events:        { title: 'Events',         render: renderEvents },
  volunteers:    { title: 'Volunteers',     render: renderVolunteers },
  budget:        { title: 'Budget',         render: renderBudget },
  notifications: { title: 'Notifications', render: renderNotifications },
  admin:         { title: 'Admin Panel',    render: renderAdmin },
};

function navigate(page) {
  history.pushState({}, '', `${BASE}/${page}`);
  loadPage(page);
}
window.navigate = navigate;

function currentPage() {
  const path = location.pathname.replace(BASE, '').replace(/^\//, '') || 'dashboard';
  return PAGES[path] ? path : 'dashboard';
}

async function loadPage(page) {
  if (!PAGES[page]) page = 'dashboard';
  if (!canAccess(page)) {
    const main = document.getElementById('main-content');
    const roleLabels = { super_admin: 'Super Admin', event_manager: 'Event Manager', sewadar: 'Sewadar' };
    main.innerHTML = `
      <div class="empty-state" style="padding:60px 20px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:56px;height:56px;color:var(--text-light)">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        <h3 style="margin:16px 0 8px;color:var(--text-main)">Access Restricted</h3>
        <p>Your role <strong>${roleLabels[authUser?.role] || authUser?.role}</strong> does not have permission to view this page.</p>
        <button class="btn btn-primary" style="margin-top:20px" onclick="navigate('dashboard')">Back to Dashboard</button>
      </div>`;
    document.getElementById('topbar-title').textContent = 'Access Restricted';
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    return;
  }
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.getElementById('topbar-title').textContent = PAGES[page].title;
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try { await PAGES[page].render(main); }
  catch (err) { main.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Failed to load page: ${esc(err.message)}</p></div>`; }
}

// ─── Sidebar ────────────────────────────────────────────────────────────────────
window.toggleSidebar = () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
};
window.closeSidebar = () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
};

// ─── Event type helpers ─────────────────────────────────────────────────────────
const EVENT_TYPES = {
  major_gurpurab: { label: 'Gurpurab',  cls: 'ev-gurpurab', badge: 'badge-orange' },
  regular_diwan:  { label: 'Diwan',     cls: 'ev-diwan',    badge: 'badge-blue'   },
  kirtan_darbar:  { label: 'Kirtan',    cls: 'ev-kirtan',   badge: 'badge-purple' },
  amrit_sanchar:  { label: 'Amrit',     cls: 'ev-amrit',    badge: 'badge-green'  },
  community_camp: { label: 'Camp',      cls: 'ev-camp',     badge: 'badge-teal'   },
};
function evType(type) { return EVENT_TYPES[type] || { label: type, cls: '', badge: 'badge-gray' }; }

// ─── PAGE: Dashboard ────────────────────────────────────────────────────────────
async function renderDashboard(container) {
  const [summary, events, expenses] = await Promise.all([
    api.get('/dashboard/summary'),
    api.get('/events'),
    api.get('/expenses'),
  ]);

  const upcoming = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const recentExp = [...expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const totalVolunteers = summary.totalVolunteers ?? 0;
  const fulfillPct = Math.min(100, summary.sewaFulfillmentPercent ?? 0);
  const totalBudget = summary.totalEstimatedBudget ?? 0;
  const totalSpend  = summary.totalActualSpend ?? 0;

  container.innerHTML = `
  <div class="page-header-left" style="margin-bottom:20px">
    <h1>Prabandhak Dashboard</h1>
    <p>Operational overview of the Gurdwara management portal</p>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Total Events</div>
        <div class="kpi-value">${summary.totalEvents ?? 0}</div>
        <div class="kpi-sub">${summary.upcomingEvents ?? 0} upcoming</div>
      </div>
      <div class="kpi-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Active Sewadars</div>
        <div class="kpi-value">${totalVolunteers}</div>
        <div class="kpi-sub">${fulfillPct}% sewa fulfillment</div>
      </div>
      <div class="kpi-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Estimated Budget</div>
        <div class="kpi-value">${inr(totalBudget)}</div>
        <div class="kpi-sub">Total across all events</div>
      </div>
      <div class="kpi-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Actual Spend</div>
        <div class="kpi-value">${inr(totalSpend)}</div>
        <div class="kpi-sub">${inr(Math.max(0, totalBudget - totalSpend))} remaining</div>
      </div>
      <div class="kpi-icon" style="background:#f0fdf4;color:#16a34a">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:20px">
    <div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:600;font-size:14px">Overall Sewa Fulfillment</span>
        <span style="font-weight:700;color:var(--primary)">${fulfillPct}%</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${fulfillPct}%"></div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${totalVolunteers} sewadars registered across all events</div>
    </div>
  </div>

  <div class="dash-grid">
    <div class="card">
      <div class="card-header"><div class="card-title">🕐 Upcoming Events (30 days)</div></div>
      <div class="card-body">
        ${upcoming.length === 0
          ? `<div class="empty-state" style="padding:24px"><p>No upcoming events in the next 30 days</p></div>`
          : upcoming.map(ev => {
              const d = new Date(ev.date);
              const t = evType(ev.type);
              return `<div class="event-list-item">
                <div class="event-date-badge"><span>${d.getDate()}</span><span style="font-size:9px;font-weight:500">${d.toLocaleString('en-IN',{month:'short'})}</span></div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:500;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ev.title)}</div>
                  <span class="badge ${t.badge}" style="margin-top:3px">${t.label}</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted);flex-shrink:0">${inr(ev.estimatedBudget)}</div>
              </div>`;
            }).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">₹ Recent Expenses</div></div>
      <div class="card-body">
        ${recentExp.length === 0
          ? `<div class="empty-state" style="padding:24px"><p>No expenses logged yet</p></div>`
          : recentExp.map(ex => `
            <div class="expense-row">
              <div>
                <div style="font-weight:500;font-size:13.5px">${esc(ex.description)}</div>
                <div style="font-size:11.5px;color:var(--text-muted)">${fmtDate(ex.date)}</div>
              </div>
              <div style="font-weight:600;font-size:14px;flex-shrink:0">${inr(ex.amount)}</div>
            </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ─── PAGE: Calendar ─────────────────────────────────────────────────────────────
let calYear, calMonth, calSelectedDate;
async function renderCalendar(container) {
  const today = new Date();
  if (calYear === undefined) { calYear = today.getFullYear(); calMonth = today.getMonth(); }
  const events = await api.get('/events');

  // Index events by date string
  const byDate = {};
  events.forEach(ev => {
    const key = ev.date.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(ev);
  });

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const thisMonthEvents = events.filter(ev => {
    const d = new Date(ev.date.slice(0, 10));
    return d.getFullYear() === calYear && d.getMonth() === calMonth;
  }).sort((a, b) => a.date.localeCompare(b.date));

  let gridRows = '';
  let cellIdx = 0;
  for (let row = 0; row < totalCells / 7; row++) {
    gridRows += '<tr>';
    for (let col = 0; col < 7; col++) {
      const dayNum = cellIdx - firstDay + 1;
      const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
      const dateStr = isCurrentMonth
        ? `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
        : '';
      const isToday = isCurrentMonth && calYear === today.getFullYear() && calMonth === today.getMonth() && dayNum === today.getDate();
      const isSelected = dateStr && dateStr === calSelectedDate;
      const dayEvents = dateStr ? (byDate[dateStr] || []) : [];

      gridRows += `<td class="cal-cell${!isCurrentMonth ? ' other-month' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}"
        onclick="calSelectDate('${dateStr}')"
        style="${!isCurrentMonth ? 'cursor:default' : ''}">`;
      if (isCurrentMonth) {
        gridRows += `<div class="cal-day-num">${dayNum}</div>`;
        dayEvents.slice(0, 2).forEach(ev => {
          const t = evType(ev.type);
          gridRows += `<span class="cal-event-pill ${t.cls}">${esc(ev.title)}</span>`;
        });
        if (dayEvents.length > 2) gridRows += `<span style="font-size:10px;color:var(--text-muted)">+${dayEvents.length - 2} more</span>`;
      }
      gridRows += '</td>';
      cellIdx++;
    }
    gridRows += '</tr>';
  }

  const selEvents = calSelectedDate ? (byDate[calSelectedDate] || []) : [];

  container.innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Religious Calendar</h1>
      <p>${thisMonthEvents.length} event${thisMonthEvents.length !== 1 ? 's' : ''} in ${MONTHS[calMonth]} ${calYear}</p>
    </div>
    <div class="cal-nav">
      <button onclick="calToday()" style="font-size:13px;padding:6px 12px">Today</button>
      <button onclick="calPrev()">&#8249;</button>
      <span class="cal-month-label">${MONTHS[calMonth]} ${calYear}</span>
      <button onclick="calNext()">&#8250;</button>
    </div>
  </div>

  <div class="cal-legend">
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:#f97316"></div> Gurpurab</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:#2563eb"></div> Diwan</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:#7c3aed"></div> Kirtan</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:#16a34a"></div> Amrit</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:#0d9488"></div> Camp</div>
  </div>

  <div class="calendar-grid">
    <div>
      <div class="card">
        <div class="card-body" style="padding:0">
          <table class="cal-table">
            <thead><tr>${DAYS.map(d => `<th>${d}</th>`).join('')}</tr></thead>
            <tbody>${gridRows}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div>
      ${calSelectedDate
        ? `<div class="card" style="margin-bottom:16px">
            <div class="card-header">
              <div class="card-title">${new Date(calSelectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
            </div>
            <div class="card-body" style="padding:0">
              ${selEvents.length === 0
                ? `<div class="empty-state" style="padding:24px"><p>No events on this day</p></div>`
                : selEvents.map(ev => {
                    const t = evType(ev.type);
                    return `<div style="padding:14px 16px;border-bottom:1px solid var(--border)">
                      <div style="font-weight:600;margin-bottom:4px">${esc(ev.title)}</div>
                      <span class="badge ${t.badge}">${t.label}</span>
                      <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">
                        <div>${ev.volunteersNeeded} sewadars needed</div>
                        <div>Budget: ${inr(ev.estimatedBudget)}</div>
                      </div>
                    </div>`;
                  }).join('')}
            </div>
          </div>`
        : `<div class="card" style="margin-bottom:16px">
            <div class="card-body empty-state" style="padding:32px 20px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <p>Click any date to see events</p>
            </div>
          </div>`}

      <div class="card cal-side-panel">
        <div class="card-header"><div class="card-title">${MONTHS[calMonth]} Events</div></div>
        <div class="card-body" style="padding:0">
          ${thisMonthEvents.length === 0
            ? `<div class="empty-state" style="padding:24px"><p>No events this month</p></div>`
            : thisMonthEvents.map(ev => {
                const t = evType(ev.type);
                const day = new Date(ev.date.slice(0,10) + 'T00:00:00').getDate();
                return `<div class="cal-side-list-item" onclick="calSelectDate('${ev.date.slice(0,10)}')">
                  <div style="display:flex;align-items:center;gap:10px">
                    <div class="cal-day-badge">${day}</div>
                    <div>
                      <div style="font-weight:500;font-size:13px">${esc(ev.title)}</div>
                      <span class="badge ${t.badge}" style="margin-top:3px">${t.label}</span>
                    </div>
                  </div>
                </div>`;
              }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

window.calPrev = async () => {
  if (calMonth === 0) { calMonth = 11; calYear--; } else calMonth--;
  calSelectedDate = null;
  await loadPage('calendar');
};
window.calNext = async () => {
  if (calMonth === 11) { calMonth = 0; calYear++; } else calMonth++;
  calSelectedDate = null;
  await loadPage('calendar');
};
window.calToday = async () => {
  const today = new Date();
  calYear = today.getFullYear(); calMonth = today.getMonth(); calSelectedDate = null;
  await loadPage('calendar');
};
window.calSelectDate = async (dateStr) => {
  if (!dateStr) return;
  calSelectedDate = calSelectedDate === dateStr ? null : dateStr;
  await loadPage('calendar');
};

// ─── PAGE: Events ───────────────────────────────────────────────────────────────
async function renderEvents(container) {
  const events = await api.get('/events');
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  const editable = canEdit();
  container.innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Events</h1>
      <p>Manage Gurdwara events and programmes</p>
    </div>
    ${editable ? `<button class="btn btn-primary" onclick="openAddEvent()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Event
    </button>` : `<span class="badge badge-blue" style="padding:6px 12px;font-size:12px">View Only</span>`}
  </div>
  <div class="card">
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Event</th><th>Type</th><th>Date</th>
          <th>Sewadars</th><th>Budget</th>${editable ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>
          ${events.length === 0
            ? `<tr><td colspan="${editable ? 6 : 5}"><div class="empty-state" style="padding:32px"><p>No events yet.</p></div></td></tr>`
            : events.map(ev => {
                const t = evType(ev.type);
                return `<tr>
                  <td><div style="font-weight:500">${esc(ev.title)}</div>${ev.description ? `<div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${esc(ev.description.slice(0,50))}${ev.description.length > 50 ? '…' : ''}</div>` : ''}</td>
                  <td><span class="badge ${t.badge}">${t.label}</span></td>
                  <td>${fmtDate(ev.date)}</td>
                  <td>${ev.volunteersNeeded}</td>
                  <td>${inr(ev.estimatedBudget)}</td>
                  ${editable ? `<td>
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-secondary btn-sm" onclick="openEditEvent(${ev.id})">Edit</button>
                      <button class="btn btn-danger btn-sm" onclick="deleteEvent(${ev.id}, '${esc(ev.title)}')">Delete</button>
                    </div>
                  </td>` : ''}
                </tr>`;
              }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function eventFormHTML(ev = {}) {
  const types = [
    ['major_gurpurab','Gurpurab'],['regular_diwan','Regular Diwan'],
    ['kirtan_darbar','Kirtan Darbar'],['amrit_sanchar','Amrit Sanchar'],['community_camp','Community Camp']
  ];
  const dateVal = ev.date ? ev.date.slice(0, 10) : '';
  return `
  <form id="event-form">
    <div class="form-group"><label class="form-label">Event Title *</label>
      <input class="form-input" name="title" value="${esc(ev.title || '')}" placeholder="e.g. Baisakhi Celebration" required></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Type *</label>
        <select class="form-select" name="type" required>
          ${types.map(([v,l]) => `<option value="${v}"${ev.type===v?' selected':''}>${l}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label">Date *</label>
        <input class="form-input" name="date" type="date" value="${dateVal}" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Sewadars Needed *</label>
        <input class="form-input" name="volunteersNeeded" type="number" min="1" value="${ev.volunteersNeeded || ''}" required></div>
      <div class="form-group"><label class="form-label">Estimated Budget (₹) *</label>
        <input class="form-input" name="estimatedBudget" type="number" min="0" value="${ev.estimatedBudget || ''}" required></div>
    </div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea class="form-textarea" name="description" placeholder="Optional details…">${esc(ev.description || '')}</textarea></div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary">${ev.id ? 'Update Event' : 'Add Event'}</button>
    </div>
  </form>`;
}

window.openAddEvent = () => {
  openModal('Add New Event', eventFormHTML());
  document.getElementById('event-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { title: fd.get('title'), type: fd.get('type'), date: fd.get('date') + 'T00:00:00', volunteersNeeded: Number(fd.get('volunteersNeeded')), estimatedBudget: Number(fd.get('estimatedBudget')), description: fd.get('description') };
    try {
      await api.post('/events', body);
      closeModal(); toast('Event added successfully!');
      await loadPage('events');
    } catch (err) { toast(err.message, 'error'); }
  };
};

window.openEditEvent = async (id) => {
  const ev = await api.get(`/events/${id}`);
  openModal('Edit Event', eventFormHTML(ev));
  document.getElementById('event-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { title: fd.get('title'), type: fd.get('type'), date: fd.get('date') + 'T00:00:00', volunteersNeeded: Number(fd.get('volunteersNeeded')), estimatedBudget: Number(fd.get('estimatedBudget')), description: fd.get('description') };
    try {
      await api.put(`/events/${id}`, body);
      closeModal(); toast('Event updated!');
      await loadPage('events');
    } catch (err) { toast(err.message, 'error'); }
  };
};

window.deleteEvent = async (id, title) => {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    await api.delete(`/events/${id}`);
    toast('Event deleted.'); await loadPage('events');
  } catch (err) { toast(err.message, 'error'); }
};

// ─── PAGE: Volunteers ───────────────────────────────────────────────────────────
async function renderVolunteers(container) {
  const [volunteers, events, fulfillment] = await Promise.all([
    api.get('/volunteers'),
    api.get('/events'),
    api.get('/volunteers/fulfillment').catch(() => []),
  ]);

  const eventMap = {};
  events.forEach(e => { eventMap[e.id] = e.title; });

  const depts = ['Langar','Joda Ghar','Parking','Kirtan / Stage','Cleaning','Security'];

  const editable = canEdit();
  container.innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Volunteers</h1>
      <p>${volunteers.length} sewadars registered</p>
    </div>
    ${editable ? `<button class="btn btn-primary" onclick="openRegisterVolunteer(${JSON.stringify(events).replace(/"/g,'&quot;')})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Register Sewadar
    </button>` : `<span class="badge badge-blue" style="padding:6px 12px;font-size:12px">View Only</span>`}
  </div>

  ${fulfillment.length > 0 ? `
  <div class="card" style="margin-bottom:20px">
    <div class="card-header"><div class="card-title">Event Fulfillment</div></div>
    <div class="card-body">
      ${fulfillment.map(f => {
        const pct = Math.min(100, Math.round((f.registered / Math.max(1, f.needed)) * 100));
        return `<div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;font-weight:500">${esc(f.eventTitle)}</span>
            <span style="font-size:12px;color:var(--text-muted)">${f.registered}/${f.needed} (${pct}%)</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill ${pct >= 100 ? 'green' : ''}" style="width:${pct}%"></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>` : ''}

  <div class="card">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>Department</th><th>Event</th><th>Registered</th>${editable ? '<th>Action</th>' : ''}</tr></thead>
        <tbody>
          ${volunteers.length === 0
            ? `<tr><td colspan="${editable ? 6 : 5}"><div class="empty-state" style="padding:32px"><p>No sewadars registered yet.</p></div></td></tr>`
            : volunteers.map(v => `
              <tr>
                <td><div style="font-weight:500">${esc(v.name)}</div></td>
                <td>${esc(v.phone)}</td>
                <td><span class="badge badge-gray">${esc(v.department)}</span></td>
                <td>${esc(eventMap[v.eventId] || 'Unknown event')}</td>
                <td>${fmtDate(v.registeredAt)}</td>
                ${editable ? `<td><button class="btn btn-danger btn-sm" onclick="deleteVolunteer(${v.id},'${esc(v.name)}')">Remove</button></td>` : ''}
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

window.openRegisterVolunteer = (events) => {
  const depts = ['Langar','Joda Ghar','Parking','Kirtan / Stage','Cleaning','Security'];
  const html = `
  <form id="vol-form">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Full Name *</label>
        <input class="form-input" name="name" placeholder="Sewadar's name" required></div>
      <div class="form-group"><label class="form-label">Phone *</label>
        <input class="form-input" name="phone" placeholder="+91 XXXXX XXXXX" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Department *</label>
        <select class="form-select" name="department" required>
          ${depts.map(d => `<option>${d}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label">Event *</label>
        <select class="form-select" name="eventId" required>
          ${events.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('')}
        </select></div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary">Register Sewadar</button>
    </div>
  </form>`;
  openModal('Register Sewadar', html);
  document.getElementById('vol-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { name: fd.get('name'), phone: fd.get('phone'), department: fd.get('department'), eventId: Number(fd.get('eventId')) };
    try {
      await api.post('/volunteers', body);
      closeModal(); toast('Sewadar registered!'); await loadPage('volunteers');
    } catch (err) { toast(err.message, 'error'); }
  };
};

window.deleteVolunteer = async (id, name) => {
  if (!confirm(`Remove "${name}" from volunteers?`)) return;
  try { await api.delete(`/volunteers/${id}`); toast('Sewadar removed.'); await loadPage('volunteers'); }
  catch (err) { toast(err.message, 'error'); }
};

// ─── PAGE: Budget ───────────────────────────────────────────────────────────────
async function renderBudget(container) {
  const [expenses, events] = await Promise.all([api.get('/expenses'), api.get('/events')]);

  const eventMap = {};
  events.forEach(e => { eventMap[e.id] = e; });

  // Per-event budget summary
  const budgetByEvent = {};
  expenses.forEach(ex => {
    if (!budgetByEvent[ex.eventId]) budgetByEvent[ex.eventId] = 0;
    budgetByEvent[ex.eventId] += Number(ex.amount) || 0;
  });

  const totalBudget = events.reduce((s, e) => s + (Number(e.estimatedBudget) || 0), 0);
  const totalSpent  = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const editable = canEdit();
  container.innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Budget Tracker</h1>
      <p>${inr(totalSpent)} spent of ${inr(totalBudget)} total budget</p>
    </div>
    ${editable ? `<button class="btn btn-primary" onclick="openAddExpense(${JSON.stringify(events).replace(/"/g,'&quot;')})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Log Expense
    </button>` : ''}
  </div>

  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
    <div class="kpi-card">
      <div><div class="kpi-label">Total Budget</div><div class="kpi-value">${inr(totalBudget)}</div><div class="kpi-sub">Across ${events.length} events</div></div>
      <div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
    </div>
    <div class="kpi-card">
      <div><div class="kpi-label">Total Spent</div><div class="kpi-value">${inr(totalSpent)}</div><div class="kpi-sub">${expenses.length} expenses logged</div></div>
      <div class="kpi-icon" style="background:${totalSpent > totalBudget ? 'var(--danger-bg)' : 'var(--success-bg)'};color:${totalSpent > totalBudget ? 'var(--danger)' : 'var(--success)'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      </div>
    </div>
    <div class="kpi-card">
      <div><div class="kpi-label">${totalSpent > totalBudget ? 'Over Budget' : 'Remaining'}</div>
        <div class="kpi-value ${totalSpent > totalBudget ? 'budget-over' : 'budget-ok'}">${inr(Math.abs(totalBudget - totalSpent))}</div>
        <div class="kpi-sub">${Math.round((totalSpent/Math.max(1,totalBudget))*100)}% utilised</div>
      </div>
      <div class="kpi-icon" style="background:${totalSpent > totalBudget ? 'var(--danger-bg)' : '#f0fdf4'};color:${totalSpent > totalBudget ? 'var(--danger)' : 'var(--success)'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="${totalSpent > totalBudget ? '1 17 8 9 13 13 23 4' : '23 6 13.5 15.5 8.5 10.5 1 18'}"/></svg>
      </div>
    </div>
  </div>

  <div class="dash-grid">
    <div class="card">
      <div class="card-header"><div class="card-title">Expense Log</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Description</th><th>Event</th><th>Date</th><th>Amount</th><th>By</th>${editable ? '<th></th>' : ''}</tr></thead>
          <tbody>
            ${expenses.length === 0
              ? `<tr><td colspan="${editable ? 6 : 5}"><div class="empty-state" style="padding:32px"><p>No expenses logged yet.</p></div></td></tr>`
              : [...expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).map(ex => `
                <tr>
                  <td style="font-weight:500">${esc(ex.description)}</td>
                  <td>${esc(eventMap[ex.eventId]?.title || '—')}</td>
                  <td>${fmtDate(ex.date)}</td>
                  <td style="font-weight:600">${inr(ex.amount)}</td>
                  <td style="color:var(--text-muted)">${esc(ex.loggedBy)}</td>
                  ${editable ? `<td><button class="btn btn-danger btn-sm" onclick="deleteExpense(${ex.id})">×</button></td>` : ''}
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Per-Event Budget Health</div></div>
      <div class="card-body">
        ${events.length === 0
          ? `<div class="empty-state"><p>No events found</p></div>`
          : events.map(ev => {
              const spent = budgetByEvent[ev.id] || 0;
              const budget = Number(ev.estimatedBudget) || 0;
              const pct = Math.min(100, Math.round((spent / Math.max(1, budget)) * 100));
              const over = spent > budget;
              return `<div style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
                  <span style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%">${esc(ev.title)}</span>
                  <span style="font-size:12px;${over ? 'color:var(--danger);font-weight:600' : 'color:var(--text-muted)'}">${inr(spent)} / ${inr(budget)}</span>
                </div>
                <div class="progress-bar-track">
                  <div class="progress-bar-fill ${over ? 'red' : ''}" style="width:${pct}%"></div>
                </div>
                ${over ? `<div style="font-size:11px;color:var(--danger);margin-top:2px">⚠ Over by ${inr(spent-budget)}</div>` : ''}
              </div>`;
            }).join('')}
      </div>
    </div>
  </div>`;
}

window.openAddExpense = (events) => {
  const html = `
  <form id="exp-form">
    <div class="form-group"><label class="form-label">Description *</label>
      <input class="form-input" name="description" placeholder="e.g. Tent Setup & Canopy" required></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Event *</label>
        <select class="form-select" name="eventId" required>
          ${events.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label">Amount (₹) *</label>
        <input class="form-input" name="amount" type="number" min="1" placeholder="0" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date *</label>
        <input class="form-input" name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
      <div class="form-group"><label class="form-label">Logged By</label>
        <input class="form-input" name="loggedBy" placeholder="Your name"></div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary">Log Expense</button>
    </div>
  </form>`;
  openModal('Log Expense', html);
  document.getElementById('exp-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { description: fd.get('description'), eventId: Number(fd.get('eventId')), amount: Number(fd.get('amount')), date: fd.get('date') + 'T00:00:00', loggedBy: fd.get('loggedBy') || 'Admin' };
    try {
      await api.post('/expenses', body);
      closeModal(); toast('Expense logged!'); await loadPage('budget');
    } catch (err) { toast(err.message, 'error'); }
  };
};

window.deleteExpense = async (id) => {
  if (!confirm('Delete this expense?')) return;
  try { await api.delete(`/expenses/${id}`); toast('Expense deleted.'); await loadPage('budget'); }
  catch (err) { toast(err.message, 'error'); }
};

// ─── PAGE: Notifications ─────────────────────────────────────────────────────────
async function renderNotifications(container) {
  const [notifications, events] = await Promise.all([api.get('/notifications'), api.get('/events')]);

  const audiences = ['all_sangat','active_volunteers','event_specific'];
  const audienceLabel = { all_sangat: 'All Sangat', active_volunteers: 'Active Volunteers', event_specific: 'Event Specific' };

  const editable = canEdit();
  container.innerHTML = `
  <div class="page-header-left" style="margin-bottom:20px">
    <h1>Notifications</h1>
    <p>Send announcements to Sangat and volunteers</p>
  </div>

  <div class="${editable ? 'dash-grid' : ''}">
    ${editable ? `<div class="card">
      <div class="card-header"><div class="card-title">Send Notification</div></div>
      <div class="card-body">
        <form id="notif-form">
          <div class="form-group"><label class="form-label">Title *</label>
            <input class="form-input" name="title" placeholder="e.g. Baisakhi Langar Announcement" required></div>
          <div class="form-group"><label class="form-label">Message *</label>
            <textarea class="form-textarea" name="message" placeholder="Your announcement message…" required style="min-height:100px"></textarea></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Audience</label>
              <select class="form-select" name="audience" id="audience-select" onchange="toggleEventField(this.value)">
                ${audiences.map(a => `<option value="${a}">${audienceLabel[a]}</option>`).join('')}
              </select></div>
            <div class="form-group" id="event-field" style="display:none"><label class="form-label">Event</label>
              <select class="form-select" name="eventId">
                <option value="">— Select Event —</option>
                ${events.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('')}
              </select></div>
          </div>
          <div class="form-group">
            <label class="form-label">Channels</label>
            <div class="checkbox-group">
              <label class="checkbox-label"><input type="checkbox" name="channels" value="sms" checked> SMS</label>
              <label class="checkbox-label"><input type="checkbox" name="channels" value="email"> Email</label>
            </div>
          </div>
          <div class="form-actions" style="border-top:none;margin-top:0;padding-top:0">
            <button type="submit" class="btn btn-primary" style="width:100%">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Send to Sangat
            </button>
          </div>
        </form>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-header"><div class="card-title">Sent History (${notifications.length})</div></div>
      <div class="card-body" style="padding:0;max-height:500px;overflow-y:auto">
        ${notifications.length === 0
          ? `<div class="empty-state" style="padding:32px"><p>No notifications sent yet.</p></div>`
          : [...notifications].sort((a,b) => new Date(b.sentAt) - new Date(a.sentAt)).map(n => `
            <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px">
                <div style="font-weight:600;font-size:13.5px">${esc(n.title)}</div>
                <span class="badge badge-blue" style="flex-shrink:0">${audienceLabel[n.audience] || n.audience}</span>
              </div>
              <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:6px">${esc(n.message)}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${(n.channels || []).map(ch => `<span class="badge badge-gray">${ch.toUpperCase()}</span>`).join('')}
                <span style="font-size:11px;color:var(--text-light);margin-left:auto">${fmtDateTime(n.sentAt)}</span>
              </div>
            </div>`).join('')}
      </div>
    </div>
  </div>`;

  if (editable) {
    document.getElementById('notif-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const channels = fd.getAll('channels');
      const audience = fd.get('audience');
      const body = { title: fd.get('title'), message: fd.get('message'), audience, channels, sentBy: authUser?.name || 'Admin' };
      if (audience === 'event_specific' && fd.get('eventId')) body.eventId = Number(fd.get('eventId'));
      try {
        await api.post('/notifications', body);
        toast('Notification sent to Sangat!'); await loadPage('notifications');
      } catch (err) { toast(err.message, 'error'); }
    };
  }
}

window.toggleEventField = (val) => {
  const f = document.getElementById('event-field');
  if (f) f.style.display = val === 'event_specific' ? '' : 'none';
};

// ─── PAGE: Admin ─────────────────────────────────────────────────────────────────
async function renderAdmin(container) {
  const [users, logs] = await Promise.all([api.get('/users'), api.get('/activity-logs')]);

  const roleLabel = { super_admin: 'Super Admin', event_manager: 'Event Manager', sewadar: 'Sewadar' };
  const roleBadge = { super_admin: 'badge-red', event_manager: 'badge-orange', sewadar: 'badge-blue' };

  container.innerHTML = `
  <div class="page-header-left" style="margin-bottom:20px">
    <h1>Admin Panel</h1>
    <p>User management and system audit log</p>
  </div>

  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('users')">Users (${users.length})</button>
    <button class="tab-btn" onclick="switchTab('logs')">Audit Log (${logs.length})</button>
  </div>

  <div id="tab-users" class="tab-panel active">
    <div class="page-header" style="margin-bottom:16px">
      <div></div>
      <button class="btn btn-primary" onclick="openAddUser()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add User
      </button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Last Login</th><th>Action</th></tr></thead>
          <tbody>
            ${users.length === 0
              ? `<tr><td colspan="5"><div class="empty-state" style="padding:32px"><p>No users found.</p></div></td></tr>`
              : users.map(u => `
                <tr>
                  <td><div style="font-weight:500">${esc(u.name)}</div></td>
                  <td style="color:var(--text-muted)">@${esc(u.username)}</td>
                  <td><span class="badge ${roleBadge[u.role] || 'badge-gray'}">${roleLabel[u.role] || u.role}</span></td>
                  <td style="color:var(--text-muted)">${u.lastLogin ? fmtDateTime(u.lastLogin) : 'Never'}</td>
                  <td><button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id},'${esc(u.name)}')">Remove</button></td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="tab-logs" class="tab-panel">
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Action</th><th>Timestamp</th></tr></thead>
          <tbody>
            ${logs.length === 0
              ? `<tr><td colspan="3"><div class="empty-state" style="padding:32px"><p>No activity logged yet.</p></div></td></tr>`
              : [...logs].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(l => `
                <tr>
                  <td style="color:var(--text-muted);font-weight:500">#${l.userId}</td>
                  <td>${esc(l.action)}</td>
                  <td style="color:var(--text-muted)">${fmtDateTime(l.timestamp)}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

window.switchTab = (tab) => {
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', (i === 0 && tab === 'users') || (i === 1 && tab === 'logs')));
  document.getElementById('tab-users').classList.toggle('active', tab === 'users');
  document.getElementById('tab-logs').classList.toggle('active', tab === 'logs');
};

window.openAddUser = () => {
  const html = `
  <form id="user-form">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Full Name *</label>
        <input class="form-input" name="name" placeholder="e.g. Gurpreet Singh" required></div>
      <div class="form-group"><label class="form-label">Username *</label>
        <input class="form-input" name="username" placeholder="e.g. gurpreet" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Role *</label>
        <select class="form-select" name="role" required>
          <option value="sewadar">Sewadar</option>
          <option value="event_manager">Event Manager</option>
          <option value="super_admin">Super Admin</option>
        </select></div>
      <div class="form-group"><label class="form-label">Password *</label>
        <input class="form-input" name="password" type="password" placeholder="Set password" required></div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary">Add User</button>
    </div>
  </form>`;
  openModal('Add User', html);
  document.getElementById('user-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { name: fd.get('name'), username: fd.get('username'), role: fd.get('role'), password: fd.get('password') };
    try {
      await api.post('/users', body);
      closeModal(); toast('User added!'); await loadPage('admin');
    } catch (err) { toast(err.message, 'error'); }
  };
};

window.deleteUser = async (id, name) => {
  if (!confirm(`Remove user "${name}"?`)) return;
  try { await api.delete(`/users/${id}`); toast('User removed.'); await loadPage('admin'); }
  catch (err) { toast(err.message, 'error'); }
};

// ─── Login page ─────────────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('app-shell').style.display = 'none';
  let screen = document.getElementById('login-screen');
  if (!screen) {
    screen = document.createElement('div');
    screen.id = 'login-screen';
    document.body.appendChild(screen);
  }
  screen.innerHTML = `
  <div class="login-screen">
    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-icon">S</div>
        <div class="login-logo-title">SewaSync</div>
        <div class="login-logo-sub">Gurdwara Management Portal</div>
      </div>
      <div class="login-divider"></div>
      <div class="login-heading">Welcome back</div>
      <div class="login-subheading">Sign in with your assigned credentials to continue</div>

      <div id="login-error" class="login-error">Invalid User ID or password. Please try again.</div>

      <form id="login-form">
        <div class="form-group">
          <label class="form-label">User ID</label>
          <div class="login-input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <input class="form-input" id="login-username" name="username" type="text"
              placeholder="Enter your User ID" autocomplete="username" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <div class="login-input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <input class="form-input" id="login-password" name="password" type="password"
              placeholder="Enter your password" autocomplete="current-password" required>
          </div>
        </div>
        <button type="submit" class="login-btn" id="login-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
          Sign In
        </button>
      </form>

      <div class="login-footer-text">
        Waheguru Ji Ka Khalsa &nbsp;•&nbsp; Waheguru Ji Ki Fateh
      </div>
    </div>
  </div>`;

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    errEl.classList.remove('show');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;border-color:rgba(255,255,255,.4);border-top-color:#fff"></div> Signing in…';

    try {
      const data = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: document.getElementById('login-username').value.trim(),
          password: document.getElementById('login-password').value,
        }),
      });
      if (!data.ok) {
        errEl.classList.add('show');
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Sign In`;
        return;
      }
      const { token, user } = await data.json();
      saveSession(token, user);
      showApp();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.add('show');
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Sign In`;
    }
  };

  // Focus username field
  setTimeout(() => document.getElementById('login-username')?.focus(), 100);
}

function showApp() {
  const screen = document.getElementById('login-screen');
  if (screen) screen.remove();
  const shell = document.getElementById('app-shell');
  shell.style.display = 'flex';

  // Show/hide nav items based on role
  document.querySelectorAll('.nav-link').forEach(el => {
    el.style.display = canAccess(el.dataset.page) ? '' : 'none';
  });

  // Update sidebar user chip
  if (authUser) {
    const roleLabels = { super_admin: 'Super Admin', event_manager: 'Event Manager', sewadar: 'Sewadar' };
    const roleBadgeColors = { super_admin: '#dc2626', event_manager: '#ea580c', sewadar: '#2563eb' };
    const initial = (authUser.name || authUser.username || 'U')[0].toUpperCase();
    const footer = document.getElementById('sidebar-footer');
    if (footer) {
      footer.innerHTML = `
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${initial}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${esc(authUser.name || authUser.username)}</div>
            <div class="sidebar-user-role" style="color:${roleBadgeColors[authUser.role] || 'var(--text-muted)'}">${roleLabels[authUser.role] || authUser.role}</div>
          </div>
          <button class="logout-btn" onclick="doLogout()" title="Sign out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>`;
    }
  }

  loadPage(currentPage());
}

window.doLogout = async () => {
  try { await fetch(API + '/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } }); } catch (_) {}
  clearSession();
  showLogin();
};

// ─── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('popstate', () => {
  if (authToken) loadPage(currentPage());
});

document.addEventListener('DOMContentLoaded', () => {
  if (authToken) {
    showApp();
  } else {
    showLogin();
  }
});
