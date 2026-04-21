/* ── GharKharcha v3 — with Onboarding & Dynamic Members ── */

const API = 'https://15c3jq5fc2.execute-api.ap-south-1.amazonaws.com';
const FAMILY_ID = 'family'; // will be dynamic after onboarding

const STATE = {
  user: null,
  family: null,       // { familyId, familyName, members:[] }
  expenses: [],
  currentView: 'dashboard',
  currentFilter: 'all',
  currentCatFilter: 'all',
  charts: {},
  obMembers: [],      // members being added during onboarding
  obMemberCount: 1,
};

const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8' }, { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef9c3', text: '#854d0e' }, { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ede9fe', text: '#6d28d9' }, { bg: '#fee2e2', text: '#991b1b' },
];

const CAT_ICONS = { Groceries: '🛒', Utilities: '⚡', Transport: '🚗', Entertainment: '🎬', Medical: '💊', Other: '📋' };
const CAT_COLORS = { Groceries: '#3b82f6', Utilities: '#10b981', Transport: '#f59e0b', Entertainment: '#ec4899', Medical: '#8b5cf6', Other: '#6b7280' };

/* ─────────────── API ─────────────── */
async function apiCall(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) throw new Error(`API ${method} ${path} failed: ${res.status}`);
  return res.json();
}


// Save a new expense
const apiSaveExpense = (expense) =>
  apiCall(
    "/expense",
    "POST",
    JSON.stringify({ ...expense, familyId: STATE.family?.familyId })
  );

// Get expenses, optionally filter by month
const apiGetExpenses = (month) => {
  const familyId = STATE.family?.familyId;
  const query = month ? `?familyId=${familyId}&month=${month}` : `?familyId=${familyId}`;
  return apiCall(`/expenses${query}`).then((data) => data.expenses || []);
};

// Delete an expense
const apiDeleteExpense = (expenseId) => {
  const familyId = STATE.family?.familyId;
  return apiCall(
    "/expense",
    "DELETE",
    JSON.stringify({ familyId, expenseId })
  );
};

// Save a family member
const apiSaveMember = (member) =>
  apiCall(
    "/member",
    "POST",
    JSON.stringify({ ...member, familyId: STATE.family?.familyId })
  );

// Get all family members
const apiGetMembers = () => {
  const familyId = STATE.family?.familyId;
  return apiCall(`/members?familyId=${familyId}`).then((data) => data.members || []);
};

/* ─────────────── AUTH ─────────────── */
function handleLogin(response) {
  const p = parseJwt(response.credential);
  STATE.user = {
    name: p.name, email: p.email, picture: p.picture,
    initials: p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  };
  localStorage.setItem('gk_user', JSON.stringify(STATE.user));

  // Check if family is already set up
  const savedFamily = localStorage.getItem('gk_family');
  if (savedFamily) {
    STATE.family = JSON.parse(savedFamily);
    showApp();
  } else {
    showOnboarding();
  }
}

function parseJwt(token) {
  return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
}

function logout() {
  if (!confirm('Sign out of GharKharcha?')) return;
  STATE.user = null; STATE.family = null; STATE.expenses = [];
  localStorage.removeItem('gk_user');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('onboarding-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

/* ─────────────── ONBOARDING ─────────────── */
function showOnboarding() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('onboarding-screen').classList.remove('hidden');
  setProgress(1);

  // Pre-fill name from Google
  const nameInput = document.getElementById('ob-yourname');
  if (STATE.user?.name) nameInput.value = STATE.user.name.split(' ')[0];
}

function setProgress(step) {
  const pct = (step / 3) * 100;
  document.getElementById('ob-fill').style.width = pct + '%';
  document.getElementById('ob-step-label').textContent = `Step ${step} of 3`;
}

function obNext(step, skip = false) {
  if (step === 1) {
    const name = document.getElementById('ob-yourname').value.trim();
    const family = document.getElementById('ob-familyname').value.trim();
    const role = document.getElementById('ob-role').value;
    if (!name) { toast('Please enter your name'); return; }
    if (!family) { toast('Please enter your family name'); return; }

    // Build family ID from family name
    const fid = family.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString().slice(-4);
    STATE.family = {
      familyId: fid,
      familyName: family,
      members: [{
        name, email: STATE.user.email,
        role, initials: name.slice(0, 2).toUpperCase(),
        color: AVATAR_COLORS[0].bg, textColor: AVATAR_COLORS[0].text,
        isYou: true,
      }]
    };

    document.getElementById('ob-step-1').classList.add('hidden');
    document.getElementById('ob-step-2').classList.remove('hidden');
    setProgress(2);
  }

  if (step === 2) {
    if (!skip) {
      // Collect member rows
      const extra = [];
      for (let i = 0; i < STATE.obMemberCount; i++) {
        const n = document.getElementById(`mn-${i}`)?.value.trim();
        const e = document.getElementById(`me-${i}`)?.value.trim();
        const r = document.getElementById(`mr-${i}`)?.value;
        if (n && e) {
          const colorIdx = (STATE.family.members.length + extra.length) % AVATAR_COLORS.length;
          extra.push({ name: n, email: e, role: r, initials: n.slice(0, 2).toUpperCase(), color: AVATAR_COLORS[colorIdx].bg, textColor: AVATAR_COLORS[colorIdx].text });
        }
      }
      STATE.family.members.push(...extra);
    }

    // Build summary
    buildSummary();
    document.getElementById('ob-step-2').classList.add('hidden');
    document.getElementById('ob-step-3').classList.remove('hidden');
    setProgress(3);
  }
}

function obBack(step) {
  if (step === 2) {
    document.getElementById('ob-step-2').classList.add('hidden');
    document.getElementById('ob-step-1').classList.remove('hidden');
    setProgress(1);
  }
}

function addMemberRow() {
  if (STATE.obMemberCount >= 5) { toast('Maximum 5 additional members'); return; }
  const i = STATE.obMemberCount;
  const container = document.getElementById('member-inputs');
  const row = document.createElement('div');
  row.className = 'member-input-row';
  row.id = `mir-${i}`;
  row.innerHTML = `
    <input class="fi" type="text" placeholder="Name" id="mn-${i}" />
    <input class="fi" type="email" placeholder="Gmail address" id="me-${i}" />
    <select class="fi" id="mr-${i}" style="width:120px">
      <option value="member">Member</option>
      <option value="admin">Admin</option>
      <option value="view">View only</option>
    </select>
    <button class="mir-remove" onclick="removeMember(${i})">✕</button>
  `;
  container.appendChild(row);
  STATE.obMemberCount++;
  if (STATE.obMemberCount >= 5) document.getElementById('add-member-btn').style.display = 'none';
}

function removeMember(i) {
  document.getElementById(`mir-${i}`)?.remove();
}

function buildSummary() {
  const el = document.getElementById('ob-summary');
  el.innerHTML = STATE.family.members.map((m, i) => `
    <div class="obs-row">
      <div class="obs-av" style="background:${m.color};color:${m.textColor}">${m.initials}</div>
      <div>
        <div class="obs-name">${m.name}</div>
        <div class="obs-email">${m.email}</div>
      </div>
      <span class="${m.isYou ? 'obs-you' : 'obs-role'}">${m.isYou ? 'You · ' + m.role : m.role}</span>
    </div>
  `).join('');
}

async function launchApp() {
  const btn = document.getElementById('ob-launch-btn');
  const status = document.getElementById('ob-launch-status');
  btn.textContent = 'Setting up your family...';
  btn.disabled = true;
  status.textContent = 'Saving to cloud...';

  try {
    // Save all members to DynamoDB
    for (const m of STATE.family.members) {
      await apiSaveMember(m);
    }
    localStorage.setItem('gk_family', JSON.stringify(STATE.family));
    status.textContent = '✓ Family created! Launching...';
    setTimeout(() => {
      document.getElementById('onboarding-screen').classList.add('hidden');
      showApp();
    }, 800);
  } catch (err) {
    // Save locally even if API fails
    localStorage.setItem('gk_family', JSON.stringify(STATE.family));
    status.textContent = '✓ Saved locally. Launching...';
    setTimeout(() => {
      document.getElementById('onboarding-screen').classList.add('hidden');
      showApp();
    }, 800);
  }
}

/* ─────────────── APP ─────────────── */
function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('onboarding-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  const u = STATE.user;
  // Sidebar user info
  const sav = document.getElementById('s-av');
  const mav = document.getElementById('m-av');
  if (u.picture) {
    sav.innerHTML = `<img src="${u.picture}" alt="${u.name}" referrerpolicy="no-referrer">`;
    mav.innerHTML = `<img src="${u.picture}" alt="${u.name}" referrerpolicy="no-referrer">`;
  } else {
    sav.textContent = u.initials;
    mav.textContent = u.initials;
  }

  // Find this user's member record
  const me = STATE.family?.members?.find(m => m.email === u.email);
  document.getElementById('s-name').textContent = me?.name || u.name;
  document.getElementById('s-role').textContent = me?.role || 'member';
  document.getElementById('sb-family-name').textContent = STATE.family?.familyName || 'My Family';

  // Set topbar date
  document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Populate paid-by and shared-with dropdowns from family members
  populateMemberDropdowns();

  navigate('dashboard');
}

function populateMemberDropdowns() {
  const members = STATE.family?.members || [];
  const paidby = document.getElementById('f-paidby');
  const shared = document.getElementById('f-shared');

  // Find current user's name
  const me = members.find(m => m.email === STATE.user?.email);

  paidby.innerHTML = members.map(m =>
    `<option value="${m.name}" ${m.email === STATE.user?.email ? 'selected' : ''}>${m.name}${m.email === STATE.user?.email ? ' (you)' : ''}</option>`
  ).join('');

  shared.innerHTML = `<option value="none">No one (personal)</option>` +
    members.filter(m => m.email !== STATE.user?.email).map(m =>
      `<option value="${m.name}">${m.name}</option>`
    ).join('') +
    `<option value="family">Whole family</option>`;
}

/* ─────────────── NAVIGATION ─────────────── */
function navigate(view) {
  STATE.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`view-${view}`)?.classList.add('active');
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');

  const titles = { dashboard: 'Dashboard', expenses: 'All Expenses', add: 'Add Expense', scan: 'Scan Receipt', members: 'Members', reports: 'Reports' };
  document.getElementById('topbar-title').textContent = titles[view] || view;

  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('show');

  if (view === 'add') { document.getElementById('f-date').value = todayStr(); }
  if (view === 'dashboard') loadDashboard();
  if (view === 'expenses') loadAllExpenses();
  if (view === 'members') loadMembers();
  if (view === 'reports') loadReports();
  window.scrollTo(0, 0);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay')?.classList.toggle('show');
}

/* ─────────────── DASHBOARD ─────────────── */
async function loadDashboard() {
  const month = document.getElementById('month-picker').value;
  document.getElementById('dash-list').innerHTML = '<div class="empty">Loading from cloud...</div>';
  try {
    STATE.expenses = await apiGetExpenses(month);
    renderDashboard(STATE.expenses);
  } catch (e) {
    console.log(e);
    toast('Could not load — check connection');
    renderDashboard([]);
  }
}

function renderDashboard(expenses) {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const groceries = expenses.filter(e => e.category === 'Groceries').reduce((s, e) => s + Number(e.amount), 0);
  const utilities = expenses.filter(e => e.category === 'Utilities').reduce((s, e) => s + Number(e.amount), 0);
  const shared = expenses.filter(e => e.shared);

  document.getElementById('m-total').textContent = fmt(total);
  document.getElementById('m-groceries').textContent = fmt(groceries);
  document.getElementById('m-utilities').textContent = fmt(utilities);
  document.getElementById('m-shared').textContent = fmt(shared.reduce((s, e) => s + Number(e.amount), 0));
  document.getElementById('m-shared-ct').textContent = `${shared.length} transactions`;
  document.getElementById('m-trend').textContent = `${expenses.length} transactions`;

  renderMembersStrip(expenses);
  renderPieChart(expenses);
  renderBarChart(expenses);
  renderExpList(expenses, 'dash-list', STATE.currentFilter);
}

function monthChanged() { if (STATE.currentView === 'dashboard') loadDashboard(); }

function renderMembersStrip(expenses) {
  const members = STATE.family?.members || [];
  document.getElementById('members-strip').innerHTML = members.map(m => {
    const spent = expenses.filter(e => e.paidBy === m.name).reduce((s, e) => s + Number(e.amount), 0);
    return `<div class="m-chip">
      <div class="ch-av" style="background:${m.color};color:${m.textColor}">${m.initials}</div>
      <div><div class="ch-name">${m.name}</div><div class="ch-amt">${fmt(spent)}</div></div>
    </div>`;
  }).join('');
}

function renderExpList(expenses, id, filter) {
  const el = document.getElementById(id);
  let list = [...expenses];
  if (filter === 'shared') list = list.filter(e => e.shared);
  if (filter === 'personal') list = list.filter(e => !e.shared);
  if (!list.length) { el.innerHTML = '<div class="empty">No expenses found. Add your first one!</div>'; return; }
  el.innerHTML = list.slice(0, 20).map(e => `
    <div class="exp-row">
      <div class="exp-ic">${CAT_ICONS[e.category] || '📋'}</div>
      <div><div class="exp-name">${e.desc}</div><div class="exp-meta">${e.paidBy} · ${e.category}</div></div>
      <span class="exp-badge ${e.shared ? 'b-sh' : 'b-pe'}">${e.shared ? 'Shared' : 'Personal'}</span>
      <div class="exp-date">${fmtDate(e.date)}</div>
      <div class="exp-amt">${fmt(e.amount)}</div>
    </div>`).join('');
}

function filterExp(f, btn) {
  STATE.currentFilter = f;
  document.getElementById('dash-filters').querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderExpList(STATE.expenses, 'dash-list', f);
}

/* ─────────────── ALL EXPENSES ─────────────── */
async function loadAllExpenses() {
  document.getElementById('all-list').innerHTML = '<div class="empty">Loading...</div>';
  try { STATE.expenses = await apiGetExpenses(); } catch (e) { console.log(e); }
  renderAllExpenses();
}

function renderAllExpenses() {
  let list = [...STATE.expenses];
  if (STATE.currentCatFilter !== 'all') list = list.filter(e => e.category === STATE.currentCatFilter);
  renderExpList(list, 'all-list', 'all');
}

function filterCat(cat, btn) {
  STATE.currentCatFilter = cat;
  document.querySelectorAll('#view-expenses .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderAllExpenses();
}

/* ─────────────── SAVE EXPENSE ─────────────── */
async function saveExpense() {
  const desc = document.getElementById('f-desc').value.trim();
  const amount = parseFloat(document.getElementById('f-amount').value);
  const date = document.getElementById('f-date').value;
  const cat = document.getElementById('f-cat').value;
  const paidBy = document.getElementById('f-paidby').value;
  const shared = document.getElementById('f-shared').value;
  const notes = document.getElementById('f-notes').value.trim();

  if (!desc) { toast('Please enter a description'); return; }
  if (!amount || amount <= 0) { toast('Please enter a valid amount'); return; }
  if (!date) { toast('Please pick a date'); return; }

  const btn = document.getElementById('save-btn');
  btn.textContent = 'Saving...'; btn.disabled = true;
  try {
    await apiSaveExpense({ desc, amount, date, category: cat, paidBy, shared: shared !== 'none' ? shared : null, notes, receiptUrl: null, createdBy: STATE.user?.email });
    resetForm();
    document.getElementById('save-status').textContent = '✓ Saved to cloud!';
    setTimeout(() => document.getElementById('save-status').textContent = '', 3000);
    toast(`${fmt(amount)} saved ☁️`);
    setTimeout(() => navigate('dashboard'), 700);
  } catch (e) {
    console.log(e);
    toast('Error saving — check connection' + e);
  }
  finally { btn.textContent = 'Save expense'; btn.disabled = false; }
}

async function saveScanExpense() {
  const desc = document.getElementById('s-desc').value.trim() || 'Scanned receipt';
  const amount = parseFloat(document.getElementById('s-amount').value);
  const date = document.getElementById('s-date').value || todayStr();
  const cat = document.getElementById('s-cat').value;
  if (!amount || amount <= 0) { toast('Please verify the amount'); return; }
  const me = STATE.family?.members?.find(m => m.email === STATE.user?.email);
  try {
    await apiSaveExpense({ desc, amount, date, category: cat, paidBy: me?.name || 'Me', shared: null, notes: 'Scanned receipt', receiptUrl: null, createdBy: STATE.user?.email });
    toast(`${fmt(amount)} saved ☁️`);
    resetScan();
    setTimeout(() => navigate('dashboard'), 700);
  } catch (e) {
    console.log(e);
    toast('Error saving' + e);
  }
}

function resetForm() {
  ['f-desc', 'f-amount', 'f-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-date').value = todayStr();
  document.getElementById('f-cat').value = 'Groceries';
  document.getElementById('f-shared').value = 'none';
}

/* ─────────────── SCAN ─────────────── */
function triggerFileInput() { document.getElementById('receipt-file').click(); }

function handleReceiptFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('receipt-preview').src = e.target.result;
    document.getElementById('ocr-preview').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
  const textEl = document.getElementById('ocr-text');
  document.getElementById('ocr-result').classList.remove('hidden');
  textEl.textContent = 'Reading receipt with OCR...';

  // Simulated OCR — Phase 2: replace with real Google Vision API
  setTimeout(() => {
    const mockAmt = Math.floor(Math.random() * 3000) + 200;
    textEl.textContent = `Detected: ₹${mockAmt.toLocaleString('en-IN')} · ${fmtDate(todayStr())}`;
    document.getElementById('s-amount').value = mockAmt;
    document.getElementById('s-date').value = todayStr();
    ['scan-form-fields', 'scan-amount-row', 'scan-cat-row', 'scan-actions'].forEach(id => document.getElementById(id).classList.remove('hidden'));
  }, 1800);
}

function resetScan() {
  document.getElementById('receipt-file').value = '';
  document.getElementById('ocr-result').classList.add('hidden');
  document.getElementById('ocr-preview').classList.add('hidden');
  ['scan-form-fields', 'scan-amount-row', 'scan-cat-row', 'scan-actions'].forEach(id => document.getElementById(id).classList.add('hidden'));
  ['s-desc', 's-amount'].forEach(id => document.getElementById(id).value = '');
}

/* ─────────────── MEMBERS ─────────────── */
async function loadMembers() {
  try {
    const members = await apiGetMembers();
    if (members.length > 0) {
      STATE.family.members = members;
      localStorage.setItem('gk_family', JSON.stringify(STATE.family));
    }
  } catch (e) {
    console.log(e);
    toast('Could not load family members');
  }
  renderMembers();
}

function renderMembers() {
  const members = STATE.family?.members || [];
  const expenses = STATE.expenses;
  document.getElementById('members-grid').innerHTML = members.length ? members.map(m => {
    const spent = expenses.filter(e => e.paidBy === m.name).reduce((s, e) => s + Number(e.amount), 0);
    const count = expenses.filter(e => e.paidBy === m.name).length;
    const isYou = m.email === STATE.user?.email;
    return `<div class="mem-card">
      <div class="mem-head">
        <div class="mem-av" style="background:${m.color};color:${m.textColor}">${m.initials}</div>
        <div>
          <div class="mem-name">${m.name}${isYou ? ' 👋' : ''}</div>
          <div class="mem-email">${m.email}</div>
          <span class="mem-role-badge">${m.role}${isYou ? ' · you' : ''}</span>
        </div>
      </div>
      <div class="mem-stats">Spent: <strong>${fmt(spent)}</strong> · ${count} expenses</div>
    </div>`;
  }).join('') : '<div class="empty">No members yet.</div>';
}

async function inviteMember() {
  const name = document.getElementById('inv-name').value.trim();
  const email = document.getElementById('inv-email').value.trim();
  const role = document.getElementById('inv-role').value;
  if (!name) { toast('Please enter a name'); return; }
  if (!email || !email.includes('@')) { toast('Please enter a valid Gmail'); return; }

  const colorIdx = STATE.family.members.length % AVATAR_COLORS.length;
  const member = {
    name, email, role,
    initials: name.slice(0, 2).toUpperCase(),
    color: AVATAR_COLORS[colorIdx].bg,
    textColor: AVATAR_COLORS[colorIdx].text,
  };

  try {
    await apiSaveMember(member);
    STATE.family.members.push(member);
    localStorage.setItem('gk_family', JSON.stringify(STATE.family));
    populateMemberDropdowns();
    renderMembers();
    document.getElementById('inv-name').value = '';
    document.getElementById('inv-email').value = '';
    document.getElementById('invite-msg').textContent = `✓ ${name} added!`;
    setTimeout(() => document.getElementById('invite-msg').textContent = '', 3000);
    toast(`${name} added to family`);
  } catch (e) {
    console.log(e);
    toast('Error adding member' + e);
  }
}

/* ─────────────── CHARTS ─────────────── */
function renderPieChart(expenses) {
  const cats = Object.keys(CAT_COLORS);
  const data = cats.map(c => expenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0));
  const hasData = data.some(d => d > 0);
  const total = data.reduce((s, v) => s + v, 0);

  document.getElementById('pie-legend').innerHTML = cats.filter((_, i) => data[i] > 0).map(c => {
    const pct = total > 0 ? Math.round(data[cats.indexOf(c)] / total * 100) : 0;
    return `<span class="li"><span class="ldot" style="background:${CAT_COLORS[c]}"></span>${c} ${pct}%</span>`;
  }).join('');

  destroyChart('pieChart');
  STATE.charts.pie = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: { labels: cats, datasets: [{ data: hasData ? data : [1], backgroundColor: hasData ? cats.map(c => CAT_COLORS[c]) : ['#e5e7eb'], borderWidth: 3, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}` } } } },
  });
}

function renderBarChart(expenses) {
  const weeks = [0, 0, 0, 0, 0];
  expenses.forEach(e => { const w = Math.min(Math.floor((new Date(e.date).getDate() - 1) / 7), 4); weeks[w] += Number(e.amount); });
  destroyChart('barChart');
  STATE.charts.bar = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'], datasets: [{ data: weeks, backgroundColor: '#2563eb', borderRadius: 5, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}` } } }, scales: { y: { ticks: { callback: v => '₹' + (v / 1000).toFixed(0) + 'k', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.04)' } }, x: { ticks: { font: { size: 11 } }, grid: { display: false } } } },
  });
}

async function loadReports() {
  try { STATE.expenses = await apiGetExpenses(); } catch (e) {
    console.log(e);
  }
  const all = STATE.expenses;
  const months = ['Jan', 'Feb', 'Mar', 'Apr'];
  const mData = months.map((_, i) => (all).filter(e => e.date?.startsWith(`2026-0${i + 1}`)).reduce((s, e) => s + Number(e.amount), 0));
  const cats = Object.keys(CAT_COLORS);
  const cData = cats.map(c => all.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0));
  const members = STATE.family?.members || [];
  const mNames = members.map(m => m.name);
  const meData = mNames.map(n => all.filter(e => e.paidBy === n).reduce((s, e) => s + Number(e.amount), 0));

  destroyChart('monthlyChart');
  STATE.charts.monthly = new Chart(document.getElementById('monthlyChart'), { type: 'bar', data: { labels: months, datasets: [{ data: mData, backgroundColor: '#1d4ed8', borderRadius: 5, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}` } } }, scales: { y: { ticks: { callback: v => '₹' + (v / 1000).toFixed(0) + 'k', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.04)' } }, x: { ticks: { font: { size: 11 } }, grid: { display: false } } } } });
  destroyChart('catChart');
  STATE.charts.cat = new Chart(document.getElementById('catChart'), { type: 'bar', data: { labels: cats, datasets: [{ data: cData, backgroundColor: cats.map(c => CAT_COLORS[c]), borderRadius: 5, borderSkipped: false }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}` } } }, scales: { x: { ticks: { callback: v => '₹' + (v / 1000).toFixed(0) + 'k', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.04)' } }, y: { ticks: { font: { size: 11 } }, grid: { display: false } } } } });
  destroyChart('memberChart');
  STATE.charts.member = new Chart(document.getElementById('memberChart'), { type: 'doughnut', data: { labels: mNames, datasets: [{ data: meData, backgroundColor: members.map(m => m.textColor), borderWidth: 3, borderColor: '#fff' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } }, tooltip: { callbacks: { label: ctx => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}` } } } } });
}

function destroyChart(id) {
  const key = id.replace('Chart', '');
  if (STATE.charts[key]) { STATE.charts[key].destroy(); delete STATE.charts[key]; }
}

/* ─────────────── HELPERS ─────────────── */
function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(s) { if (!s) return ''; return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2800); }

/* ─────────────── INIT ─────────────── */
function initSidebarOverlay() {
  const o = document.createElement('div');
  o.className = 'sidebar-overlay';
  o.onclick = () => { document.getElementById('sidebar').classList.remove('open'); o.classList.remove('show'); };
  document.body.appendChild(o);
}

window.addEventListener('DOMContentLoaded', () => {
  initSidebarOverlay();
  const savedUser = localStorage.getItem('gk_user');
  const savedFamily = localStorage.getItem('gk_family');
  if (savedUser) {
    STATE.user = JSON.parse(savedUser);
    if (savedFamily) {
      STATE.family = JSON.parse(savedFamily);
      showApp();
    } else {
      showOnboarding();
    }
  }
});