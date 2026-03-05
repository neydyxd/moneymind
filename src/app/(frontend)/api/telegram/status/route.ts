/**
 * Диагностика Telegram webhook.
 * GET /api/telegram/status — проверка без secret (только инфо о webhook)
 * GET /api/telegram/status?secret=XXX — полная диагностика
 */
import { NextRequest } from 'next/server'
import { getBot } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      return Response.json({
        ok: false,
        error: 'TELEGRAM_BOT_TOKEN не задан',
        hint: 'Добавьте переменную в .env на продакшене',
      })
    }

    const bot = getBot()
    const info = await bot.telegram.getWebhookInfo()

    const secret = req.nextUrl.searchParams.get('secret')
    const hasValidSecret = secret === process.env.PAYLOAD_SECRET

    const baseUrl =
      process.env.SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

    const response: Record<string, unknown> = {
      ok: true,
      webhookSet: Boolean(info.url),
      webhookUrl: info.url || null,
      expectedWebhookUrl: baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/telegram` : null,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
      pendingUpdates: info.pending_update_count,
    }

    if (hasValidSecret) {
      ;(response as Record<string, unknown>).env = {
        SITE_URL: process.env.SITE_URL ? 'задан' : 'не задан',
        VERCEL_URL: process.env.VERCEL_URL || null,
      }
    }

    return Response.json(response)
  } catch (error) {
    console.error('Telegram status error:', error)
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Ошибка',
      },
      { status: 500 },
    )
  }
}
