/**
 * Open Food Facts barcode lookup — fully free, no API key required.
 * See https://openfoodfacts.org for terms (attribution requested).
 */

export interface ProductLookup {
  name: string;
  brand?: string;
  imageUrl?: string;
}

export async function lookupBarcode(code: string): Promise<ProductLookup | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const name =
      p.product_name_en ||
      p.product_name ||
      p.generic_name ||
      p.abbreviated_product_name;
    if (!name || typeof name !== 'string') return null;

    return {
      name: title(name),
      brand: p.brands || undefined,
      imageUrl: p.image_front_small_url || p.image_url || undefined,
    };
  } catch {
    return null;
  }
}

function title(s: string): string {
  // Light cleanup of product names — strip trailing brand suffixes, normalize caps
  let out = s.trim().replace(/\s+/g, ' ');
  // If shouted, title-case it
  if (out === out.toUpperCase()) {
    out = out
      .toLowerCase()
      .split(' ')
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ');
  }
  return out;
}
