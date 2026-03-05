import type { CollectionConfig } from 'payload'

export const FunnelEvents: CollectionConfig = {
  slug: 'funnel-events',
  admin: {
    useAsTitle: 'event',
    defaultColumns: ['user', 'event', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Пользователь',
      required: true,
    },
    {
      name: 'event',
      type: 'select',
      label: 'Событие',
      required: true,
      options: [
        { label: 'Регистрация', value: 'registration' },
        { label: 'Первая транзакция', value: 'first_transaction' },
        { label: 'Использование чата', value: 'chat_used' },
        { label: 'Голосовой ввод', value: 'voice_used' },
        { label: 'Подключение Telegram', value: 'telegram_connected' },
        { label: 'Просмотр статистики', value: 'stats_viewed' },
      ],
    },
    {
      name: 'meta',
      type: 'json',
      label: 'Мета-данные',
      admin: {
        description: 'Дополнительные данные о событии',
      },
    },
  ],
  timestamps: true,
}
