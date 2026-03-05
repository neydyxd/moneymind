import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import config from '@payload-config'
import { TransactionsClient } from './TransactionsClient'

export default async function TransactionsPage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  if (!user) return null

  const categories = await payload.find({
    collection: 'categories',
    limit: 100,
    overrideAccess: true,
  })

  const initialCategories = categories.docs.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color as string | undefined,
    icon: c.icon as string | undefined,
  }))

  return <TransactionsClient initialCategories={initialCategories} />
}
