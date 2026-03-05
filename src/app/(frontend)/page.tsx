import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'
import config from '@payload-config'
import './styles.css'

export default async function LandingPage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  if (user) redirect('/dashboard')

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-icon">💰</div>
          MoneyMind
        </div>
        <div className="landing-nav-links">
          <a href="/login" className="btn btn-ghost">Войти</a>
          <a href="/register" className="btn btn-primary">Начать бесплатно</a>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-badge">
          ✨ AI-ассистент для ваших финансов
        </div>
        <h1 className="hero-title">
          Контролируй расходы<br />
          с помощью <span>AI</span>
        </h1>
        <p className="hero-desc">
          Добавляй расходы текстом или голосом, получай умную аналитику
          и задавай вопросы AI-ассистенту о своём бюджете
        </p>
        <div className="hero-actions">
          <a href="/register" className="btn btn-primary btn-lg">
            Начать бесплатно →
          </a>
          <a href="/login" className="btn btn-secondary btn-lg">
            Войти
          </a>
        </div>
      </section>

      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-value">AI</div>
          <div className="hero-stat-label">Умный парсинг</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">🎙</div>
          <div className="hero-stat-label">Голосовой ввод</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">📊</div>
          <div className="hero-stat-label">Наглядная аналитика</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">💬</div>
          <div className="hero-stat-label">AI-чат о бюджете</div>
        </div>
      </div>

      <section className="features-section">
        <p className="section-label">Возможности</p>
        <h2 className="section-title">Всё для контроля финансов</h2>
        <p className="section-desc">
          Мощные инструменты для учёта расходов и анализа бюджета
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <div className="feature-title">AI-парсинг расходов</div>
            <div className="feature-desc">
              Просто напишите &ldquo;кофе 300&rdquo; или &ldquo;такси до офиса 500р&rdquo; — AI сам определит сумму, категорию и тип операции
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎙️</div>
            <div className="feature-title">Голосовой ввод</div>
            <div className="feature-desc">
              Надиктуйте расход голосом на русском языке — удобно когда руки заняты или нет времени печатать
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <div className="feature-title">Наглядная аналитика</div>
            <div className="feature-desc">
              Круговые диаграммы по категориям и столбчатые графики по дням помогут понять, куда уходят деньги
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <div className="feature-title">AI-ассистент</div>
            <div className="feature-desc">
              Задайте вопрос: &ldquo;Сколько я потратил на кофе?&rdquo; или &ldquo;Как сэкономить в этом месяце?&rdquo; — и получите умный ответ
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏷️</div>
            <div className="feature-title">Гибкие категории</div>
            <div className="feature-desc">
              Готовые категории для быстрого старта и возможность создавать свои под ваши потребности
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <div className="feature-title">Безопасность</div>
            <div className="feature-desc">
              Ваши данные защищены — каждый пользователь видит только свои транзакции и не имеет доступа к чужим
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <h2 className="section-title" style={{ marginBottom: 16 }}>
          Начните прямо сейчас
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 16 }}>
          Бесплатно, без кредитной карты
        </p>
        <a href="/register" className="btn btn-primary btn-lg">
          Создать аккаунт →
        </a>
      </section>

      <footer className="landing-footer">
        <p>© 2024 MoneyMind. Ваш AI-помощник для бюджета.</p>
      </footer>
    </div>
  )
}
