'use client'

import { useState, useEffect } from 'react'
import '../../styles.css'

interface UserProfile {
  name?: string
  email?: string
  telegramId?: string
  currency?: string
  monthlyBudget?: number
}

interface TelegramConnectState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  botUrl?: string
  error?: string
}

interface Category {
  id: string
  name: string
  color?: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [tgConnect, setTgConnect] = useState<TelegramConnectState>({ status: 'idle' })
  const [disconnecting, setDisconnecting] = useState(false)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setUserId(data.user?.id || null)
          setProfile({
            name: data.user?.name || '',
            email: data.user?.email || '',
            telegramId: data.user?.telegramId || '',
            currency: data.user?.currency || 'RUB',
            monthlyBudget: data.user?.monthlyBudget || 0,
          })
        }
      } finally {
        setLoadingProfile(false)
      }

      const catRes = await fetch('/api/categories?limit=100', { credentials: 'include' })
      if (catRes.ok) {
        const data = await catRes.json()
        setCategories(data.docs || [])
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (tgConnect.status !== 'ready') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (data.user?.telegramId) {
          setProfile((p) => ({ ...p, telegramId: data.user.telegramId }))
          setTgConnect({ status: 'idle' })
          showToast('Telegram подключён!')
        }
      } catch { /* ignore */ }
    }, 5000)

    const timeout = setTimeout(() => {
      clearInterval(interval)
      setTgConnect({ status: 'idle' })
    }, 10 * 60 * 1000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [tgConnect.status])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: profile.name,
          telegramId: profile.telegramId,
          currency: profile.currency,
          monthlyBudget: profile.monthlyBudget,
        }),
      })
      if (res.ok) {
        showToast('Профиль сохранён')
      } else {
        showToast('Ошибка сохранения', 'error')
      }
    } catch {
      showToast('Ошибка соединения', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newCatName, color: newCatColor, isDefault: false }),
      })
      if (res.ok) {
        const data = await res.json()
        setCategories((prev) => [...prev, { id: data.doc?.id || data.id, name: newCatName, color: newCatColor }])
        setNewCatName('')
        showToast('Категория добавлена')
      }
    } catch {
      showToast('Ошибка', 'error')
    }
  }

  async function connectTelegram() {
    setTgConnect({ status: 'loading' })
    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setTgConnect({ status: 'ready', botUrl: data.botUrl })
      } else {
        setTgConnect({ status: 'error', error: 'Ошибка генерации ссылки' })
      }
    } catch {
      setTgConnect({ status: 'error', error: 'Ошибка соединения' })
    }
  }

  async function disconnectTelegram() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setProfile((p) => ({ ...p, telegramId: '' }))
        setTgConnect({ status: 'idle' })
        showToast('Telegram отключён')
      } else {
        showToast('Ошибка', 'error')
      }
    } catch {
      showToast('Ошибка соединения', 'error')
    } finally {
      setDisconnecting(false)
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Удалить категорию?')) return
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE', credentials: 'include' })
      setCategories((prev) => prev.filter((c) => c.id !== id))
      showToast('Категория удалена')
    } catch {
      showToast('Ошибка', 'error')
    }
  }

  if (loadingProfile) {
    return (
      <>
        <div className="dashboard-header">
          <div className="page-title">Настройки</div>
        </div>
        <div className="loading-overlay"><div className="spinner" /></div>
      </>
    )
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <div className="page-title">Настройки</div>
          <div className="page-subtitle">Профиль и категории</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="settings-section">
          <div className="settings-section-title">Профиль</div>
          <form onSubmit={saveProfile}>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Имя</label>
                <input
                  className="form-input"
                  value={profile.name || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ваше имя"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  value={profile.email || ''}
                  disabled
                  style={{ opacity: 0.6 }}
                />
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Валюта</label>
                <select
                  className="form-select"
                  value={profile.currency || 'RUB'}
                  onChange={(e) => setProfile((p) => ({ ...p, currency: e.target.value }))}
                >
                  <option value="RUB">₽ Рубль</option>
                  <option value="USD">$ Доллар</option>
                  <option value="EUR">€ Евро</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ежемесячный бюджет ₽</label>
              <input
                className="form-input"
                type="number"
                value={profile.monthlyBudget || ''}
                onChange={(e) => setProfile((p) => ({ ...p, monthlyBudget: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                min="0"
                style={{ maxWidth: 200 }}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Сохранить'}
            </button>
          </form>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Telegram бот</div>

          {profile.telegramId ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 'var(--radius)',
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--green)' }}>
                    Telegram подключён
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    ID: {profile.telegramId}
                  </div>
                </div>
              </div>
              <button
                className="btn"
                style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}
                onClick={disconnectTelegram}
                disabled={disconnecting}
              >
                {disconnecting ? <span className="spinner" /> : 'Отключить Telegram'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
                Подключите Telegram-бота чтобы добавлять транзакции и общаться с AI прямо в мессенджере.
                Ссылка действует <strong>10 минут</strong>.
              </div>

              {tgConnect.status === 'idle' && (
                <button className="btn btn-primary" onClick={connectTelegram}>
                  Подключить Telegram
                </button>
              )}

              {tgConnect.status === 'loading' && (
                <button className="btn btn-primary" disabled>
                  <span className="spinner" />
                </button>
              )}

              {tgConnect.status === 'ready' && tgConnect.botUrl && (
                <div>
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 'var(--radius)',
                      marginBottom: 12,
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    Нажмите кнопку ниже — откроется Telegram с ботом.<br />
                    Нажмите <strong>START</strong> в боте для привязки аккаунта.
                  </div>
                  <a
                    href={tgConnect.botUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
                    </svg>
                    Открыть в Telegram
                  </a>
                  <button
                    className="btn"
                    style={{ marginLeft: 8, background: 'transparent', border: '1px solid var(--border)' }}
                    onClick={() => setTgConnect({ status: 'idle' })}
                  >
                    Новая ссылка
                  </button>
                </div>
              )}

              {tgConnect.status === 'error' && (
                <div>
                  <div style={{ color: 'var(--red)', fontSize: 14, marginBottom: 8 }}>
                    {tgConnect.error}
                  </div>
                  <button className="btn btn-primary" onClick={connectTelegram}>
                    Попробовать снова
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Категории расходов</div>

          <div style={{ marginBottom: 16 }}>
            {categories.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '8px 0' }}>
                Нет категорий. Создайте свою первую.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {categories.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      background: (c.color || '#6366f1') + '22',
                      borderRadius: 8,
                      border: `1px solid ${c.color || '#6366f1'}44`,
                      fontSize: 13,
                      fontWeight: 500,
                      color: c.color || '#a78bfa',
                    }}
                  >
                    {c.name}
                    <button
                      onClick={() => deleteCategory(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, fontSize: 11, padding: '0 2px' }}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={addCategory} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="form-label">Название новой категории</label>
              <input
                className="form-input"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Напр: Спорт, Питомец..."
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Цвет</label>
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                style={{
                  width: 46,
                  height: 44,
                  padding: 4,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                }}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!newCatName.trim()}>
              + Добавить
            </button>
          </form>
        </div>


      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
