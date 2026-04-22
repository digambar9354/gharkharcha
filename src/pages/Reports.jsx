import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar as BarChart, Doughnut as DoughnutChart } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js'
import { useApp } from '../context/AppContext'
import { ExpenseRow, fmt } from '../components/index.jsx'
import { CATEGORIES, CAT_COLORS } from '../constants/index.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const barChartOptions = (currency) => ({
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
})

const horizontalBarOptions = (currency) => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { callback: v => `${currency}${(v / 1000).toFixed(0)}k`, font: { size: 11 } }, grid: { color: 'rgba(128,128,128,.1)' } },
    y: { ticks: { font: { size: 11 } }, grid: { display: false } },
  },
})

export default function Reports() {
  const navigate = useNavigate()
  const { fetchExpenses, removeExpense, expenses, members, currency, gid } = useApp()

  useEffect(() => { fetchExpenses() }, [gid])

  const year = new Date().getFullYear()
  const monthlyData = MONTH_LABELS.map((_, i) =>
    expenses
      .filter(e => e.date?.startsWith(`${year}-${String(i + 1).padStart(2, '0')}`))
      .reduce((s, e) => s + Number(e.amount), 0)
  )
  const categoryData = CATEGORIES.map(c =>
    expenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0)
  )
  const memberNames = members.map(m => m.name)
  const memberData  = memberNames.map(n =>
    expenses.filter(e => e.paidBy === n).reduce((s, e) => s + Number(e.amount), 0)
  )
  const recurring = expenses.filter(e => e.recurring && e.recurring !== 'none')

  return (
    <div className="view active">
      <div className="panel" style={{ marginBottom: '1rem' }}>
        <div className="pt">Monthly comparison {year}</div>
        <div className="chart-wrap" style={{ height: 240 }}>
          <BarChart
            data={{ labels: MONTH_LABELS, datasets: [{ data: monthlyData, backgroundColor: '#1d4ed8', borderRadius: 5, borderSkipped: false }] }}
            options={barChartOptions(currency)}
          />
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="pt">Top categories</div>
          <div className="chart-wrap">
            <BarChart
              data={{ labels: CATEGORIES, datasets: [{ data: categoryData, backgroundColor: CATEGORIES.map(c => CAT_COLORS[c]), borderRadius: 5, borderSkipped: false }] }}
              options={horizontalBarOptions(currency)}
            />
          </div>
        </div>
        {members.length > 0 && (
          <div className="panel">
            <div className="pt">Per member</div>
            <div className="chart-wrap">
              <DoughnutChart
                data={{ labels: memberNames, datasets: [{ data: memberData, backgroundColor: members.map(m => m.textColor || '#3b82f6'), borderWidth: 3, borderColor: 'transparent' }] }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } } } }}
              />
            </div>
          </div>
        )}
      </div>

      {recurring.length > 0 && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <div className="pt" style={{ marginBottom: '.75rem' }}>Recurring expenses</div>
          <div className="exp-list stagger">
            {recurring.map(e => (
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
      )}
    </div>
  )
}
