import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { STRINGS } from '../i18n'

const INITIAL = {
  balance: 45230.0,
  monthlyBudget: 8500.0,
  transactions: [],
}

const STORAGE_KEY = 'tahseen.account.v1'
const LANG_KEY = 'tahseen.lang.v1'
const API_KEY_NAME = 'tahseen_openai_key'

const AccountContext = createContext(null)

const sameMonth = (ts) => {
  const d = new Date(ts)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export function AccountProvider({ children }) {
  const [balance, setBalance] = useState(INITIAL.balance)
  const [monthlyBudget] = useState(INITIAL.monthlyBudget)
  const [transactions, setTransactions] = useState(INITIAL.transactions)
  const [apiKey, setApiKeyState] = useState(null)
  const [lang, setLang] = useState('ar')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (typeof parsed.balance === 'number') setBalance(parsed.balance)
          if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions)
        }
        const storedLang = await AsyncStorage.getItem(LANG_KEY)
        if (storedLang) setLang(storedLang)
        const envKey = process.env.EXPO_PUBLIC_OPENAI_KEY
        const savedKey = await SecureStore.getItemAsync(API_KEY_NAME)
        const keyToUse = savedKey || envKey || null
        if (keyToUse && !savedKey) {
          await SecureStore.setItemAsync(API_KEY_NAME, keyToUse)
        }
        if (keyToUse) setApiKeyState(keyToUse)
      } catch (e) {
        // ignore corrupt storage
      } finally {
        setHydrated(true)
      }
    })()
  }, [])

  const persist = useCallback(async (nextBalance, nextTx) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ balance: nextBalance, transactions: nextTx })
      )
    } catch (e) {
      // ignore
    }
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

  const makeTx = (transfer, blocked) => ({
    id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    type: 'transfer',
    amount: Number(transfer.amount) || 0,
    beneficiary: transfer.beneficiary || '',
    iban: transfer.iban || '',
    reason: transfer.reason || '',
    riskScore: typeof transfer.riskScore === 'number' ? transfer.riskScore : 0,
    riskLevel: transfer.riskLevel || 'low',
    timestamp: Date.now(),
    blocked: !!blocked,
  })

  const executeTransfer = useCallback(
    (transfer) => {
      const tx = makeTx(transfer, false)
      setTransactions((prev) => {
        const next = [tx, ...prev]
        setBalance((b) => {
          const nb = b - tx.amount
          persist(nb, next)
          return nb
        })
        return next
      })
      return tx
    },
    [persist]
  )

  const blockTransfer = useCallback(
    (transfer) => {
      const tx = makeTx(transfer, true)
      setTransactions((prev) => {
        const next = [tx, ...prev]
        persist(balance, next)
        return next
      })
      return tx
    },
    [persist, balance]
  )

  const resetAccount = useCallback(() => {
    setBalance(INITIAL.balance)
    setTransactions([])
    persist(INITIAL.balance, [])
  }, [persist])

  const monthlySpent = useMemo(
    () =>
      transactions
        .filter((t) => !t.blocked && sameMonth(t.timestamp))
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  )

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
      balance,
      monthlyBudget,
      monthlySpent,
      transactions,
      apiKey,
      lang,
      hydrated,
      isRTL: lang === 'ar',
      setApiKey,
      toggleLang,
      executeTransfer,
      blockTransfer,
      resetAccount,
      t,
      formatMoney,
    }),
    [
      balance,
      monthlyBudget,
      monthlySpent,
      transactions,
      apiKey,
      lang,
      hydrated,
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
