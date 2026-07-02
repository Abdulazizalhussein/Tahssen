import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import './AuthPage.css'

const TAB = { REGISTER: 'register', LOGIN: 'login' }

export default function AuthPage() {
  const { register, login, t, isRTL } = useAccount()
  const navigate = useNavigate()

  const [tab, setTab] = useState(TAB.REGISTER)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const switchTab = useCallback((next) => {
    setTab(next)
    setError('')
    setPassword('')
    setConfirm('')
  }, [])

  const submit = useCallback(async () => {
    if (busy) return
    setError('')
    const isRegister = tab === TAB.REGISTER

    if (name.trim().length < 2) return setError(t('errNameMin'))
    if (password.length < 6) return setError(t('errPasswordMin'))
    if (isRegister && password !== confirm) return setError(t('errPasswordMismatch'))

    setBusy(true)
    try {
      const res = isRegister
        ? await register(name, password)
        : await login(name, password)
      if (res.ok) {
        navigate('/app/home', { replace: true })
      } else if (res.error === 'nameTaken') {
        setError(t('errNameTaken'))
      } else {
        setError(t('errInvalidCredentials'))
      }
    } catch {
      setError(t('error'))
    } finally {
      setBusy(false)
    }
  }, [busy, tab, name, password, confirm, register, login, navigate, t])

  const isRegister = tab === TAB.REGISTER

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className="auth-screen">
      <div className="auth-inner">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo">
            <ShieldCheck size={40} color="var(--gold)" />
          </div>
          <h1 className="auth-app-name">{t('appName')}</h1>
          <p className="auth-tagline">{t('tagline')}</p>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs" dir={isRTL ? 'rtl' : 'ltr'}>
          <AuthTab
            label={t('createAccount')}
            active={isRegister}
            onPress={() => switchTab(TAB.REGISTER)}
          />
          <AuthTab
            label={t('signIn')}
            active={!isRegister}
            onPress={() => switchTab(TAB.LOGIN)}
          />
        </div>

        {/* Form card */}
        <div className="auth-card card">
          <h2 className="auth-card-title" style={{ textAlign: 'start' }}>
            {isRegister ? t('createAccount') : t('signIn')}
          </h2>

          <InputField
            icon={<User size={18} />}
            placeholder={t('fullName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="username"
            autoCapitalize="words"
          />

          <InputField
            icon={<Lock size={18} />}
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            type={showPass ? 'text' : 'password'}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            rightIcon={showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            onRightIconClick={() => setShowPass((v) => !v)}
          />

          {isRegister && (
            <InputField
              icon={<Lock size={18} />}
              placeholder={t('confirmPassword')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={handleKeyDown}
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
            />
          )}

          {error && (
            <div className="auth-error" role="alert">
              <AlertCircle size={15} color="var(--danger)" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            className="btn btn-gold btn-full auth-submit"
            onClick={submit}
            disabled={busy}
          >
            {busy ? (
              <span className="spinner" />
            ) : (
              isRegister ? t('createAccountBtn') : t('signInBtn')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function AuthTab({ label, active, onPress }) {
  return (
    <button
      className={`auth-tab${active ? ' auth-tab--active' : ''}`}
      onClick={onPress}
      type="button"
    >
      {label}
    </button>
  )
}

function InputField({ icon, rightIcon, onRightIconClick, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className={`auth-input-wrap${focused ? ' auth-input-wrap--focused' : ''}`}>
      <span className={`auth-input-icon${focused ? ' auth-input-icon--focused' : ''}`}>
        {icon}
      </span>
      <input
        className="auth-input"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect="off"
        spellCheck={false}
        {...props}
      />
      {rightIcon ? (
        <button
          type="button"
          className="auth-eye-btn"
          onClick={onRightIconClick}
          tabIndex={-1}
          aria-label="toggle password visibility"
        >
          {rightIcon}
        </button>
      ) : null}
    </div>
  )
}
