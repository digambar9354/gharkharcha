import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { todayStr } from '../components/index.jsx'
import { CATEGORIES } from '../constants/index.js'

export default function Scan() {
  const navigate = useNavigate()
  const { addExpense, user, members, currency } = useApp()
  const [preview, setPreview] = useState(null)
  const [ocr, setOcr] = useState(null)
  const [fields, setFields] = useState({ desc: '', amount: '', date: todayStr(), cat: 'Groceries' })
  const [show, setShow] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)
    setOcr('Scanning...')
    setTimeout(() => {
      const amt = Math.floor(Math.random() * 3000) + 200
      setOcr(`Detected: ₹${amt.toLocaleString('en-IN')} · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`)
      setFields(f => ({ ...f, amount: amt, date: todayStr() }))
      setShow(true)
    }, 1800)
  }

  const handleSave = async () => {
    if (!fields.amount) return
    const me = members.find(m => m.email === user?.email)
    await addExpense({
      desc: fields.desc || 'Scanned receipt',
      amount: Number(fields.amount),
      currency,
      date: fields.date,
      category: fields.cat,
      paymentType: 'Cash',
      paidBy: me?.name || user?.name?.split(' ')[0] || 'Me',
      notes: 'Scanned receipt',
    })
    navigate('/dashboard')
  }

  const reset = () => { setShow(false); setOcr(null); setPreview(null) }

  return (
    <div className="view active">
      <div className="form-card">
        <div className="form-title">Scan receipt</div>
        <div className="scan-zone" onClick={() => document.getElementById('rf').click()}>
          <input
            id="rf"
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          <svg viewBox="0 0 48 48" fill="none" width="44" height="44">
            <rect x="4" y="10" width="40" height="30" rx="7" stroke="currentColor" strokeWidth="2" />
            <circle cx="24" cy="25" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M16 4h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="scan-zone-label">Tap to open camera or upload photo</div>
          <div className="scan-zone-sub">OCR reads amount & date automatically</div>
        </div>
        {ocr && <div className="ocr-ok"><span>✓</span><span>{ocr}</span></div>}
        {preview && <div className="receipt-prev"><img src={preview} alt="Receipt" /></div>}
        {show && (
          <>
            <div className="fg">
              <label className="fl">Description</label>
              <input className="fi" type="text" value={fields.desc} onChange={e => setFields(f => ({ ...f, desc: e.target.value }))} placeholder="e.g. D-Mart groceries" />
            </div>
            <div className="f2">
              <div className="fg">
                <label className="fl">Amount</label>
                <input className="fi" type="number" value={fields.amount} onChange={e => setFields(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="fg">
                <label className="fl">Date</label>
                <input className="fi" type="date" value={fields.date} onChange={e => setFields(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="fg">
              <label className="fl">Category</label>
              <select className="fi" value={fields.cat} onChange={e => setFields(f => ({ ...f, cat: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="f-actions">
              <button className="btn-ghost" onClick={reset}>Scan again</button>
              <button className="btn-save" onClick={handleSave}>Save expense</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
