import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  if (!user) return null

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [currentMonth, lastMonth, recentTx] = await Promise.all([
    payload.find({
      collection: 'transactions',
      where: {
        and: [
          { user: { equals: user.id } },
          { date: { greater_than_equal: startOfMonth.toISOString() } },
        ],
      },
      limit: 500,
      depth: 1,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'transactions',
      where: {
        and: [
          { user: { equals: user.id } },
          { date: { greater_than_equal: startOfLastMonth.toISOString() } },
          { date: { less_than_equal: endOfLastMonth.toISOString() } },
        ],
      },
      limit: 500,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'transactions',
      where: { user: { equals: user.id } },
      limit: 5,
      sort: '-date',
      depth: 1,
      overrideAccess: false,
      user,
    }),
  ])

  const expense = currentMonth.docs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
  const income = currentMonth.docs.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
  const lastExpense = lastMonth.docs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
  const lastIncome = lastMonth.docs.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)

  const byCategory: Record<string, { name: string; color: string; amount: number }> = {}
  for (const t of currentMonth.docs) {
    if (t.type !== 'expense') continue
    const cat = t.category as { id: string; name: string; color?: string } | null
    const catId = cat?.id || 'other'
    const catName = cat?.name || 'Другое'
    const catColor = cat?.color || '#6366f1'
    if (!byCategory[catId]) byCategory[catId] = { name: catName, color: catColor, amount: 0 }
    byCategory[catId].amount += t.amount || 0
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const byDayMap: Record<number, number> = {}
  for (const t of currentMonth.docs) {
    if (t.type !== 'expense' || !t.date) continue
    const day = new Date(t.date).getDate()
    byDayMap[day] = (byDayMap[day] || 0) + (t.amount || 0)
  }
  const byDay = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: byDayMap[i + 1] || 0 }))

  const recentTransactions = recentTx.docs.map((t) => ({
    id: t.id,
    description: t.description,
    amount: t.amount || 0,
    type: t.type as 'expense' | 'income',
    date: t.date ? new Date(t.date).toLocaleDateString('ru-RU') : '',
    categoryName: (t.category as { name?: string } | null)?.name,
    categoryColor: (t.category as { color?: string } | null)?.color || '#6366f1',
  }))

  const userName = (user.name as string | undefined) || user.email?.split('@')[0] || 'пользователь'

  return (
    <DashboardClient
      userName={userName}
      stats={{
        expense,
        income,
        balance: income - expense,
        lastExpense,
        lastIncome,
        transactionCount: currentMonth.totalDocs,
      }}
      byCategory={Object.values(byCategory).sort((a, b) => b.amount - a.amount)}
      byDay={byDay}
      recentTransactions={recentTransactions}
      monthlyBudget={(user as { monthlyBudget?: number }).monthlyBudget || 0}
    />
  )
}
