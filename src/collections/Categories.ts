import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'icon', 'color', 'isDefault'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Название',
      required: true,
    },
    {
      name: 'icon',
      type: 'select',
      label: 'Иконка',
      defaultValue: 'tag',
      options: [
        { label: '🍕 Еда', value: 'utensils' },
        { label: '🚌 Транспорт', value: 'car' },
        { label: '🛍 Покупки', value: 'shopping-bag' },
        { label: '🏠 Жильё', value: 'home' },
        { label: '💊 Здоровье', value: 'heart' },
        { label: '🎮 Развлечения', value: 'gamepad' },
        { label: '📚 Образование', value: 'book' },
        { label: '☕ Кофе', value: 'coffee' },
        { label: '✈️ Путешествия', value: 'plane' },
        { label: '💰 Доход', value: 'trending-up' },
        { label: '🏷 Другое', value: 'tag' },
      ],
    },
    {
      name: 'color',
      type: 'select',
      label: 'Цвет',
      defaultValue: '#6366f1',
      options: [
        { label: 'Фиолетовый', value: '#6366f1' },
        { label: 'Синий', value: '#3b82f6' },
        { label: 'Зелёный', value: '#22c55e' },
        { label: 'Жёлтый', value: '#eab308' },
        { label: 'Оранжевый', value: '#f97316' },
        { label: 'Красный', value: '#ef4444' },
        { label: 'Розовый', value: '#ec4899' },
        { label: 'Голубой', value: '#06b6d4' },
        { label: 'Сиреневый', value: '#8b5cf6' },
        { label: 'Лавандовый', value: '#a78bfa' },
        { label: 'Изумрудный', value: '#10b981' },
      ],
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      label: 'Системная категория',
      defaultValue: false,
      admin: {
        description: 'Категория доступна всем пользователям',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Пользователь',
      admin: {
        condition: (data) => !data.isDefault,
        description: 'Оставьте пустым для системной категории',
      },
    },
  ],
}
