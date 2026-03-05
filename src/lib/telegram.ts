import { Telegraf, Context, Markup } from 'telegraf'
import { getPayload } from 'payload'
import config from '@payload-config'
import { chat } from '@/lib/ai'
import crypto from 'crypto'

// In-memory stores (работает для single-process Next.js)
// Токены подключения Telegram — в БД (Users.telegramConnectToken) для serverless
const pendingTransactions = new Map<number, PendingTransaction>()
const chatSessions = new Map<number, string>() // chatId -> sessionId

interface PendingTransaction {
  amount: number
  description: string
  type: 'expense' | 'income'
  categoryId: string | null
  categoryName: string | null
  userId: string
  currency: string
}

/** Сохраняет токен в БД для serverless (токен доступен из любого инстанса) */
export async function generateConnectToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(16).toString('hex')
  const payload = await getPayloadInstance()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 минут
  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      telegramConnectToken: token,
      telegramConnectTokenExpiresAt: expiresAt.toISOString(),
    } as Record<string, unknown>,
    overrideAccess: true,
  })
  return token
}

let botInstance: Telegraf | null = null

export function getBot(): Telegraf {
  if (!botInstance) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN не задан в .env')
    botInstance = new Telegraf(token)
    setupHandlers(botInstance)
  }
  return botInstance
}

async function getPayloadInstance() {
  const resolvedConfig = await config
  return getPayload({ config: resolvedConfig })
}

async function getUserByTelegramId(telegramId: string) {
  const payload = await getPayloadInstance()
  const users = await payload.find({
    collection: 'users',
    where: { telegramId: { equals: telegramId } },
    limit: 1,
    overrideAccess: true,
  })
  return { payload, user: users.docs[0] as (typeof users.docs[0] & { currency?: string; monthlyBudget?: number }) | null }
}

async function parseTransactionText(text: string) {
  const payload = await getPayloadInstance()

  const categories = await payload.find({
    collection: 'categories',
    limit: 100,
    overrideAccess: true,
  })

  const categoryNames = categories.docs.map((c) => c.name).join(', ')

  const responseText = await chat(
    [
      {
        role: 'system',
        content: `Ты помощник для парсинга финансовых транзакций.
Из текста пользователя извлеки: сумму, описание, тип (income/expense), категорию.
Если текст НЕ является финансовой транзакцией — верни {"amount": 0}.
Доступные категории: ${categoryNames || 'Еда, Транспорт, Покупки, Развлечения, Здоровье, Другое'}.
Отвечай ТОЛЬКО в формате JSON без лишнего текста:
{"amount": число, "description": "строка", "type": "expense"|"income", "category": "название категории"}`,
      },
      { role: 'user', content: text },
    ],
    200,
  )

  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as { amount?: number; description?: string; type?: string; category?: string }) : {}

  let categoryId: string | null = null
  if (parsed.category) {
    const found = categories.docs.find(
      (c) => c.name.toLowerCase() === (parsed.category as string).toLowerCase(),
    )
    if (found) categoryId = found.id
  }

  return {
    amount: parsed.amount || 0,
    description: parsed.description || text,
    type: (parsed.type === 'income' ? 'income' : 'expense') as 'expense' | 'income',
    categoryId,
    categoryName: parsed.category || null,
  }
}

function getCurrencySymbol(currency?: string) {
  if (currency === 'USD') return '$'
  if (currency === 'EUR') return '€'
  return '₽'
}

// ─── Обработчики ───────────────────────────────────────────────────────────

function setupHandlers(bot: Telegraf) {
  bot.start(handleStart)
  bot.command('help', handleHelp)
  bot.command('stats', handleStats)
  bot.command('balance', handleBalance)
  bot.command('history', handleHistory)
  bot.command('add', handleAddCommand)
  bot.action('confirm_tx', handleConfirmTransaction)
  bot.action('cancel_tx', handleCancelTransaction)
  bot.on('text', handleMessage)
}

async function handleStart(ctx: Context) {
  const telegramId = String(ctx.from?.id)
  const rawText = (ctx.message as { text?: string } | undefined)?.text ?? ''
  const token = rawText.split(' ')[1]

  if (token) {
    const payload = await getPayloadInstance()
    const users = await payload.find({
      collection: 'users',
      where: {
        and: [
          { telegramConnectToken: { equals: token } },
          { telegramConnectTokenExpiresAt: { greater_than: new Date().toISOString() } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    const user = users.docs[0]
    if (!user) {
      await ctx.reply('❌ Ссылка устарела. Сгенерируйте новую в настройках приложения.')
      return
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        telegramId,
        telegramConnectToken: '',
        telegramConnectTokenExpiresAt: null,
      } as Record<string, unknown>,
      overrideAccess: true,
    })

    await payload.create({
      collection: 'funnel-events',
      data: { user: user.id, event: 'telegram_connected' },
      overrideAccess: true,
    })

    await ctx.reply(
      `✅ Аккаунт успешно привязан!\n\n` +
        `Теперь вы можете:\n` +
        `• Написать транзакцию — я её распознаю и сохраню\n` +
        `  _"потратил 500 на кофе"_\n` +
        `  _"получил зарплату 80000"_\n\n` +
        `• Задать вопрос о финансах:\n` +
        `  _"сколько я трачу на еду?"_\n` +
        `  _"дай совет по бюджету"_\n\n` +
        `/stats — статистика месяца\n` +
        `/help — все команды`,
      { parse_mode: 'Markdown' },
    )
    return
  }

  const { user } = await getUserByTelegramId(telegramId)

  if (user) {
    await ctx.reply(
      `👋 С возвращением, ${user.name || user.email}!\n\n` +
        `Напишите транзакцию или задайте вопрос.\n\n` +
        `/help — список команд`,
    )
  } else {
    await ctx.reply(
      `👋 Привет\\! Я *MoneyMind* — ваш AI финансовый ассистент\\.\n\n` +
        `Чтобы начать:\n` +
        `1\\. Откройте приложение *MoneyMind*\n` +
        `2\\. Перейдите в *Настройки → Telegram*\n` +
        `3\\. Нажмите *"Подключить Telegram"*\n` +
        `4\\. Нажмите кнопку в появившемся сообщении`,
      { parse_mode: 'MarkdownV2' },
    )
  }
}

async function handleHelp(ctx: Context) {
  await ctx.reply(
    `*Команды MoneyMind:*\n\n` +
      `📝 *Добавление транзакций*\n` +
      `Просто напишите сообщение:\n` +
      `_"потратил 500 на кофе"_\n` +
      `_"купил продукты 2000"_\n` +
      `_"получил зарплату 80000"_\n\n` +
      `/add <текст> — явно добавить транзакцию\n\n` +
      `📊 *Статистика*\n` +
      `/stats — расходы и доходы за месяц\n` +
      `/balance — текущий баланс\n` +
      `/history — последние 10 транзакций\n\n` +
      `💬 *AI-ассистент*\n` +
      `Задайте любой финансовый вопрос:\n` +
      `_"сколько я трачу на еду?"_\n` +
      `_"на чём могу сэкономить?"_\n` +
      `_"дай совет по бюджету"_`,
    { parse_mode: 'Markdown' },
  )
}

async function handleStats(ctx: Context) {
  const { user } = await getUserByTelegramId(String(ctx.from?.id))
  if (!user) {
    await ctx.reply('❌ Аккаунт не привязан. Отправьте /start для инструкций.')
    return
  }

  await ctx.sendChatAction('typing')

  const payload = await getPayloadInstance()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const transactions = await payload.find({
    collection: 'transactions',
    where: {
      and: [
        { user: { equals: user.id } },
        { date: { greater_than_equal: startOfMonth.toISOString() } },
      ],
    },
    limit: 500,
    depth: 1,
    overrideAccess: true,
  })

  const expenses = transactions.docs.filter((t) => t.type === 'expense')
  const income = transactions.docs.filter((t) => t.type === 'income')
  const totalExpense = expenses.reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0)
  const balance = totalIncome - totalExpense
  const sym = getCurrencySymbol(user.currency)

  const byCategory: Record<string, number> = {}
  for (const t of expenses) {
    const catName =
      t.category && typeof t.category === 'object'
        ? (t.category as { name: string }).name
        : 'Другое'
    byCategory[catName] = (byCategory[catName] || 0) + (t.amount || 0)
  }

  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => `  • ${name}: ${amount.toLocaleString('ru')}${sym}`)
    .join('\n')

  const monthName = now.toLocaleDateString('ru', { month: 'long', year: 'numeric' })

  await ctx.reply(
    `📊 *Статистика за ${monthName}*\n\n` +
      `💰 Доходы: *${totalIncome.toLocaleString('ru')}${sym}*\n` +
      `💸 Расходы: *${totalExpense.toLocaleString('ru')}${sym}*\n` +
      `${balance >= 0 ? '✅' : '⚠️'} Баланс: *${balance.toLocaleString('ru')}${sym}*\n` +
      (topCategories ? `\n*Топ расходов:*\n${topCategories}` : ''),
    { parse_mode: 'Markdown' },
  )
}

async function handleBalance(ctx: Context) {
  const { user } = await getUserByTelegramId(String(ctx.from?.id))
  if (!user) {
    await ctx.reply('❌ Аккаунт не привязан. Отправьте /start для инструкций.')
    return
  }

  await ctx.sendChatAction('typing')

  const payload = await getPayloadInstance()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const transactions = await payload.find({
    collection: 'transactions',
    where: {
      and: [
        { user: { equals: user.id } },
        { date: { greater_than_equal: startOfMonth.toISOString() } },
      ],
    },
    limit: 500,
    overrideAccess: true,
  })

  const totalExpense = transactions.docs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalIncome = transactions.docs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const balance = totalIncome - totalExpense
  const sym = getCurrencySymbol(user.currency)

  const budgetInfo =
    user.monthlyBudget
      ? `\n📋 Бюджет: ${user.monthlyBudget.toLocaleString('ru')}${sym} (использовано ${Math.round((totalExpense / user.monthlyBudget) * 100)}%)`
      : ''

  await ctx.reply(
    `💳 *Баланс за этот месяц*\n\n` +
      `${balance >= 0 ? '✅' : '⚠️'} *${balance.toLocaleString('ru')}${sym}*${budgetInfo}`,
    { parse_mode: 'Markdown' },
  )
}

async function handleHistory(ctx: Context) {
  const { user } = await getUserByTelegramId(String(ctx.from?.id))
  if (!user) {
    await ctx.reply('❌ Аккаунт не привязан. Отправьте /start для инструкций.')
    return
  }

  await ctx.sendChatAction('typing')

  const payload = await getPayloadInstance()

  const transactions = await payload.find({
    collection: 'transactions',
    where: { user: { equals: user.id } },
    limit: 10,
    sort: '-date',
    depth: 1,
    overrideAccess: true,
  })

  const sym = getCurrencySymbol(user.currency)

  if (transactions.docs.length === 0) {
    await ctx.reply('📭 Нет транзакций. Напишите что потратили или получили.')
    return
  }

  const list = transactions.docs
    .map((t) => {
      const date = t.date
        ? new Date(t.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })
        : '?'
      const sign = t.type === 'expense' ? '💸 \\-' : '💰 \\+'
      const cat =
        t.category && typeof t.category === 'object'
          ? ` \\(${(t.category as { name: string }).name}\\)`
          : ''
      const desc = (t.description || '').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
      return `${sign}${(t.amount || 0).toLocaleString('ru')}${sym} ${desc}${cat} — ${date}`
    })
    .join('\n')

  await ctx.reply(`📋 *Последние транзакции:*\n\n${list}`, { parse_mode: 'MarkdownV2' })
}

async function handleAddCommand(ctx: Context) {
  const rawText = (ctx.message as { text?: string } | undefined)?.text ?? ''
  const transactionText = rawText.replace(/^\/add\s*/, '').trim()

  if (!transactionText) {
    await ctx.reply(
      'Укажите текст транзакции:\n`/add потратил 500 на кофе`',
      { parse_mode: 'Markdown' },
    )
    return
  }

  const { user } = await getUserByTelegramId(String(ctx.from?.id))
  if (!user) {
    await ctx.reply('❌ Аккаунт не привязан. Отправьте /start для инструкций.')
    return
  }

  await ctx.sendChatAction('typing')
  await processTransaction(ctx, transactionText, user)
}

async function handleMessage(ctx: Context) {
  const text = (ctx.message as { text?: string } | undefined)?.text
  if (!text) return

  const { user } = await getUserByTelegramId(String(ctx.from?.id))
  if (!user) {
    await ctx.reply('❌ Аккаунт не привязан.\n\nОткройте настройки MoneyMind и подключите Telegram.')
    return
  }

  await ctx.sendChatAction('typing')

  const parsed = await parseTransactionText(text)

  if (parsed.amount > 0) {
    await processTransaction(ctx, text, user, parsed)
  } else {
    await processChatMessage(ctx, text, user)
  }
}

async function processTransaction(
  ctx: Context,
  text: string,
  user: { id: string; currency?: string },
  preParsed?: Awaited<ReturnType<typeof parseTransactionText>>,
) {
  const parsed = preParsed ?? (await parseTransactionText(text))

  if (parsed.amount <= 0) {
    await ctx.reply(
      'Не удалось распознать сумму. Попробуйте написать конкретнее:\n_"потратил 500 на кофе"_',
      { parse_mode: 'Markdown' },
    )
    return
  }

  const sym = getCurrencySymbol(user.currency)
  const sign = parsed.type === 'expense' ? '💸 −' : '💰 +'
  const catText = parsed.categoryName ? ` • ${parsed.categoryName}` : ''

  const chatId = ctx.chat?.id
  if (chatId) {
    pendingTransactions.set(chatId, { ...parsed, userId: user.id, currency: user.currency || 'RUB' })
  }

  await ctx.reply(
    `${sign}${parsed.amount.toLocaleString('ru')}${sym} — ${parsed.description}${catText}\n\nСохранить?`,
    Markup.inlineKeyboard([
      Markup.button.callback('✅ Сохранить', 'confirm_tx'),
      Markup.button.callback('❌ Отмена', 'cancel_tx'),
    ]),
  )
}

async function handleConfirmTransaction(ctx: Context) {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const pending = pendingTransactions.get(chatId)
  if (!pending) {
    await ctx.answerCbQuery('Транзакция уже была обработана')
    return
  }

  pendingTransactions.delete(chatId)

  const payload = await getPayloadInstance()

  await payload.create({
    collection: 'transactions',
    data: {
      description: pending.description,
      amount: pending.amount,
      type: pending.type,
      ...(pending.categoryId ? { category: pending.categoryId } : {}),
      date: new Date().toISOString(),
      user: pending.userId,
      source: 'telegram',
    },
    overrideAccess: true,
  })

  const sym = getCurrencySymbol(pending.currency)
  const sign = pending.type === 'expense' ? '💸 −' : '💰 +'

  await ctx.editMessageText(
    `${sign}${pending.amount.toLocaleString('ru')}${sym} — ${pending.description}\n\n✅ Сохранено!`,
  )
  await ctx.answerCbQuery('Сохранено!')
}

async function handleCancelTransaction(ctx: Context) {
  const chatId = ctx.chat?.id
  if (chatId) pendingTransactions.delete(chatId)
  await ctx.editMessageText('❌ Отменено')
  await ctx.answerCbQuery('Отменено')
}

async function processChatMessage(ctx: Context, text: string, user: { id: string; currency?: string }) {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const payload = await getPayloadInstance()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const transactions = await payload.find({
    collection: 'transactions',
    where: {
      and: [
        { user: { equals: user.id } },
        { date: { greater_than_equal: startOfMonth.toISOString() } },
      ],
    },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })

  const sym = getCurrencySymbol(user.currency)
  const totalExpense = transactions.docs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalIncome = transactions.docs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const transactionsSummary = transactions.docs
    .map(
      (t) =>
        `${t.date ? new Date(t.date).toLocaleDateString('ru') : '?'}: ${t.type === 'expense' ? '-' : '+'}${t.amount}${sym} — ${t.description}`,
    )
    .join('\n')

  const sessionId = chatSessions.get(chatId)
  let sessionMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  if (sessionId) {
    try {
      const session = await payload.findByID({
        collection: 'chat-history',
        id: sessionId,
        overrideAccess: true,
      })
      if (session?.messages) {
        sessionMessages = (
          session.messages as Array<{ role: 'user' | 'assistant'; content: string }>
        ).slice(-10)
      }
    } catch {
      chatSessions.delete(chatId)
    }
  }

  const reply = await chat(
    [
      {
        role: 'system',
        content: `Ты финансовый AI-ассистент MoneyMind. Отвечай кратко, по делу, на русском. Используй эмодзи.

Данные за ${now.toLocaleDateString('ru', { month: 'long', year: 'numeric' })}:
Расходы: ${totalExpense}${sym}
Доходы: ${totalIncome}${sym}
Баланс: ${totalIncome - totalExpense}${sym}

${transactionsSummary ? `Транзакции:\n${transactionsSummary}` : 'Транзакций нет'}`,
      },
      ...sessionMessages,
      { role: 'user', content: text },
    ],
    500,
  )

  const newMessages = [
    ...sessionMessages,
    { role: 'user' as const, content: text, timestamp: new Date().toISOString() },
    { role: 'assistant' as const, content: reply, timestamp: new Date().toISOString() },
  ]

  if (sessionId) {
    try {
      await payload.update({
        collection: 'chat-history',
        id: sessionId,
        data: { messages: newMessages },
        overrideAccess: true,
      })
    } catch {
      const newSession = await payload.create({
        collection: 'chat-history',
        data: { user: user.id, messages: newMessages, title: text.substring(0, 50) },
        overrideAccess: true,
      })
      chatSessions.set(chatId, String(newSession.id))
    }
  } else {
    const newSession = await payload.create({
      collection: 'chat-history',
      data: { user: user.id, messages: newMessages, title: text.substring(0, 50) },
      overrideAccess: true,
    })
    chatSessions.set(chatId, String(newSession.id))
  }

  await ctx.reply(reply)
}
