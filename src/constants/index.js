// Single source of truth for all shared constants across the app.

export const CATEGORIES = [
  'Groceries', 'Utilities', 'Transport', 'Entertainment', 'Medical', 'Construction', 'Other',
]

export const CAT_COLORS = {
  Groceries:     '#3b82f6',
  Utilities:     '#10b981',
  Transport:     '#f59e0b',
  Entertainment: '#ec4899',
  Medical:       '#8b5cf6',
  Construction:  '#f97316',
  Other:         '#6b7280',
}

export const CAT_ICONS = {
  Groceries:     '🛒',
  Utilities:     '⚡',
  Transport:     '🚗',
  Entertainment: '🎬',
  Medical:       '💊',
  Construction:  '🏗️',
  Other:         '📋',
}

export const DEFAULT_PAYMENT_TYPES = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking', 'Cheque']

export const DEFAULT_BUDGETS = {
  Groceries:     15000,
  Utilities:     8000,
  Transport:     5000,
  Entertainment: 3000,
  Medical:       5000,
  Construction:  0,
  Other:         5000,
}

export const CURRENCIES = [
  { value: '₹', label: '₹ INR' },
  { value: '$', label: '$ USD' },
  { value: '€', label: '€ EUR' },
]

export const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#fee2e2', text: '#991b1b' },
]

export const TOAST_DURATION_MS = 2800

// Generates last N months as [['YYYY-MM', 'Mon YYYY'], ...]
export function generateMonths(count = 13) {
  const months = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    months.push([value, label])
  }
  return months
}
