import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as api from '../api/api'
import {
  AVATAR_COLORS,
  DEFAULT_PAYMENT_TYPES,
  DEFAULT_BUDGETS,
  TOAST_DURATION_MS,
} from '../constants/index.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null)

  // ── Groups ────────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState([])
  const [currentGroup, setCurrentGroup] = useState(null)

  // ── Group data ────────────────────────────────────────────────────────────
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [cashflow, setCashflow] = useState([])

  // ── Group settings (persisted in the group DB record) ─────────────────────
  const [paymentTypes, setPaymentTypes] = useState(DEFAULT_PAYMENT_TYPES)
  const [budgets, setBudgets] = useState(DEFAULT_BUDGETS)
  const [groupCurrency, setGroupCurrencyState] = useState('₹')

  // ── User preferences (persisted in the user DB record) ───────────────────
  const [theme, setThemeState] = useState('light')
  const [currency, setCurrencyState] = useState('₹')

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const gid = currentGroup?.groupId || null

  // ── Theme sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), TOAST_DURATION_MS)
  }, [])

  // ── Group settings loader ─────────────────────────────────────────────────
  const loadGroupSettings = useCallback((group) => {
    if (!group) return
    setPaymentTypes(group.paymentTypes || DEFAULT_PAYMENT_TYPES)
    setBudgets(group.budgets || DEFAULT_BUDGETS)
    setGroupCurrencyState(group.currency || '₹')
  }, [])

  // ── AUTH ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (googleResponse) => {
    const p = parseJwt(googleResponse.credential)
    const u = {
      name: p.name,
      email: p.email,
      picture: p.picture,
      initials: p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    }

    await api.saveUser({ email: u.email, name: u.name, picture: u.picture })

    const result = await api.getUser(u.email)
    if (result) {
      u.defaultGroupId = result.user?.defaultGroupId || null
      setThemeState(result.user?.theme || 'light')
      setCurrencyState(result.user?.currency || '₹')
      if (result.groups?.length) {
        setGroups(result.groups)
        const defaultGroup = result.groups.find(g => g.groupId === result.user?.defaultGroupId) || result.groups[0]
        setCurrentGroup(defaultGroup)
        loadGroupSettings(defaultGroup)
      }
    }

    setUser(u)
    localStorage.setItem('gk_session', JSON.stringify({ email: u.email, name: u.name, picture: u.picture }))
  }, [loadGroupSettings])

  const logout = useCallback(() => {
    setUser(null)
    setGroups([])
    setCurrentGroup(null)
    setMembers([])
    setExpenses([])
    setCashflow([])
    localStorage.removeItem('gk_session')
  }, [])

  // ── Session restore ────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('gk_session')
    if (!raw) return
    try {
      const s = JSON.parse(raw)
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
          const defaultGroup = result.groups.find(g => g.groupId === result.user?.defaultGroupId) || result.groups[0]
          setCurrentGroup(defaultGroup)
          loadGroupSettings(defaultGroup)
        }
      })
    } catch {
      localStorage.removeItem('gk_session')
    }
  }, [loadGroupSettings])

  // ── THEME ─────────────────────────────────────────────────────────────────
  const setTheme = useCallback(async (t) => {
    setThemeState(t)
    if (user?.email) await api.saveUser({ email: user.email, name: user.name, theme: t, currency })
  }, [user, currency])

  // ── CURRENCY ──────────────────────────────────────────────────────────────
  const setCurrency = useCallback(async (c) => {
    setCurrencyState(c)
    if (user?.email) await api.saveUser({ email: user.email, name: user.name, theme, currency: c })
  }, [user, theme])

  // ── GROUPS ────────────────────────────────────────────────────────────────
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
    setGroups(prev => [...prev, newGroup])
    setCurrentGroup(newGroup)
    loadGroupSettings(newGroup)
    await api.saveUser({ email: user.email, name: user.name, defaultGroupId: newGroup.groupId })
    showToast(`Group "${name}" created!`)
    return newGroup
  }, [user, groupCurrency, loadGroupSettings, showToast])

  const switchGroup = useCallback(async (groupId) => {
    const g = groups.find(g => g.groupId === groupId)
    if (!g) return
    const result = await api.getGroup(groupId)
    const freshGroup = result?.group ? { ...result.group, userRole: g.userRole } : g
    setCurrentGroup(freshGroup)
    loadGroupSettings(freshGroup)
    setMembers([])
    setExpenses([])
    setCashflow([])
    if (user?.email) await api.saveUser({ email: user.email, name: user.name, defaultGroupId: groupId })
  }, [groups, user, loadGroupSettings])

  const removeGroup = useCallback(async (groupId) => {
    await api.deleteGroup(groupId)
    setGroups(prev => {
      const updated = prev.filter(g => g.groupId !== groupId)
      if (currentGroup?.groupId === groupId) {
        setCurrentGroup(updated[0] || null)
        if (updated[0]) loadGroupSettings(updated[0])
      }
      return updated
    })
    showToast('Group deleted')
  }, [currentGroup, loadGroupSettings, showToast])

  // ── GROUP SETTINGS ────────────────────────────────────────────────────────
  const updateGroupSettings = useCallback(async (updates) => {
    if (!currentGroup) return
    const updatedGroup = { ...currentGroup, ...updates }
    await api.updateGroup(updatedGroup)
    if (updates.paymentTypes !== undefined) setPaymentTypes(updates.paymentTypes)
    if (updates.budgets !== undefined) setBudgets(updates.budgets)
    if (updates.currency !== undefined) setGroupCurrencyState(updates.currency)
    setGroups(prev => prev.map(g => g.groupId === currentGroup.groupId ? updatedGroup : g))
    setCurrentGroup(updatedGroup)
    showToast('Settings saved')
  }, [currentGroup, showToast])

  const addPaymentType = useCallback((name) => {
    if (!name || paymentTypes.includes(name)) return
    const updated = [...paymentTypes, name]
    setPaymentTypes(updated)
    updateGroupSettings({ paymentTypes: updated })
    showToast(`"${name}" added`)
  }, [paymentTypes, updateGroupSettings, showToast])

  const deletePaymentType = useCallback((index) => {
    if (index < DEFAULT_PAYMENT_TYPES.length) { showToast("Can't delete default types"); return }
    const updated = paymentTypes.filter((_, i) => i !== index)
    setPaymentTypes(updated)
    updateGroupSettings({ paymentTypes: updated })
  }, [paymentTypes, updateGroupSettings, showToast])

  const updateBudgets = useCallback((newBudgets) => {
    setBudgets(newBudgets)
    updateGroupSettings({ budgets: newBudgets })
  }, [updateGroupSettings])

  // ── EXPENSES ──────────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async (month) => {
    if (!gid) return []
    setLoading(true)
    try {
      const data = await api.getExpenses(gid, month)
      setExpenses(data)
      return data
    } catch {
      showToast('Could not load expenses')
      return []
    } finally {
      setLoading(false)
    }
  }, [gid, showToast])

  const addExpense = useCallback(async (expense) => {
    if (!gid) { showToast('Please select or create a group first'); return false }
    const result = await api.saveExpense({ ...expense, groupId: gid, createdBy: user?.email })
    if (result?.success) {
      // Add to local state so list updates immediately without a refetch
      const newExpense = result.item || { ...expense, expenseId: result.expenseId, groupId: gid }
      setExpenses(prev => [newExpense, ...prev])
      showToast(`${expense.currency || groupCurrency}${Number(expense.amount).toLocaleString('en-IN')} saved ☁️`)
      return true
    }
    showToast('Error saving — check connection')
    return false
  }, [gid, user, groupCurrency, showToast])

  const editExpense = useCallback(async (expense) => {
    const result = await api.updateExpense({ ...expense, groupId: gid })
    if (result?.success) {
      setExpenses(prev => prev.map(e => (e.expenseId === expense.expenseId ? { ...e, ...expense } : e)))
      showToast('Expense updated ✓')
      return true
    }
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

  // ── CASH FLOW ─────────────────────────────────────────────────────────────
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

  // ── MEMBERS ───────────────────────────────────────────────────────────────
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
      groupId: gid, name, email, role,
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
    // group settings
    paymentTypes, addPaymentType, deletePaymentType,
    budgets, updateBudgets,
    groupCurrency,
    setGroupCurrency: (c) => updateGroupSettings({ currency: c }),
    updateGroupSettings,
    // user preferences
    theme, setTheme,
    currency, setCurrency,
    // data
    members, expenses, cashflow,
    fetchExpenses, addExpense, editExpense, removeExpense,
    fetchCashFlow, addCashFlow,
    fetchMembers, addMember,
    // ui
    loading, toast, showToast,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)

function parseJwt(token) {
  return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
}
