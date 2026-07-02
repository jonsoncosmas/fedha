/* ===== FEDHA FINANCE TRACKER — MAIN APP JS ===== */
'use strict';

// ===== DATA STORE =====
const DB = {
  income: [],
  expenses: [],
  loans: [],
  repayments: [],
  budgets: [],
  savings: [],
  bills: [],
  networth: []
};

const STORAGE_KEYS = {
  income: 'fedha_income',
  expenses: 'fedha_expenses',
  loans: 'fedha_loans',
  repayments: 'fedha_repayments',
  budgets: 'fedha_budgets',
  savings: 'fedha_savings',
  bills: 'fedha_bills',
  networth: 'fedha_networth'
};

// ===== CURRENCY =====
const FMT = (n) => 'Tshs ' + Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 });

// ===== DATE UTILS =====
const now = () => new Date();
const toDateStr = (d) => new Date(d).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
const toTimeStr = (d) => new Date(d).toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit' });
const toFullStr = (d) => toDateStr(d) + ' ' + toTimeStr(d);
const toISOLocal = (d = new Date()) => {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
};
const isToday = (d) => {
  const t = new Date(d), n = now();
  return t.toDateString() === n.toDateString();
};
const isThisWeek = (d) => {
  const t = new Date(d), n = now();
  const startOfWeek = new Date(n); startOfWeek.setDate(n.getDate() - n.getDay()); startOfWeek.setHours(0,0,0,0);
  return t >= startOfWeek;
};
const isThisMonth = (d) => {
  const t = new Date(d), n = now();
  return t.getMonth() === n.getMonth() && t.getFullYear() === n.getFullYear();
};
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));

// ===== CAT ICONS =====
const CAT_ICONS = {
  food:'🍽️', transport:'🚗', housing:'🏠', utilities:'⚡', health:'🏥',
  education:'📚', entertainment:'🎮', shopping:'🛍️', business:'💼',
  personal:'✂️', other:'📌', salary:'💰', freelance:'💻', investment:'📈',
  rental:'🏘️', gift:'🎁', loan:'🤝', repay:'💸', cash:'💵',
  property:'🏠', vehicle:'🚗', equipment:'🔧', receivable:'📋',
  card:'💳', subscriptions:'📱', insurance:'🛡️'
};

// ===== LOCAL STORAGE =====
function saveData(key) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(DB[key]));
  } catch(e) { console.error('Save failed', e); }
}
function loadData(key) {
  try {
    const d = localStorage.getItem(STORAGE_KEYS[key]);
    if (d) DB[key] = JSON.parse(d);
  } catch(e) { DB[key] = []; }
}
function loadAll() {
  Object.keys(STORAGE_KEYS).forEach(loadData);
}

// ===== TOAST =====
let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = 'toast hidden', 3000);
}

// ===== NAV =====
let currentPage = 'dashboard';
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  currentPage = page;
  document.getElementById('page-title').textContent =
    page.charAt(0).toUpperCase() + page.slice(1);
  // Close mobile sidebar
  closeSidebar();
  // Render page
  renderPage(page);
}

function renderPage(page) {
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'income': renderIncome(); break;
    case 'expenses': renderExpenses(); break;
    case 'loans': renderLoans(); break;
    case 'budget': renderBudgets(); break;
    case 'savings': renderSavings(); break;
    case 'bills': renderBills(); break;
    case 'networth': renderNetWorth(); break;
  }
}

// ===== SIDEBAR MOBILE =====
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('visible');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}

// ===== LIVE CLOCK =====
function updateClock() {
  const el = document.getElementById('live-clock');
  if (el) {
    const n = now();
    el.textContent = n.toLocaleDateString('en-TZ', { weekday: 'short', day: 'numeric', month: 'short' })
      + ' · ' + n.toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

// ===== CHART.JS MINI =====
let weeklyChart, categoryChart;
function renderCharts() {
  renderWeeklyChart();
  renderCategoryChart();
}

function renderWeeklyChart() {
  const canvas = document.getElementById('chart-weekly');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Last 7 days
  const days = [];
  const incData = [], expData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const dNext = new Date(d); dNext.setDate(d.getDate() + 1);
    days.push(d.toLocaleDateString('en-TZ', { weekday: 'short' }));
    incData.push(DB.income.filter(r => new Date(r.datetime) >= d && new Date(r.datetime) < dNext).reduce((s,r) => s + r.amount, 0));
    expData.push(DB.expenses.filter(r => new Date(r.datetime) >= d && new Date(r.datetime) < dNext).reduce((s,r) => s + r.amount + r.tax, 0));
  }
  if (weeklyChart) weeklyChart.destroy();
  weeklyChart = new SimpleChart(ctx, {
    labels: days, datasets: [
      { label: 'Income', data: incData, color: '#00f5a0' },
      { label: 'Expenses', data: expData, color: '#ff4d6d' }
    ]
  }, 'bar');
}

function renderCategoryChart() {
  const canvas = document.getElementById('chart-category');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cats = {};
  DB.expenses.filter(e => isThisMonth(e.datetime)).forEach(e => {
    cats[e.category] = (cats[e.category] || 0) + e.amount;
  });
  const labels = Object.keys(cats);
  const data = Object.values(cats);
  const colors = ['#00f5a0','#ff4d6d','#4cc9f0','#c77dff','#ff9f43','#ffd60a','#ff006e','#00b4d8','#7209b7','#f72585'];
  if (categoryChart) categoryChart.destroy();
  categoryChart = new SimpleChart(ctx, { labels, datasets: [{ label: 'Spending', data, colors }] }, 'donut');
}

// ===== SIMPLE CHART ENGINE =====
class SimpleChart {
  constructor(ctx, config, type) {
    this.ctx = ctx; this.config = config; this.type = type;
    this.draw();
  }
  destroy() { this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height); }
  draw() {
    if (this.type === 'bar') this.drawBar();
    if (this.type === 'donut') this.drawDonut();
  }
  drawBar() {
    const { ctx, config } = this;
    const c = ctx.canvas; c.width = c.offsetWidth || 500; const W = c.width, H = c.height;
    ctx.clearRect(0,0,W,H);
    const { labels, datasets } = config;
    const pad = { l: 50, r: 16, t: 16, b: 36 };
    const bW = (W - pad.l - pad.r) / labels.length;
    const allVals = datasets.flatMap(d => d.data);
    const maxV = Math.max(...allVals, 1);
    // Grid
    ctx.strokeStyle = '#33335a'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (H - pad.t - pad.b) * i / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      const v = maxV * (4 - i) / 4;
      ctx.fillStyle = '#6060a0'; ctx.font = '10px JetBrains Mono';
      ctx.fillText(v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v.toFixed(0), 2, y + 4);
    }
    // Bars
    const nD = datasets.length, bPad = 4, groupW = bW - 8;
    datasets.forEach((ds, di) => {
      ds.data.forEach((val, i) => {
        const x = pad.l + i * bW + 4 + di * (groupW / nD);
        const bh = ((H - pad.t - pad.b) * val) / maxV;
        const y = H - pad.b - bh;
        const bwSingle = groupW / nD - bPad;
        ctx.fillStyle = ds.color;
        ctx.beginPath(); ctx.roundRect(x, y, bwSingle, bh, 3); ctx.fill();
      });
    });
    // Labels
    ctx.fillStyle = '#a0a0c0'; ctx.font = '11px Space Grotesk'; ctx.textAlign = 'center';
    labels.forEach((l, i) => {
      ctx.fillText(l, pad.l + i * bW + bW / 2, H - 8);
    });
    // Legend
    datasets.forEach((ds, i) => {
      const lx = pad.l + i * 80;
      ctx.fillStyle = ds.color;
      ctx.fillRect(lx, 2, 10, 6);
      ctx.fillStyle = '#a0a0c0'; ctx.textAlign = 'left';
      ctx.fillText(ds.label, lx + 14, 10);
    });
  }
  drawDonut() {
    const { ctx, config } = this;
    const c = ctx.canvas; c.width = c.offsetWidth || 300; const W = c.width, H = c.height;
    ctx.clearRect(0,0,W,H);
    const { labels, datasets } = config;
    if (!datasets[0] || !datasets[0].data.length) {
      ctx.fillStyle = '#6060a0'; ctx.font = '13px Space Grotesk'; ctx.textAlign = 'center';
      ctx.fillText('No data yet', W/2, H/2); return;
    }
    const data = datasets[0].data, colors = datasets[0].colors || ['#00f5a0'];
    const total = data.reduce((s,v) => s+v, 0);
    if (!total) { ctx.fillStyle = '#6060a0'; ctx.font='13px Space Grotesk'; ctx.textAlign='center'; ctx.fillText('No spending', W/2, H/2); return; }
    const cx = W * 0.38, cy = H * 0.5, r = Math.min(W * 0.28, H * 0.42), ri = r * 0.55;
    let angle = -Math.PI / 2;
    data.forEach((val, i) => {
      const slice = (val / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath(); ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      angle += slice;
    });
    ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2);
    ctx.fillStyle = '#22223a'; ctx.fill();
    ctx.fillStyle = '#f0f0ff'; ctx.font = 'bold 11px Space Grotesk'; ctx.textAlign = 'center';
    ctx.fillText('Spending', cx, cy - 6); ctx.fillText('by Category', cx, cy + 10);
    // Legend
    const lx = W * 0.72, ly0 = 20;
    labels.forEach((l, i) => {
      if (i > 7) return;
      const ly = ly0 + i * 20;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(lx - 12, ly, 8, 8);
      ctx.fillStyle = '#a0a0c0'; ctx.font = '10px Space Grotesk'; ctx.textAlign = 'left';
      ctx.fillText((l.length > 10 ? l.slice(0,10)+'…' : l) + ' ' + ((data[i]/total)*100).toFixed(0)+'%', lx, ly + 8);
    });
  }
}

// ===== DASHBOARD =====
function renderDashboard() {
  // KPI
  const totalInc = DB.income.reduce((s, r) => s + r.amount, 0);
  const totalExp = DB.expenses.reduce((s, r) => s + r.amount + r.tax, 0);
  const balance = totalInc - totalExp;
  const todayInc = DB.income.filter(r => isToday(r.datetime)).reduce((s,r) => s+r.amount, 0);
  const todayExp = DB.expenses.filter(r => isToday(r.datetime)).reduce((s,r) => s+r.amount+r.tax, 0);
  const netLoans = DB.loans.filter(l=>l.dir==='owe').reduce((s,l)=>s+loanRemaining(l),0)
                 - DB.loans.filter(l=>l.dir==='lent').reduce((s,l)=>s+loanRemaining(l),0);

  document.getElementById('kpi-total-income').textContent = FMT(totalInc);
  document.getElementById('kpi-total-expense').textContent = FMT(totalExp);
  document.getElementById('kpi-balance').textContent = FMT(balance);
  document.getElementById('kpi-balance').style.color = balance >= 0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('kpi-loans').textContent = FMT(Math.abs(netLoans));
  document.getElementById('kpi-income-today').textContent = 'Today: ' + FMT(todayInc);
  document.getElementById('kpi-expense-today').textContent = 'Today: ' + FMT(todayExp);

  // Period
  updatePeriod(document.querySelector('.period-btn.active')?.dataset.period || 'daily');

  // Charts
  setTimeout(renderCharts, 100);

  // Recent transactions (last 10)
  const all = [
    ...DB.income.map(r => ({...r, _type:'income'})),
    ...DB.expenses.map(r => ({...r, _type:'expense'})),
    ...DB.repayments.map(r => ({...r, _type:'repay'}))
  ].sort((a,b) => new Date(b.datetime) - new Date(a.datetime)).slice(0, 10);

  const cont = document.getElementById('recent-transactions');
  document.getElementById('recent-count').textContent = (DB.income.length + DB.expenses.length) + ' transactions';
  cont.innerHTML = all.length ? all.map(renderTxItem).join('') : emptyState('No transactions yet. Add income or expenses to get started!');
}

function updatePeriod(period) {
  let filter;
  if (period === 'daily') filter = isToday;
  else if (period === 'weekly') filter = isThisWeek;
  else filter = isThisMonth;

  const inc = DB.income.filter(r => filter(r.datetime)).reduce((s,r) => s+r.amount, 0);
  const exp = DB.expenses.filter(r => filter(r.datetime)).reduce((s,r) => s+r.amount+r.tax, 0);
  const net = inc - exp;
  const rate = inc > 0 ? Math.max(0, ((inc - exp) / inc * 100)).toFixed(0) : 0;

  document.getElementById('period-income').textContent = FMT(inc);
  document.getElementById('period-expense').textContent = FMT(exp);
  document.getElementById('period-net').textContent = FMT(net);
  document.getElementById('period-net').style.color = net >= 0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('period-savings-rate').textContent = rate + '%';
}

function renderTxItem(r) {
  const t = r._type;
  const icon = t === 'income' ? (CAT_ICONS[r.category]||'💰') : t==='expense' ? (CAT_ICONS[r.category]||'💸') : '💸';
  const label = t === 'income' ? r.source : t==='expense' ? r.description : 'Repayment';
  const amt = t === 'income' ? '+'+FMT(r.amount) : '-'+FMT(r.amount + (r.tax||0));
  const amtClass = t === 'income' ? 'income' : t === 'expense' ? 'expense' : 'repay';
  return `<div class="tx-item">
    <div class="tx-icon ${amtClass}">${icon}</div>
    <div class="tx-body">
      <div class="tx-name">${escHtml(label)}</div>
      <div class="tx-meta">${toFullStr(r.datetime)} <span class="tx-cat-badge">${r.category||''}</span></div>
    </div>
    <div class="tx-amount ${amtClass}">${amt}</div>
  </div>`;
}

function emptyState(msg) {
  return `<div class="empty-state"><span class="empty-icon">📊</span>${msg}</div>`;
}

// ===== INCOME =====
function renderIncome() {
  const cat = document.getElementById('inc-filter-cat').value;
  const filtered = cat ? DB.income.filter(r => r.category === cat) : DB.income;
  const sorted = [...filtered].sort((a,b) => new Date(b.datetime) - new Date(a.datetime));

  document.getElementById('inc-this-month').textContent = FMT(DB.income.filter(r=>isThisMonth(r.datetime)).reduce((s,r)=>s+r.amount,0));
  document.getElementById('inc-this-week').textContent = FMT(DB.income.filter(r=>isThisWeek(r.datetime)).reduce((s,r)=>s+r.amount,0));
  document.getElementById('inc-today').textContent = FMT(DB.income.filter(r=>isToday(r.datetime)).reduce((s,r)=>s+r.amount,0));
  document.getElementById('inc-all-time').textContent = FMT(DB.income.reduce((s,r)=>s+r.amount,0));

  const cont = document.getElementById('income-list');
  cont.innerHTML = sorted.length ? sorted.map(r => `
    <div class="tx-item">
      <div class="tx-icon income">${CAT_ICONS[r.category]||'💰'}</div>
      <div class="tx-body">
        <div class="tx-name">${escHtml(r.source)}</div>
        <div class="tx-meta">${toFullStr(r.datetime)} · ${escHtml(r.notes||'')} <span class="tx-cat-badge">${r.category}</span></div>
      </div>
      <div class="tx-amount income">+${FMT(r.amount)}</div>
      <button class="tx-del" onclick="deleteRecord('income','${r.id}')">✕</button>
    </div>`).join('') : emptyState('No income recorded yet.');
}

function saveIncome() {
  const amount = parseFloat(document.getElementById('inc-amount').value);
  const source = document.getElementById('inc-source').value.trim();
  const category = document.getElementById('inc-category').value;
  const datetime = document.getElementById('inc-datetime').value || toISOLocal();
  const notes = document.getElementById('inc-notes').value.trim();
  if (!amount || amount <= 0) return toast('Enter a valid amount', 'error');
  if (!source) return toast('Enter the income source', 'error');
  DB.income.push({ id: uid(), amount, source, category, datetime, notes, created: toISOLocal() });
  saveData('income');
  hideForm('income-form-card');
  clearForm(['inc-amount','inc-source','inc-notes']);
  renderIncome();
  updateDashboardKPIs();
  toast(`Income of ${FMT(amount)} saved! ✓`);
}

// ===== EXPENSES =====
function renderExpenses() {
  const cat = document.getElementById('exp-filter-cat').value;
  const filtered = cat ? DB.expenses.filter(r => r.category === cat) : DB.expenses;
  const sorted = [...filtered].sort((a,b) => new Date(b.datetime) - new Date(a.datetime));

  const totalTax = DB.expenses.reduce((s,r) => s+(r.tax||0), 0);
  document.getElementById('exp-this-month').textContent = FMT(DB.expenses.filter(r=>isThisMonth(r.datetime)).reduce((s,r)=>s+r.amount+r.tax,0));
  document.getElementById('exp-this-week').textContent = FMT(DB.expenses.filter(r=>isThisWeek(r.datetime)).reduce((s,r)=>s+r.amount+r.tax,0));
  document.getElementById('exp-today').textContent = FMT(DB.expenses.filter(r=>isToday(r.datetime)).reduce((s,r)=>s+r.amount+r.tax,0));
  document.getElementById('exp-tax-total').textContent = FMT(totalTax);

  const cont = document.getElementById('expense-list');
  cont.innerHTML = sorted.length ? sorted.map(r => `
    <div class="tx-item">
      <div class="tx-icon expense">${CAT_ICONS[r.category]||'💸'}</div>
      <div class="tx-body">
        <div class="tx-name">${escHtml(r.description)}</div>
        <div class="tx-meta">${toFullStr(r.datetime)} · ${escHtml(r.method||'')} ${r.tax>0?`· Tax: ${FMT(r.tax)}`:''} <span class="tx-cat-badge">${r.category}</span></div>
      </div>
      <div class="tx-amount expense">-${FMT(r.amount + r.tax)}</div>
      <button class="tx-del" onclick="deleteRecord('expenses','${r.id}')">✕</button>
    </div>`).join('') : emptyState('No expenses recorded yet.');
}

function saveExpense() {
  const description = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const tax = parseFloat(document.getElementById('exp-tax').value) || 0;
  const category = document.getElementById('exp-category').value;
  const method = document.getElementById('exp-method').value;
  const datetime = document.getElementById('exp-datetime').value || toISOLocal();
  const notes = document.getElementById('exp-notes').value.trim();
  if (!description) return toast('Describe the expense', 'error');
  if (!amount || amount <= 0) return toast('Enter a valid amount', 'error');
  DB.expenses.push({ id: uid(), description, amount, tax, category, method, datetime, notes, created: toISOLocal() });
  saveData('expenses');
  hideForm('expense-form-card');
  clearForm(['exp-desc','exp-amount','exp-tax','exp-notes']);
  renderExpenses();
  updateDashboardKPIs();
  toast(`Expense of ${FMT(amount+tax)} saved! ✓`);
}

// ===== LOANS =====
let loanDir = 'owe';

function loanRepaid(loan) {
  return DB.repayments.filter(r => r.loanId === loan.id).reduce((s,r) => s+r.amount, 0);
}
function loanRemaining(loan) {
  return Math.max(0, loan.amount - loanRepaid(loan));
}

function renderLoans() {
  const oweLoans = DB.loans.filter(l => l.dir === 'owe');
  const lentLoans = DB.loans.filter(l => l.dir === 'lent');
  const oweTotal = oweLoans.reduce((s,l) => s+l.amount, 0);
  const lentTotal = lentLoans.reduce((s,l) => s+l.amount, 0);
  const repaidOut = DB.repayments.filter(r => {
    const loan = DB.loans.find(l => l.id === r.loanId);
    return loan && loan.dir === 'owe';
  }).reduce((s,r) => s+r.amount, 0);
  const repaidIn = DB.repayments.filter(r => {
    const loan = DB.loans.find(l => l.id === r.loanId);
    return loan && loan.dir === 'lent';
  }).reduce((s,r) => s+r.amount, 0);

  document.getElementById('loan-owe-total').textContent = FMT(oweLoans.reduce((s,l)=>s+loanRemaining(l),0));
  document.getElementById('loan-lent-total').textContent = FMT(lentLoans.reduce((s,l)=>s+loanRemaining(l),0));
  document.getElementById('loan-repaid-out').textContent = FMT(repaidOut);
  document.getElementById('loan-repaid-in').textContent = FMT(repaidIn);

  // Populate repay select
  const sel = document.getElementById('repay-loan-select');
  sel.innerHTML = DB.loans.filter(l=>loanRemaining(l)>0).map(l =>
    `<option value="${l.id}">${escHtml(l.person)} — ${FMT(loanRemaining(l))} remaining (${l.dir==='owe'?'I owe':'They owe'})</option>`
  ).join('') || '<option value="">No active loans</option>';

  // Render loan cards
  document.getElementById('loans-owe-list').innerHTML = oweLoans.length
    ? oweLoans.map(l => renderLoanCard(l)).join('') : '<div class="empty-state">No loans recorded.</div>';
  document.getElementById('loans-lent-list').innerHTML = lentLoans.length
    ? lentLoans.map(l => renderLoanCard(l)).join('') : '<div class="empty-state">No loans given.</div>';

  // Repayments
  const repSorted = [...DB.repayments].sort((a,b) => new Date(b.datetime)-new Date(a.datetime));
  document.getElementById('repayment-list').innerHTML = repSorted.length
    ? repSorted.map(r => {
        const loan = DB.loans.find(l => l.id === r.loanId);
        return `<div class="tx-item">
          <div class="tx-icon repay">💸</div>
          <div class="tx-body">
            <div class="tx-name">Repayment — ${escHtml(loan?.person||'?')}</div>
            <div class="tx-meta">${toFullStr(r.datetime)} · ${escHtml(r.notes||'')} <span class="tx-cat-badge">${loan?.dir==='owe'?'I paid':'Received'}</span></div>
          </div>
          <div class="tx-amount repay">${FMT(r.amount)}</div>
          <button class="tx-del" onclick="deleteRecord('repayments','${r.id}')">✕</button>
        </div>`;
      }).join('') : emptyState('No repayments recorded.');
}

function renderLoanCard(loan) {
  const repaid = loanRepaid(loan);
  const remaining = loanRemaining(loan);
  const pct = loan.amount > 0 ? Math.min(100, (repaid / loan.amount) * 100) : 0;
  const isOverdue = loan.dueDate && new Date(loan.dueDate) < now() && remaining > 0;
  const daysLeft = loan.dueDate ? daysBetween(now(), loan.dueDate) : null;
  return `<div class="loan-card loan-${loan.dir}">
    <div class="loan-header">
      <div>
        <div class="loan-person">${escHtml(loan.person)} ${isOverdue ? '<span class="overdue-badge">OVERDUE</span>' : ''}</div>
        <div class="loan-meta">${toDateStr(loan.date)} ${loan.dueDate?`· Due: ${toDateStr(loan.dueDate)}`:''}
          ${loan.interest>0?`· ${loan.interest}% p.a.`:''} ${loan.notes?`· ${escHtml(loan.notes)}`:''}</div>
      </div>
      <div>
        <div class="loan-total">${FMT(loan.amount)}</div>
        <button class="loan-del" onclick="deleteRecord('loans','${loan.id}')">✕ Remove</button>
      </div>
    </div>
    <div class="loan-progress-bar"><div class="loan-progress-fill" style="width:${pct}%"></div></div>
    <div class="loan-meta">${FMT(repaid)} repaid · ${pct.toFixed(0)}% complete
      ${daysLeft !== null ? (daysLeft >= 0 ? ` · ${daysLeft} days left` : ` · ${Math.abs(daysLeft)} days overdue`) : ''}</div>
    <div class="loan-remaining">${loan.dir==='owe'?'Still owe:':'Still owed:'} ${FMT(remaining)}</div>
  </div>`;
}

function saveLoan() {
  const person = document.getElementById('loan-person').value.trim();
  const amount = parseFloat(document.getElementById('loan-amount').value);
  const interest = parseFloat(document.getElementById('loan-interest').value)||0;
  const date = document.getElementById('loan-date').value || toISOLocal().slice(0,10);
  const dueDate = document.getElementById('loan-due').value;
  const notes = document.getElementById('loan-notes').value.trim();
  if (!person) return toast('Enter the person/institution name', 'error');
  if (!amount || amount <= 0) return toast('Enter a valid loan amount', 'error');
  DB.loans.push({ id: uid(), dir: loanDir, person, amount, interest, date, dueDate, notes });
  saveData('loans');
  hideForm('loan-form-card');
  clearForm(['loan-person','loan-amount','loan-interest','loan-due','loan-notes']);
  renderLoans(); updateDashboardKPIs();
  toast(`Loan of ${FMT(amount)} recorded! ✓`);
}

function saveRepayment() {
  const loanId = document.getElementById('repay-loan-select').value;
  const amount = parseFloat(document.getElementById('repay-amount').value);
  const datetime = document.getElementById('repay-date').value || toISOLocal();
  const notes = document.getElementById('repay-notes').value.trim();
  if (!loanId) return toast('Select a loan', 'error');
  if (!amount || amount <= 0) return toast('Enter a valid amount', 'error');
  const loan = DB.loans.find(l => l.id === loanId);
  if (amount > loanRemaining(loan) + 0.01) return toast('Amount exceeds remaining balance', 'error');
  DB.repayments.push({ id: uid(), loanId, amount, datetime, notes });
  saveData('repayments');
  hideForm('repayment-form-card');
  clearForm(['repay-amount','repay-notes']);
  renderLoans(); updateDashboardKPIs();
  toast(`Repayment of ${FMT(amount)} recorded! ✓`);
}

// ===== BUDGETS =====
function renderBudgets() {
  const cont = document.getElementById('budget-list');
  if (!DB.budgets.length) { cont.innerHTML = '<div class="empty-state"><span class="empty-icon">◎</span>No budgets set yet. Set monthly limits per category.</div>'; return; }
  cont.innerHTML = DB.budgets.map(b => {
    const spent = DB.expenses.filter(e => e.category === b.category && isThisMonth(e.datetime)).reduce((s,e) => s+e.amount+e.tax, 0);
    const pct = b.limit > 0 ? Math.min(100, (spent/b.limit)*100) : 0;
    const cls = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : '';
    return `<div class="budget-card">
      <div class="budget-header">
        <span class="budget-cat">${CAT_ICONS[b.category]||'📌'} ${b.category.charAt(0).toUpperCase()+b.category.slice(1)}</span>
        <span class="budget-pct" style="color:${pct>=100?'var(--red)':pct>=75?'var(--orange)':'var(--green)'}">${pct.toFixed(0)}%</span>
        <button class="budget-del" onclick="deleteRecord('budgets','${b.id}')">✕</button>
      </div>
      <div class="budget-bar"><div class="budget-bar-fill ${cls}" style="width:${pct}%"></div></div>
      <div class="budget-amounts">
        <span>Spent: ${FMT(spent)}</span>
        <span>Limit: ${FMT(b.limit)}</span>
      </div>
      <div style="font-size:12px;color:${pct>=100?'var(--red)':'var(--text3)'};margin-top:6px">
        ${pct>=100?`⚠️ Over by ${FMT(spent-b.limit)}`:`Remaining: ${FMT(b.limit-spent)}`}
      </div>
    </div>`;
  }).join('');
}

function saveBudget() {
  const category = document.getElementById('budget-cat').value;
  const limit = parseFloat(document.getElementById('budget-limit').value);
  if (!limit || limit <= 0) return toast('Enter a valid budget limit', 'error');
  const existing = DB.budgets.findIndex(b => b.category === category);
  if (existing >= 0) { DB.budgets[existing].limit = limit; toast(`Budget updated for ${category}! ✓`); }
  else { DB.budgets.push({ id: uid(), category, limit }); toast(`Budget of ${FMT(limit)} set for ${category}! ✓`); }
  saveData('budgets');
  hideForm('budget-form-card');
  renderBudgets();
}

// ===== SAVINGS =====
function renderSavings() {
  const cont = document.getElementById('savings-list');
  if (!DB.savings.length) { cont.innerHTML = '<div class="empty-state"><span class="empty-icon">◈</span>No savings goals yet. Create a goal to start saving!</div>'; return; }
  // Populate add-funds select
  const sel = document.getElementById('sv-add-select');
  sel.innerHTML = DB.savings.map(g => `<option value="${g.id}">${escHtml(g.name)} — ${FMT(g.target - g.current)} left</option>`).join('');
  cont.innerHTML = DB.savings.map(g => {
    const pct = g.target > 0 ? Math.min(100, (g.current/g.target)*100) : 0;
    const done = pct >= 100;
    const daysLeft = g.targetDate ? daysBetween(now(), g.targetDate) : null;
    const monthly = g.targetDate && daysLeft > 0 ? (g.target-g.current)/(daysLeft/30) : null;
    return `<div class="savings-card ${done?'savings-complete':''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="savings-name">${escHtml(g.name)}</div>
        ${done?'<span class="complete-badge">✓ COMPLETE</span>':''}
      </div>
      <div class="savings-target">Target: ${FMT(g.target)}${g.targetDate?` · Due ${toDateStr(g.targetDate)}`:''}${g.notes?` · ${escHtml(g.notes)}`:''}</div>
      <div class="savings-bar"><div class="savings-bar-fill" style="width:${pct}%"></div></div>
      <div class="savings-amounts">
        <span class="savings-current">${FMT(g.current)} saved</span>
        <span class="savings-remaining">${done?'Goal reached! 🎉':'Need '+FMT(g.target-g.current)}</span>
      </div>
      ${monthly?`<div style="font-size:11px;color:var(--text3);margin-bottom:10px">Save ${FMT(monthly)}/month to reach goal</div>`:''}
      <div class="savings-actions">
        <button class="savings-add-btn" onclick="openAddFunds('${g.id}')">+ Add Funds</button>
        <button class="savings-del" onclick="deleteRecord('savings','${g.id}')">Remove</button>
      </div>
    </div>`;
  }).join('');
}

function saveSavingsGoal() {
  const name = document.getElementById('sv-name').value.trim();
  const target = parseFloat(document.getElementById('sv-target').value);
  const current = parseFloat(document.getElementById('sv-current').value)||0;
  const targetDate = document.getElementById('sv-date').value;
  const notes = document.getElementById('sv-notes').value.trim();
  if (!name) return toast('Enter a goal name', 'error');
  if (!target || target <= 0) return toast('Enter a valid target amount', 'error');
  DB.savings.push({ id: uid(), name, target, current, targetDate, notes });
  saveData('savings');
  hideForm('savings-form-card');
  clearForm(['sv-name','sv-target','sv-current','sv-notes']);
  renderSavings();
  toast(`Savings goal "${name}" created! ✓`);
}

function openAddFunds(id) {
  document.getElementById('sv-add-select').value = id;
  document.getElementById('savings-add-form').classList.remove('hidden');
  document.getElementById('savings-add-form').scrollIntoView({behavior:'smooth'});
}

function saveAddFunds() {
  const id = document.getElementById('sv-add-select').value;
  const amount = parseFloat(document.getElementById('sv-add-amount').value);
  if (!amount || amount <= 0) return toast('Enter a valid amount', 'error');
  const goal = DB.savings.find(g => g.id === id);
  if (!goal) return toast('Goal not found', 'error');
  goal.current = Math.min(goal.target, goal.current + amount);
  saveData('savings');
  hideForm('savings-add-form');
  clearForm(['sv-add-amount']);
  renderSavings();
  toast(`${FMT(amount)} added to "${goal.name}"! ✓`);
}

// ===== BILLS =====
function renderBills() {
  const today = new Date(); today.setHours(0,0,0,0);
  const in7days = new Date(today); in7days.setDate(today.getDate()+7);
  const overdue = DB.bills.filter(b => b.status!=='paid' && new Date(b.dueDate) < today);
  const dueSoon = DB.bills.filter(b => b.status!=='paid' && new Date(b.dueDate) >= today && new Date(b.dueDate) <= in7days);

  const alertEl = document.getElementById('bills-alert');
  if (overdue.length || dueSoon.length) {
    alertEl.classList.add('visible');
    alertEl.textContent = `⚠️ ${overdue.length} overdue bill(s), ${dueSoon.length} due within 7 days`;
  } else {
    alertEl.classList.remove('visible');
  }

  const sorted = [...DB.bills].sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate));
  const cont = document.getElementById('bills-list');
  cont.innerHTML = sorted.length ? sorted.map(b => {
    const dDue = new Date(b.dueDate); dDue.setHours(0,0,0,0);
    const isOv = b.status !== 'paid' && dDue < today;
    const isSoon = b.status !== 'paid' && dDue >= today && dDue <= in7days;
    const cls = b.status === 'paid' ? 'paid' : isOv ? 'overdue' : isSoon ? 'due-soon' : '';
    const daysText = b.status === 'paid' ? 'Paid' : isOv ? `${daysBetween(dDue, today)} day(s) overdue` : `Due in ${daysBetween(today, dDue)} day(s)`;
    return `<div class="bill-card ${cls}">
      <div class="bill-status-dot"></div>
      <div class="bill-body">
        <div class="bill-name">${escHtml(b.name)}</div>
        <div class="bill-meta">${toDateStr(b.dueDate)} · ${b.recurrence} · ${b.category} · ${daysText}</div>
      </div>
      <div class="bill-amount">${FMT(b.amount)}</div>
      <div class="bill-actions">
        ${b.status!=='paid'?`<button class="bill-mark-paid" onclick="markBillPaid('${b.id}')">✓ Paid</button>`:''}
        <button class="bill-del" onclick="deleteRecord('bills','${b.id}')">✕</button>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><span class="empty-icon">◷</span>No bills added yet.</div>';
}

function saveBill() {
  const name = document.getElementById('bill-name').value.trim();
  const amount = parseFloat(document.getElementById('bill-amount').value);
  const dueDate = document.getElementById('bill-due').value;
  const recurrence = document.getElementById('bill-recur').value;
  const category = document.getElementById('bill-cat').value;
  const status = document.getElementById('bill-status').value;
  if (!name) return toast('Enter a bill name', 'error');
  if (!amount || amount <= 0) return toast('Enter a valid amount', 'error');
  if (!dueDate) return toast('Select a due date', 'error');
  DB.bills.push({ id: uid(), name, amount, dueDate, recurrence, category, status });
  saveData('bills');
  hideForm('bill-form-card');
  clearForm(['bill-name','bill-amount','bill-due']);
  renderBills();
  toast(`Bill "${name}" added! ✓`);
}

function markBillPaid(id) {
  const bill = DB.bills.find(b => b.id === id);
  if (!bill) return;
  bill.status = 'paid';
  // Auto-create expense record
  DB.expenses.push({ id: uid(), description: `Bill: ${bill.name}`, amount: bill.amount, tax: 0, category: bill.category, method: 'bank', datetime: toISOLocal(), notes: 'Auto from bill payment' });
  saveData('expenses'); saveData('bills');
  renderBills(); updateDashboardKPIs();
  toast(`Bill "${bill.name}" marked as paid & recorded! ✓`);
}

// ===== NET WORTH =====
let nwType = 'asset';
function renderNetWorth() {
  const assets = DB.networth.filter(n => n.type === 'asset');
  const debts = DB.networth.filter(n => n.type === 'debt');
  const totalAssets = assets.reduce((s,n) => s+n.value, 0);
  const totalDebts = debts.reduce((s,n) => s+n.value, 0);
  const net = totalAssets - totalDebts;
  document.getElementById('nw-total-assets').textContent = FMT(totalAssets);
  document.getElementById('nw-total-debts').textContent = FMT(totalDebts);
  document.getElementById('nw-net-value').textContent = FMT(net);
  document.getElementById('nw-net-value').style.color = net >= 0 ? 'var(--green)' : 'var(--red)';
  const renderList = (items, cont) => {
    document.getElementById(cont).innerHTML = items.length
      ? items.map(n => `<div class="nw-item ${n.type}">
          <div><div class="nw-item-name">${CAT_ICONS[n.category]||'📌'} ${escHtml(n.name)}</div><div class="nw-item-cat">${n.category}</div></div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="nw-item-val">${FMT(n.value)}</span>
            <button class="nw-item-del" onclick="deleteRecord('networth','${n.id}')">✕</button>
          </div>
        </div>`).join('')
      : '<div style="color:var(--text3);font-size:13px;padding:12px">Nothing here yet.</div>';
  };
  renderList(assets, 'assets-list');
  renderList(debts, 'debts-list');
}

function saveNetWorth() {
  const name = document.getElementById('nw-name').value.trim();
  const value = parseFloat(document.getElementById('nw-value').value);
  const category = document.getElementById('nw-cat').value;
  if (!name) return toast('Enter a name', 'error');
  if (!value || value <= 0) return toast('Enter a valid value', 'error');
  DB.networth.push({ id: uid(), type: nwType, name, value, category });
  saveData('networth');
  hideForm('asset-form-card');
  clearForm(['nw-name','nw-value']);
  renderNetWorth();
  toast(`${nwType === 'asset' ? 'Asset' : 'Debt'} "${name}" saved! ✓`);
}

// ===== LIVE KPI UPDATE =====
function updateDashboardKPIs() {
  if (currentPage === 'dashboard') renderDashboard();
}

// ===== GENERIC DELETE =====
function deleteRecord(key, id) {
  if (!confirm('Delete this record?')) return;
  DB[key] = DB[key].filter(r => r.id !== id);
  saveData(key);
  renderPage(currentPage);
  updateDashboardKPIs();
  toast('Deleted', 'info');
}

// ===== UTILS =====
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function clearForm(ids) { ids.forEach(id => { const el=document.getElementById(id); if(el){el.value='';} }); }
function hideForm(id) { document.getElementById(id).classList.add('hidden'); }
function showForm(id) {
  document.getElementById(id).classList.remove('hidden');
  document.getElementById(id).scrollIntoView({behavior:'smooth'});
}

// ===== FORM TOGGLE HELPERS =====
function setToggle(btnA, btnB, valA, valB, onSwitch) {
  document.getElementById(btnA).addEventListener('click', () => {
    document.getElementById(btnA).classList.add('active');
    document.getElementById(btnB).classList.remove('active');
    onSwitch(valA);
  });
  document.getElementById(btnB).addEventListener('click', () => {
    document.getElementById(btnB).classList.add('active');
    document.getElementById(btnA).classList.remove('active');
    onSwitch(valB);
  });
}

// ===== INIT =====
function init() {
  loadAll();

  // Splash
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    navigate('dashboard');
    updateClock();
    setInterval(updateClock, 1000);
  }, 1800);

  // Nav links
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.page); });
  });

  // Mobile menu
  document.getElementById('menu-toggle').addEventListener('click', openSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  // Quick add
  document.getElementById('quick-add-btn').addEventListener('click', () => {
    document.getElementById('quick-modal').classList.remove('hidden');
  });
  document.getElementById('close-quick-modal').addEventListener('click', () => {
    document.getElementById('quick-modal').classList.add('hidden');
  });
  document.getElementById('quick-modal').querySelector('.modal-backdrop').addEventListener('click', () => {
    document.getElementById('quick-modal').classList.add('hidden');
  });
  document.querySelectorAll('.quick-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('quick-modal').classList.add('hidden');
      navigate(btn.dataset.target);
      setTimeout(() => {
        const addBtn = document.getElementById(`add-${btn.dataset.target.replace('s','')}-btn`) ||
                       document.getElementById(`add-${btn.dataset.target}-btn`);
        if (addBtn) addBtn.click();
      }, 200);
    });
  });

  // Period tabs
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      updatePeriod(btn.dataset.period);
    });
  });

  // INCOME
  document.getElementById('add-income-btn').addEventListener('click', () => {
    document.getElementById('inc-datetime').value = toISOLocal();
    showForm('income-form-card');
  });
  document.getElementById('cancel-income-btn').addEventListener('click', () => hideForm('income-form-card'));
  document.getElementById('save-income-btn').addEventListener('click', saveIncome);
  document.getElementById('inc-filter-cat').addEventListener('change', renderIncome);

  // EXPENSES
  document.getElementById('add-expense-btn').addEventListener('click', () => {
    document.getElementById('exp-datetime').value = toISOLocal();
    showForm('expense-form-card');
  });
  document.getElementById('cancel-expense-btn').addEventListener('click', () => hideForm('expense-form-card'));
  document.getElementById('save-expense-btn').addEventListener('click', saveExpense);
  document.getElementById('exp-filter-cat').addEventListener('change', renderExpenses);

  // LOANS
  document.getElementById('add-loan-btn').addEventListener('click', () => {
    document.getElementById('loan-date').value = toISOLocal().slice(0,10);
    showForm('loan-form-card');
  });
  document.getElementById('cancel-loan-btn').addEventListener('click', () => hideForm('loan-form-card'));
  document.getElementById('save-loan-btn').addEventListener('click', saveLoan);
  setToggle('loan-dir-owe','loan-dir-lent','owe','lent', v => {
    loanDir = v;
    document.getElementById('loan-person-label').textContent = v==='owe'?'Lender Name':'Borrower Name';
  });
  document.getElementById('add-repayment-btn').addEventListener('click', () => {
    document.getElementById('repay-date').value = toISOLocal();
    showForm('repayment-form-card');
  });
  document.getElementById('cancel-repay-btn').addEventListener('click', () => hideForm('repayment-form-card'));
  document.getElementById('save-repay-btn').addEventListener('click', saveRepayment);

  // BUDGET
  document.getElementById('add-budget-btn').addEventListener('click', () => showForm('budget-form-card'));
  document.getElementById('cancel-budget-btn').addEventListener('click', () => hideForm('budget-form-card'));
  document.getElementById('save-budget-btn').addEventListener('click', saveBudget);

  // SAVINGS
  document.getElementById('add-savings-btn').addEventListener('click', () => showForm('savings-form-card'));
  document.getElementById('cancel-savings-btn').addEventListener('click', () => hideForm('savings-form-card'));
  document.getElementById('save-savings-btn').addEventListener('click', saveSavingsGoal);
  document.getElementById('cancel-sv-add-btn').addEventListener('click', () => hideForm('savings-add-form'));
  document.getElementById('save-sv-add-btn').addEventListener('click', saveAddFunds);

  // BILLS
  document.getElementById('add-bill-btn').addEventListener('click', () => showForm('bill-form-card'));
  document.getElementById('cancel-bill-btn').addEventListener('click', () => hideForm('bill-form-card'));
  document.getElementById('save-bill-btn').addEventListener('click', saveBill);

  // NET WORTH
  document.getElementById('add-asset-btn').addEventListener('click', () => showForm('asset-form-card'));
  document.getElementById('cancel-asset-btn').addEventListener('click', () => hideForm('asset-form-card'));
  document.getElementById('save-asset-btn').addEventListener('click', saveNetWorth);
  setToggle('nw-type-asset','nw-type-debt','asset','debt', v => { nwType = v; });

  // Keyboard shortcut: I = income, E = expense, ESC = close forms
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'i' || e.key === 'I') { navigate('income'); setTimeout(()=>document.getElementById('add-income-btn').click(), 200); }
    if (e.key === 'e' || e.key === 'E') { navigate('expenses'); setTimeout(()=>document.getElementById('add-expense-btn').click(), 200); }
    if (e.key === 'Escape') {
      document.getElementById('quick-modal').classList.add('hidden');
      document.querySelectorAll('.form-card').forEach(f=>f.classList.add('hidden'));
    }
  });

  // Auto-refresh budget alerts
  setInterval(() => { if(currentPage==='budget') renderBudgets(); if(currentPage==='dashboard') updateDashboardKPIs(); }, 60000);
}

document.addEventListener('DOMContentLoaded', init);

// ===== SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
