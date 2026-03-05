import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import { NextRequest } from 'next/server'
import config from '@payload-config'

export async function GET(req: NextRequest) {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

    if (!user) {
      return Response.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')

    const where: import('payload').Where = { user: { equals: user.id } }
    if (type) where['type'] = { equals: type }

    const result = await payload.find({
      collection: 'transactions',
      where,
      page,
      limit,
      sort: '-date',
      depth: 1,
      overrideAccess: false,
      user,
    })

    return Response.json(result)
  } catch (error) {
    console.error('Transactions GET error:', error)
    return Response.json({ error: 'Ошибка получения транзакций' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

    if (!user) {
      return Response.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json()

    const transaction = await payload.create({
      collection: 'transactions',
      data: {
        ...body,
        user: user.id,
      },
      overrideAccess: false,
      user,
    })

    const existing = await payload.find({
      collection: 'funnel-events',
      where: {
        and: [{ user: { equals: user.id } }, { event: { equals: 'first_transaction' } }],
      },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs === 0) {
      await payload.create({
        collection: 'funnel-events',
        data: { user: user.id, event: 'first_transaction' },
        overrideAccess: true,
      })
    }

    return Response.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Transactions POST error:', error)
    return Response.json({ error: 'Ошибка создания транзакции' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

    if (!user) {
      return Response.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await req.json()

    await payload.delete({
      collection: 'transactions',
      id,
      overrideAccess: false,
      user,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Transactions DELETE error:', error)
    return Response.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}
