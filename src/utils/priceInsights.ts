import { PriceRecord, Trip } from '../types';

export interface CheapestStoreInsight {
  itemName: string;
  cheapestStore: string;
  cheapestPrice: number;
  priciestStore: string;
  priciestPrice: number;
  savings: number;       // absolute savings between cheapest and priciest
  savingsPercent: number;
  stores: { name: string; price: number }[];
}

export interface SpendingSummary {
  total: number;
  trips: number;
  avgPerTrip: number;
  topStore: { name: string; spent: number } | null;
}

/**
 * For each item bought at 2+ stores, identifies the cheapest store and
 * computes potential savings vs. the priciest. Used to surface
 * "you'd save $X by buying Y at Z" insights on the History screen.
 */
export function computeCheapestStores(
  ledger: PriceRecord[],
  minStoresPerItem = 2,
  maxResults = 5
): CheapestStoreInsight[] {
  // Group: item → store → most-recent price (avg of last 3 actually, smoother)
  const byItem: Record<string, Record<string, number[]>> = {};
  for (const rec of ledger) {
    const key = rec.itemName.toLowerCase();
    if (!byItem[key]) byItem[key] = {};
    if (!byItem[key][rec.storeName]) byItem[key][rec.storeName] = [];
    byItem[key][rec.storeName].push(rec.price);
  }

  const insights: CheapestStoreInsight[] = [];
  for (const itemKey in byItem) {
    const storeMap = byItem[itemKey];
    const stores = Object.entries(storeMap).map(([name, prices]) => {
      const recent = prices.slice(0, 3);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      return { name, price: avg };
    });
    if (stores.length < minStoresPerItem) continue;
    stores.sort((a, b) => a.price - b.price);
    const cheapest = stores[0];
    const priciest = stores[stores.length - 1];
    const savings = priciest.price - cheapest.price;
    if (savings < 0.05) continue;
    insights.push({
      itemName: capitalizeFirst(itemKey),
      cheapestStore: cheapest.name,
      cheapestPrice: cheapest.price,
      priciestStore: priciest.name,
      priciestPrice: priciest.price,
      savings,
      savingsPercent: (savings / priciest.price) * 100,
      stores,
    });
  }
  return insights
    .sort((a, b) => b.savings - a.savings)
    .slice(0, maxResults);
}

export function computeSpendingSummary(trips: Trip[]): SpendingSummary {
  const tripsWithSpend = trips.filter((t) => typeof t.totalSpent === 'number' && t.totalSpent! > 0);
  if (tripsWithSpend.length === 0) {
    return { total: 0, trips: 0, avgPerTrip: 0, topStore: null };
  }
  const total = tripsWithSpend.reduce((acc, t) => acc + (t.totalSpent || 0), 0);

  const byStore: Record<string, number> = {};
  for (const t of tripsWithSpend) {
    const s = t.storeName || 'Unknown';
    byStore[s] = (byStore[s] || 0) + (t.totalSpent || 0);
  }
  const topStoreEntry = Object.entries(byStore).sort((a, b) => b[1] - a[1])[0];

  return {
    total,
    trips: tripsWithSpend.length,
    avgPerTrip: total / tripsWithSpend.length,
    topStore: topStoreEntry ? { name: topStoreEntry[0], spent: topStoreEntry[1] } : null,
  };
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}
