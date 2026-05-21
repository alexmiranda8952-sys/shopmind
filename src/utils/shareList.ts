import { GroceryItem } from '../types';

const HEADER = 'SHOPMIND/1';

interface SharePayload {
  v: 1;
  ts: number;
  items: { n: string; q?: string; p?: boolean }[];
}

function utf8ToBase64(str: string): string {
  // Encode UTF-8 string to base64 without relying on Buffer
  let bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6));
      bytes.push(0x80 | (c & 0x3f));
    } else {
      bytes.push(0xe0 | (c >> 12));
      bytes.push(0x80 | ((c >> 6) & 0x3f));
      bytes.push(0x80 | (c & 0x3f));
    }
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i] || 0;
    const b2 = bytes[i + 1] || 0;
    const b3 = bytes[i + 2] || 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += chars[(triplet >> 18) & 0x3f];
    result += chars[(triplet >> 12) & 0x3f];
    result += i + 1 < bytes.length ? chars[(triplet >> 6) & 0x3f] : '=';
    result += i + 2 < bytes.length ? chars[triplet & 0x3f] : '=';
  }
  return result;
}

function base64ToUtf8(b64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c1 = chars.indexOf(clean[i]);
    const c2 = chars.indexOf(clean[i + 1]);
    const c3 = chars.indexOf(clean[i + 2]);
    const c4 = chars.indexOf(clean[i + 3]);
    const triplet = (c1 << 18) | (c2 << 12) | ((c3 & 0x3f) << 6) | (c4 & 0x3f);
    bytes.push((triplet >> 16) & 0xff);
    if (clean[i + 2] !== '=') bytes.push((triplet >> 8) & 0xff);
    if (clean[i + 3] !== '=') bytes.push(triplet & 0xff);
  }
  // Decode UTF-8
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) {
      result += String.fromCharCode(b);
    } else if (b < 0xe0) {
      result += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i] & 0x3f));
    } else {
      const c2 = bytes[++i];
      const c3 = bytes[++i];
      result += String.fromCharCode(((b & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f));
    }
  }
  return result;
}

/**
 * Encodes the unchecked items from a list into a portable share string.
 * Format: `SHOPMIND/1:<base64-payload>` — safe to share via any text channel.
 */
export function encodeListForSharing(items: GroceryItem[]): string {
  const payload: SharePayload = {
    v: 1,
    ts: Date.now(),
    items: items
      .filter((i) => !i.checked)
      .map((i) => ({
        n: i.name,
        ...(i.quantity ? { q: i.quantity } : {}),
        ...(i.priority ? { p: true } : {}),
      })),
  };
  const json = JSON.stringify(payload);
  return `${HEADER}:${utf8ToBase64(json)}`;
}

export interface DecodedShare {
  items: { name: string; quantity: string; priority: boolean }[];
  sharedAt: number;
}

/**
 * Decodes a share string back into items. Returns null if the input doesn't
 * look like a valid ShopMind payload.
 */
export function decodeSharedList(input: string): DecodedShare | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Tolerate users pasting the whole share text with leading prose
  const match = trimmed.match(/SHOPMIND\/1:([A-Za-z0-9+/=]+)/);
  if (!match) return null;
  try {
    const json = base64ToUtf8(match[1]);
    const payload = JSON.parse(json) as SharePayload;
    if (payload.v !== 1 || !Array.isArray(payload.items)) return null;
    return {
      sharedAt: payload.ts || Date.now(),
      items: payload.items
        .filter((i) => i && typeof i.n === 'string')
        .map((i) => ({
          name: i.n,
          quantity: i.q || '',
          priority: !!i.p,
        })),
    };
  } catch {
    return null;
  }
}

/**
 * Builds the human-readable text that wraps the encoded payload when sharing.
 * Provides a nice fallback view for recipients who don't have ShopMind installed.
 */
export function buildShareableText(items: GroceryItem[]): string {
  const unchecked = items.filter((i) => !i.checked);
  const preview = unchecked
    .slice(0, 20)
    .map((i) => `• ${i.name}${i.quantity ? `  (${i.quantity})` : ''}${i.priority ? '  ★' : ''}`)
    .join('\n');
  const extra = unchecked.length > 20 ? `\n…+${unchecked.length - 20} more` : '';
  const encoded = encodeListForSharing(items);
  return [
    `🛒 My ShopMind list (${unchecked.length} items):`,
    '',
    preview + extra,
    '',
    '— Paste this code into ShopMind → Templates → Import to add everything:',
    encoded,
  ].join('\n');
}
