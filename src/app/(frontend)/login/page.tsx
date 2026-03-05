'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import '../styles.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.errors?.[0]?.message || 'Неверный email или пароль')
        return
      }

      router.push('/dashboard')
      router.refresh()
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

        <h1 className="auth-title">Добро пожаловать</h1>
        <p className="auth-subtitle">Войдите в свой аккаунт</p>

        <form onSubmit={handleSubmit}>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8, padding: '12px' }}
          >
            {loading ? <span className="spinner" /> : 'Войти'}
          </button>
        </form>

        <div className="auth-divider">
          Нет аккаунта? <a href="/register">Зарегистрироваться</a>
        </div>
      </div>
    </div>
  )
}
