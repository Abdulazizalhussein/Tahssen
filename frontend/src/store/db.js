// ─────────────────────────────────────────────────────────────────
//  Tahseen localStorage DB — port of src/db/database.js
//  Single JSON document under key tahseen.db.v1
// ─────────────────────────────────────────────────────────────────

const DB_KEY = 'tahseen.db.v1'

const EMPTY_DB = () => ({
  seq: { users: 0, transactions: 0, fixed_expenses: 0, beneficiaries: 0 },
  users: [],
  transactions: [],
  fixed_expenses: [],
  beneficiaries: [],
  session: null,
})

function readDB() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return EMPTY_DB()
    return JSON.parse(raw)
  } catch {
    return EMPTY_DB()
  }
}

function writeDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data))
}

// ── Database init ─────────────────────────────────────────────────

export async function openDatabase() {
  // Ensure the store exists with correct shape
  const data = readDB()
  // Back-fill any missing seq keys
  if (!data.seq) data.seq = { users: 0, transactions: 0, fixed_expenses: 0, beneficiaries: 0 }
  if (!data.users) data.users = []
  if (!data.transactions) data.transactions = []
  if (!data.fixed_expenses) data.fixed_expenses = []
  if (!data.beneficiaries) data.beneficiaries = []
  if (data.session === undefined) data.session = null
  writeDB(data)
  return true
}

// ── Password hashing (Web Crypto SHA-256 + salt) ──────────────────

export async function hashPassword(password) {
  const text = password + 'tahseen_salt_2025'
  const encoded = new TextEncoder().encode(text)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Row mappers ───────────────────────────────────────────────────

function mapTransaction(row) {
  // Timestamps stored as ISO strings; UI expects ms numbers
  const ms = row.timestamp ? Date.parse(row.timestamp) : Date.now()
  return {
    id: String(row.id),
    type: row.type,
    amount: row.amount,
    beneficiary: row.beneficiary || '',
    iban: '',
    reason: row.reason || '',
    riskScore: row.risk_score || 0,
    riskLevel: row.risk_level || 'low',
    status: row.status,
    blocked: row.status === 'blocked',
    timestamp: Number.isNaN(ms) ? Date.now() : ms,
  }
}

function mapBeneficiary(row) {
  const toMs = (s) => (s ? Date.parse(s) : null)
  return {
    id: String(row.id),
    name: row.name,
    iban: row.iban || '',
    bank: row.bank || '',
    status: row.status || 'active',
    blockedReason: row.blocked_reason || '',
    addedAt: toMs(row.added_at),
    lastTransferAt: toMs(row.last_transfer_at),
    transferCount: row.transfer_count || 0,
  }
}

// ── Auth ──────────────────────────────────────────────────────────

export async function registerUser(name, password) {
  const hash = await hashPassword(password)
  const data = readDB()
  data.seq.users += 1
  const id = data.seq.users
  data.users.push({
    id,
    name: name.trim(),
    password_hash: hash,
    balance: 45230.00,
    monthly_budget: 8500.00,
    monthly_income: 0,
    created_at: new Date().toISOString(),
  })
  writeDB(data)
  return id
}

export async function loginUser(name, password) {
  const hash = await hashPassword(password)
  const data = readDB()
  const user = data.users.find(
    (u) => u.name === name.trim() && u.password_hash === hash
  )
  return user || null
}

export async function getUserByName(name) {
  const data = readDB()
  return data.users.find((u) => u.name === name.trim()) || null
}

export async function getUserById(id) {
  const data = readDB()
  return data.users.find((u) => u.id === id) || null
}

// ── Session ───────────────────────────────────────────────────────

export async function saveSession(userId) {
  const data = readDB()
  data.session = { user_id: userId, created_at: new Date().toISOString() }
  writeDB(data)
}

export async function getSession() {
  const data = readDB()
  return data.session || null
}

export async function clearSession() {
  const data = readDB()
  data.session = null
  writeDB(data)
}

// ── Balance & transactions ────────────────────────────────────────

export async function updateBalance(userId, newBalance) {
  const data = readDB()
  const user = data.users.find((u) => u.id === userId)
  if (user) user.balance = newBalance
  writeDB(data)
}

export async function addTransaction(userId, transaction) {
  const data = readDB()
  data.seq.transactions += 1
  const id = data.seq.transactions
  data.transactions.push({
    id,
    user_id: userId,
    type: transaction.type || 'transfer',
    amount: transaction.amount,
    beneficiary: transaction.beneficiary || '',
    reason: transaction.reason || '',
    risk_score: transaction.riskScore || 0,
    risk_level: transaction.riskLevel || 'low',
    status: transaction.status || 'completed',
    timestamp: new Date().toISOString(),
  })
  writeDB(data)
  return id
}

export async function getTransactions(userId, limit = 50) {
  const data = readDB()
  const rows = data.transactions
    .filter((t) => t.user_id === userId)
    .sort((a, b) => {
      const ta = a.timestamp ? Date.parse(a.timestamp) : 0
      const tb = b.timestamp ? Date.parse(b.timestamp) : 0
      if (tb !== ta) return tb - ta
      return b.id - a.id
    })
    .slice(0, limit)
  return rows.map(mapTransaction)
}

export async function getMonthlySpent(userId) {
  const data = readDB()
  const now = new Date()
  // Start of current calendar month (local time)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const total = data.transactions
    .filter((t) =>
      t.user_id === userId &&
      t.status === 'completed' &&
      t.type === 'transfer' &&
      t.timestamp &&
      new Date(t.timestamp) >= startOfMonth
    )
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  return total
}

export async function resetUserData(userId) {
  const data = readDB()
  data.transactions = data.transactions.filter((t) => t.user_id !== userId)
  const user = data.users.find((u) => u.id === userId)
  if (user) user.balance = 45230.00
  writeDB(data)
}

// ── Financial profile ─────────────────────────────────────────────

export async function updateMonthlyIncome(userId, income) {
  const data = readDB()
  const user = data.users.find((u) => u.id === userId)
  if (user) user.monthly_income = Number(income) || 0
  writeDB(data)
}

export async function addFixedExpense(userId, { name, nameEn, amount, category }) {
  const data = readDB()
  data.seq.fixed_expenses += 1
  const id = data.seq.fixed_expenses
  data.fixed_expenses.push({
    id,
    user_id: userId,
    name: (name || '').trim(),
    name_en: nameEn || null,
    amount: Number(amount) || 0,
    category: category || 'other',
  })
  writeDB(data)
  return id
}

export async function getFixedExpenses(userId) {
  const data = readDB()
  return data.fixed_expenses
    .filter((e) => e.user_id === userId)
    .sort((a, b) => a.id - b.id)
    .map((r) => ({
      id: String(r.id),
      name: r.name,
      nameEn: r.name_en || '',
      amount: r.amount,
      category: r.category || 'other',
    }))
}

export async function deleteFixedExpense(id) {
  const data = readDB()
  data.fixed_expenses = data.fixed_expenses.filter((e) => e.id !== Number(id))
  writeDB(data)
}

export async function updateFixedExpense(id, { name, nameEn, amount, category }) {
  const data = readDB()
  const exp = data.fixed_expenses.find((e) => e.id === Number(id))
  if (exp) {
    exp.name = (name || '').trim()
    exp.name_en = nameEn || null
    exp.amount = Number(amount) || 0
    exp.category = category || 'other'
  }
  writeDB(data)
}

export async function getTotalFixedExpenses(userId) {
  const data = readDB()
  return data.fixed_expenses
    .filter((e) => e.user_id === userId)
    .reduce((sum, e) => sum + (e.amount || 0), 0)
}

// ── Beneficiaries ─────────────────────────────────────────────────

export async function getBeneficiaries(userId) {
  const data = readDB()
  return data.beneficiaries
    .filter((b) => b.user_id === userId)
    .sort((a, b) => {
      // Sort by last_transfer_at DESC, then added_at DESC
      const ta = a.last_transfer_at ? Date.parse(a.last_transfer_at) : 0
      const tb = b.last_transfer_at ? Date.parse(b.last_transfer_at) : 0
      if (tb !== ta) return tb - ta
      const aa = a.added_at ? Date.parse(a.added_at) : 0
      const ab = b.added_at ? Date.parse(b.added_at) : 0
      return ab - aa
    })
    .map(mapBeneficiary)
}

export async function getActiveBeneficiaries(userId) {
  const data = readDB()
  return data.beneficiaries
    .filter((b) => b.user_id === userId && b.status === 'active')
    .sort((a, b) => {
      const ta = a.last_transfer_at ? Date.parse(a.last_transfer_at) : 0
      const tb = b.last_transfer_at ? Date.parse(b.last_transfer_at) : 0
      if (tb !== ta) return tb - ta
      const aa = a.added_at ? Date.parse(a.added_at) : 0
      const ab = b.added_at ? Date.parse(b.added_at) : 0
      return ab - aa
    })
    .map(mapBeneficiary)
}

export async function addBeneficiary(userId, { name, iban, bank }) {
  const data = readDB()
  // Dedupe by trimmed name
  const trimmedName = (name || '').trim()
  const existing = data.beneficiaries.find(
    (b) => b.user_id === userId && b.name === trimmedName
  )
  if (existing) return mapBeneficiary(existing)

  data.seq.beneficiaries += 1
  const id = data.seq.beneficiaries
  const row = {
    id,
    user_id: userId,
    name: trimmedName,
    iban: iban || '',
    bank: bank || '',
    status: 'active',
    blocked_reason: '',
    added_at: new Date().toISOString(),
    last_transfer_at: null,
    transfer_count: 0,
  }
  data.beneficiaries.push(row)
  writeDB(data)
  return { id: String(id), name: trimmedName, status: 'active' }
}

export async function blockBeneficiary(userId, name, reason) {
  const data = readDB()
  const trimmedName = (name || '').trim()
  const existing = data.beneficiaries.find(
    (b) => b.user_id === userId && b.name === trimmedName
  )
  if (!existing) {
    // Insert new blocked beneficiary
    data.seq.beneficiaries += 1
    data.beneficiaries.push({
      id: data.seq.beneficiaries,
      user_id: userId,
      name: trimmedName,
      iban: '',
      bank: '',
      status: 'blocked',
      blocked_reason: reason || 'تم الحظر بناءً على تحليل المخاطر',
      added_at: new Date().toISOString(),
      last_transfer_at: null,
      transfer_count: 0,
    })
  } else {
    existing.status = 'blocked'
    existing.blocked_reason = reason || 'تم الحظر بناءً على تحليل المخاطر'
  }
  writeDB(data)
}

export async function isBeneficiaryBlocked(userId, name) {
  const data = readDB()
  const trimmedName = (name || '').trim()
  const b = data.beneficiaries.find(
    (b) => b.user_id === userId && b.name === trimmedName
  )
  return b?.status === 'blocked'
}

export async function updateBeneficiaryLastTransfer(userId, name) {
  const data = readDB()
  const trimmedName = (name || '').trim()
  const b = data.beneficiaries.find(
    (b) => b.user_id === userId && b.name === trimmedName
  )
  if (b) {
    b.last_transfer_at = new Date().toISOString()
    b.transfer_count = (b.transfer_count || 0) + 1
  }
  writeDB(data)
}

export async function unblockBeneficiary(userId, beneficiaryId) {
  const data = readDB()
  const b = data.beneficiaries.find(
    (b) => b.id === Number(beneficiaryId) && b.user_id === userId
  )
  if (b) {
    b.status = 'active'
    b.blocked_reason = ''
  }
  writeDB(data)
}
