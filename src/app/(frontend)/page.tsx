import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'
import config from '@payload-config'
import './styles.css'
import { LandingAnimations, HeroMockup } from './LandingClient'

export default async function LandingPage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  if (user) redirect('/dashboard')

  return (
    <div className="landing">
      <LandingAnimations />

      {/* NAV */}
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

      {/* HERO */}
      <section className="landing-hero">
        <div className="hero-glow hero-glow--1" aria-hidden="true" />
        <div className="hero-glow hero-glow--2" aria-hidden="true" />
        <div className="hero-glow hero-glow--3" aria-hidden="true" />

        <div className="hero-badge">
          <span className="hero-badge-pulse" aria-hidden="true" />
          ✨ AI-ассистент для ваших финансов
        </div>

        <h1 className="hero-title">
          Контролируй расходы<br />
          с помощью <span className="hero-title-gradient">AI</span>
        </h1>

        <p className="hero-desc">
          Добавляй расходы текстом или голосом, получай умную аналитику
          и задавай вопросы AI-ассистенту о своём бюджете
        </p>

        <div className="hero-actions">
          <a href="/register" className="btn btn-primary btn-lg hero-btn-glow">
            Начать бесплатно →
          </a>
          <a href="/login" className="btn btn-secondary btn-lg">
            Войти
          </a>
        </div>

        <HeroMockup />
      </section>

      {/* STATS */}
      <div className="hero-stats animate-in">
        <div className="hero-stat stagger-item">
          <div className="hero-stat-icon">🤖</div>
          <div className="hero-stat-value" data-count="10000">0</div>
          <div className="hero-stat-label">Операций распознано</div>
        </div>
        <div className="hero-stat stagger-item">
          <div className="hero-stat-icon">🎙</div>
          <div className="hero-stat-value" data-count="98">0</div>
          <div className="hero-stat-suffix">%</div>
          <div className="hero-stat-label">Точность распознавания</div>
        </div>
        <div className="hero-stat stagger-item">
          <div className="hero-stat-icon">📊</div>
          <div className="hero-stat-value" data-count="3.5">0</div>
          <div className="hero-stat-suffix">x</div>
          <div className="hero-stat-label">Быстрее ввод данных</div>
        </div>
        <div className="hero-stat stagger-item">
          <div className="hero-stat-icon">💬</div>
          <div className="hero-stat-value" data-count="24">0</div>
          <div className="hero-stat-suffix">/7</div>
          <div className="hero-stat-label">AI на связи</div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="features-section animate-in">
        <p className="section-label">Возможности</p>
        <h2 className="section-title">Всё для контроля финансов</h2>
        <p className="section-desc">
          Мощные инструменты для учёта расходов и анализа бюджета
        </p>

        <div className="features-grid">
          <div className="feature-card stagger-item animate-in">
            <div className="feature-icon-wrap">
              <div className="feature-icon">🤖</div>
            </div>
            <div className="feature-title">AI-парсинг расходов</div>
            <div className="feature-desc">
              Просто напишите &ldquo;кофе 300&rdquo; или &ldquo;такси до офиса 500р&rdquo; — AI сам определит сумму, категорию и тип операции
            </div>
          </div>
          <div className="feature-card stagger-item animate-in">
            <div className="feature-icon-wrap">
              <div className="feature-icon">🎙️</div>
            </div>
            <div className="feature-title">Голосовой ввод</div>
            <div className="feature-desc">
              Надиктуйте расход голосом на русском языке — удобно когда руки заняты или нет времени печатать
            </div>
          </div>
          <div className="feature-card stagger-item animate-in">
            <div className="feature-icon-wrap">
              <div className="feature-icon">📊</div>
            </div>
            <div className="feature-title">Наглядная аналитика</div>
            <div className="feature-desc">
              Круговые диаграммы по категориям и столбчатые графики по дням помогут понять, куда уходят деньги
            </div>
          </div>
          <div className="feature-card stagger-item animate-in">
            <div className="feature-icon-wrap">
              <div className="feature-icon">💬</div>
            </div>
            <div className="feature-title">AI-ассистент</div>
            <div className="feature-desc">
              Задайте вопрос: &ldquo;Сколько я потратил на кофе?&rdquo; или &ldquo;Как сэкономить в этом месяце?&rdquo; — и получите умный ответ
            </div>
          </div>
          <div className="feature-card stagger-item animate-in">
            <div className="feature-icon-wrap">
              <div className="feature-icon">🏷️</div>
            </div>
            <div className="feature-title">Гибкие категории</div>
            <div className="feature-desc">
              Готовые категории для быстрого старта и возможность создавать свои под ваши потребности
            </div>
          </div>
          <div className="feature-card stagger-item animate-in">
            <div className="feature-icon-wrap">
              <div className="feature-icon">🔒</div>
            </div>
            <div className="feature-title">Безопасность</div>
            <div className="feature-desc">
              Ваши данные защищены — каждый пользователь видит только свои транзакции и не имеет доступа к чужим
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="steps-section animate-in">
        <p className="section-label">Как это работает</p>
        <h2 className="section-title">Три шага до контроля бюджета</h2>
        <p className="section-desc">Начните вести финансы за 30 секунд — без таблиц и ручного ввода</p>

        <div className="steps-row">
          <div className="step-item stagger-item">
            <div className="step-number">01</div>
            <div className="step-icon-wrap">
              <span className="step-icon">🎙</span>
            </div>
            <h3 className="step-title">Напишите или надиктуйте</h3>
            <p className="step-desc">
              Скажите или напечатайте что угодно: &ldquo;кофе 200&rdquo;, &ldquo;зарплата 80к&rdquo;, &ldquo;такси до аэропорта&rdquo;
            </p>
          </div>

          <div className="step-connector" aria-hidden="true">
            <div className="step-connector-line" />
            <div className="step-connector-arrow">→</div>
          </div>

          <div className="step-item stagger-item">
            <div className="step-number">02</div>
            <div className="step-icon-wrap">
              <span className="step-icon">🤖</span>
            </div>
            <h3 className="step-title">AI распознаёт</h3>
            <p className="step-desc">
              Искусственный интеллект мгновенно парсит текст, определяет сумму, категорию и тип операции
            </p>
          </div>

          <div className="step-connector" aria-hidden="true">
            <div className="step-connector-line" />
            <div className="step-connector-arrow">→</div>
          </div>

          <div className="step-item stagger-item">
            <div className="step-number">03</div>
            <div className="step-icon-wrap">
              <span className="step-icon">📊</span>
            </div>
            <h3 className="step-title">Получите аналитику</h3>
            <p className="step-desc">
              Смотрите графики, задавайте вопросы AI-ассистенту и принимайте умные финансовые решения
            </p>
          </div>
        </div>
      </section>

      {/* TELEGRAM */}
      <section className="telegram-section animate-in">
        <div className="telegram-content">
          <div className="telegram-icon-wrap">
            <svg className="telegram-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="24" cy="24" r="24" fill="#229ED9" />
              <path d="M10.2 23.4l25.5-9.8c1.2-.4 2.2.3 1.8 1.9l-4.3 20.3c-.3 1.4-1.1 1.7-2.2 1.1l-6-4.4-2.9 2.8c-.3.3-.6.5-1.2.5l.4-6.2 10.8-9.7c.5-.4 0-.6-.7-.2L15.3 28.4l-5.9-1.8c-1.3-.4-1.3-1.3.2-1.9z" fill="white" />
            </svg>
          </div>
          <div className="telegram-text">
            <p className="section-label">Telegram</p>
            <h2 className="section-title telegram-title">Работает прямо в Telegram</h2>
            <p className="telegram-desc">
              Не нужно открывать сайт — добавляйте расходы прямо из мессенджера.
              Бот доступен 24/7 и синхронизируется с вашим аккаунтом в реальном времени.
            </p>
            <div className="telegram-features">
              <div className="telegram-feature">
                <span className="telegram-feature-icon">⚡</span>
                <span>Мгновенный ввод расходов</span>
              </div>
              <div className="telegram-feature">
                <span className="telegram-feature-icon">🔄</span>
                <span>Синхронизация в реальном времени</span>
              </div>
              <div className="telegram-feature">
                <span className="telegram-feature-icon">🌐</span>
                <span>Работает на любом устройстве</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta animate-in">
        <div className="cta-glow" aria-hidden="true" />
        <p className="section-label">Начнём?</p>
        <h2 className="cta-title">Возьмите финансы под контроль</h2>
        <p className="cta-desc">Бесплатно, без кредитной карты, без лишних настроек</p>
        <div className="cta-actions">
          <a href="/register" className="btn btn-primary btn-lg hero-btn-glow">
            Создать аккаунт →
          </a>
          <a href="/login" className="btn btn-secondary btn-lg">
            Уже есть аккаунт
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-logo">
          <div className="landing-logo-icon" style={{ width: 24, height: 24, fontSize: 12 }}>💰</div>
          <span>MoneyMind</span>
        </div>
        <p>© 2026 MoneyMind. Ваш AI-помощник для бюджета.</p>
      </footer>
    </div>
  )
}
