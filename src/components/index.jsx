// ── Toast ──
export function Toast({ message }) {
  if (!message) return null
  return <div className="toast show">{message}</div>
}
export default Toast

// ── ExpenseRow ──
export const CAT_ICONS = { Groceries:'🛒', Utilities:'⚡', Transport:'🚗', Entertainment:'🎬', Medical:'💊', Construction:'🏗️', Other:'📋' }

export function ExpenseRow({ expense: e, onEdit, onDelete, currency = '₹' }) {
  const isRec    = e.recurring && e.recurring !== 'none'
  const isShared = e.shared && e.shared !== 'none'
  const dateTime = e.time ? `${fmtDate(e.date)} ${e.time}` : fmtDate(e.date)
  return (
    <div className="exp-row">
      <div className="exp-ic">{CAT_ICONS[e.category] || '📋'}</div>
      <div>
        <div className="exp-name">{e.desc}</div>
        <div className="exp-meta">{e.paidBy || '—'} · {e.category} · {e.paymentType || '—'}</div>
      </div>
      <span className={`exp-badge ${isRec ? 'b-rec' : isShared ? 'b-sh' : 'b-pe'}`}>
        {isRec ? `🔁 ${e.recurring}` : isShared ? 'Shared' : 'Personal'}
      </span>
      <div className="exp-date">{dateTime}</div>
      <div className="exp-amt">{e.currency || currency}{Number(e.amount).toLocaleString('en-IN')}</div>
      <div className="exp-actions">
        {onEdit   && <button className="exp-edit-btn" onClick={() => onEdit(e)}   title="Edit">✏️</button>}
        {onDelete && <button className="exp-del-btn"  onClick={() => onDelete(e)} title="Delete">🗑</button>}
      </div>
    </div>
  )
}

// ── MetricCard ──
export function MetricCard({ label, value, sub, variant = '' }) {
  return (
    <div className={`metric ${variant}`}>
      <div className="ml">{label}</div>
      <div className="mv">{value}</div>
      <div className="ms">{sub}</div>
    </div>
  )
}

// ── ConfirmModal ──
export function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <div className="modal-title">Are you sure?</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1rem' }}>{message}</p>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──
export function fmtDate(s) {
  if (!s) return ''
  return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function fmt(n, cur = '₹') {
  return `${cur}${Number(n).toLocaleString('en-IN')}`
}
