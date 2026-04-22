import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AddExpense from './pages/AddExpense'
import { Expenses, CashFlow, Members, Settle, Reports, Settings, Scan, ImportCSV } from './pages/pages.jsx'
import { Toast } from './components/index.jsx'

export default function App() {
  const { user, toast } = useApp()
  if (!user) return <><Login /><Toast message={toast} /></>
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/add" element={<AddExpense />} />
          <Route path="/add/:id" element={<AddExpense />} />
          <Route path="/cashflow" element={<CashFlow />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/import" element={<ImportCSV />} />
          <Route path="/members" element={<Members />} />
          <Route path="/settle" element={<Settle />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
      <Toast message={toast} />
    </>
  )
}
