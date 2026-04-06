import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import { NextRequest } from 'next/server'
import config from '@payload-config'
import { chat, checkAiConfig } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })
    if (!user) {
      return Response.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { text } = await req.json()

    if (!text) {
      return Response.json({ error: 'Текст обязателен' }, { status: 400 })
    }

    const aiCheck = checkAiConfig()
    if (!aiCheck.ok) {
      return Response.json({ error: aiCheck.error }, { status: 500 })
    }

    const categories = await payload.find({
      collection: 'categories',
      limit: 100,
      overrideAccess: true,
    })

    const categoryNames = categories.docs.map((c) => c.name).join(', ')

    const responseText = await chat(
      [
        {
          role: 'system',
          content: `Ты помощник для парсинга финансовых транзакций.
Из текста пользователя извлеки: сумму, описание, тип (income/expense), категорию.
Доступные категории: ${categoryNames || 'Еда, Транспорт, Покупки, Развлечения, Здоровье, Другое'}.
Отвечай ТОЛЬКО в формате JSON без лишнего текста:
{"amount": число, "description": "строка", "type": "expense"|"income", "category": "название категории"}`,
        },
        { role: 'user', content: text },
      ],
      200,
    )

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    let categoryId: string | null = null
    if (parsed.category) {
      const foundCategory = categories.docs.find(
        (c) => c.name.toLowerCase() === (parsed.category as string).toLowerCase(),
      )
      if (foundCategory) categoryId = foundCategory.id
    }

    return Response.json({
      amount: parsed.amount || 0,
      description: parsed.description || text,
      type: parsed.type || 'expense',
      categoryId,
      categoryName: parsed.category,
    })
  } catch (error) {
    console.error('Parse transaction error:', error)
    return Response.json({ error: 'Ошибка парсинга' }, { status: 500 })
  }
}
