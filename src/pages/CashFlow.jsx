import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmt, todayStr } from '../components/index.jsx'

const EMPTY_FORM = () => ({ amount: '', desc: '', date: todayStr(), time: '' })

export default function CashFlow() {
  const { fetchCashFlow, addCashFlow, cashflow, currency, gid } = useApp()
  const [inForm, setInForm] = useState(EMPTY_FORM)
  const [outForm, setOutForm] = useState(EMPTY_FORM)

  useEffect(() => { fetchCashFlow() }, [gid])

  const totalIn  = cashflow.filter(e => e.cfType === 'in').reduce((s, e) => s + Number(e.amount), 0)
  const totalOut = cashflow.filter(e => e.cfType === 'out').reduce((s, e) => s + Number(e.amount), 0)
  const balance  = totalIn - totalOut

  const save = async (type) => {
    const form = type === 'in' ? inForm : outForm
    if (!form.amount || Number(form.amount) <= 0) return
    if (!form.desc.trim()) return
    await addCashFlow({ ...form, amount: Number(form.amount), cfType: type, category: 'Cash Flow', paymentType: 'Cash' })
    if (type === 'in') setInForm(EMPTY_FORM())
    else setOutForm(EMPTY_FORM())
  }

  return (
    <div className="view active">
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="metric green"><div className="ml">Total cash in</div><div className="mv">{fmt(totalIn, currency)}</div></div>
        <div className="metric red"><div className="ml">Total cash out</div><div className="mv">{fmt(totalOut, currency)}</div></div>
        <div className="metric accent"><div className="ml">Net balance</div><div className="mv">{fmt(balance, currency)}</div></div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-hd"><div className="pt">Add cash in</div></div>
          <div className="fg">
            <label className="fl">Amount</label>
            <input className="fi" type="number" value={inForm.amount} onChange={e => setInForm(f => ({ ...f, amount: e.target.value }))} placeholder="₹0" />
          </div>
          <div className="fg">
            <label className="fl">Source / description</label>
            <input className="fi" type="text" value={inForm.desc} onChange={e => setInForm(f => ({ ...f, desc: e.target.value }))} placeholder="e.g. Salary, rent received" />
          </div>
          <div className="f2">
            <div className="fg">
              <label className="fl">Date</label>
              <input className="fi" type="date" value={inForm.date} onChange={e => setInForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="fg">
              <label className="fl">Time (optional)</label>
              <input className="fi" type="time" value={inForm.time} onChange={e => setInForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>
          <button className="btn-green" onClick={() => save('in')}>+ Add cash in</button>
        </div>

        <div className="panel">
          <div className="panel-hd"><div className="pt">Add cash out</div></div>
          <div className="fg">
            <label className="fl">Amount</label>
            <input className="fi" type="number" value={outForm.amount} onChange={e => setOutForm(f => ({ ...f, amount: e.target.value }))} placeholder="₹0" />
          </div>
          <div className="fg">
            <label className="fl">Purpose / description</label>
            <input className="fi" type="text" value={outForm.desc} onChange={e => setOutForm(f => ({ ...f, desc: e.target.value }))} placeholder="e.g. Paid vendor, gave loan" />
          </div>
          <div className="f2">
            <div className="fg">
              <label className="fl">Date</label>
              <input className="fi" type="date" value={outForm.date} onChange={e => setOutForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="fg">
              <label className="fl">Time (optional)</label>
              <input className="fi" type="time" value={outForm.time} onChange={e => setOutForm(f => ({ ...f, time: e.target.value }))} />
            </div>
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
                <div>
                  <div className="exp-name">{e.desc}</div>
                  <div className="exp-meta">{e.cfType === 'in' ? 'Cash received' : 'Cash paid out'}</div>
                </div>
                <div className="exp-date">{e.date}{e.time ? ' ' + e.time : ''}</div>
                <div className={e.cfType === 'in' ? 'cf-in-amt' : 'cf-out-amt'}>
                  {e.cfType === 'in' ? '+' : '-'}{currency}{Number(e.amount).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
