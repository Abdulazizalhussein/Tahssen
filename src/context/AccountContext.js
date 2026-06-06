import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
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
} from '../db/database'

const LANG_KEY = 'tahseen.lang.v1'
const API_KEY_NAME = 'tahseen_openai_key'

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [memberSince, setMemberSince] = useState('')
  const [balance, setBalance] = useState(0)
  const [monthlyBudget, setMonthlyBudget] = useState(8500)
  const [monthlySpent, setMonthlySpent] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [apiKey, setApiKeyState] = useState(null)
  const [lang, setLang] = useState('ar')
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(async (id) => {
    const user = await getUserById(id)
    if (!user) return false
    const [txs, spent] = await Promise.all([getTransactions(id), getMonthlySpent(id)])
    setUserId(user.id)
    setUserName(user.name)
    setMemberSince(user.created_at || '')
    setBalance(user.balance)
    setMonthlyBudget(user.monthly_budget)
    setTransactions(txs)
    setMonthlySpent(spent)
    return true
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        await openDatabase()
        const storedLang = await AsyncStorage.getItem(LANG_KEY)
        if (storedLang) setLang(storedLang)

        const envKey = process.env.EXPO_PUBLIC_OPENAI_KEY
        const savedKey = await SecureStore.getItemAsync(API_KEY_NAME)
        const keyToUse = savedKey || envKey || null
        if (keyToUse && !savedKey) await SecureStore.setItemAsync(API_KEY_NAME, keyToUse)
        if (keyToUse) setApiKeyState(keyToUse)

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
    setTransactions([])
  }, [])

  const setApiKey = useCallback(async (key) => {
    const trimmed = (key || '').trim()
    setApiKeyState(trimmed || null)
    try {
      if (trimmed) await SecureStore.setItemAsync(API_KEY_NAME, trimmed)
      else await SecureStore.deleteItemAsync(API_KEY_NAME)
    } catch (e) {
      // ignore
    }
  }, [])

  const toggleLang = useCallback(async () => {
    setLang((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar'
      AsyncStorage.setItem(LANG_KEY, next).catch(() => {})
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
        const [txs] = await Promise.all([getTransactions(userId), refreshMonthlySpent(userId)])
        setBalance(newBalance)
        setTransactions(txs)
      } catch (e) {
        // ignore persistence failure
      }
      return payload
    },
    [userId, balance, refreshMonthlySpent]
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
        const txs = await getTransactions(userId)
        setTransactions(txs)
      } catch (e) {
        // ignore
      }
      return payload
    },
    [userId]
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

  const t = useCallback((key) => STRINGS[lang][key] ?? STRINGS.ar[key] ?? key, [lang])

  const formatMoney = useCallback(
    (n) =>
      (Number(n) || 0).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [lang]
  )

  const value = useMemo(
    () => ({
      userId,
      userName,
      memberSince,
      balance,
      monthlyBudget,
      monthlySpent,
      transactions,
      apiKey,
      lang,
      isLoading,
      isAuthed: !!userId,
      isRTL: lang === 'ar',
      register,
      login,
      logout,
      loadUser,
      setApiKey,
      toggleLang,
      executeTransfer,
      blockTransfer,
      resetAccount,
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
      transactions,
      apiKey,
      lang,
      isLoading,
      register,
      login,
      logout,
      loadUser,
      setApiKey,
      toggleLang,
      executeTransfer,
      blockTransfer,
      resetAccount,
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
