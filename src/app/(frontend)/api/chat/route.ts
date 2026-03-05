import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import { NextRequest } from 'next/server'
import config from '@payload-config'
import { chat, checkAiConfig } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

    if (!user) {
      return Response.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { message, sessionId } = await req.json()

    if (!message) {
      return Response.json({ error: 'Сообщение обязательно' }, { status: 400 })
    }

    const aiCheck = checkAiConfig()
    if (!aiCheck.ok) {
      return Response.json({ error: aiCheck.error }, { status: 500 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const transactions = await payload.find({
      collection: 'transactions',
      where: {
        and: [
          { user: { equals: user.id } },
          { date: { greater_than_equal: startOfMonth.toISOString() } },
        ],
      },
      limit: 100,
      depth: 1,
      overrideAccess: false,
      user,
    })

    const transactionsSummary = transactions.docs
      .map(
        (t) =>
          `${t.date ? new Date(t.date).toLocaleDateString('ru') : '?'}: ${t.type === 'expense' ? '-' : '+'}${t.amount}₽ — ${t.description}${t.category && typeof t.category === 'object' ? ` (${(t.category as { name: string }).name})` : ''}`,
      )
      .join('\n')

    const totalExpense = transactions.docs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    const totalIncome = transactions.docs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    let sessionMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []
    if (sessionId) {
      try {
        const session = await payload.findByID({
          collection: 'chat-history',
          id: sessionId,
          overrideAccess: false,
          user,
        })
        if (session?.messages) {
          sessionMessages = (
            session.messages as Array<{ role: 'user' | 'assistant'; content: string }>
          ).slice(-10)
        }
      } catch {
        // сессия не найдена — начнём новую
      }
    }

    const assistantMessage = await chat(
      [
        {
          role: 'system',
          content: `Ты финансовый AI-ассистент приложения MoneyMind.
Ты помогаешь пользователю анализировать его расходы и давать советы по управлению бюджетом.
Отвечай на русском языке, кратко и по делу.

Данные пользователя за текущий месяц:
Расходы: ${totalExpense}₽
Доходы: ${totalIncome}₽
Баланс: ${totalIncome - totalExpense}₽

Транзакции за месяц:
${transactionsSummary || 'Транзакций пока нет'}`,
        },
        ...sessionMessages,
        { role: 'user', content: message },
      ],
      500,
    )

    const newMessages = [
      ...sessionMessages,
      { role: 'user' as const, content: message, timestamp: new Date().toISOString() },
      { role: 'assistant' as const, content: assistantMessage, timestamp: new Date().toISOString() },
    ]

    let newSessionId = sessionId
    if (sessionId) {
      await payload.update({
        collection: 'chat-history',
        id: sessionId,
        data: { messages: newMessages },
        overrideAccess: false,
        user,
      })
    } else {
      const session = await payload.create({
        collection: 'chat-history',
        data: {
          user: user.id,
          messages: newMessages,
          title: message.substring(0, 50),
        },
        overrideAccess: false,
        user,
      })
      newSessionId = session.id

      await payload.create({
        collection: 'funnel-events',
        data: { user: user.id, event: 'chat_used' },
        overrideAccess: true,
      })
    }

    return Response.json({
      message: assistantMessage,
      sessionId: newSessionId,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return Response.json({ error: 'Ошибка чата' }, { status: 500 })
  }
}
