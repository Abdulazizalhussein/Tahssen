import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Home,
  ArrowUpRight,
  MessageCircle,
  BarChart2,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import './AppLayout.css'

const NAV_ITEMS = [
  { to: '/app/home',         icon: Home,          labelKey: 'tabHome' },
  { to: '/app/transfer',     icon: ArrowUpRight,  labelKey: 'tabTransfer' },
  { to: '/app/chat',         icon: MessageCircle, labelKey: 'tabChat' },
  { to: '/app/analytics',    icon: BarChart2,     labelKey: 'tabAnalytics' },
  { to: '/app/settings',     icon: Settings,      labelKey: 'tabSettings' },
]

export default function AppLayout() {
  const { t } = useAccount()

  return (
    <div className="layout-root">
      {/* ---- Desktop sidebar ---- */}
      <nav className="layout-sidebar" aria-label="main navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <ShieldCheck size={20} color="var(--gold)" />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">{t('appName')}</span>
            <span className="sidebar-brand-tagline">{t('tagline')}</span>
          </div>
        </div>

        <div className="sidebar-nav">
          {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'sidebar-nav-link' + (isActive ? ' active' : '')
              }
            >
              <Icon size={18} />
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ---- Main content ---- */}
      <main className="layout-content">
        <div className="layout-inner">
          <Outlet />
        </div>
      </main>

      {/* ---- Mobile bottom tab bar ---- */}
      <nav className="layout-tabs" aria-label="tab navigation">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              'tab-item' + (isActive ? ' active' : '')
            }
          >
            <Icon size={22} />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
