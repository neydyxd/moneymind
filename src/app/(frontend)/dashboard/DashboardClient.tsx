'use client'

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface Stats {
  expense: number
  income: number
  balance: number
  lastExpense: number
  lastIncome: number
  transactionCount: number
}

interface CategoryStat {
  name: string
  color: string
  amount: number
}

interface DayData {
  day: number
  amount: number
}

interface Transaction {
  id: string
  description: string
  amount: number
  type: 'expense' | 'income'
  date: string
  categoryName?: string
  categoryColor?: string
}

interface DashboardClientProps {
  userName: string
  stats: Stats
  byCategory: CategoryStat[]
  byDay: DayData[]
  recentTransactions: Transaction[]
  monthlyBudget: number
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽'
}

function pctChange(current: number, prev: number) {
  if (prev === 0) return null
  const pct = ((current - prev) / prev) * 100
  return { pct: Math.abs(pct).toFixed(0), up: pct > 0 }
}

export function DashboardClient({ userName, stats, byCategory, byDay, recentTransactions, monthlyBudget }: DashboardClientProps) {
  const expenseChange = pctChange(stats.expense, stats.lastExpense)
  const incomeChange = pctChange(stats.income, stats.lastIncome)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Доброе утро'
    if (h < 17) return 'Добрый день'
    return 'Добрый вечер'
  }

  const monthName = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  return (
    <>
      <div className="dashboard-header">
        <div>
          <div className="page-title">{greeting()}, {userName}! 👋</div>
          <div className="page-subtitle">Статистика за {monthName}</div>
        </div>
        <a href="/dashboard/transactions" className="btn btn-primary btn-sm">
          + Добавить расход
        </a>
      </div>

      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="card">
            <div className="card-title">Расходы</div>
            <div className="stat-value" style={{ color: 'var(--red)' }}>{formatMoney(stats.expense)}</div>
            {expenseChange && (
              <div className={`stat-change ${expenseChange.up ? 'down' : 'up'}`}>
                {expenseChange.up ? '↑' : '↓'} {expenseChange.pct}% к прошлому месяцу
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Доходы</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{formatMoney(stats.income)}</div>
            {incomeChange && (
              <div className={`stat-change ${incomeChange.up ? 'up' : 'down'}`}>
                {incomeChange.up ? '↑' : '↓'} {incomeChange.pct}% к прошлому месяцу
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Баланс</div>
            <div className="stat-value" style={{ color: stats.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {stats.balance >= 0 ? '+' : ''}{formatMoney(stats.balance)}
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              {stats.transactionCount} транзакций
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-icon">📋</span>
              <span className="stat-label">Бюджет</span>
            </div>
            {monthlyBudget > 0 ? (
              <>
                <div className="stat-value">
                  {formatMoney(monthlyBudget - stats.expense)}
                  <span className="stat-sub"> осталось</span>
                </div>
                <div className="budget-bar">
                  <div
                    className="budget-bar-fill"
                    style={{
                      width: `${Math.min(100, (stats.expense / monthlyBudget) * 100)}%`,
                      background:
                        stats.expense / monthlyBudget < 0.8
                          ? 'var(--green)'
                          : stats.expense / monthlyBudget < 1
                          ? 'var(--yellow, #eab308)'
                          : 'var(--red)',
                    }}
                  />
                </div>
                <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
                  {Math.round((stats.expense / monthlyBudget) * 100)}% использовано
                </div>
              </>
            ) : (
              <div className="stat-value" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Установите в настройках
              </div>
            )}
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-title">Расходы по категориям</div>
            {byCategory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🥧</div>
                <div className="empty-title">Нет данных</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Добавьте первые расходы
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {byCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v))}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text)' }}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-title">Расходы по дням</div>
            {byDay.every((d) => d.amount === 0) ? (
              <div className="empty-state">
                <div className="empty-icon">📈</div>
                <div className="empty-title">Нет данных</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Добавьте первые расходы
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byDay} barSize={6}>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v))}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                    labelFormatter={(l) => `${l} число`}
                  />
                  <Bar dataKey="amount" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="chart-title" style={{ marginBottom: 0 }}>Последние транзакции</div>
            <a href="/dashboard/transactions" className="btn btn-ghost btn-sm" style={{ fontSize: 13 }}>
              Все →
            </a>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-icon">💳</div>
              <div className="empty-title">Транзакций пока нет</div>
              <a href="/dashboard/transactions" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                Добавить первую
              </a>
            </div>
          ) : (
            <div className="transaction-list">
              {recentTransactions.map((t) => (
                <div className="transaction-item" key={t.id}>
                  <div
                    className="transaction-icon"
                    style={{ background: t.categoryColor + '22' }}
                  >
                    {t.type === 'income' ? '💚' : '🔴'}
                  </div>
                  <div className="transaction-info">
                    <div className="transaction-desc">{t.description}</div>
                    <div className="transaction-meta">
                      {t.categoryName && <span className="category-badge">{t.categoryName}</span>}
                      {' '}{t.date}
                    </div>
                  </div>
                  <div className={`transaction-amount ${t.type}`}>
                    {t.type === 'expense' ? '−' : '+'}{formatMoney(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
