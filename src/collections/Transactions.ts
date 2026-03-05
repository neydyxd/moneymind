import type { CollectionConfig } from 'payload'
import type { Access } from 'payload'

const ownerOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.collection === 'users') {
    return { user: { equals: user.id } }
  }
  return false
}

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['description', 'amount', 'type', 'category', 'date', 'user'],
  },
  access: {
    read: ownerOrAdmin,
    create: ({ req: { user } }) => Boolean(user),
    update: ownerOrAdmin,
    delete: ownerOrAdmin,
  },
  fields: [
    {
      name: 'description',
      type: 'text',
      label: 'Описание',
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      label: 'Сумма',
      required: true,
      min: 0,
    },
    {
      name: 'type',
      type: 'select',
      label: 'Тип',
      required: true,
      defaultValue: 'expense',
      options: [
        { label: '↓ Расход', value: 'expense' },
        { label: '↑ Доход', value: 'income' },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Категория',
    },
    {
      name: 'date',
      type: 'date',
      label: 'Дата',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Пользователь',
      required: true,
      hooks: {
        beforeChange: [
          ({ req, value }) => {
            if (req.user && !value) return req.user.id
            return value
          },
        ],
      },
    },
    {
      name: 'source',
      type: 'select',
      label: 'Источник',
      defaultValue: 'manual',
      options: [
        { label: 'Вручную', value: 'manual' },
        { label: 'Голос', value: 'voice' },
        { label: 'AI парсинг', value: 'ai' },
        { label: 'Telegram', value: 'telegram' },
      ],
    },
    {
      name: 'rawText',
      type: 'text',
      label: 'Исходный текст',
      admin: {
        description: 'Оригинальный текст для AI-парсинга',
        condition: (data) => data.source === 'ai' || data.source === 'voice',
      },
    },
  ],
  timestamps: true,
}
