import type { CollectionConfig } from 'payload'
import type { Access } from 'payload'

const ownerOnly: Access = ({ req: { user } }) => {
  if (!user) return false
  return { user: { equals: user.id } }
}

export const ChatHistory: CollectionConfig = {
  slug: 'chat-history',
  admin: {
    useAsTitle: 'createdAt',
    defaultColumns: ['user', 'createdAt'],
  },
  access: {
    read: ownerOnly,
    create: ({ req: { user } }) => Boolean(user),
    update: ownerOnly,
    delete: ownerOnly,
  },
  fields: [
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
      name: 'messages',
      type: 'array',
      label: 'Сообщения',
      fields: [
        {
          name: 'role',
          type: 'select',
          label: 'Роль',
          required: true,
          options: [
            { label: 'Пользователь', value: 'user' },
            { label: 'Ассистент', value: 'assistant' },
          ],
        },
        {
          name: 'content',
          type: 'textarea',
          label: 'Текст',
          required: true,
        },
        {
          name: 'timestamp',
          type: 'date',
          label: 'Время',
          defaultValue: () => new Date().toISOString(),
        },
      ],
    },
    {
      name: 'title',
      type: 'text',
      label: 'Заголовок диалога',
      admin: {
        description: 'Автоматически генерируется из первого сообщения',
      },
    },
  ],
  timestamps: true,
}
