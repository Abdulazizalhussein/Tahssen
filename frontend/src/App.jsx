import React, { useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import { AccountProvider, useAccount } from './store/AccountContext'
import AppLayout from './components/AppLayout'

// Pages — written by other agents; import by exact contract names
import SplashPage       from './pages/SplashPage'
import AuthPage         from './pages/AuthPage'
import HomePage         from './pages/HomePage'
import TransferPage     from './pages/TransferPage'
import ChatPage         from './pages/ChatPage'
import AnalyticsPage    from './pages/AnalyticsPage'
import BeneficiariesPage from './pages/BeneficiariesPage'
import SettingsPage     from './pages/SettingsPage'
import RecommendationsPage from './pages/RecommendationsPage'

// ----------------------------------------------------------------
// LangSync — keeps <html> dir + lang in sync with account context
// ----------------------------------------------------------------
function LangSync() {
  const { lang, isRTL } = useAccount()

  useEffect(() => {
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang, isRTL])

  return null
}

// ----------------------------------------------------------------
// RequireAuth — guards /app/* routes
// ----------------------------------------------------------------
function RequireAuth({ children }) {
  const { isLoading, isAuthed } = useAccount()
  const location = useLocation()

  if (isLoading) return null

  if (!isAuthed) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return children
}

// ----------------------------------------------------------------
// AuthGuard — redirects authed users away from /auth
// ----------------------------------------------------------------
function AuthGuard({ children }) {
  const { isLoading, isAuthed } = useAccount()

  if (isLoading) return null
  if (isAuthed) return <Navigate to="/app/home" replace />
  return children
}

// ----------------------------------------------------------------
// Inner router (needs AccountContext already in tree)
// ----------------------------------------------------------------
function AppRoutes() {
  return (
    <>
      <LangSync />
      <Routes>
        {/* Splash */}
        <Route path="/" element={<SplashPage />} />

        {/* Auth */}
        <Route
          path="/auth"
          element={
            <AuthGuard>
              <AuthPage />
            </AuthGuard>
          }
        />

        {/* Protected app shell */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          {/* Default redirect */}
          <Route index element={<Navigate to="home" replace />} />

          <Route path="home"           element={<HomePage />} />
          <Route path="transfer"       element={<TransferPage />} />
          <Route path="chat"           element={<ChatPage />} />
          <Route path="analytics"       element={<AnalyticsPage />} />
          <Route path="beneficiaries"   element={<BeneficiariesPage />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="settings"        element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

// ----------------------------------------------------------------
// Root export
// ----------------------------------------------------------------
export default function App() {
  return (
    <BrowserRouter>
      <AccountProvider>
        <AppRoutes />
      </AccountProvider>
    </BrowserRouter>
  )
}
