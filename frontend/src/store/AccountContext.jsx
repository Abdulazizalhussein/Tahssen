// ─────────────────────────────────────────────────────────────────
//  Tahseen AccountContext — port of src/context/AccountContext.js
//  AsyncStorage replaced with localStorage (key tahseen.lang.v1)
// ─────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { STRINGS } from '../i18n'
import {
  openDatabase,
  registerUser,
  loginUser,
  getUserByName,
  getUserById,
  saveSession,
  getSession,
  clearSession,
  updateBalance,
  addTransaction,
  getTransactions,
  getMonthlySpent,
  resetUserData,
  updateMonthlyIncome,
  addFixedExpense,
  getFixedExpenses,
  deleteFixedExpense,
  updateFixedExpense,
  getTotalFixedExpenses,
  getBeneficiaries,
  addBeneficiary as addBeneficiaryDB,
  blockBeneficiary,
  unblockBeneficiary,
  updateBeneficiaryLastTransfer,
} from './db'

const LANG_KEY = 'tahseen.lang.v1'

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [memberSince, setMemberSince] = useState('')
  const [balance, setBalance] = useState(0)
  const [monthlyBudget, setMonthlyBudget] = useState(8500)
  const [monthlySpent, setMonthlySpent] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [fixedExpenses, setFixedExpenses] = useState([])
  const [totalFixedExpenses, setTotalFixedExpenses] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [beneficiaries, setBeneficiaries] = useState([])
  const [lang, setLang] = useState('ar')
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(async (id) => {
    const user = await getUserById(id)
    if (!user) return false
    const [txs, spent, expenses, totalFixed, bens] = await Promise.all([
      getTransactions(id),
      getMonthlySpent(id),
      getFixedExpenses(id),
      getTotalFixedExpenses(id),
      getBeneficiaries(id),
    ])
    setUserId(user.id)
    setUserName(user.name)
    setMemberSince(user.created_at || '')
    setBalance(user.balance)
    setMonthlyBudget(user.monthly_budget)
    setMonthlyIncome(user.monthly_income || 0)
    setFixedExpenses(expenses)
    setTotalFixedExpenses(totalFixed)
    setTransactions(txs)
    setBeneficiaries(bens)
    setMonthlySpent(spent)
    return true
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        await openDatabase()
        const storedLang = localStorage.getItem(LANG_KEY)
        if (storedLang) setLang(storedLang)

        const session = await getSession()
        if (session?.user_id) await loadUser(session.user_id)
      } catch (e) {
        // start unauthenticated on any failure
      } finally {
        setIsLoading(false)
      }
    })()
  }, [loadUser])

  const register = useCallback(
    async (name, password) => {
      const existing = await getUserByName(name)
      if (existing) return { ok: false, error: 'nameTaken' }
      const id = await registerUser(name, password)
      await saveSession(id)
      await loadUser(id)
      return { ok: true }
    },
    [loadUser]
  )

  const login = useCallback(
    async (name, password) => {
      const user = await loginUser(name, password)
      if (!user) return { ok: false, error: 'invalidCredentials' }
      await saveSession(user.id)
      await loadUser(user.id)
      return { ok: true }
    },
    [loadUser]
  )

  const logout = useCallback(async () => {
    await clearSession()
    setUserId(null)
    setUserName('')
    setMemberSince('')
    setBalance(0)
    setMonthlySpent(0)
    setMonthlyIncome(0)
    setFixedExpenses([])
    setTotalFixedExpenses(0)
    setTransactions([])
    setBeneficiaries([])
  }, [])

  const refreshBeneficiaries = useCallback(
    async (id) => {
      const targetId = id || userId
      if (!targetId) return
      const list = await getBeneficiaries(targetId)
      setBeneficiaries(list)
    },
    [userId]
  )

  const addBeneficiary = useCallback(
    async ({ name, iban, bank }) => {
      if (!userId) return
      await addBeneficiaryDB(userId, { name, iban, bank })
      await refreshBeneficiaries(userId)
    },
    [userId, refreshBeneficiaries]
  )

  const blockBeneficiaryAction = useCallback(
    async (name, reason) => {
      if (!userId) return
      await blockBeneficiary(userId, name, reason)
      await refreshBeneficiaries(userId)
    },
    [userId, refreshBeneficiaries]
  )

  const unblockBeneficiaryAction = useCallback(
    async (id) => {
      if (!userId) return
      await unblockBeneficiary(userId, id)
      await refreshBeneficiaries(userId)
    },
    [userId, refreshBeneficiaries]
  )

  const refreshFixedExpenses = useCallback(async (id) => {
    const [expenses, total] = await Promise.all([
      getFixedExpenses(id),
      getTotalFixedExpenses(id),
    ])
    setFixedExpenses(expenses)
    setTotalFixedExpenses(total)
  }, [])

  const saveMonthlyIncome = useCallback(
    async (income) => {
      if (!userId) return
      const value = Number(income) || 0
      await updateMonthlyIncome(userId, value)
      setMonthlyIncome(value)
    },
    [userId]
  )

  const addExpense = useCallback(
    async (expense) => {
      if (!userId) return
      await addFixedExpense(userId, expense)
      await refreshFixedExpenses(userId)
    },
    [userId, refreshFixedExpenses]
  )

  const removeExpense = useCallback(
    async (id) => {
      if (!userId) return
      await deleteFixedExpense(id)
      await refreshFixedExpenses(userId)
    },
    [userId, refreshFixedExpenses]
  )

  const editExpense = useCallback(
    async (id, expense) => {
      if (!userId) return
      await updateFixedExpense(id, expense)
      await refreshFixedExpenses(userId)
    },
    [userId, refreshFixedExpenses]
  )

  const toggleLang = useCallback(async () => {
    setLang((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar'
      try { localStorage.setItem(LANG_KEY, next) } catch {}
      return next
    })
  }, [])

  const refreshMonthlySpent = useCallback(async (id) => {
    try {
      const spent = await getMonthlySpent(id)
      setMonthlySpent(spent)
    } catch (e) {
      // ignore
    }
  }, [])

  const executeTransfer = useCallback(
    async (transfer) => {
      if (!userId) return null
      const amount = Number(transfer.amount) || 0
      const payload = {
        type: 'transfer',
        amount,
        beneficiary: transfer.beneficiary || '',
        reason: transfer.reason || '',
        riskScore: typeof transfer.riskScore === 'number' ? transfer.riskScore : 0,
        riskLevel: transfer.riskLevel || 'low',
        status: 'completed',
      }
      const newBalance = balance - amount
      try {
        await addTransaction(userId, payload)
        await updateBalance(userId, newBalance)
        if (payload.beneficiary) {
          await addBeneficiaryDB(userId, { name: payload.beneficiary })
          await updateBeneficiaryLastTransfer(userId, payload.beneficiary)
        }
        const [txs] = await Promise.all([getTransactions(userId), refreshMonthlySpent(userId)])
        setBalance(newBalance)
        setTransactions(txs)
        await refreshBeneficiaries(userId)
      } catch (e) {
        // ignore persistence failure
      }
      return payload
    },
    [userId, balance, refreshMonthlySpent, refreshBeneficiaries]
  )

  const blockTransfer = useCallback(
    async (transfer) => {
      if (!userId) return null
      const payload = {
        type: 'transfer',
        amount: Number(transfer.amount) || 0,
        beneficiary: transfer.beneficiary || '',
        reason: transfer.reason || '',
        riskScore: typeof transfer.riskScore === 'number' ? transfer.riskScore : 0,
        riskLevel: transfer.riskLevel || 'low',
        status: 'blocked',
      }
      try {
        await addTransaction(userId, payload)
        if (payload.beneficiary) {
          await blockBeneficiary(
            userId,
            payload.beneficiary,
            payload.reasoning || payload.reason || 'مؤشرات احتيال مرتفعة'
          )
        }
        const txs = await getTransactions(userId)
        setTransactions(txs)
        await refreshBeneficiaries(userId)
      } catch (e) {
        // ignore
      }
      return payload
    },
    [userId, refreshBeneficiaries]
  )

  const resetAccount = useCallback(async () => {
    if (!userId) return
    try {
      await resetUserData(userId)
      await loadUser(userId)
    } catch (e) {
      // ignore
    }
  }, [userId, loadUser])

  const t = useCallback((key) => STRINGS[lang]?.[key] ?? STRINGS.ar?.[key] ?? key, [lang])

  const formatMoney = useCallback(
    (n) =>
      (Number(n) || 0).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [lang]
  )

  const discretionaryBudget = monthlyIncome - totalFixedExpenses - monthlySpent

  const value = useMemo(
    () => ({
      userId,
      userName,
      memberSince,
      balance,
      monthlyBudget,
      monthlySpent,
      monthlyIncome,
      fixedExpenses,
      totalFixedExpenses,
      discretionaryBudget,
      transactions,
      beneficiaries,
      lang,
      isLoading,
      isAuthed: !!userId,
      isRTL: lang === 'ar',
      register,
      login,
      logout,
      loadUser,
      toggleLang,
      executeTransfer,
      blockTransfer,
      resetAccount,
      saveMonthlyIncome,
      addExpense,
      removeExpense,
      editExpense,
      refreshBeneficiaries,
      addBeneficiary,
      blockBeneficiaryAction,
      unblockBeneficiaryAction,
      t,
      formatMoney,
    }),
    [
      userId,
      userName,
      memberSince,
      balance,
      monthlyBudget,
      monthlySpent,
      monthlyIncome,
      fixedExpenses,
      totalFixedExpenses,
      discretionaryBudget,
      transactions,
      beneficiaries,
      lang,
      isLoading,
      register,
      login,
      logout,
      loadUser,
      toggleLang,
      executeTransfer,
      blockTransfer,
      resetAccount,
      saveMonthlyIncome,
      addExpense,
      removeExpense,
      editExpense,
      refreshBeneficiaries,
      addBeneficiary,
      blockBeneficiaryAction,
      unblockBeneficiaryAction,
      t,
      formatMoney,
    ]
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
