import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmt } from '../components/index.jsx'

function calcBalances(members, expenses) {
  const balances = {}
  members.forEach(m => { balances[m.name] = 0 })
  expenses
    .filter(e => e.shared && e.shared !== 'none')
    .forEach(e => {
      const sharedWith = members.filter(m => m.name !== e.paidBy)
      if (sharedWith.length === 0) return
      const splitAmt = Number(e.amount) / (sharedWith.length + 1)
      if (balances[e.paidBy] !== undefined) balances[e.paidBy] += splitAmt * sharedWith.length
      sharedWith.forEach(m => { if (balances[m.name] !== undefined) balances[m.name] -= splitAmt })
    })
  return balances
}

export default function Settle() {
  const { fetchExpenses, expenses, members, currency, gid, showToast } = useApp()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => { fetchExpenses() }, [gid])

  const balances = calcBalances(members, expenses)
  const creditors = Object.entries(balances).filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1])
  const owes = Object.entries(balances)
    .filter(([, v]) => v < -1)
    .map(([person, bal]) => creditors[0]
      ? { from: person, to: creditors[0][0], amount: Math.abs(bal).toFixed(0) }
      : null
    )
    .filter(Boolean)

  const handleSettle = () => {
    if (!from || !to || !amount) { showToast('Please fill all fields'); return }
    showToast(`${from} → ${to}: ${fmt(amount, currency)} settled`)
    setAmount('')
    setNote('')
  }

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
                <div className="settle-amt">{fmt(o.amount, currency)}</div>
                <button className="settle-ok" onClick={() => showToast('Marked as settled!')}>Settled ✓</button>
              </div>
            </div>
          ))}
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="pt" style={{ marginBottom: '1rem' }}>Mark as settled manually</div>
        <div className="f2">
          <div className="fg">
            <label className="fl">From</label>
            <select className="fi" value={from} onChange={e => setFrom(e.target.value)}>
              <option value="">Select member</option>
              {members.map(m => <option key={m.email}>{m.name}</option>)}
            </select>
          </div>
          <div className="fg">
            <label className="fl">To</label>
            <select className="fi" value={to} onChange={e => setTo(e.target.value)}>
              <option value="">Select member</option>
              {members.map(m => <option key={m.email}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="fg">
          <label className="fl">Amount</label>
          <input className="fi" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹0" />
        </div>
        <div className="fg">
          <label className="fl">Note (optional)</label>
          <input className="fi" type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Paid via UPI" />
        </div>
        <button className="btn-save" onClick={handleSettle}>Mark as settled</button>
      </div>
    </div>
  )
}
