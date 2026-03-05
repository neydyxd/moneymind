/**
 * Регистрация webhook в Telegram.
 * Вызовите один раз после деплоя: GET /api/telegram/setup?secret=YOUR_PAYLOAD_SECRET
 *
 * Переменные окружения:
 * - SITE_URL — полный URL сайта (например https://moneymind.example.com)
 * - VERCEL_URL — автоматически на Vercel (например your-app.vercel.app)
 * - TELEGRAM_BOT_TOKEN — токен бота
 */
import { NextRequest } from 'next/server'
import { getBot } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret')
    const expectedSecret = process.env.PAYLOAD_SECRET
    if (!expectedSecret || secret !== expectedSecret) {
      return Response.json({ error: 'Неверный secret' }, { status: 403 })
    }

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      return Response.json({ error: 'TELEGRAM_BOT_TOKEN не задан' }, { status: 500 })
    }

    // Определяем base URL: SITE_URL или VERCEL_URL (авто на Vercel)
    let baseUrl = process.env.SITE_URL
    if (!baseUrl && process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }
    if (!baseUrl) {
      return Response.json(
        {
          error:
            'Укажите SITE_URL в .env (например https://your-domain.com) или деплойте на Vercel (VERCEL_URL задаётся автоматически)',
        },
        { status: 500 },
      )
    }

    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/telegram`
    const bot = getBot()
    await bot.telegram.setWebhook(webhookUrl)

    const info = await bot.telegram.getWebhookInfo()

    return Response.json({
      ok: true,
      message: 'Webhook успешно зарегистрирован',
      webhookUrl,
      currentWebhook: info.url || null,
    })
  } catch (error) {
    console.error('Telegram webhook setup error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Ошибка при регистрации webhook' },
      { status: 500 },
    )
  }
}
