import type { Update } from 'telegraf/types'
import { NextRequest } from 'next/server'
import { getBot } from '@/lib/telegram'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  let update: unknown = null
  try {
    update = await req.json()
  } catch (e) {
    console.error('[Telegram] Ошибка парсинга body:', e)
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 200 })
  }

  if (!update || typeof update !== 'object') {
    console.error('[Telegram] Пустой или неверный update:', update)
    return Response.json({ ok: false, error: 'empty_update' }, { status: 200 })
  }

  try {
    const bot = getBot()
    await bot.handleUpdate(update as Update)
    return Response.json({ ok: true })
  } catch (error) {
    console.error('[Telegram] Webhook error:', error)
    console.error('[Telegram] Update:', JSON.stringify(update, null, 2))
    if (error instanceof Error && error.stack) {
      console.error('[Telegram] Stack:', error.stack)
    }
    // Всегда возвращаем 200, чтобы Telegram не повторял запросы
    return Response.json({ ok: false }, { status: 200 })
  }
}
