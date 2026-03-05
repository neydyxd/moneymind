import { getPayload } from 'payload'
import config from './payload.config'

const defaultCategories = [
  { name: 'Еда и рестораны', icon: 'utensils', color: '#f97316' },
  { name: 'Транспорт', icon: 'car', color: '#3b82f6' },
  { name: 'Покупки', icon: 'shopping-bag', color: '#ec4899' },
  { name: 'Жильё', icon: 'home', color: '#6366f1' },
  { name: 'Здоровье', icon: 'heart', color: '#ef4444' },
  { name: 'Развлечения', icon: 'gamepad', color: '#8b5cf6' },
  { name: 'Образование', icon: 'book', color: '#06b6d4' },
  { name: 'Кофе', icon: 'coffee', color: '#a78bfa' },
  { name: 'Путешествия', icon: 'plane', color: '#22c55e' },
  { name: 'Доход', icon: 'trending-up', color: '#10b981' },
] as const

async function seed() {
  const payload = await getPayload({ config })

  console.log('🌱 Seeding default categories...')

  for (const cat of defaultCategories) {
    const existing = await payload.find({
      collection: 'categories',
      where: { and: [{ name: { equals: cat.name } }, { isDefault: { equals: true } }] },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs === 0) {
      await payload.create({
        collection: 'categories',
        data: { ...cat, isDefault: true },
        overrideAccess: true,
      })
      console.log(`✅ Created: ${cat.name}`)
    } else {
      console.log(`⏭ Exists: ${cat.name}`)
    }
  }

  console.log('🎉 Seed complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
