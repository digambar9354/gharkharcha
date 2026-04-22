import config from '../config.js'

// ── Base caller ────────────────────────────────────────────────────────────
async function call(path, method = 'GET', body = null) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } }
    if (body) opts.body = JSON.stringify(body)

    const res = await fetch(`${config.api.baseUrl}${path}`, opts)
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()

  } catch (e) {
    console.warn('API error:', path, e.message)
    return null
  }
}

// ── User ───────────────────────────────────────────────────────────────────
export const saveUser = (u) => call('/user', 'POST', u)
export const getUser = (userId) => call(`/user?userId=${encodeURIComponent(userId)}`)

// ── Groups ─────────────────────────────────────────────────────────────────
export const saveGroup = (g) => call('/group', 'POST', g)
export const getGroup = (groupId) => call(`/group?groupId=${groupId}`)
export const updateGroup = (g) => call('/group', 'PUT', g)
export const deleteGroup = (groupId) => call('/group', 'DELETE', { groupId })

// ── Members ────────────────────────────────────────────────────────────────
export const saveMember = (m) => call('/member', 'POST', m)
export const getMembers = (groupId) => call(`/members?groupId=${groupId}`).then(d => d?.members || [])
export const deleteMember = (groupId, userId) => call('/member', 'DELETE', { groupId, userId })

// ── Expenses ───────────────────────────────────────────────────────────────
export const saveExpense = (e) => call('/expense', 'POST', e)
export const getExpenses = (groupId, month) => call(`/expenses?groupId=${groupId}${month ? '&month=' + month : ''}`).then(d => d?.expenses || [])
export const updateExpense = (e) => call('/expense', 'PUT', e)
export const deleteExpense = (groupId, expenseId) => call('/expense', 'DELETE', { groupId, expenseId })
export const batchSaveExpenses = (groupId, expenses, createdBy, currency) =>
  call('/expenses/batch', 'POST', { groupId, createdBy, currency, expenses })

// ── Cash Flow ──────────────────────────────────────────────────────────────
export const saveCashFlow = (e) => call('/cashflow', 'POST', e)
export const getCashFlow = (groupId, month) => call(`/cashflow?groupId=${groupId}${month ? '&month=' + month : ''}`).then(d => d?.cashflow || [])