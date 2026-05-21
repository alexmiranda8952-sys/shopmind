import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_KEY_STORAGE = '@shopmind_ai_key';
// Legacy key (was used when the assistant ran on Anthropic Claude). We read it
// as a fallback so users who already entered a key don't have to re-enter,
// but new keys should be free Google Gemini keys.
const LEGACY_ANTHROPIC_STORAGE = '@shopmind_anthropic_key';

/**
 * The AI assistant runs on Google Gemini, which has a genuinely free tier:
 *   - Get a key at https://aistudio.google.com/app/apikey  (free Google account)
 *   - gemini-2.0-flash: ~15 requests/min, 1,500/day at no cost
 * The user's key is stored on-device and sent directly to Google — never to
 * our servers.
 */

const GEMINI_MODEL = 'gemini-2.0-flash';

export async function getAIApiKey(): Promise<string> {
  try {
    const fresh = await AsyncStorage.getItem(AI_KEY_STORAGE);
    if (fresh) return fresh;
    // Fall back to a previously-stored key for continuity
    return (await AsyncStorage.getItem(LEGACY_ANTHROPIC_STORAGE)) || '';
  } catch {
    return '';
  }
}

export async function setAIApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(AI_KEY_STORAGE, key.trim());
}

// ── Back-compat aliases (older imports referenced the Anthropic names) ──
export const getAnthropicApiKey = getAIApiKey;
export const setAnthropicApiKey = setAIApiKey;

export interface AIExtractedItem {
  name: string;
  quantity?: string;
  reason?: string;     // brief why-this-was-suggested
}

export interface AIResult {
  ok: boolean;
  items: AIExtractedItem[];
  reply: string;
  error?: string;
}

const SYSTEM_PROMPT = `You are ShopMind's grocery-list assistant. Users describe what they need in
plain English (e.g. "ingredients for tacos for 4", "low-carb dinner for the week",
"birthday party for 8 kids"). Your job is to:

1. Reply with a short, friendly one-sentence acknowledgement (max 80 chars).
2. Then output a JSON code block listing the grocery items they should add.

The JSON MUST follow this exact shape:
{
  "items": [
    { "name": "Tortillas", "quantity": "1 pack" },
    { "name": "Ground beef", "quantity": "1 lb" }
  ]
}

Rules:
- "name" is the item, capitalized normally (not ALL CAPS).
- "quantity" is optional but useful — include amounts or counts when relevant.
- 5-20 items per response is the sweet spot.
- Don't include household items the user didn't ask about (cleaning supplies, etc).
- Group similar items as one entry (e.g., "Mixed bell peppers" not three rows).
- If the user's request is vague or unrelated to groceries, reply normally without a JSON block.

Output format: friendly sentence, then a fenced \`\`\`json code block.`;

/**
 * Sends a user message to Google Gemini and parses out the grocery items.
 * Gemini Flash is fast and free-tier eligible.
 */
export async function askAI(userMessage: string, apiKey: string): Promise<AIResult> {
  if (!apiKey) {
    return {
      ok: false,
      items: [],
      reply: '',
      error: 'No API key configured. Add your free Gemini key in Settings → AI Assistant.',
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let parsed: any = {};
      try { parsed = JSON.parse(text); } catch {}
      const apiMsg = parsed?.error?.message as string | undefined;
      let errMsg: string;
      if (response.status === 400 && apiMsg?.toLowerCase().includes('api key')) {
        errMsg = 'Invalid API key. Double-check it in Settings.';
      } else if (response.status === 429) {
        errMsg = "You've hit Gemini's free-tier rate limit. Wait a minute and retry.";
      } else {
        errMsg = apiMsg || `Request failed (${response.status})`;
      }
      return { ok: false, items: [], reply: '', error: errMsg };
    }

    const data = await response.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    const items = extractItems(text);
    const reply = stripJsonBlock(text).trim();

    return { ok: true, items, reply: reply || 'Here are some items for your list:' };
  } catch (e: any) {
    return {
      ok: false,
      items: [],
      reply: '',
      error: e?.message || 'Network error',
    };
  }
}

function extractItems(text: string): AIExtractedItem[] {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  // Some responses return raw JSON without a fence — try that too
  const candidate = match ? match[1].trim() : tryRawJson(text);
  if (!candidate) return [];
  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed?.items)) {
      return parsed.items
        .filter((i: any) => i && typeof i.name === 'string')
        .map((i: any) => ({
          name: String(i.name).trim(),
          quantity: i.quantity ? String(i.quantity).trim() : undefined,
          reason: i.reason ? String(i.reason).trim() : undefined,
        }));
    }
  } catch {
    /* fall through */
  }
  return [];
}

function tryRawJson(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function stripJsonBlock(text: string): string {
  return text
    .replace(/```(?:json)?[\s\S]*?```/gi, '')
    .replace(/\{[\s\S]*"items"[\s\S]*\}/i, '')
    .trim();
}
