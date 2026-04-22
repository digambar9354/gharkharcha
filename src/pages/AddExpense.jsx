import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { todayStr } from '../components/index.jsx'
import { CATEGORIES, CURRENCIES } from '../constants/index.js'
import config from '../config.js'

export default function AddExpense() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { id }    = useParams()
  const { addExpense, editExpense, members, paymentTypes, currency, user, showToast } = useApp()

  const editing = location.state?.expense || null
  const isEdit  = !!editing

  const [form, setForm] = useState({
    desc: '', amount: '', currency, date: todayStr(), time: '',
    category: 'Groceries', paymentType: paymentTypes[0] || 'UPI',
    paidBy: members.find(m => m.email === user?.email)?.name || user?.name?.split(' ')[0] || '',
    shared: 'none', recurring: 'none', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [newPayType, setNewPayType] = useState('')
  const [showAddPay, setShowAddPay] = useState(false)

  useEffect(() => {
    if (!editing) return
    setForm({
      desc:        editing.desc        || '',
      amount:      editing.amount      || '',
      currency:    editing.currency    || currency,
      date:        editing.date        || todayStr(),
      time:        editing.time        || '',
      category:    editing.category    || 'Groceries',
      paymentType: editing.paymentType || paymentTypes[0],
      paidBy:      editing.paidBy      || '',
      shared:      editing.shared      || 'none',
      recurring:   editing.recurring   || 'none',
      notes:       editing.notes       || '',
    })
  }, [editing])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handlePayTypeChange = (v) => {
    if (v === '__other__') { setShowAddPay(true); return }
    set('paymentType', v)
  }

  const confirmNewPayType = () => {
    if (!newPayType.trim()) return
    set('paymentType', newPayType.trim())
    setNewPayType('')
    setShowAddPay(false)
  }

  const handleSubmit = async () => {
    if (!form.desc.trim())                    { showToast('Please enter a description'); return }
    if (!form.amount || Number(form.amount) <= 0) { showToast('Please enter a valid amount'); return }
    if (!form.date)                           { showToast('Please pick a date'); return }
    setSaving(true)
    const expense = {
      ...form,
      amount:    Number(form.amount),
      shared:    form.shared    !== 'none' ? form.shared    : null,
      recurring: form.recurring !== 'none' ? form.recurring : null,
    }
    const ok = isEdit
      ? await editExpense({ ...expense, expenseId: editing.expenseId || id })
      : await addExpense(expense)
    setSaving(false)
    if (ok) navigate('/dashboard')
  }

  return (
    <div className="view active">
      <div className="form-card">
        <div className="form-title">{isEdit ? 'Edit expense' : 'New expense'}</div>

        {!isEdit && (
          <div className="scan-hint" onClick={() => navigate('/scan')}>
            <svg viewBox="0 0 18 18" fill="none" width="16" height="16">
              <rect x="1.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="9" cy="10" r="2.8" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span>Scan a receipt — OCR auto-fills amount & date</span>
            <span>→</span>
          </div>
        )}

        <div className="fg">
          <label className="fl">Description *</label>
          <input className="fi" type="text" value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="e.g. Weekly groceries from D-Mart" autoFocus={!isEdit} />
        </div>

        <div className="f2">
          <div className="fg">
            <label className="fl">Amount *</label>
            <div className="amount-wrap">
              <select className="currency-sel" value={form.currency} onChange={e => set('currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input className="fi amount-fi" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" min="0" />
            </div>
          </div>
          <div className="fg">
            <label className="fl">Category *</label>
            <select className="fi" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="f2">
          <div className="fg">
            <label className="fl">Date *</label>
            <input className="fi" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="fg">
            <label className="fl">Time (optional)</label>
            <input className="fi" type="time" value={form.time} onChange={e => set('time', e.target.value)} />
          </div>
        </div>

        <div className="f2">
          <div className="fg">
            <label className="fl">Payment type</label>
            <select className="fi" value={form.paymentType} onChange={e => handlePayTypeChange(e.target.value)}>
              {paymentTypes.map(p => <option key={p}>{p}</option>)}
              <option value="__other__">+ Add custom type…</option>
            </select>
            {showAddPay && (
              <div className="add-pay-inline">
                <input
                  className="fi"
                  type="text"
                  value={newPayType}
                  onChange={e => setNewPayType(e.target.value)}
                  placeholder="e.g. PhonePe"
                  onKeyDown={e => { if (e.key === 'Enter') confirmNewPayType(); if (e.key === 'Escape') setShowAddPay(false) }}
                  autoFocus
                  style={{ marginTop: 6 }}
                />
                <div className="add-pay-actions">
                  <button className="btn-ghost" onClick={() => setShowAddPay(false)}>Cancel</button>
                  <button className="btn-save" onClick={confirmNewPayType}>Use</button>
                </div>
              </div>
            )}
          </div>
          <div className="fg">
            <label className="fl">Paid by</label>
            <select className="fi" value={form.paidBy} onChange={e => set('paidBy', e.target.value)}>
              {members.length
                ? members.map(m => <option key={m.email}>{m.name}</option>)
                : <option>{user?.name?.split(' ')[0] || 'Me'}</option>}
            </select>
          </div>
        </div>

        <div className="fg">
          <label className="fl">Shared with</label>
          <select className="fi" value={form.shared} onChange={e => set('shared', e.target.value)}>
            <option value="none">No one (personal)</option>
            {members.filter(m => m.email !== user?.email).map(m => <option key={m.email}>{m.name}</option>)}
            <option value="group">Whole group</option>
          </select>
        </div>

        <div className="f2">
          <div className="fg">
            <label className="fl">Recurring?</label>
            <select className="fi" value={form.recurring} onChange={e => set('recurring', e.target.value)}>
              <option value="none">No</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="fg">
            <label className="fl">Notes (optional)</label>
            <input className="fi" type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any extra details…" />
          </div>
        </div>

        <div className="f-actions">
          <button className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn-save" onClick={handleSubmit} disabled={saving}>
            {saving
              ? <span className="btn-saving"><span className="spinner-sm" />{isEdit ? 'Updating…' : 'Saving…'}</span>
              : isEdit ? 'Update expense' : 'Save expense'}
          </button>
        </div>
      </div>
    </div>
  )
}
