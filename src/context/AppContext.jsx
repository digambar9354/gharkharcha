import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as api from '../api/api'

const AppContext = createContext(null)

const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8' }, { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef9c3', text: '#854d0e' }, { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ede9fe', text: '#6d28d9' }, { bg: '#fee2e2', text: '#991b1b' },
]

export function AppProvider({ children }) {
  // ── Auth ──
  const [user, setUser] = useState(null)

  // ── Groups (from DB) ──
  const [groups, setGroups] = useState([])
  const [currentGroup, setCurrentGroup] = useState(null)

  // ── Group data (from DB) ──
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [cashflow, setCashflow] = useState([])

  // ── Group settings (from DB via group record) ──
  const [paymentTypes, setPaymentTypes] = useState(['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking', 'Cheque'])
  const [budgets, setBudgets] = useState({ Groceries: 15000, Utilities: 8000, Transport: 5000, Entertainment: 3000, Medical: 5000, Construction: 0, Other: 5000 })
  const [groupCurrency, setGroupCurrency] = useState('₹')

  // ── User preferences (from DB via user record) ──
  const [theme, setThemeState] = useState('light')
  const [currency, setCurrencyState] = useState('₹')

  // ── UI state ──
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const gid = currentGroup?.groupId || null

  // ── Apply theme ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── Toast ──
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }, [])

  // ── AUTH ──
  const login = useCallback(async (googleResponse) => {
    const p = parseJwt(googleResponse.credential)
    const u = {
      name: p.name,
      email: p.email,
      picture: p.picture,
      initials: p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    }

    // Save user to DB (creates or updates)
    await api.saveUser({
      email: u.email,
      name: u.name,
      picture: u.picture,
    })

    // Fetch full user profile + groups from DB
    const result = await api.getUser(u.email)
    if (result) {
      u.defaultGroupId = result.user?.defaultGroupId || null
      u.dbTheme = result.user?.theme || 'light'
      u.dbCurrency = result.user?.currency || '₹'

      // Set theme and currency from DB
      setThemeState(result.user?.theme || 'light')
      setCurrencyState(result.user?.currency || '₹')

      // Set groups from DB
      if (result.groups?.length) {
        setGroups(result.groups)
        // Select last used group or first available
        const lastGroupId = result.user?.defaultGroupId
        const defaultGroup = result.groups.find(g => g.groupId === lastGroupId) || result.groups[0]
        setCurrentGroup(defaultGroup)
        loadGroupSettings(defaultGroup)
      }
    }

    setUser(u)
    // Cache only minimal session info locally
    localStorage.setItem('gk_session', JSON.stringify({ email: u.email, name: u.name, picture: u.picture }))
  }, [])

  const logout = useCallback(() => {
    if (!confirm('Sign out of GharKharcha?')) return
    setUser(null); setGroups([]); setCurrentGroup(null)
    setMembers([]); setExpenses([]); setCashflow([])
    localStorage.removeItem('gk_session')
  }, [])

  // Restore session on app load
  useEffect(() => {
    const session = localStorage.getItem('gk_session')
    if (session) {
      const s = JSON.parse(session)
      // Re-fetch from DB to get fresh data
      api.getUser(s.email).then(result => {
        if (!result) return
        const u = {
          ...s,
          initials: s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          defaultGroupId: result.user?.defaultGroupId,
        }
        setUser(u)
        setThemeState(result.user?.theme || 'light')
        setCurrencyState(result.user?.currency || '₹')
        if (result.groups?.length) {
          setGroups(result.groups)
          const lastGroupId = result.user?.defaultGroupId
          const defaultGroup = result.groups.find(g => g.groupId === lastGroupId) || result.groups[0]
          setCurrentGroup(defaultGroup)
          loadGroupSettings(defaultGroup)
        }
      })
    }
  }, [])

  // ── Load group settings from group record ──
  const loadGroupSettings = useCallback((group) => {
    if (!group) return
    setPaymentTypes(group.paymentTypes || ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking', 'Cheque'])
    setBudgets(group.budgets || {})
    setGroupCurrency(group.currency || '₹')
  }, [])

  // ── THEME (save to DB) ──
  const setTheme = useCallback(async (t) => {
    setThemeState(t)
    if (user?.email) await api.saveUser({ email: user.email, name: user.name, theme: t, currency })
  }, [user, currency])

  // ── CURRENCY (save to DB) ──
  const setCurrency = useCallback(async (c) => {
    setCurrencyState(c)
    if (user?.email) await api.saveUser({ email: user.email, name: user.name, theme, currency: c })
  }, [user, theme])

  // ── GROUPS ──
  const createGroup = useCallback(async (name, desc, type) => {
    if (!user) return null
    const result = await api.saveGroup({
      name, description: desc, type,
      createdBy: user.email,
      creatorName: user.name,
      currency: groupCurrency,
    })
    if (!result?.group) { showToast('Error creating group'); return null }

    const newGroup = { ...result.group, userRole: 'admin' }
    const updatedGroups = [...groups, newGroup]
    setGroups(updatedGroups)
    setCurrentGroup(newGroup)
    loadGroupSettings(newGroup)

    // Save last used group to user record
    await api.saveUser({ email: user.email, name: user.name, defaultGroupId: newGroup.groupId })

    showToast(`Group "${name}" created!`)
    return newGroup
  }, [user, groups, groupCurrency, loadGroupSettings, showToast])

  const switchGroup = useCallback(async (groupId) => {
    const g = groups.find(g => g.groupId === groupId)
    if (!g) return

    // Fetch fresh group data (in case settings changed on another device)
    const result = await api.getGroup(groupId)
    const freshGroup = result?.group ? { ...result.group, userRole: g.userRole } : g

    setCurrentGroup(freshGroup)
    loadGroupSettings(freshGroup)
    setMembers([]); setExpenses([]); setCashflow([])

    // Save preference to DB
    if (user?.email) await api.saveUser({ email: user.email, name: user.name, defaultGroupId: groupId })
  }, [groups, user, loadGroupSettings])

  const removeGroup = useCallback(async (groupId) => {
    if (!confirm('Delete this group? Expenses will remain in database.')) return
    await api.deleteGroup(groupId)
    const updated = groups.filter(g => g.groupId !== groupId)
    setGroups(updated)
    if (currentGroup?.groupId === groupId) {
      setCurrentGroup(updated[0] || null)
      if (updated[0]) loadGroupSettings(updated[0])
    }
    showToast('Group deleted')
  }, [groups, currentGroup, loadGroupSettings, showToast])

  // ── GROUP SETTINGS (save to DB) ──
  const updateGroupSettings = useCallback(async (updates) => {
    if (!currentGroup) return
    const updatedGroup = { ...currentGroup, ...updates }
    await api.updateGroup(updatedGroup)

    // Update local state
    if (updates.paymentTypes) setPaymentTypes(updates.paymentTypes)
    if (updates.budgets) setBudgets(updates.budgets)
    if (updates.currency) setGroupCurrency(updates.currency)

    // Update groups list
    setGroups(prev => prev.map(g => g.groupId === currentGroup.groupId ? updatedGroup : g))
    setCurrentGroup(updatedGroup)
    showToast('Settings saved')
  }, [currentGroup, showToast])

  const addPaymentType = useCallback((name) => {
    if (!name || paymentTypes.includes(name)) return
    const updated = [...paymentTypes, name]
    setPaymentTypes(updated)
    updateGroupSettings({ ...currentGroup, paymentTypes: updated })
    showToast(`"${name}" added`)
  }, [paymentTypes, currentGroup, updateGroupSettings, showToast])

  const deletePaymentType = useCallback((index) => {
    if (index < 6) { showToast("Can't delete default types"); return }
    const updated = paymentTypes.filter((_, i) => i !== index)
    setPaymentTypes(updated)
    updateGroupSettings({ ...currentGroup, paymentTypes: updated })
  }, [paymentTypes, currentGroup, updateGroupSettings, showToast])

  const updateBudgets = useCallback((newBudgets) => {
    setBudgets(newBudgets)
    updateGroupSettings({ ...currentGroup, budgets: newBudgets })
  }, [currentGroup, updateGroupSettings])

  // ── EXPENSES ──
  const fetchExpenses = useCallback(async (month) => {
    if (!gid) return []
    setLoading(true)
    try {
      const data = await api.getExpenses(gid, month)
      setExpenses(data)
      return data
    } catch (e) { showToast('Could not load expenses') }
    finally { setLoading(false) }
    return []
  }, [gid, showToast])

  const addExpense = useCallback(async (expense) => {
    if (!gid) { showToast('Please select or create a group first'); return false }
    const result = await api.saveExpense({ ...expense, groupId: gid, createdBy: user?.email })
    if (result?.success) {
      showToast(`${expense.currency || groupCurrency}${Number(expense.amount).toLocaleString('en-IN')} saved ☁️`)
      return true
    }
    showToast('Error saving — check connection')
    return false
  }, [gid, user, groupCurrency, showToast])

  const editExpense = useCallback(async (expense) => {
    const result = await api.updateExpense({ ...expense, groupId: gid })
    if (result?.success) { showToast('Expense updated ✓'); return true }
    showToast('Error updating')
    return false
  }, [gid, showToast])

  const removeExpense = useCallback(async (expenseId) => {
    const result = await api.deleteExpense(gid, expenseId)
    if (result?.success) {
      setExpenses(prev => prev.filter(e => e.expenseId !== expenseId))
      showToast('Deleted')
      return true
    }
    showToast('Error deleting')
    return false
  }, [gid, showToast])

  // ── CASH FLOW ──
  const fetchCashFlow = useCallback(async (month) => {
    if (!gid) return []
    const data = await api.getCashFlow(gid, month)
    setCashflow(data || [])
    return data
  }, [gid])

  const addCashFlow = useCallback(async (entry) => {
    if (!gid) { showToast('Please select a group first'); return false }
    const result = await api.saveCashFlow({ ...entry, groupId: gid, createdBy: user?.email })
    if (result?.success) {
      setCashflow(prev => [result.item, ...prev])
      showToast(`Cash ${entry.cfType} saved ☁️`)
      return true
    }
    showToast('Error saving')
    return false
  }, [gid, user, showToast])

  // ── MEMBERS ──
  const fetchMembers = useCallback(async () => {
    if (!gid) return []
    const data = await api.getMembers(gid)
    if (data?.length) setMembers(data)
    return data
  }, [gid])

  const addMember = useCallback(async (name, email, role) => {
    if (!gid) return false
    const ci = members.length % AVATAR_COLORS.length
    const member = {
      groupId: gid,
      name, email, role,
      initials: name.slice(0, 2).toUpperCase(),
      color: AVATAR_COLORS[ci].bg,
      textColor: AVATAR_COLORS[ci].text,
      invitedBy: user?.email,
    }
    const result = await api.saveMember(member)
    if (result?.success) {
      setMembers(prev => [...prev, { ...member, userId: email }])
      showToast(`${name} added`)
      return true
    }
    showToast('Error adding member')
    return false
  }, [gid, members, user, showToast])

  const value = {
    // auth
    user, login, logout,
    // groups
    groups, currentGroup, gid,
    createGroup, switchGroup, removeGroup,
    // group settings (stored in group record in DB)
    paymentTypes, addPaymentType, deletePaymentType,
    budgets, updateBudgets,
    groupCurrency, setGroupCurrency: (c) => updateGroupSettings({ ...currentGroup, currency: c }),
    updateGroupSettings,
    // user preferences (stored in user record in DB)
    theme, setTheme,
    currency, setCurrency,
    // data
    members, expenses, cashflow,
    fetchExpenses, addExpense, editExpense, removeExpense,
    fetchCashFlow, addCashFlow,
    fetchMembers, addMember,
    // ui
    loading, toast, showToast,
    AVATAR_COLORS,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)

function parseJwt(token) {
  return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
}