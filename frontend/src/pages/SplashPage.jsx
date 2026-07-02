import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import './SplashPage.css'

export default function SplashPage() {
  const { isLoading, isAuthed } = useAccount()
  const navigate = useNavigate()
  const timerRef = useRef(null)

  useEffect(() => {
    if (isLoading) return
    timerRef.current = setTimeout(() => {
      navigate(isAuthed ? '/app/home' : '/auth', { replace: true })
    }, 1500)
    return () => clearTimeout(timerRef.current)
  }, [isLoading, isAuthed, navigate])

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo">
          <ShieldCheck size={72} color="var(--gold)" />
        </div>
        <h1 className="splash-title">تحصين</h1>
        <p className="splash-tagline">جهاز المناعة المالي</p>
      </div>
    </div>
  )
}
