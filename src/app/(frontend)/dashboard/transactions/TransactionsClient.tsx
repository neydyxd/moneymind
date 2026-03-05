'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface Transaction {
  id: string
  description: string
  amount: number
  type: 'expense' | 'income'
  date: string
  categoryName?: string
  categoryColor?: string
  source?: string
}

interface TransactionsClientProps {
  initialCategories: Category[]
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽'
}

export function TransactionsClient({ initialCategories }: TransactionsClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [aiParsing, setAiParsing] = useState(false)
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadTransactions = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?page=${p}&limit=20`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setTransactions(
        data.docs.map((t: {
          id: string
          description: string
          amount: number
          type: 'expense' | 'income'
          date?: string
          category?: { name?: string; color?: string } | null
          source?: string
        }) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          date: t.date ? new Date(t.date).toLocaleDateString('ru-RU') : '',
          categoryName: t.category?.name,
          categoryColor: t.category?.color || '#6366f1',
          source: t.source,
        })),
      )
      setTotalPages(data.totalPages || 1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTransactions(page) }, [page, loadTransactions])

  async function parseWithAI() {
    if (!description) return
    setAiParsing(true)
    try {
      const res = await fetch('/api/parse-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description }),
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.amount) setAmount(String(data.amount))
      if (data.description) setDescription(data.description)
      if (data.type) setType(data.type)
      if (data.categoryId) setCategoryId(data.categoryId)
      showToast('AI заполнил форму')
    } catch {
      showToast('Ошибка AI-парсинга', 'error')
    } finally {
      setAiParsing(false)
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', blob, 'voice.webm')
        formData.append('model', 'whisper-1')
        formData.append('language', 'ru')

        try {
          const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''}` },
            body: formData,
          })
          if (res.ok) {
            const data = await res.json()
            setDescription(data.text || '')
            showToast('Голос распознан!')
          } else {
            showToast('Ошибка распознавания', 'error')
          }
        } catch {
          showToast('Нет API ключа для голоса', 'error')
        }
      }

      mr.start()
      setRecording(true)
    } catch {
      showToast('Нет доступа к микрофону', 'error')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description || !amount) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          type,
          category: categoryId || undefined,
          date: new Date(date).toISOString(),
          source: 'manual',
        }),
      })

      if (!res.ok) throw new Error()

      setDescription('')
      setAmount('')
      setCategoryId('')
      setDate(new Date().toISOString().slice(0, 10))
      showToast('Транзакция добавлена!')
      loadTransactions(1)
      setPage(1)
    } catch {
      showToast('Ошибка добавления', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      })
      showToast('Удалено')
      loadTransactions(page)
    } catch {
      showToast('Ошибка удаления', 'error')
    }
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <div className="page-title">Транзакции</div>
          <div className="page-subtitle">Управление доходами и расходами</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="add-transaction-form">
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>Добавить транзакцию</div>

          <div className="type-toggle">
            <button
              type="button"
              className={`type-toggle-btn ${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => setType('expense')}
            >
              ↓ Расход
            </button>
            <button
              type="button"
              className={`type-toggle-btn ${type === 'income' ? 'active income' : ''}`}
              onClick={() => setType('income')}
            >
              ↑ Доход
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Описание (или введите текст для AI-парсинга)</label>
              <div className="input-with-icon">
                <input
                  className="form-input"
                  placeholder='Напр: "кофе 300" или "такси до аэропорта 1500р"'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ paddingRight: 80 }}
                />
                <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className={`mic-btn ${recording ? 'recording' : ''}`}
                    title="Голосовой ввод"
                    onClick={recording ? stopRecording : startRecording}
                  >
                    {recording ? '⏹' : '🎙'}
                  </button>
                  <button
                    type="button"
                    className="mic-btn"
                    title="AI парсинг"
                    onClick={parseWithAI}
                    disabled={aiParsing || !description}
                  >
                    {aiParsing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '✨'}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Сумма ₽</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Категория</label>
                <select
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">— Без категории —</option>
                  {initialCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Дата</label>
              <input
                className="form-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting || !description || !amount}
              style={{ width: '100%', marginTop: 4, padding: '11px' }}
            >
              {submitting ? <span className="spinner" /> : `Добавить ${type === 'expense' ? 'расход' : 'доход'}`}
            </button>
          </form>
        </div>

        <div className="chart-card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>
            История операций
          </div>

          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <div className="empty-title">Транзакций пока нет</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Добавьте первую транзакцию выше
              </div>
            </div>
          ) : (
            <>
              <div className="transaction-list">
                {transactions.map((t) => (
                  <div className="transaction-item" key={t.id}>
                    <div
                      className="transaction-icon"
                      style={{ background: (t.categoryColor || '#6366f1') + '22' }}
                    >
                      {t.type === 'income' ? '💚' : '🔴'}
                    </div>
                    <div className="transaction-info">
                      <div className="transaction-desc">{t.description}</div>
                      <div className="transaction-meta">
                        {t.categoryName && (
                          <span className="category-badge">{t.categoryName}</span>
                        )}
                        {' '}{t.date}
                        {t.source && t.source !== 'manual' && (
                          <span style={{ marginLeft: 4, color: 'var(--accent-light)', fontSize: 11 }}>
                            via {t.source}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`transaction-amount ${t.type}`}>
                      {t.type === 'expense' ? '−' : '+'}{formatMoney(t.amount)}
                    </div>
                    <button
                      className="transaction-delete"
                      onClick={() => handleDelete(t.id)}
                      title="Удалить"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ← Назад
                  </button>
                  <span style={{ padding: '7px 14px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Вперёд →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </>
  )
}
