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
      created_at TEXT DEFAULT (datetime('now'))
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
  `)
  return db
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
