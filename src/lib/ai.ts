export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiResponse {
  content: string
}

type Provider = 'openai' | 'yandexgpt' | 'gigachat'

function getProvider(): Provider {
  const p = process.env.AI_PROVIDER as Provider | undefined
  if (p === 'yandexgpt' || p === 'gigachat') return p
  return 'openai'
}

// ─── OpenAI ────────────────────────────────────────────────────────────────
async function chatOpenAI(messages: ChatMessage[], maxTokens = 500): Promise<string> {
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
  })
  return res.choices[0]?.message?.content || ''
}

// ─── Yandex GPT ────────────────────────────────────────────────────────────
// Docs: https://cloud.yandex.ru/docs/foundation-models/concepts/yandexgpt/models
// Env: YANDEX_FOLDER_ID, YANDEX_API_KEY
async function chatYandexGPT(messages: ChatMessage[], maxTokens = 500): Promise<string> {
  const folderId = process.env.YANDEX_FOLDER_ID
  const apiKey = process.env.YANDEX_API_KEY
  if (!folderId || !apiKey) throw new Error('YANDEX_FOLDER_ID и YANDEX_API_KEY не заданы')

  const modelUri = `gpt://${folderId}/${process.env.YANDEX_MODEL || 'yandexgpt-lite'}`

  const yandexMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, text: m.content }))

  const systemText = messages.find((m) => m.role === 'system')?.content

  const body = {
    modelUri,
    completionOptions: {
      stream: false,
      temperature: 0.7,
      maxTokens: String(maxTokens),
    },
    messages: [
      ...(systemText ? [{ role: 'system', text: systemText }] : []),
      ...yandexMessages,
    ],
  }

  const res = await fetch(
    'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
        'x-folder-id': folderId,
      },
      body: JSON.stringify(body),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Yandex GPT error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.result?.alternatives?.[0]?.message?.text || ''
}

// ─── GigaChat ──────────────────────────────────────────────────────────────
// Docs: https://developers.sber.ru/docs/ru/gigachat/api/overview
// Env: GIGACHAT_CREDENTIALS (base64 ClientID:Secret) или GIGACHAT_ACCESS_TOKEN
//
// GigaChat использует самоподписанный сертификат Сбера — обходим через undici Agent
import { Agent } from 'undici'

const gigachatAgent = new Agent({ connect: { rejectUnauthorized: false } })

let gigachatTokenCache: { token: string; expiresAt: number } | null = null

async function getGigaChatToken(): Promise<string> {
  if (gigachatTokenCache && Date.now() < gigachatTokenCache.expiresAt) {
    return gigachatTokenCache.token
  }

  const accessToken = process.env.GIGACHAT_ACCESS_TOKEN
  if (accessToken) return accessToken

  // Поддерживаем три способа задать credentials:
  // 1. GIGACHAT_CLIENT_ID + GIGACHAT_CLIENT_SECRET — кодируем автоматически
  // 2. GIGACHAT_CREDENTIALS в виде "ClientID:ClientSecret" — кодируем автоматически
  // 3. GIGACHAT_CREDENTIALS уже в base64 — используем как есть
  let base64Credentials: string
  const clientId = process.env.GIGACHAT_CLIENT_ID
  const clientSecret = process.env.GIGACHAT_CLIENT_SECRET

  if (clientId && clientSecret) {
    base64Credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  } else {
    const raw = process.env.GIGACHAT_CREDENTIALS
    if (!raw) {
      throw new Error(
        'Задайте GIGACHAT_CLIENT_ID + GIGACHAT_CLIENT_SECRET или GIGACHAT_CREDENTIALS в .env',
      )
    }
    // Если содержит двоеточие — это сырая строка "ID:Secret", кодируем
    base64Credentials = raw.includes(':') ? Buffer.from(raw).toString('base64') : raw
  }

  const res = await fetch(
    'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        RqUID: crypto.randomUUID(),
        Authorization: `Basic ${base64Credentials}`,
      },
      body: 'scope=GIGACHAT_API_PERS',
      // @ts-expect-error undici dispatcher не входит в стандартный тип RequestInit
      dispatcher: gigachatAgent,
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GigaChat auth error ${res.status}: ${err}`)
  }

  const data = await res.json()
  gigachatTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_at || 1800) * 1000 - 60_000,
  }
  return gigachatTokenCache.token
}

async function chatGigaChat(messages: ChatMessage[], maxTokens = 500): Promise<string> {
  const token = await getGigaChatToken()
  const model = process.env.GIGACHAT_MODEL || 'GigaChat'

  const res = await fetch(
    'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      // @ts-expect-error undici dispatcher не входит в стандартный тип RequestInit
      dispatcher: gigachatAgent,
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GigaChat error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ─── Public API ────────────────────────────────────────────────────────────

export function checkAiConfig(): { ok: boolean; error?: string } {
  const provider = getProvider()
  if (provider === 'yandexgpt') {
    if (!process.env.YANDEX_API_KEY || !process.env.YANDEX_FOLDER_ID) {
      return { ok: false, error: 'YANDEX_API_KEY и YANDEX_FOLDER_ID не заданы в .env' }
    }
  } else if (provider === 'gigachat') {
    const hasCredentials =
      process.env.GIGACHAT_ACCESS_TOKEN ||
      process.env.GIGACHAT_CREDENTIALS ||
      (process.env.GIGACHAT_CLIENT_ID && process.env.GIGACHAT_CLIENT_SECRET)
    if (!hasCredentials) {
      return {
        ok: false,
        error: 'Задайте GIGACHAT_CLIENT_ID + GIGACHAT_CLIENT_SECRET в .env',
      }
    }
  } else {
    if (!process.env.OPENAI_API_KEY) {
      return { ok: false, error: 'OPENAI_API_KEY не задан в .env' }
    }
  }
  return { ok: true }
}

export async function chat(messages: ChatMessage[], maxTokens = 500): Promise<string> {
  const provider = getProvider()
  if (provider === 'yandexgpt') return chatYandexGPT(messages, maxTokens)
  if (provider === 'gigachat') return chatGigaChat(messages, maxTokens)
  return chatOpenAI(messages, maxTokens)
}

export function getProviderName(): string {
  const p = getProvider()
  if (p === 'yandexgpt') return 'Yandex GPT'
  if (p === 'gigachat') return 'GigaChat'
  return 'OpenAI'
}
