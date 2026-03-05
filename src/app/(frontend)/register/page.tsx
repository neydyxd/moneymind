'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import '../styles.css'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.errors?.[0]?.message || 'Ошибка регистрации')
        return
      }

      const loginRes = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      if (loginRes.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        router.push('/login')
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <a href="/" className="auth-logo">
          <div className="auth-logo-icon">💰</div>
          MoneyMind
        </a>

        <h1 className="auth-title">Создать аккаунт</h1>
        <p className="auth-subtitle">Начните бесплатно прямо сейчас</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Имя</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              className="form-input"
              type="password"
              placeholder="Минимум 8 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8, padding: '12px' }}
          >
            {loading ? <span className="spinner" /> : 'Создать аккаунт'}
          </button>
        </form>

        <div className="auth-divider">
          Уже есть аккаунт? <a href="/login">Войти</a>
        </div>
      </div>
    </div>
  )
}
