import * as SQLite from 'expo-sqlite'
import * as Crypto from 'expo-crypto'

let db

export async function openDatabase() {
  db = await SQLite.openDatabaseAsync('tahseen.db')
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      balance REAL DEFAULT 45230.00,
      monthly_budget REAL DEFAULT 8500.00,
      monthly_income REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fixed_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      name_en TEXT,
      amount REAL NOT NULL,
      category TEXT DEFAULT 'other',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      beneficiary TEXT,
      reason TEXT,
      risk_score INTEGER DEFAULT 0,
      risk_level TEXT DEFAULT 'low',
      status TEXT DEFAULT 'completed',
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS beneficiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      iban TEXT DEFAULT '',
      bank TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      blocked_reason TEXT DEFAULT '',
      added_at TEXT DEFAULT (datetime('now')),
      last_transfer_at TEXT,
      transfer_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `)
  await migrate()
  return db
}

// SQLite ADD COLUMN throws if the column already exists; ignore that case so
// the migration is safe to run on every launch.
async function migrate() {
  try {
    await db.execAsync('ALTER TABLE users ADD COLUMN monthly_income REAL DEFAULT 0')
  } catch (e) {
    // column already exists
  }
}

export async function hashPassword(password) {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + 'tahseen_salt_2025'
  )
}

// SQLite stores timestamps as UTC text ("2026-06-06 03:15:00").
// The UI expects a numeric ms timestamp, so map rows on the way out.
function mapTransaction(row) {
  const ms = row.timestamp ? Date.parse(`${row.timestamp.replace(' ', 'T')}Z`) : Date.now()
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

// Auth functions
export async function registerUser(name, password) {
  const hash = await hashPassword(password)
  const result = await db.runAsync(
    'INSERT INTO users (name, password_hash) VALUES (?, ?)',
    [name.trim(), hash]
  )
  return result.lastInsertRowId
}

export async function loginUser(name, password) {
  const hash = await hashPassword(password)
  const user = await db.getFirstAsync(
    'SELECT * FROM users WHERE name = ? AND password_hash = ?',
    [name.trim(), hash]
  )
  return user // null if not found
}

export async function getUserByName(name) {
  return await db.getFirstAsync('SELECT * FROM users WHERE name = ?', [name.trim()])
}

export async function getUserById(id) {
  return await db.getFirstAsync('SELECT * FROM users WHERE id = ?', [id])
}

export async function saveSession(userId) {
  await db.runAsync('DELETE FROM sessions')
  await db.runAsync('INSERT INTO sessions (id, user_id) VALUES (1, ?)', [userId])
}

export async function getSession() {
  return await db.getFirstAsync('SELECT * FROM sessions WHERE id = 1')
}

export async function clearSession() {
  await db.runAsync('DELETE FROM sessions')
}

// Balance & transactions
export async function updateBalance(userId, newBalance) {
  await db.runAsync('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId])
}

export async function addTransaction(userId, transaction) {
  const result = await db.runAsync(
    `INSERT INTO transactions (user_id, type, amount, beneficiary, reason, risk_score, risk_level, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      transaction.type || 'transfer',
      transaction.amount,
      transaction.beneficiary || '',
      transaction.reason || '',
      transaction.riskScore || 0,
      transaction.riskLevel || 'low',
      transaction.status || 'completed',
    ]
  )
  return result.lastInsertRowId
}

export async function getTransactions(userId, limit = 50) {
  const rows = await db.getAllAsync(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC, id DESC LIMIT ?',
    [userId, limit]
  )
  return rows.map(mapTransaction)
}

export async function getMonthlySpent(userId) {
  const result = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
     WHERE user_id = ? AND status = 'completed' AND type = 'transfer'
     AND timestamp >= datetime('now', 'start of month')`,
    [userId]
  )
  return result?.total || 0
}

export async function resetUserData(userId) {
  await db.runAsync('DELETE FROM transactions WHERE user_id = ?', [userId])
  await db.runAsync('UPDATE users SET balance = 45230.00 WHERE id = ?', [userId])
}

// Financial profile: monthly income & fixed expenses
export async function updateMonthlyIncome(userId, income) {
  await db.runAsync('UPDATE users SET monthly_income = ? WHERE id = ?', [
    Number(income) || 0,
    userId,
  ])
}

export async function addFixedExpense(userId, { name, nameEn, amount, category }) {
  const result = await db.runAsync(
    `INSERT INTO fixed_expenses (user_id, name, name_en, amount, category)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, (name || '').trim(), nameEn || null, Number(amount) || 0, category || 'other']
  )
  return result.lastInsertRowId
}

export async function getFixedExpenses(userId) {
  const rows = await db.getAllAsync(
    'SELECT * FROM fixed_expenses WHERE user_id = ? ORDER BY id ASC',
    [userId]
  )
  return rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    nameEn: r.name_en || '',
    amount: r.amount,
    category: r.category || 'other',
  }))
}

export async function deleteFixedExpense(id) {
  await db.runAsync('DELETE FROM fixed_expenses WHERE id = ?', [id])
}

export async function updateFixedExpense(id, { name, nameEn, amount, category }) {
  await db.runAsync(
    'UPDATE fixed_expenses SET name = ?, name_en = ?, amount = ?, category = ? WHERE id = ?',
    [(name || '').trim(), nameEn || null, Number(amount) || 0, category || 'other', id]
  )
}

export async function getTotalFixedExpenses(userId) {
  const result = await db.getFirstAsync(
    'SELECT COALESCE(SUM(amount), 0) as total FROM fixed_expenses WHERE user_id = ?',
    [userId]
  )
  return result?.total || 0
}

// Beneficiaries
function mapBeneficiary(row) {
  const toMs = (s) => (s ? Date.parse(`${s.replace(' ', 'T')}Z`) : null)
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

export async function getBeneficiaries(userId) {
  const rows = await db.getAllAsync(
    'SELECT * FROM beneficiaries WHERE user_id = ? ORDER BY last_transfer_at DESC, added_at DESC',
    [userId]
  )
  return rows.map(mapBeneficiary)
}

export async function getActiveBeneficiaries(userId) {
  const rows = await db.getAllAsync(
    "SELECT * FROM beneficiaries WHERE user_id = ? AND status = 'active' ORDER BY last_transfer_at DESC, added_at DESC",
    [userId]
  )
  return rows.map(mapBeneficiary)
}

export async function addBeneficiary(userId, { name, iban, bank }) {
  const existing = await db.getFirstAsync(
    'SELECT * FROM beneficiaries WHERE user_id = ? AND name = ?',
    [userId, name.trim()]
  )
  if (existing) return mapBeneficiary(existing)

  const result = await db.runAsync(
    'INSERT INTO beneficiaries (user_id, name, iban, bank) VALUES (?, ?, ?, ?)',
    [userId, name.trim(), iban || '', bank || '']
  )
  return { id: String(result.lastInsertRowId), name: name.trim(), status: 'active' }
}

export async function blockBeneficiary(userId, name, reason) {
  const existing = await db.getFirstAsync(
    'SELECT * FROM beneficiaries WHERE user_id = ? AND name = ?',
    [userId, name.trim()]
  )
  if (!existing) {
    await db.runAsync(
      "INSERT INTO beneficiaries (user_id, name, status, blocked_reason) VALUES (?, ?, 'blocked', ?)",
      [userId, name.trim(), reason || 'تم الحظر بناءً على تحليل المخاطر']
    )
  } else {
    await db.runAsync(
      "UPDATE beneficiaries SET status = 'blocked', blocked_reason = ? WHERE user_id = ? AND name = ?",
      [reason || 'تم الحظر بناءً على تحليل المخاطر', userId, name.trim()]
    )
  }
}

export async function isBeneficiaryBlocked(userId, name) {
  const b = await db.getFirstAsync(
    'SELECT status FROM beneficiaries WHERE user_id = ? AND name = ?',
    [userId, name.trim()]
  )
  return b?.status === 'blocked'
}

export async function updateBeneficiaryLastTransfer(userId, name) {
  await db.runAsync(
    `UPDATE beneficiaries SET last_transfer_at = datetime('now'), transfer_count = transfer_count + 1
     WHERE user_id = ? AND name = ?`,
    [userId, name.trim()]
  )
}

export async function unblockBeneficiary(userId, beneficiaryId) {
  await db.runAsync(
    "UPDATE beneficiaries SET status = 'active', blocked_reason = '' WHERE id = ? AND user_id = ?",
    [beneficiaryId, userId]
  )
}
