import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'createdAt'],
  },
  auth: true,
  access: {
    create: () => true,
    read: ({ req: { user } }) => {
      if (!user) return false
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return { id: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return { id: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
    },
    {
      name: 'telegramId',
      type: 'text',
      label: 'Telegram ID',
      admin: {
        description: 'ID пользователя в Telegram для интеграции с ботом',
      },
    },
    {
      name: 'currency',
      type: 'select',
      label: 'Валюта',
      defaultValue: 'RUB',
      options: [
        { label: '₽ Рубль', value: 'RUB' },
        { label: '$ Доллар', value: 'USD' },
        { label: '€ Евро', value: 'EUR' },
      ],
    },
    {
      name: 'monthlyBudget',
      type: 'number',
      label: 'Ежемесячный бюджет',
      min: 0,
    },
  ],
}
