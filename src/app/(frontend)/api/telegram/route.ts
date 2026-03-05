import { NextRequest } from 'next/server'
import { getBot } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const bot = getBot()
    await bot.handleUpdate(update)
    return Response.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    // Всегда возвращаем 200, чтобы Telegram не повторял запросы
    return Response.json({ ok: false }, { status: 200 })
  }
}
