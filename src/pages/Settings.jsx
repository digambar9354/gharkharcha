import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ConfirmModal } from '../components/index.jsx'
import { CATEGORIES, CAT_ICONS, DEFAULT_PAYMENT_TYPES, CURRENCIES } from '../constants/index.js'

export default function Settings() {
  const {
    paymentTypes, addPaymentType, deletePaymentType,
    budgets, updateBudgets,
    theme, setTheme,
    currency, setCurrency,
    groups, deleteGroup,
  } = useApp()
  const [newPay, setNewPay] = useState('')
  const [deleteGroupId, setDeleteGroupId] = useState(null)

  const handleAddPaymentType = () => {
    if (!newPay.trim()) return
    addPaymentType(newPay.trim())
    setNewPay('')
  }

  return (
    <div className="view active">
      <div className="two-col">
        <div className="panel">
          <div className="pt" style={{ marginBottom: '1rem' }}>Payment types</div>
          {paymentTypes.map((p, i) => (
            <div key={p} className="pay-type-item">
              <span className="pay-type-name">
                {p}
                {i < DEFAULT_PAYMENT_TYPES.length && <span className="pay-default-badge">default</span>}
              </span>
              {i >= DEFAULT_PAYMENT_TYPES.length && (
                <button className="pay-del-btn" onClick={() => deletePaymentType(i)}>✕</button>
              )}
            </div>
          ))}
          <div className="f2" style={{ marginTop: '.75rem' }}>
            <input
              className="fi"
              type="text"
              value={newPay}
              onChange={e => setNewPay(e.target.value)}
              placeholder="Add type (e.g. PhonePe)"
              onKeyDown={e => { if (e.key === 'Enter') handleAddPaymentType() }}
            />
            <button className="btn-save" onClick={handleAddPaymentType}>Add</button>
          </div>
        </div>

        <div className="panel">
          <div className="pt" style={{ marginBottom: '1rem' }}>Appearance & preferences</div>
          <div className="setting-row">
            <div>
              <div className="setting-label">Dark mode</div>
              <div className="setting-sub">Switch between light and dark</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={theme === 'dark'} onChange={e => setTheme(e.target.checked ? 'dark' : 'light')} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="setting-row" style={{ marginTop: '1rem' }}>
            <div className="setting-label">Default currency</div>
            <select className="fi" style={{ width: 100 }} value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="pt" style={{ marginBottom: '.75rem', marginTop: '1.25rem' }}>My groups</div>
          {groups.length === 0
            ? <div className="empty" style={{ padding: '.5rem 0' }}>No groups yet</div>
            : groups.map(g => (
              <div key={g.groupId} className="my-group-item">
                <div>
                  <div className="group-item-name">{g.icon} {g.name}</div>
                  <div className="group-item-type">{g.type} · {g.members?.length || 1} members</div>
                </div>
                <button className="pay-del-btn" onClick={() => setDeleteGroupId(g.groupId)}>✕</button>
              </div>
            ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="pt" style={{ marginBottom: '1rem' }}>Monthly budget limits</div>
        <div className="budget-grid">
          {CATEGORIES.map(cat => (
            <div key={cat} className="budget-item">
              <div className="budget-cat">{CAT_ICONS[cat]} {cat}</div>
              <div className="budget-input-wrap">
                <input
                  className="budget-input"
                  type="number"
                  value={budgets[cat] || ''}
                  placeholder="No limit"
                  onChange={e => updateBudgets({ ...budgets, [cat]: Number(e.target.value) })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {deleteGroupId && (
        <ConfirmModal
          message="Delete this group? Expenses will remain in the database."
          onConfirm={() => { deleteGroup(deleteGroupId); setDeleteGroupId(null) }}
          onCancel={() => setDeleteGroupId(null)}
        />
      )}
    </div>
  )
}
