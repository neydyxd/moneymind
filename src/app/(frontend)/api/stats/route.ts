import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import config from '@payload-config'

export async function GET() {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

    if (!user) {
      return Response.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [currentMonth, lastMonth, allTransactions] = await Promise.all([
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
        depth: 1,
        overrideAccess: false,
        user,
      }),
      payload.find({
        collection: 'transactions',
        where: { user: { equals: user.id } },
        limit: 10,
        sort: '-date',
        depth: 1,
        overrideAccess: false,
        user,
      }),
    ])

    const calcTotals = (docs: typeof currentMonth.docs) => ({
      expense: docs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
      income: docs.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
    })

    const current = calcTotals(currentMonth.docs)
    const last = calcTotals(lastMonth.docs)

    const byCategory: Record<string, { name: string; color: string; amount: number }> = {}
    for (const t of currentMonth.docs) {
      if (t.type !== 'expense') continue
      const catId = typeof t.category === 'object' && t.category ? (t.category as { id: string }).id : 'other'
      const catName = typeof t.category === 'object' && t.category ? (t.category as { name: string }).name : 'Другое'
      const catColor = typeof t.category === 'object' && t.category ? ((t.category as { color?: string }).color || '#6366f1') : '#6366f1'
      if (!byCategory[catId]) byCategory[catId] = { name: catName, color: catColor, amount: 0 }
      byCategory[catId].amount += t.amount || 0
    }

    const byDay: Record<string, number> = {}
    for (const t of currentMonth.docs) {
      if (t.type !== 'expense') continue
      const day = t.date ? new Date(t.date).getDate().toString() : '?'
      byDay[day] = (byDay[day] || 0) + (t.amount || 0)
    }

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: byDay[(i + 1).toString()] || 0,
    }))

    return Response.json({
      current,
      last,
      balance: current.income - current.expense,
      byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount),
      byDay: dailyData,
      recentTransactions: allTransactions.docs,
      transactionCount: currentMonth.totalDocs,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return Response.json({ error: 'Ошибка получения статистики' }, { status: 500 })
  }
}
