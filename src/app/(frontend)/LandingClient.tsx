'use client'

import { useEffect, useRef } from 'react'

function useAnimateOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            const staggerItems = entry.target.querySelectorAll<HTMLElement>('.stagger-item')
            staggerItems.forEach((item, i) => {
              setTimeout(() => item.classList.add('visible'), i * 120)
            })
          }
        })
      },
      { threshold: 0.1 }
    )

    document.querySelectorAll('.animate-in').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function useCountUp() {
  useEffect(() => {
    const counters = document.querySelectorAll<HTMLElement>('[data-count]')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          const target = parseFloat(el.dataset.count ?? '0')
          const duration = 1800
          const startTime = performance.now()

          const update = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            const current = target * eased

            el.textContent = target < 10
              ? current.toFixed(1)
              : Math.floor(current).toLocaleString('ru')

            if (progress < 1) requestAnimationFrame(update)
          }

          requestAnimationFrame(update)
          observer.unobserve(el)
        })
      },
      { threshold: 0.5 }
    )

    counters.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export function LandingAnimations() {
  useAnimateOnScroll()
  useCountUp()
  return null
}

export function HeroMockup() {
  return (
    <div className="hero-mockup animate-in">
      <div className="mockup-header">
        <div className="mockup-dot mockup-dot--red" />
        <div className="mockup-dot mockup-dot--yellow" />
        <div className="mockup-dot mockup-dot--green" />
        <span className="mockup-title">MoneyMind Dashboard</span>
      </div>
      <div className="mockup-content">
        <div className="mockup-stats-row">
          <div className="mockup-stat-item">
            <span className="mockup-stat-label">Доходы</span>
            <span className="mockup-stat-value income">+120 000 ₽</span>
          </div>
          <div className="mockup-stat-item">
            <span className="mockup-stat-label">Расходы</span>
            <span className="mockup-stat-value expense">−45 200 ₽</span>
          </div>
          <div className="mockup-stat-item">
            <span className="mockup-stat-label">Остаток</span>
            <span className="mockup-stat-value balance">74 800 ₽</span>
          </div>
        </div>
        <div className="mockup-bars">
          <div className="mockup-bar-wrap">
            <div className="mockup-bar" style={{ height: '60%' }} />
            <span className="mockup-bar-label">Пн</span>
          </div>
          <div className="mockup-bar-wrap">
            <div className="mockup-bar" style={{ height: '80%' }} />
            <span className="mockup-bar-label">Вт</span>
          </div>
          <div className="mockup-bar-wrap">
            <div className="mockup-bar" style={{ height: '45%' }} />
            <span className="mockup-bar-label">Ср</span>
          </div>
          <div className="mockup-bar-wrap">
            <div className="mockup-bar mockup-bar--accent" style={{ height: '95%' }} />
            <span className="mockup-bar-label">Чт</span>
          </div>
          <div className="mockup-bar-wrap">
            <div className="mockup-bar" style={{ height: '70%' }} />
            <span className="mockup-bar-label">Пт</span>
          </div>
          <div className="mockup-bar-wrap">
            <div className="mockup-bar" style={{ height: '55%' }} />
            <span className="mockup-bar-label">Сб</span>
          </div>
          <div className="mockup-bar-wrap">
            <div className="mockup-bar" style={{ height: '30%' }} />
            <span className="mockup-bar-label">Вс</span>
          </div>
        </div>
        <div className="mockup-transactions">
          <div className="mockup-tx">
            <span className="mockup-tx-icon">☕</span>
            <span className="mockup-tx-name">Кофе</span>
            <span className="mockup-tx-amount expense">−320 ₽</span>
          </div>
          <div className="mockup-tx">
            <span className="mockup-tx-icon">🚕</span>
            <span className="mockup-tx-name">Такси</span>
            <span className="mockup-tx-amount expense">−580 ₽</span>
          </div>
          <div className="mockup-tx">
            <span className="mockup-tx-icon">💼</span>
            <span className="mockup-tx-name">Зарплата</span>
            <span className="mockup-tx-amount income">+60 000 ₽</span>
          </div>
        </div>
      </div>
    </div>
  )
}
