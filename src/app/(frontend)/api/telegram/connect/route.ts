import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import config from '@payload-config'
import { generateConnectToken } from '@/lib/telegram'

export async function POST() {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

    if (!user) {
      return Response.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const token = await generateConnectToken(user.id)
    const botUsername = process.env.TELEGRAM_BOT_USERNAME

    return Response.json({
      token,
      botUrl: botUsername ? `https://t.me/${botUsername}?start=${token}` : null,
    })
  } catch (error) {
    console.error('Telegram connect error:', error)
    return Response.json({ error: 'Ошибка генерации токена' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

    if (!user) {
      return Response.json({ error: 'Не авторизован' }, { status: 401 })
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { telegramId: null },
      overrideAccess: false,
      user,
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Telegram disconnect error:', error)
    return Response.json({ error: 'Ошибка' }, { status: 500 })
  }
}
