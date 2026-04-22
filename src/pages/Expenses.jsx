import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ExpenseRow, fmt } from '../components/index.jsx'
import { CATEGORIES } from '../constants/index.js'

export default function Expenses() {
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
    const handler = () => setSearch(sessionStorage.getItem('gk_search') || '')
    window.addEventListener('gk_search', handler)
    return () => window.removeEventListener('gk_search', handler)
  }, [])

  const clearFilters = () => { setSearch(''); setCat(''); setPay(''); setMember(''); setMin(''); setMax('') }

  let list = [...expenses]
  if (search) list = list.filter(e => e.desc?.toLowerCase().includes(search.toLowerCase()) || e.notes?.toLowerCase().includes(search.toLowerCase()))
  if (cat) list = list.filter(e => e.category === cat)
  if (pay) list = list.filter(e => e.paymentType === pay)
  if (member) list = list.filter(e => e.paidBy === member)
  if (min) list = list.filter(e => Number(e.amount) >= Number(min))
  if (max) list = list.filter(e => Number(e.amount) <= Number(max))

  const exportCSV = () => {
    const header = 'date,time,description,amount,currency,category,paymentType,paidBy,shared,notes'
    const rows = list.map(e =>
      `${e.date},${e.time || ''},${e.desc},${e.amount},${e.currency || currency},${e.category},${e.paymentType || ''},${e.paidBy || ''},${e.shared || ''},${e.notes || ''}`
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'gharKharcha.csv'
    a.click()
  }

  return (
    <div className="view active">
      <div className="filter-bar">
        <input
          className="fi"
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 180 }}
        />
        <select className="fi" style={{ width: 130 }} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
        <button className="btn-ghost" onClick={clearFilters}>Clear</button>
      </div>
      <div className="panel" style={{ marginTop: '.75rem' }}>
        <div className="panel-hd">
          <div className="pt">All expenses <span className="exp-count">({list.length})</span></div>
          <button className="btn-ghost" onClick={exportCSV}>Export CSV</button>
        </div>
        <div className="exp-list stagger">
          {list.length === 0
            ? <div className="empty">No expenses found</div>
            : list.slice(0, 50).map(e => (
              <ExpenseRow
                key={e.expenseId || e.id}
                expense={e}
                currency={currency}
                onEdit={() => navigate(`/add/${e.expenseId || e.id}`, { state: { expense: e } })}
                onDelete={() => removeExpense(e.expenseId || e.id)}
              />
            ))}
        </div>
      </div>
    </div>
  )
}
