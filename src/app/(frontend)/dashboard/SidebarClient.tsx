'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface SidebarClientProps {
  userEmail: string
  userName?: string
  userInitials: string
}

const navItems = [
  { href: '/dashboard', label: 'Обзор', icon: '📊', exact: true },
  { href: '/dashboard/transactions', label: 'Транзакции', icon: '💳' },
  { href: '/dashboard/chat', label: 'AI-чат', icon: '🤖' },
  { href: '/dashboard/settings', label: 'Настройки', icon: '⚙️' },
]

export function SidebarClient({ userEmail, userName, userInitials }: SidebarClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${scrollY}px`
    } else {
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      window.scrollTo(0, parseInt(scrollY || '0') * -1)
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }
  }, [mobileOpen])

  async function handleLogout() {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
    router.push('/')
    router.refresh()
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      <button
        className={`mobile-menu-btn${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
        aria-expanded={mobileOpen}
        aria-controls="sidebar-nav"
      >
        <span />
        <span />
        <span />
      </button>

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}
        id="sidebar-nav"
        role="navigation"
        aria-label="Основная навигация"
      >
        <div className="sidebar-header">
          <Link href="/" className="sidebar-logo">
            <div className="sidebar-logo-icon">💰</div>
            MoneyMind
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Навигация</div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive(item.href, item.exact) ? 'active' : ''}`}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{userInitials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{userName || 'Пользователь'}</div>
              <div className="sidebar-user-email">{userEmail}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link"
            style={{ width: '100%', marginTop: 4 }}
          >
            <span style={{ fontSize: 16 }}>🚪</span>
            Выйти
          </button>
        </div>
      </aside>
    </>
  )
}
