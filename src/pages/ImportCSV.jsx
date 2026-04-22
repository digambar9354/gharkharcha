import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { batchSaveExpenses } from '../api/api.js'

function parseCSVLine(line) {
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

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(1).map((line, i) => {
    const vals = parseCSVLine(line)
    const row = {}
    headers.forEach((h, j) => { row[h] = vals[j]?.trim() || '' })
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
}

const SAMPLE_CSV = [
  'date,time,description,amount,currency,category,paymentType,paidBy,shared,notes',
  '2025-04-19,10:30,D-Mart groceries,2840,₹,Groceries,UPI,Rahul,group,weekly shop',
  '2025-04-18,,Electricity bill,3200,₹,Utilities,Net Banking,Sunita,,april bill',
  '2025-04-17,14:00,Petrol,1500,₹,Transport,Cash,Rahul,,',
  '2025-04-16,,Vegetables,680,₹,Groceries,Cash,Aai,group,',
  '2025-04-15,,Internet bill,999,₹,Utilities,UPI,Rahul,group,',
].join('\n')

export default function ImportCSV() {
  const { gid, currency, user, showToast, currentGroup } = useApp()
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null)

  const handleFile = (file) => {
    if (!file) return
    setRows([])
    setStatus('')
    setProgress(null)
    const reader = new FileReader()
    reader.onload = e => setRows(parseCSV(e.target.result))
    reader.readAsText(file)
  }

  const doImport = async () => {
    if (!currentGroup) { showToast('Please select a group first'); return }
    const valid = rows.filter(r => r._valid)
    if (!valid.length) { showToast('No valid rows to import'); return }

    setSaving(true)
    setStatus('')
    setProgress(`Preparing ${valid.length} records...`)

    try {
      const data = await batchSaveExpenses(gid, valid, user?.email, currency)
      if (data?.success) {
        setStatus(`✓ ${data.saved} of ${data.total} expenses imported!`)
        showToast(`${data.saved} expenses imported!`)
        setRows([])
      } else if (data?.saved > 0) {
        setStatus(`⚠ ${data.saved} saved, ${data.failed} failed — check errors`)
        showToast(`Partial import — ${data.saved} saved`)
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

  const downloadSample = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv' }))
    a.download = 'gharKharcha-sample.csv'
    a.click()
  }

  const validCount   = rows.filter(r => r._valid).length
  const invalidCount = rows.filter(r => !r._valid).length

  return (
    <div className="view active">
      <div className="form-card" style={{ maxWidth: 720 }}>
        <div className="form-title">Import from CSV</div>

        <div className="csv-format-box">
          <div className="csv-format-title">Required CSV format</div>
          <code className="csv-code">
            date, time, description, amount, currency, category, paymentType, paidBy, shared, notes{'\n'}
            2025-04-19, 10:30, D-Mart groceries, 2840, ₹, Groceries, UPI, Rahul, group, weekly{'\n'}
            2025-04-18, , Electricity bill, 3200, ₹, Utilities, Net Banking, Sunita, ,
          </code>
          <div style={{ marginTop: 8 }}>
            <button className="btn-ghost" onClick={downloadSample}>Download sample CSV</button>
          </div>
        </div>

        <div
          className="scan-zone"
          onClick={() => document.getElementById('csvf').click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        >
          <input id="csvf" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
            <rect x="6" y="4" width="28" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
            <path d="M28 4v12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 24h16M12 30h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <div className="scan-zone-label">Click to upload or drag & drop CSV</div>
          <div className="scan-zone-sub">Max 1,000 rows · .csv files only</div>
        </div>

        {rows.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 12, margin: '0 0 .75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>✓ {validCount} valid</span>
              {invalidCount > 0 && (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>✕ {invalidCount} invalid (will be skipped)</span>
              )}
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>{rows.length} total rows</span>
            </div>

            <div className="csv-table-wrap">
              <table className="csv-table">
                <thead>
                  <tr><th>#</th><th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th>Paid by</th><th>Status</th></tr>
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

            <div className="f-actions">
              <button className="btn-ghost" onClick={() => { setRows([]); setStatus(''); setProgress(null) }}>Cancel</button>
              <button className="btn-save" onClick={doImport} disabled={saving || validCount === 0}>
                {saving ? progress || 'Importing...' : `Import ${validCount} expenses`}
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
