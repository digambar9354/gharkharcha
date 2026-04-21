/* ── GharKharcha App JS — Connected to AWS DynamoDB ── */

// ── Config ──
const API = 'https://15c3jq5fc2.execute-api.ap-south-1.amazonaws.com';
const FAMILY_ID = 'vibhute-family';

// ── State ──
const STATE = {
  user: null,
  expenses: [],
  currentView: 'dashboard',
  currentFilter: 'all',
  currentCatFilter: 'all',
  charts: {},
};

const FAMILY_MEMBERS = [
  { name: 'Rahul',  initials: 'RP', email: 'rahul@gmail.com',  role: 'Admin',     color: '#dbeafe', text: '#1d4ed8' },
  { name: 'Sunita', initials: 'SP', email: 'sunita@gmail.com', role: 'Member',    color: '#dcfce7', text: '#166534' },
  { name: 'Aai',    initials: 'AP', email: 'aai@gmail.com',    role: 'Member',    color: '#fef9c3', text: '#854d0e' },
  { name: 'Tanvi',  initials: 'TP', email: 'tanvi@gmail.com',  role: 'View only', color: '#fce7f3', text: '#9d174d' },
];

const CAT_ICONS = {
  Groceries: '🛒', Utilities: '⚡', Transport: '🚗',
  Entertainment: '🎬', Medical: '💊', Other: '📋',
};
const CAT_COLORS = {
  Groceries: '#3b82f6', Utilities: '#10b981', Transport: '#f59e0b',
  Entertainment: '#ec4899', Medical: '#8b5cf6', Other: '#6b7280',
};

// ── API Calls ──
async function apiSaveExpense(expense) {
  const res = await fetch(`${API}/expense`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...expense, familyId: FAMILY_ID }),
  });
  if (!res.ok) throw new Error('Failed to save expense');
  return res.json();
}

async function apiGetExpenses(month) {
  const params = new URLSearchParams({ familyId: FAMILY_ID });
  if (month) params.append('month', month);
  const res = await fetch(`${API}/expenses?${params}`);
  if (!res.ok) throw new Error('Failed to fetch expenses');
  const data = await res.json();
  return data.expenses || [];
}

async function apiDeleteExpense(expenseId) {
  const res = await fetch(`${API}/expense`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId: FAMILY_ID, expenseId }),
  });
  if (!res.ok) throw new Error('Failed to delete expense');
  return res.json();
}

async function apiUpdateExpense(expense) {
  const res = await fetch(`${API}/expense`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...expense, familyId: FAMILY_ID }),
  });
  if (!res.ok) throw new Error('Failed to update expense');
  return res.json();
}

// ── Auth ──
function handleLogin(response) {
  const payload = parseJwt(response.credential);
  STATE.user = {
    name: payload.name,
    email: payload.email,
    picture: payload.picture,
    initials: payload.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  };
  localStorage.setItem('gk_user', JSON.stringify(STATE.user));
  showApp();
}

function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

function logout() {
  if (!confirm('Sign out of GharKharcha?')) return;
  STATE.user = null;
  STATE.expenses = [];
  localStorage.removeItem('gk_user');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  const u = STATE.user;
  document.getElementById('user-name').textContent = u.name;
  document.getElementById('user-email').textContent = u.email;

  const av = document.getElementById('user-avatar');
  const mav = document.getElementById('mobile-avatar');
  if (u.picture) {
    av.innerHTML = `<img src="${u.picture}" alt="${u.name}" referrerpolicy="no-referrer" />`;
    mav.innerHTML = `<img src="${u.picture}" alt="${u.name}" referrerpolicy="no-referrer" />`;
  } else {
    av.textContent = u.initials;
    mav.textContent = u.initials;
  }

  navigate('dashboard');
}

// ── Navigation ──
function navigate(view) {
  STATE.currentView = view;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) viewEl.classList.add('active');

  const navEl = document.querySelector(`[data-view="${view}"]`);
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', expenses: 'All Expenses',
    add: 'Add Expense', scan: 'Scan Receipt',
    members: 'Family Members', reports: 'Reports',
  };
  document.getElementById('topbar-title').textContent = titles[view] || view;

  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('show');

  if (view === 'add') document.getElementById('f-date').value = todayStr();

  if (view === 'dashboard') loadAndRenderDashboard();
  if (view === 'expenses') loadAndRenderExpenses();
  if (view === 'members') renderMembers();
  if (view === 'reports') loadAndRenderReports();

  window.scrollTo(0, 0);
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  sb.classList.toggle('open');
  overlay?.classList.toggle('show');
}

// ── Dashboard ──
async function loadAndRenderDashboard() {
  const month = document.getElementById('month-picker').value;
  showLoading('dash-expense-list');
  try {
    const expenses = await apiGetExpenses(month);
    STATE.expenses = expenses;
    renderDashboard(expenses);
  } catch (err) {
    console.error(err);
    toast('Could not connect to cloud — check your internet');
    renderDashboard([]);
  }
}

function renderDashboard(expenses) {
  const total      = expenses.reduce((s,e) => s + Number(e.amount), 0);
  const groceries  = expenses.filter(e => e.category==='Groceries').reduce((s,e) => s + Number(e.amount), 0);
  const utilities  = expenses.filter(e => e.category==='Utilities').reduce((s,e) => s + Number(e.amount), 0);
  const shared     = expenses.filter(e => e.shared);

  document.getElementById('m-total').textContent      = '₹' + total.toLocaleString('en-IN');
  document.getElementById('m-groceries').textContent  = '₹' + groceries.toLocaleString('en-IN');
  document.getElementById('m-utilities').textContent  = '₹' + utilities.toLocaleString('en-IN');
  document.getElementById('m-shared').textContent     = '₹' + shared.reduce((s,e) => s+Number(e.amount),0).toLocaleString('en-IN');
  document.getElementById('m-shared-count').textContent = `${shared.length} transactions`;
  document.getElementById('m-trend').textContent      = expenses.length > 0 ? `${expenses.length} transactions` : '— no data yet';

  renderMembersStrip(expenses);
  renderPieChart(expenses);
  renderBarChart(expenses, document.getElementById('month-picker').value);
  renderExpenseList(expenses, 'dash-expense-list', STATE.currentFilter);
}

function monthChanged() {
  if (STATE.currentView === 'dashboard') loadAndRenderDashboard();
}

function renderMembersStrip(expenses) {
  document.getElementById('members-strip').innerHTML = FAMILY_MEMBERS.map(m => {
    const spent = expenses.filter(e => e.paidBy===m.name).reduce((s,e) => s+Number(e.amount), 0);
    return `<div class="member-chip">
      <div class="chip-avatar" style="background:${m.color};color:${m.text}">${m.initials}</div>
      <div>
        <div class="chip-name">${m.name}</div>
        <div class="chip-amount">₹${spent.toLocaleString('en-IN')}</div>
      </div>
    </div>`;
  }).join('');
}

function renderExpenseList(expenses, containerId, filter) {
  const el = document.getElementById(containerId);
  let filtered = [...expenses];
  if (filter === 'shared')   filtered = expenses.filter(e => e.shared);
  if (filter === 'personal') filtered = expenses.filter(e => !e.shared);

  if (filtered.length === 0) {
    el.innerHTML = '<div class="empty-state">No expenses found. Add your first one!</div>';
    return;
  }

  el.innerHTML = filtered.slice(0,15).map(e => `
    <div class="expense-row">
      <div class="expense-icon-wrap">${CAT_ICONS[e.category] || '📋'}</div>
      <div>
        <div class="exp-name">${e.desc}</div>
        <div class="exp-meta">${e.paidBy} · ${e.category}</div>
      </div>
      <span class="exp-badge ${e.shared ? 'badge-shared':'badge-personal'}">${e.shared?'Shared':'Personal'}</span>
      <div class="exp-date">${formatDate(e.date)}</div>
      <div class="exp-amount">₹${Number(e.amount).toLocaleString('en-IN')}</div>
    </div>
  `).join('');
}

function filterExpenses(filter, btn) {
  STATE.currentFilter = filter;
  document.getElementById('dash-filters').querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderExpenseList(STATE.expenses, 'dash-expense-list', filter);
}

// ── All Expenses ──
async function loadAndRenderExpenses() {
  showLoading('all-expense-list');
  try {
    STATE.expenses = await apiGetExpenses();
    renderAllExpenses();
  } catch (err) {
    toast('Could not load expenses');
  }
}

function renderAllExpenses() {
  let expenses = [...STATE.expenses];
  if (STATE.currentCatFilter !== 'all') expenses = expenses.filter(e => e.category===STATE.currentCatFilter);
  renderExpenseList(expenses, 'all-expense-list', 'all');
}

function filterCat(cat, btn) {
  STATE.currentCatFilter = cat;
  document.querySelectorAll('#view-expenses .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderAllExpenses();
}

// ── Save Expense ──
async function saveExpense() {
  const desc     = document.getElementById('f-desc').value.trim();
  const amount   = parseFloat(document.getElementById('f-amount').value);
  const date     = document.getElementById('f-date').value;
  const category = document.getElementById('f-category').value;
  const paidBy   = document.getElementById('f-paidby').value;
  const shared   = document.getElementById('f-shared').value;
  const notes    = document.getElementById('f-notes').value.trim();

  if (!desc)              { toast('Please enter a description'); return; }
  if (!amount || amount <= 0) { toast('Please enter a valid amount'); return; }
  if (!date)              { toast('Please pick a date'); return; }

  const btn = document.querySelector('#view-add .btn-primary');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    await apiSaveExpense({
      desc, amount, date, category, paidBy,
      shared: shared !== 'none' ? shared : null,
      notes, receiptUrl: null,
      createdBy: STATE.user?.email || 'unknown',
    });
    resetForm();
    document.getElementById('save-status').textContent = '✓ Saved to cloud!';
    setTimeout(() => document.getElementById('save-status').textContent = '', 3000);
    toast(`₹${amount.toLocaleString('en-IN')} saved to cloud ☁️`);
    setTimeout(() => navigate('dashboard'), 800);
  } catch (err) {
    toast('Error saving — check your connection');
  } finally {
    btn.textContent = 'Save expense';
    btn.disabled = false;
  }
}

async function saveScanExpense() {
  const desc     = document.getElementById('s-desc').value.trim() || 'Scanned receipt';
  const amount   = parseFloat(document.getElementById('s-amount').value);
  const date     = document.getElementById('s-date').value || todayStr();
  const category = document.getElementById('s-category').value;

  if (!amount || amount <= 0) { toast('Please verify the amount'); return; }

  try {
    await apiSaveExpense({
      desc, amount, date, category,
      paidBy: STATE.user?.name?.split(' ')[0] || 'Me',
      shared: null, notes: 'Scanned receipt', receiptUrl: null,
      createdBy: STATE.user?.email || 'unknown',
    });
    toast(`₹${amount.toLocaleString('en-IN')} saved to cloud ☁️`);
    resetScan();
    setTimeout(() => navigate('dashboard'), 800);
  } catch (err) {
    toast('Error saving — check your connection');
  }
}

async function deleteExpense(expenseId) {
  if (!confirm('Delete this expense?')) return;
  try {
    await apiDeleteExpense(expenseId);
    STATE.expenses = STATE.expenses.filter(e => (e.expenseId||e.id) !== expenseId);
    renderDashboard(STATE.expenses);
    renderAllExpenses();
    toast('Expense deleted');
  } catch (err) {
    toast('Error deleting');
  }
}

function resetForm() {
  ['f-desc','f-amount','f-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-date').value = todayStr();
  document.getElementById('f-category').value = 'Groceries';
  document.getElementById('f-shared').value = 'none';
}

// ── Scan / OCR ──
function triggerFileInput() { document.getElementById('receipt-file').click(); }

function handleReceiptFile(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('receipt-preview').src = e.target.result;
    document.getElementById('ocr-preview').classList.remove('hidden');
  };
  reader.readAsDataURL(file);

  const textEl = document.getElementById('ocr-text');
  document.getElementById('ocr-result').classList.remove('hidden');
  textEl.textContent = 'Reading receipt with OCR...';

  // Phase 2: replace with real Google Cloud Vision API call
  setTimeout(() => {
    const mockAmount = Math.floor(Math.random() * 3000) + 200;
    textEl.textContent = `Detected: ₹${mockAmount.toLocaleString('en-IN')} · ${formatDate(todayStr())}`;
    document.getElementById('s-amount').value = mockAmount;
    document.getElementById('s-date').value = todayStr();
    ['scan-form-fields','scan-amount-row','scan-cat-row','scan-actions'].forEach(id => {
      document.getElementById(id).classList.remove('hidden');
    });
  }, 1800);
}

function resetScan() {
  document.getElementById('receipt-file').value = '';
  document.getElementById('ocr-result').classList.add('hidden');
  document.getElementById('ocr-preview').classList.add('hidden');
  ['scan-form-fields','scan-amount-row','scan-cat-row','scan-actions'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  ['s-desc','s-amount'].forEach(id => document.getElementById(id).value = '');
}

// ── Charts ──
function renderPieChart(expenses) {
  const cats = ['Groceries','Utilities','Transport','Entertainment','Medical','Other'];
  const data = cats.map(c => expenses.filter(e => e.category===c).reduce((s,e) => s+Number(e.amount), 0));
  const hasData = data.some(d => d > 0);
  const total = data.reduce((s,v) => s+v, 0);

  document.getElementById('pie-legend').innerHTML = cats.filter((_,i) => data[i]>0).map(c => {
    const pct = total > 0 ? Math.round(data[cats.indexOf(c)]/total*100) : 0;
    return `<span class="legend-item"><span class="legend-dot" style="background:${CAT_COLORS[c]}"></span>${c} ${pct}%</span>`;
  }).join('');

  destroyChart('pieChart');
  STATE.charts.pie = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: { labels: cats, datasets: [{ data: hasData?data:[1], backgroundColor: hasData?cats.map(c=>CAT_COLORS[c]):['#e2e8f0'], borderWidth:3, borderColor:'#fff' }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{callbacks:{label: ctx=>` ₹${Number(ctx.raw).toLocaleString('en-IN')}`}}} },
  });
}

function renderBarChart(expenses) {
  const weeks = [0,0,0,0,0];
  expenses.forEach(e => {
    const w = Math.min(Math.floor((new Date(e.date).getDate()-1)/7), 4);
    weeks[w] += Number(e.amount);
  });
  destroyChart('barChart');
  STATE.charts.bar = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: { labels:['Week 1','Week 2','Week 3','Week 4','Week 5'], datasets:[{ data:weeks, backgroundColor:'#2563eb', borderRadius:6, borderSkipped:false }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label: ctx=>` ₹${Number(ctx.raw).toLocaleString('en-IN')}`}}}, scales:{ y:{ticks:{callback:v=>'₹'+(v/1000).toFixed(0)+'k',font:{size:11}},grid:{color:'rgba(0,0,0,.04)'}}, x:{ticks:{font:{size:11}},grid:{display:false}} } },
  });
}

// ── Members ──
function renderMembers() {
  document.getElementById('members-grid').innerHTML = FAMILY_MEMBERS.map(m => {
    const spent = STATE.expenses.filter(e=>e.paidBy===m.name).reduce((s,e)=>s+Number(e.amount),0);
    const count = STATE.expenses.filter(e=>e.paidBy===m.name).length;
    return `<div class="member-card">
      <div class="member-card-header">
        <div class="member-big-avatar" style="background:${m.color};color:${m.text}">${m.initials}</div>
        <div>
          <div class="member-card-name">${m.name}</div>
          <div class="member-card-email">${m.email}</div>
          <span class="member-card-role">${m.role}</span>
        </div>
      </div>
      <div class="member-card-stats">Spent: <strong>₹${spent.toLocaleString('en-IN')}</strong> · ${count} expenses</div>
    </div>`;
  }).join('');
}

function inviteMember() {
  const email = document.getElementById('invite-email').value.trim();
  const role  = document.getElementById('invite-role').value;
  if (!email || !email.includes('@')) { toast('Please enter a valid email'); return; }
  document.getElementById('invite-status').textContent = `✓ Invite sent to ${email} (${role})`;
  document.getElementById('invite-email').value = '';
  setTimeout(() => document.getElementById('invite-status').textContent = '', 4000);
  toast(`Invited ${email}`);
}

// ── Reports ──
async function loadAndRenderReports() {
  try {
    const expenses = await apiGetExpenses();
    STATE.expenses = expenses;
    renderMonthlyChart(expenses);
    renderCatChart(expenses);
    renderMemberChart(expenses);
  } catch (err) {
    renderMonthlyChart([]);
    renderCatChart([]);
    renderMemberChart([]);
  }
}

function renderMonthlyChart(all) {
  const months = ['Jan','Feb','Mar','Apr'];
  const data = months.map((_,i) => (all||[]).filter(e=>e.date?.startsWith(`2026-0${i+1}`)).reduce((s,e)=>s+Number(e.amount),0));
  destroyChart('monthlyChart');
  STATE.charts.monthly = new Chart(document.getElementById('monthlyChart'), {
    type:'bar', data:{ labels:months, datasets:[{data, backgroundColor:'#1d4ed8', borderRadius:6, borderSkipped:false}] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ₹${Number(ctx.raw).toLocaleString('en-IN')}`}}}, scales:{y:{ticks:{callback:v=>'₹'+(v/1000).toFixed(0)+'k',font:{size:11}},grid:{color:'rgba(0,0,0,.04)'}},x:{ticks:{font:{size:11}},grid:{display:false}}} },
  });
}

function renderCatChart(all) {
  const cats = ['Groceries','Utilities','Transport','Entertainment','Medical','Other'];
  const data = cats.map(c=>(all||[]).filter(e=>e.category===c).reduce((s,e)=>s+Number(e.amount),0));
  destroyChart('catChart');
  STATE.charts.cat = new Chart(document.getElementById('catChart'), {
    type:'bar', data:{ labels:cats, datasets:[{data, backgroundColor:cats.map(c=>CAT_COLORS[c]), borderRadius:5, borderSkipped:false}] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ₹${Number(ctx.raw).toLocaleString('en-IN')}`}}}, scales:{x:{ticks:{callback:v=>'₹'+(v/1000).toFixed(0)+'k',font:{size:11}},grid:{color:'rgba(0,0,0,.04)'}},y:{ticks:{font:{size:11}},grid:{display:false}}} },
  });
}

function renderMemberChart(all) {
  const names = FAMILY_MEMBERS.map(m=>m.name);
  const data  = names.map(n=>(all||[]).filter(e=>e.paidBy===n).reduce((s,e)=>s+Number(e.amount),0));
  destroyChart('memberChart');
  STATE.charts.member = new Chart(document.getElementById('memberChart'), {
    type:'doughnut', data:{ labels:names, datasets:[{data, backgroundColor:FAMILY_MEMBERS.map(m=>m.text), borderWidth:3, borderColor:'#fff'}] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:12}},tooltip:{callbacks:{label:ctx=>` ₹${Number(ctx.raw).toLocaleString('en-IN')}`}}} },
  });
}

function destroyChart(id) {
  const key = id.replace('Chart','');
  if (STATE.charts[key]) { STATE.charts[key].destroy(); delete STATE.charts[key]; }
}

// ── Helpers ──
function showLoading(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '<div class="empty-state">Loading from cloud ☁️...</div>';
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function formatDate(str) {
  if (!str) return '';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Mobile sidebar overlay ──
function initSidebarOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.onclick = () => {
    document.getElementById('sidebar').classList.remove('open');
    overlay.classList.remove('show');
  };
  document.body.appendChild(overlay);
}

// ── Init ──
window.addEventListener('DOMContentLoaded', () => {
  initSidebarOverlay();
  const saved = localStorage.getItem('gk_user');
  if (saved) {
    STATE.user = JSON.parse(saved);
    showApp();
  }
});