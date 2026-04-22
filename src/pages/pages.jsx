// ── Expenses.jsx ──
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ExpenseRow, fmt } from '../components/index.jsx'

export function Expenses() {
  const navigate = useNavigate()
  const { fetchExpenses, removeExpense, expenses, members, paymentTypes, currency, gid } = useApp()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('')
  const [pay, setPay] = useState('')
  const [member, setMember] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')

  useEffect(() => { fetchExpenses() }, [gid])

  useEffect(() => {
    const h = () => setSearch(sessionStorage.getItem('gk_search') || '')
    window.addEventListener('gk_search', h)
    return () => window.removeEventListener('gk_search', h)
  }, [])

  let list = [...expenses]
  if (search) list = list.filter(e => e.desc?.toLowerCase().includes(search.toLowerCase()) || e.notes?.toLowerCase().includes(search.toLowerCase()))
  if (cat) list = list.filter(e => e.category === cat)
  if (pay) list = list.filter(e => e.paymentType === pay)
  if (member) list = list.filter(e => e.paidBy === member)
  if (min) list = list.filter(e => Number(e.amount) >= Number(min))
  if (max) list = list.filter(e => Number(e.amount) <= Number(max))

  const exportCSV = () => {
    const header = 'date,time,description,amount,currency,category,paymentType,paidBy,shared,notes'
    const rows = list.map(e => `${e.date},${e.time || ''},${e.desc},${e.amount},${e.currency || currency},${e.category},${e.paymentType || ''},${e.paidBy || ''},${e.shared || ''},${e.notes || ''}`)
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gharKharcha.csv'; a.click()
  }

  return (
    <div className="view active">
      <div className="filter-bar">
        <input className="fi" type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 180 }} />
        <select className="fi" style={{ width: 130 }} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">All categories</option>
          {['Groceries', 'Utilities', 'Transport', 'Entertainment', 'Medical', 'Construction', 'Other'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="fi" style={{ width: 130 }} value={pay} onChange={e => setPay(e.target.value)}>
          <option value="">All payment types</option>
          {paymentTypes.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="fi" style={{ width: 130 }} value={member} onChange={e => setMember(e.target.value)}>
          <option value="">All members</option>
          {members.map(m => <option key={m.email}>{m.name}</option>)}
        </select>
        <input className="fi" type="number" placeholder="Min ₹" value={min} onChange={e => setMin(e.target.value)} style={{ width: 90 }} />
        <input className="fi" type="number" placeholder="Max ₹" value={max} onChange={e => setMax(e.target.value)} style={{ width: 90 }} />
        <button className="btn-ghost" onClick={() => { setSearch(''); setCat(''); setPay(''); setMember(''); setMin(''); setMax('') }}>Clear</button>
      </div>
      <div className="panel" style={{ marginTop: '.75rem' }}>
        <div className="panel-hd">
          <div className="pt">All expenses <span className="exp-count">({list.length})</span></div>
          <button className="btn-ghost" onClick={exportCSV}>Export CSV</button>
        </div>
        <div className="exp-list">
          {list.length === 0
            ? <div className="empty">No expenses found</div>
            : list.slice(0, 50).map(e => (
              <ExpenseRow key={e.expenseId || e.id} expense={e} currency={currency}
                onEdit={() => navigate(`/add/${e.expenseId || e.id}`, { state: { expense: e } })}
                onDelete={() => removeExpense(e.expenseId || e.id)}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

// ── CashFlow.jsx ──
import { useEffect as ueEffect, useState as usState } from 'react'
import { useApp as uApp } from '../context/AppContext'
import { fmt as f2, todayStr as tStr } from '../components/index.jsx'

export function CashFlow() {
  const { fetchCashFlow, addCashFlow, cashflow, currency, gid } = uApp()
  const [inForm, setInForm] = usState({ amount: '', desc: '', date: tStr(), time: '' })
  const [outForm, setOutForm] = usState({ amount: '', desc: '', date: tStr(), time: '' })

  useEffect(() => { fetchCashFlow() }, [gid])

  const totalIn = cashflow.filter(e => e.cfType === 'in').reduce((s, e) => s + Number(e.amount), 0)
  const totalOut = cashflow.filter(e => e.cfType === 'out').reduce((s, e) => s + Number(e.amount), 0)
  const balance = totalIn - totalOut

  const save = async (type) => {
    const form = type === 'in' ? inForm : outForm
    if (!form.amount || Number(form.amount) <= 0) return
    if (!form.desc.trim()) return
    await addCashFlow({ ...form, amount: Number(form.amount), cfType: type, category: 'Cash Flow', paymentType: 'Cash' })
    if (type === 'in') setInForm({ amount: '', desc: '', date: tStr(), time: '' })
    else setOutForm({ amount: '', desc: '', date: tStr(), time: '' })
  }

  return (
    <div className="view active">
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="metric green"><div className="ml">Total cash in</div><div className="mv">{f2(totalIn, currency)}</div></div>
        <div className="metric red"><div className="ml">Total cash out</div><div className="mv">{f2(totalOut, currency)}</div></div>
        <div className="metric accent"><div className="ml">Net balance</div><div className="mv">{f2(balance, currency)}</div></div>
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-hd"><div className="pt">Add cash in</div></div>
          <div className="fg"><label className="fl">Amount</label><input className="fi" type="number" value={inForm.amount} onChange={e => setInForm(f => ({ ...f, amount: e.target.value }))} placeholder="₹0" /></div>
          <div className="fg"><label className="fl">Source / description</label><input className="fi" type="text" value={inForm.desc} onChange={e => setInForm(f => ({ ...f, desc: e.target.value }))} placeholder="e.g. Salary, rent received" /></div>
          <div className="f2">
            <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={inForm.date} onChange={e => setInForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="fg"><label className="fl">Time (optional)</label><input className="fi" type="time" value={inForm.time} onChange={e => setInForm(f => ({ ...f, time: e.target.value }))} /></div>
          </div>
          <button className="btn-green" onClick={() => save('in')}>+ Add cash in</button>
        </div>
        <div className="panel">
          <div className="panel-hd"><div className="pt">Add cash out</div></div>
          <div className="fg"><label className="fl">Amount</label><input className="fi" type="number" value={outForm.amount} onChange={e => setOutForm(f => ({ ...f, amount: e.target.value }))} placeholder="₹0" /></div>
          <div className="fg"><label className="fl">Purpose / description</label><input className="fi" type="text" value={outForm.desc} onChange={e => setOutForm(f => ({ ...f, desc: e.target.value }))} placeholder="e.g. Paid vendor, gave loan" /></div>
          <div className="f2">
            <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={outForm.date} onChange={e => setOutForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="fg"><label className="fl">Time (optional)</label><input className="fi" type="time" value={outForm.time} onChange={e => setOutForm(f => ({ ...f, time: e.target.value }))} /></div>
          </div>
          <button className="btn-red" onClick={() => save('out')}>− Add cash out</button>
        </div>
      </div>
      <div className="panel">
        <div className="pt" style={{ marginBottom: '.75rem' }}>Cash flow history</div>
        <div className="exp-list">
          {cashflow.length === 0
            ? <div className="empty">No cash flow entries yet</div>
            : cashflow.slice(0, 30).map((e, i) => (
              <div key={i} className="cf-row">
                <div className={`exp-ic ${e.cfType === 'in' ? 'cf-in-ic' : 'cf-out-ic'}`}>{e.cfType === 'in' ? '↓' : '↑'}</div>
                <div><div className="exp-name">{e.desc}</div><div className="exp-meta">{e.cfType === 'in' ? 'Cash received' : 'Cash paid out'}</div></div>
                <div className="exp-date">{e.date}{e.time ? ' ' + e.time : ''}</div>
                <div className={e.cfType === 'in' ? 'cf-in-amt' : 'cf-out-amt'}>{e.cfType === 'in' ? '+' : '-'}{currency}{Number(e.amount).toLocaleString('en-IN')}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ── Members.jsx ──
import { useEffect as uE2, useState as uS2 } from 'react'
import { useApp as uA2 } from '../context/AppContext'
import { fmt as f3 } from '../components/index.jsx'

export function Members() {
  const { fetchMembers, addMember, members, expenses, currency, gid, showToast } = uA2()
  const [name, setName] = uS2('')
  const [email, setEmail] = uS2('')
  const [role, setRole] = uS2('member')
  const [link, setLink] = uS2('')

  uE2(() => { fetchMembers() }, [gid])

  const handleAdd = async () => {
    if (!name.trim() || !email.includes('@')) { showToast('Enter valid name and Gmail'); return }
    const ok = await addMember(name.trim(), email.trim(), role)
    if (ok) { setName(''); setEmail('') }
  }

  const genLink = () => {
    const l = `${window.location.origin}?join=${gid}`
    setLink(l)
    navigator.clipboard.writeText(l).then(() => showToast('Invite link copied!'))
  }

  return (
    <div className="view active">
      <div className="members-grid">
        {members.length === 0
          ? <div className="empty" style={{ gridColumn: '1/-1' }}>No members yet. Create a group and invite people!</div>
          : members.map(m => {
            const spent = expenses.filter(e => e.paidBy === m.name).reduce((s, e) => s + Number(e.amount), 0)
            return (
              <div key={m.email} className="mem-card">
                <div className="mem-head">
                  <div className="mem-av" style={{ background: m.color, color: m.textColor }}>{m.initials}</div>
                  <div><div className="mem-name">{m.name}</div><div className="mem-email">{m.email}</div><span className="mem-role-badge">{m.role}</span></div>
                </div>
                <div className="mem-stats">Spent: <strong>{f3(spent, currency)}</strong> · {expenses.filter(e => e.paidBy === m.name).length} expenses</div>
              </div>
            )
          })}
      </div>
      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-hd"><div className="pt">Invite to group</div></div>
        <div className="invite-box">
          <div className="invite-link-row">
            <input className="fi" type="text" value={link} readOnly placeholder="Generate invite link..." style={{ flex: 1 }} />
            <button className="btn-save" onClick={genLink}>Generate & copy link</button>
          </div>
          <div className="invite-sep">or invite by email</div>
          <div className="invite-email-row">
            <input className="fi" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={{ width: 130 }} />
            <input className="fi" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Gmail address" style={{ flex: 1 }} />
            <select className="fi" value={role} onChange={e => setRole(e.target.value)} style={{ width: 120 }}>
              <option value="member">Member</option><option value="admin">Admin</option><option value="view">View only</option>
            </select>
            <button className="btn-save" onClick={handleAdd}>Add</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Settle.jsx ──
import { useEffect as uE3, useState as uS3 } from 'react'
import { useApp as uA3 } from '../context/AppContext'
import { fmt as f4 } from '../components/index.jsx'

export function Settle() {
  const { fetchExpenses, expenses, members, currency, gid, showToast } = uA3()
  const [from, setFrom] = uS3('')
  const [to, setTo] = uS3('')
  const [amount, setAmount] = uS3('')
  const [note, setNote] = uS3('')

  uE3(() => { fetchExpenses() }, [gid])

  const balances = {}
  members.forEach(m => balances[m.name] = 0)
  expenses.filter(e => e.shared && e.shared !== 'none').forEach(e => {
    const sharedWith = members.filter(m => m.name !== e.paidBy)
    const splitAmt = Number(e.amount) / (sharedWith.length + 1)
    if (balances[e.paidBy] !== undefined) balances[e.paidBy] += splitAmt * sharedWith.length
    sharedWith.forEach(m => { if (balances[m.name] !== undefined) balances[m.name] -= splitAmt })
  })

  const owes = []
  const creditors = Object.entries(balances).filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1])
  Object.entries(balances).filter(([, v]) => v < -1).forEach(([person, bal]) => {
    if (creditors[0]) owes.push({ from: person, to: creditors[0][0], amount: Math.abs(bal).toFixed(0) })
  })

  return (
    <div className="view active">
      <div className="panel">
        <div className="pt" style={{ marginBottom: '1rem' }}>Who owes whom</div>
        {owes.length === 0
          ? <div className="empty">All settled up! No pending balances 🎉</div>
          : owes.map((o, i) => (
            <div key={i} className="settle-row">
              <div className="settle-text">{o.from} owes {o.to}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="settle-amt">{f4(o.amount, currency)}</div>
                <button className="settle-ok" onClick={() => showToast('Marked as settled!')}>Settled ✓</button>
              </div>
            </div>
          ))}
      </div>
      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="pt" style={{ marginBottom: '1rem' }}>Mark as settled manually</div>
        <div className="f2">
          <div className="fg"><label className="fl">From</label><select className="fi" value={from} onChange={e => setFrom(e.target.value)}>{members.map(m => <option key={m.email}>{m.name}</option>)}</select></div>
          <div className="fg"><label className="fl">To</label><select className="fi" value={to} onChange={e => setTo(e.target.value)}>{members.map(m => <option key={m.email}>{m.name}</option>)}</select></div>
        </div>
        <div className="fg"><label className="fl">Amount</label><input className="fi" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹0" /></div>
        <div className="fg"><label className="fl">Note (optional)</label><input className="fi" type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Paid via UPI" /></div>
        <button className="btn-save" onClick={() => { showToast(`${from} → ${to}: ${f4(amount, currency)} settled`); setAmount(''); setNote('') }}>Mark as settled</button>
      </div>
    </div>
  )
}

// ── Reports.jsx ──
import { useEffect as uE4 } from 'react'
import { Bar as BarChart, Doughnut as DoughnutChart } from 'react-chartjs-2'
import { useApp as uA4 } from '../context/AppContext'
import { ExpenseRow as ER, fmt as f5 } from '../components/index.jsx'
import { useNavigate as uNav } from 'react-router-dom'

const CAT_COLORS2 = { Groceries: '#3b82f6', Utilities: '#10b981', Transport: '#f59e0b', Entertainment: '#ec4899', Medical: '#8b5cf6', Construction: '#f97316', Other: '#6b7280' }
const CATS2 = Object.keys(CAT_COLORS2)

export function Reports() {
  const navigate = uNav()
  const { fetchExpenses, removeExpense, expenses, members, currency, gid } = uA4()
  uE4(() => { fetchExpenses() }, [gid])

  const year = new Date().getFullYear()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mData = months.map((_, i) => expenses.filter(e => e.date?.startsWith(`${year}-${String(i + 1).padStart(2, '0')}`)).reduce((s, e) => s + Number(e.amount), 0))
  const cData = CATS2.map(c => expenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0))
  const mNames = members.map(m => m.name)
  const meData = mNames.map(n => expenses.filter(e => e.paidBy === n).reduce((s, e) => s + Number(e.amount), 0))
  const recurring = expenses.filter(e => e.recurring && e.recurring !== 'none')

  return (
    <div className="view active">
      <div className="panel" style={{ marginBottom: '1rem' }}>
        <div className="pt">Monthly comparison {year}</div>
        <div className="chart-wrap" style={{ height: 240 }}>
          <BarChart data={{ labels: months, datasets: [{ data: mData, backgroundColor: '#1d4ed8', borderRadius: 5, borderSkipped: false }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${currency}${Number(ctx.raw).toLocaleString('en-IN')}` } } }, scales: { y: { ticks: { callback: v => `${currency}${(v / 1000).toFixed(0)}k`, font: { size: 11 } }, grid: { color: 'rgba(128,128,128,.1)' } }, x: { ticks: { font: { size: 11 } }, grid: { display: false } } } }} />
        </div>
      </div>
      <div className="two-col">
        <div className="panel"><div className="pt">Top categories</div><div className="chart-wrap"><BarChart data={{ labels: CATS2, datasets: [{ data: cData, backgroundColor: CATS2.map(c => CAT_COLORS2[c]), borderRadius: 5, borderSkipped: false }] }} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: v => `${currency}${(v / 1000).toFixed(0)}k`, font: { size: 11 } }, grid: { color: 'rgba(128,128,128,.1)' } }, y: { ticks: { font: { size: 11 } }, grid: { display: false } } } }} /></div></div>
        {members.length > 0 && <div className="panel"><div className="pt">Per member</div><div className="chart-wrap"><DoughnutChart data={{ labels: mNames, datasets: [{ data: meData, backgroundColor: members.map(m => m.textColor || '#3b82f6'), borderWidth: 3, borderColor: 'transparent' }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } } } }} /></div></div>}
      </div>
      {recurring.length > 0 && <div className="panel" style={{ marginTop: '1rem' }}><div className="pt" style={{ marginBottom: '.75rem' }}>Recurring expenses</div><div className="exp-list">{recurring.map(e => <ER key={e.expenseId || e.id} expense={e} currency={currency} onEdit={() => navigate(`/add/${e.expenseId || e.id}`, { state: { expense: e } })} onDelete={() => removeExpense(e.expenseId || e.id)} />)}</div></div>}
    </div>
  )
}

// ── Settings.jsx ──
import { useState as uS5 } from 'react'
import { useApp as uA5 } from '../context/AppContext'

const CATS3 = ['Groceries', 'Utilities', 'Transport', 'Entertainment', 'Medical', 'Construction', 'Other']
const CAT_ICONS2 = { Groceries: '🛒', Utilities: '⚡', Transport: '🚗', Entertainment: '🎬', Medical: '💊', Construction: '🏗️', Other: '📋' }
const DEFAULT_PT_COUNT = 6

export function Settings() {
  const { paymentTypes, addPaymentType, deletePaymentType, budgets, setBudgets, theme, setTheme, currency, setCurrency, groups, currentGroup, deleteGroup } = uA5()
  const [newPay, setNewPay] = uS5('')

  return (
    <div className="view active">
      <div className="two-col">
        <div className="panel">
          <div className="pt" style={{ marginBottom: '1rem' }}>Payment types</div>
          {paymentTypes.map((p, i) => (
            <div key={p} className="pay-type-item">
              <span className="pay-type-name">{p}{i < DEFAULT_PT_COUNT && <span className="pay-default-badge">default</span>}</span>
              {i >= DEFAULT_PT_COUNT && <button className="pay-del-btn" onClick={() => deletePaymentType(i)}>✕</button>}
            </div>
          ))}
          <div className="f2" style={{ marginTop: '.75rem' }}>
            <input className="fi" type="text" value={newPay} onChange={e => setNewPay(e.target.value)} placeholder="Add type (e.g. PhonePe)" onKeyDown={e => { if (e.key === 'Enter') { addPaymentType(newPay); setNewPay('') } }} />
            <button className="btn-save" onClick={() => { addPaymentType(newPay); setNewPay('') }}>Add</button>
          </div>
        </div>
        <div className="panel">
          <div className="pt" style={{ marginBottom: '1rem' }}>Appearance & preferences</div>
          <div className="setting-row">
            <div><div className="setting-label">Dark mode</div><div className="setting-sub">Switch between light and dark</div></div>
            <label className="toggle"><input type="checkbox" checked={theme === 'dark'} onChange={e => setTheme(e.target.checked ? 'dark' : 'light')} /><span className="toggle-slider" /></label>
          </div>
          <div className="setting-row" style={{ marginTop: '1rem' }}>
            <div className="setting-label">Default currency</div>
            <select className="fi" style={{ width: 100 }} value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="₹">₹ INR</option><option value="$">$ USD</option><option value="€">€ EUR</option>
            </select>
          </div>
          <div className="pt" style={{ marginBottom: '.75rem', marginTop: '1.25rem' }}>My groups</div>
          {groups.length === 0 ? <div className="empty" style={{ padding: '.5rem 0' }}>No groups yet</div> : groups.map(g => (
            <div key={g.groupId} className="my-group-item">
              <div><div className="group-item-name">{g.icon} {g.name}</div><div className="group-item-type">{g.type} · {g.members?.length || 1} members</div></div>
              <button className="pay-del-btn" onClick={() => deleteGroup(g.groupId)}>✕</button>
            </div>
          ))}
        </div>
      </div>
      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="pt" style={{ marginBottom: '1rem' }}>Monthly budget limits</div>
        <div className="budget-grid">
          {CATS3.map(cat => {
            const limit = budgets[cat] || 0
            return (
              <div key={cat} className="budget-item">
                <div className="budget-cat">{CAT_ICONS2[cat]} {cat}</div>
                <div className="budget-input-wrap">
                  <input className="budget-input" type="number" value={limit || ''} placeholder="No limit" onChange={e => setBudgets(b => ({ ...b, [cat]: Number(e.target.value) }))} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Scan.jsx ──
import { useState as uS6 } from 'react'
import { useNavigate as uN6 } from 'react-router-dom'
import { useApp as uA6 } from '../context/AppContext'
import { todayStr as tS6 } from '../components/index.jsx'

export function Scan() {
  const navigate = uN6()
  const { addExpense, user, members, currency } = uA6()
  const [preview, setPreview] = uS6(null)
  const [ocr, setOcr] = uS6(null)
  const [fields, setFields] = uS6({ desc: '', amount: '', date: tS6(), cat: 'Groceries' })
  const [show, setShow] = uS6(false)

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)
    setOcr('Scanning...')
    setTimeout(() => {
      const amt = Math.floor(Math.random() * 3000) + 200
      setOcr(`Detected: ₹${amt.toLocaleString('en-IN')} · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`)
      setFields(f => ({ ...f, amount: amt, date: tS6() }))
      setShow(true)
    }, 1800)
  }

  const handleSave = async () => {
    if (!fields.amount) return
    const me = members.find(m => m.email === user?.email)
    await addExpense({ desc: fields.desc || 'Scanned receipt', amount: Number(fields.amount), currency, date: fields.date, category: fields.cat, paymentType: 'Cash', paidBy: me?.name || user?.name?.split(' ')[0] || 'Me', notes: 'Scanned receipt' })
    navigate('/dashboard')
  }

  return (
    <div className="view active">
      <div className="form-card">
        <div className="form-title">Scan receipt</div>
        <div className="scan-zone" onClick={() => document.getElementById('rf').click()}>
          <input id="rf" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          <svg viewBox="0 0 48 48" fill="none" width="44" height="44"><rect x="4" y="10" width="40" height="30" rx="7" stroke="currentColor" strokeWidth="2" /><circle cx="24" cy="25" r="8" stroke="currentColor" strokeWidth="2" /><path d="M16 4h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
          <div className="scan-zone-label">Tap to open camera or upload photo</div>
          <div className="scan-zone-sub">OCR reads amount & date automatically</div>
        </div>
        {ocr && <div className="ocr-ok"><span>✓</span><span>{ocr}</span></div>}
        {preview && <div className="receipt-prev"><img src={preview} alt="Receipt" /></div>}
        {show && <>
          <div className="fg"><label className="fl">Description</label><input className="fi" type="text" value={fields.desc} onChange={e => setFields(f => ({ ...f, desc: e.target.value }))} placeholder="e.g. D-Mart groceries" /></div>
          <div className="f2">
            <div className="fg"><label className="fl">Amount</label><input className="fi" type="number" value={fields.amount} onChange={e => setFields(f => ({ ...f, amount: e.target.value }))} /></div>
            <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={fields.date} onChange={e => setFields(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
          <div className="fg"><label className="fl">Category</label><select className="fi" value={fields.cat} onChange={e => setFields(f => ({ ...f, cat: e.target.value }))}>{['Groceries', 'Utilities', 'Transport', 'Entertainment', 'Medical', 'Other'].map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="f-actions"><button className="btn-ghost" onClick={() => { setShow(false); setOcr(null); setPreview(null) }}>Scan again</button><button className="btn-save" onClick={handleSave}>Save expense</button></div>
        </>}
      </div>
    </div>
  )
}

// ── ImportCSV.jsx ──
import { useState as uS7 } from 'react'
import { useApp as uA7 } from '../context/AppContext'
import { batchSaveExpenses } from '../api/api.js'

export function ImportCSV() {
  const { gid, currency, user, showToast, currentGroup } = useApp()

  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null)

  // ── Parse a single CSV line (handles quoted commas) ──────────────────────
  const parseCSVLine = (line) => {
    const result = []
    let cur = ''
    let inQ = false
    for (const c of line) {
      if (c === '"') inQ = !inQ
      else if (c === ',' && !inQ) { result.push(cur); cur = '' }
      else cur += c
    }
    result.push(cur)
    return result
  }

  // ── Parse uploaded CSV file ───────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return
    setRows([])
    setStatus('')
    setProgress(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      const parsed = lines.slice(1).map((line, i) => {
        const vals = parseCSVLine(line)
        const row = {}
        headers.forEach((h, j) => row[h] = vals[j]?.trim() || '')
        row._valid = !!(
          row.date &&
          row.description &&
          row.amount &&
          !isNaN(parseFloat(row.amount)) &&
          parseFloat(row.amount) > 0
        )
        row._index = i + 1
        return row
      }).filter(r => r.date || r.description)

      setRows(parsed)
    }
    reader.readAsText(file)
  }

  // ── Batch import all valid rows ───────────────────────────────────────────
  const doImport = async () => {

    // ── Guards ───────────────────────────────────────────────────────────────
    if (!currentGroup) { showToast('Please select a group first'); return }

    const valid = rows.filter(r => r._valid)
    if (!valid.length) { showToast('No valid rows to import'); return }

    // ── Start import ─────────────────────────────────────────────────────────
    setSaving(true)
    setStatus('')
    setProgress(`Preparing ${valid.length} records...`)

    try {
      const data = await batchSaveExpenses(
        gid,          // groupId
        valid,        // expense rows
        user?.email,  // createdBy
        currency,     // default currency
      )

      // ── Success ───────────────────────────────────────────────────────────
      if (data?.success) {
        setStatus(`✓ ${data.saved} of ${data.total} expenses imported!`)
        showToast(`${data.saved} expenses imported!`)
        setRows([])   // clear table after successful import

        // ── Partial failure ───────────────────────────────────────────────────
      } else if (data?.saved > 0) {
        setStatus(`⚠ ${data.saved} saved, ${data.failed} failed — check errors`)
        showToast(`Partial import — ${data.saved} saved`)

        // ── Full failure ──────────────────────────────────────────────────────
      } else {
        setStatus(`Error: ${data?.error || 'Import failed'}`)
        showToast('Import failed — check the error')
      }

    } catch (err) {
      setStatus(`Error: ${err.message}`)
      showToast('Import failed')

    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  // ── Download sample CSV ───────────────────────────────────────────────────
  const downloadSample = () => {
    const csv = [
      'date,time,description,amount,currency,category,paymentType,paidBy,shared,notes',
      '2025-04-19,10:30,D-Mart groceries,2840,₹,Groceries,UPI,Rahul,group,weekly shop',
      '2025-04-18,,Electricity bill,3200,₹,Utilities,Net Banking,Sunita,,april bill',
      '2025-04-17,14:00,Petrol,1500,₹,Transport,Cash,Rahul,,',
      '2025-04-16,,Vegetables,680,₹,Groceries,Cash,Aai,group,',
      '2025-04-15,,Internet bill,999,₹,Utilities,UPI,Rahul,group,',
    ].join('\n')

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'gharKharcha-sample.csv'
    a.click()
  }

  const validCount = rows.filter(r => r._valid).length
  const invalidCount = rows.filter(r => !r._valid).length

  return (
    <div className="view active">
      <div className="form-card" style={{ maxWidth: 720 }}>
        <div className="form-title">Import from CSV</div>

        {/* Format guide */}
        <div className="csv-format-box">
          <div className="csv-format-title">Required CSV format</div>
          <code className="csv-code">
            date, time, description, amount, currency, category, paymentType, paidBy, shared, notes{'\n'}
            2025-04-19, 10:30, D-Mart groceries, 2840, ₹, Groceries, UPI, Rahul, group, weekly{'\n'}
            2025-04-18, , Electricity bill, 3200, ₹, Utilities, Net Banking, Sunita, ,
          </code>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={downloadSample}>
              Download sample CSV
            </button>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className="scan-zone"
          onClick={() => document.getElementById('csvf').click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        >
          <input
            id="csvf"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
            <rect x="6" y="4" width="28" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
            <path d="M28 4v12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 24h16M12 30h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <div className="scan-zone-label">Click to upload or drag & drop CSV</div>
          <div className="scan-zone-sub">Max 1,000 rows · .csv files only</div>
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <>
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 12, margin: '0 0 .75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
                ✓ {validCount} valid
              </span>
              {invalidCount > 0 && (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>
                  ✕ {invalidCount} invalid (will be skipped)
                </span>
              )}
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>
                {rows.length} total rows
              </span>
            </div>

            {/* Preview table */}
            <div className="csv-table-wrap">
              <table className="csv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Paid by</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className={r._valid ? '' : 'err'}>
                      <td>{r._index}</td>
                      <td>{r.date}</td>
                      <td>{r.description || r.desc}</td>
                      <td>{r.currency || currency}{r.amount}</td>
                      <td>{r.category || '—'}</td>
                      <td>{r.paidby || r.paidBy || '—'}</td>
                      <td>{r._valid ? '✓' : '⚠ missing fields'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 12px' }}>
                  Showing first 20 rows — {rows.length - 20} more will also be imported
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="f-actions">
              <button
                className="btn-ghost"
                onClick={() => { setRows([]); setStatus(''); setProgress(null) }}
              >
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={doImport}
                disabled={saving || validCount === 0}
              >
                {saving
                  ? progress || 'Importing...'
                  : `Import ${validCount} expenses`}
              </button>
            </div>

            {status && (
              <div className="save-msg" style={{ color: status.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>
                {status}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
