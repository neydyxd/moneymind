'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

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
    <aside className="sidebar">
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
  )
}
