import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { useApp } from '../context/AppContext'
import { MetricCard, ExpenseRow, fmt } from '../components/index.jsx'
import { CATEGORIES, CAT_COLORS } from '../constants/index.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

export default function Dashboard() {
  const navigate = useNavigate()
  const { fetchExpenses, fetchCashFlow, removeExpense, expenses, cashflow, members, currency, loading, gid } = useApp()
  const [filter, setFilter] = useState('all')
  const [month, setMonth] = useState(sessionStorage.getItem('gk_month') || '')

  const load = useCallback(async (m) => {
    await fetchExpenses(m)
    await fetchCashFlow()
  }, [fetchExpenses, fetchCashFlow])

  useEffect(() => { load(month) }, [month, gid])

  useEffect(() => {
    const handler = () => setMonth(sessionStorage.getItem('gk_month') || '')
    window.addEventListener('gk_month', handler)
    return () => window.removeEventListener('gk_month', handler)
  }, [])

  const total    = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const shared   = expenses.filter(e => e.shared && e.shared !== 'none')
  const cashIn   = cashflow.filter(e => e.cfType === 'in').reduce((s, e) => s + Number(e.amount), 0)
  const cashOut  = cashflow.filter(e => e.cfType === 'out').reduce((s, e) => s + Number(e.amount), 0)

  const catData  = CATEGORIES.map(c => expenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0))
  const hasData  = catData.some(d => d > 0)
  const weeks    = [0, 0, 0, 0, 0]
  expenses.forEach(e => {
    const w = Math.min(Math.floor((new Date(e.date).getDate() - 1) / 7), 4)
    weeks[w] += Number(e.amount)
  })

  const filteredExp = filter === 'shared'    ? expenses.filter(e => e.shared && e.shared !== 'none')
                    : filter === 'personal'  ? expenses.filter(e => !e.shared || e.shared === 'none')
                    : filter === 'recurring' ? expenses.filter(e => e.recurring && e.recurring !== 'none')
                    : expenses

  if (loading) return <div className="view active"><div className="empty">Loading...</div></div>

  return (
    <div className="view active">
      <div className="metrics-grid stagger">
        <MetricCard label="Total spent"  value={fmt(total, currency)}                                            sub={`${expenses.length} transactions`} variant="accent" />
        <MetricCard label="Cash in"      value={fmt(cashIn, currency)}                                           sub="received"                          variant="green" />
        <MetricCard label="Cash out"     value={fmt(cashOut, currency)}                                          sub="paid in cash"                      variant="red" />
        <MetricCard label="Shared"       value={fmt(shared.reduce((s, e) => s + Number(e.amount), 0), currency)} sub={`${shared.length} group expenses`} />
      </div>

      {members.length > 0 && (
        <div className="members-strip stagger">
          {members.map(m => {
            const spent = expenses.filter(e => e.paidBy === m.name).reduce((s, e) => s + Number(e.amount), 0)
            return (
              <div key={m.email} className="m-chip">
                <div className="ch-av" style={{ background: m.color, color: m.textColor }}>{m.initials}</div>
                <div>
                  <div className="ch-name">{m.name}</div>
                  <div className="ch-amt">{fmt(spent, currency)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="two-col">
        <div className="panel">
          <div className="pt">By category</div>
          <div className="legend" style={{ marginBottom: 8 }}>
            {CATEGORIES.filter((_, i) => catData[i] > 0).map(c => {
              const pct = total > 0 ? Math.round(catData[CATEGORIES.indexOf(c)] / total * 100) : 0
              return (
                <span key={c} className="li">
                  <span className="ldot" style={{ background: CAT_COLORS[c] }} />{c} {pct}%
                </span>
              )
            })}
          </div>
          <div className="chart-wrap">
            <Doughnut
              data={{
                labels: CATEGORIES,
                datasets: [{
                  data: hasData ? catData : [1],
                  backgroundColor: hasData ? CATEGORIES.map(c => CAT_COLORS[c]) : ['#e5e7eb'],
                  borderWidth: 3,
                  borderColor: 'transparent',
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: ctx => ` ${currency}${Number(ctx.raw).toLocaleString('en-IN')}` } },
                },
              }}
            />
          </div>
        </div>
        <div className="panel">
          <div className="pt">Weekly trend</div>
          <div className="chart-wrap">
            <Bar
              data={{
                labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'],
                datasets: [{ data: weeks, backgroundColor: '#2563eb', borderRadius: 5, borderSkipped: false }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: ctx => ` ${currency}${Number(ctx.raw).toLocaleString('en-IN')}` } },
                },
                scales: {
                  y: { ticks: { callback: v => `${currency}${(v / 1000).toFixed(0)}k`, font: { size: 11 } }, grid: { color: 'rgba(128,128,128,.1)' } },
                  x: { ticks: { font: { size: 11 } }, grid: { display: false } },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd">
          <div className="pt">Recent expenses</div>
          <div className="pills">
            {['all', 'shared', 'personal', 'recurring'].map(f => (
              <button key={f} className={`pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="exp-list stagger">
          {filteredExp.length === 0
            ? (
              <div className="empty">
                No expenses found.{' '}
                <a onClick={() => navigate('/add')} style={{ color: 'var(--blue)', cursor: 'pointer' }}>
                  Add your first one!
                </a>
              </div>
            )
            : filteredExp.slice(0, 20).map(e => (
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
