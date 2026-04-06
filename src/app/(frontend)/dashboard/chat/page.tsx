'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import '../../styles.css'

// Web Speech API типы
interface SpeechRecognitionResult {
  readonly [index: number]: { transcript: string; confidence: number }
  readonly length: number
}
interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult
  readonly length: number
}
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognitionInstance }
    webkitSpeechRecognition: { new (): SpeechRecognitionInstance }
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Сколько я потратил в этом месяце?',
  'На что ушло больше всего денег?',
  'Как сэкономить на питании?',
  'Покажи мой баланс',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const [recording, setRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) setSpeechSupported(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: msg, sessionId }),
      })

      if (!res.ok) throw new Error()

      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
      if (data.sessionId) setSessionId(data.sessionId)
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте ещё раз.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const spokenTextRef = useRef('')

  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang = 'ru-RU'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    spokenTextRef.current = ''

    recognition.onresult = (event) => {
      const parts: string[] = []
      for (let i = 0; i < event.results.length; i++) {
        parts.push(event.results[i][0].transcript)
      }
      spokenTextRef.current = parts.join(' ')
      setInput(spokenTextRef.current)
    }

    recognition.onerror = () => setRecording(false)
    recognition.onend = () => setRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setRecording(false)
    if (spokenTextRef.current.trim()) {
      sendMessage(spokenTextRef.current.trim())
      setInput('')
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <div className="page-title">AI-ассистент 🤖</div>
          <div className="page-subtitle">Задайте вопрос о своих финансах</div>
        </div>
        {messages.length > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setMessages([]); setSessionId(null) }}
          >
            Новый чат
          </button>
        )}
      </div>

      <div className="chat-container">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">🤖</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
              Привет! Я ваш финансовый ассистент
            </div>
            <div style={{ fontSize: 14, maxWidth: 400 }}>
              Я знаю ваши транзакции за этот месяц и могу ответить на любые вопросы о бюджете
            </div>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chat-suggestion" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                <div className={`chat-avatar ${m.role}`}>
                  {m.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="chat-bubble">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message assistant">
                <div className="chat-avatar assistant">🤖</div>
                <div className="chat-bubble">
                  <div className="typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Спросите о своих финансах..."
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            {speechSupported && (
              <button
                className={`chat-send-btn ${recording ? 'recording' : ''}`}
                onClick={recording ? stopRecording : startRecording}
                disabled={loading}
                title={recording ? 'Остановить запись' : 'Голосовой ввод'}
                style={recording ? { background: 'var(--red)', color: '#fff' } : {}}
              >
                {recording ? '⏹' : '🎙'}
              </button>
            )}
            <button
              className="chat-send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              title="Отправить (Enter)"
            >
              ↑
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6, textAlign: 'center' }}>
            Enter — отправить · Shift+Enter — новая строка
          </div>
        </div>
      </div>
    </>
  )
}
