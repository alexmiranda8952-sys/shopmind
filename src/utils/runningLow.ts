import { Trip, GroceryItem } from '../types';

export interface RunningLowItem {
  name: string;
  avgIntervalDays: number;   // typical days between purchases
  daysSinceLast: number;     // days since the most recent buy
  overdueBy: number;         // daysSinceLast − avgInterval (positive = overdue)
  confidence: 'high' | 'medium' | 'low';  // how reliable the cadence is
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Analyzes the user's trip history to identify items that the user
 * buys on a regular cadence and is now overdue to buy.
 *
 *  - Requires ≥3 purchases of the item to establish a cadence
 *  - Excludes items currently on the list (don't double-suggest)
 *  - Sorts by how overdue the item is, then by cadence confidence
 *  - Caps to a small number to avoid overwhelming users
 */
export function detectRunningLow(
  trips: Trip[],
  currentItems: GroceryItem[],
  maxResults = 5
): RunningLowItem[] {
  if (trips.length < 3) return [];

  const onListNow = new Set(currentItems.map((i) => i.name.toLowerCase()));
  const now = Date.now();

  // Group: item-name (lowercased) → array of completedAt timestamps when bought
  const buyTimes: Record<string, number[]> = {};
  for (const trip of trips) {
    for (const name of trip.itemNames) {
      const key = name.toLowerCase();
      if (!buyTimes[key]) buyTimes[key] = [];
      buyTimes[key].push(trip.completedAt);
    }
  }

  const candidates: RunningLowItem[] = [];

  for (const [key, times] of Object.entries(buyTimes)) {
    if (times.length < 3) continue;
    if (onListNow.has(key)) continue;

    times.sort((a, b) => b - a); // newest first

    // Compute intervals between consecutive purchases (newest pair first)
    const intervals: number[] = [];
    for (let i = 0; i < times.length - 1; i++) {
      const days = (times[i] - times[i + 1]) / MS_PER_DAY;
      if (days > 0.25) intervals.push(days); // skip same-day duplicates
    }
    if (intervals.length < 2) continue;

    const avgIntervalDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const daysSinceLast = (now - times[0]) / MS_PER_DAY;
    const overdueBy = daysSinceLast - avgIntervalDays;

    // Only surface if the user is at least 25% past their typical interval
    if (overdueBy < avgIntervalDays * 0.25) continue;

    // Variance check — if intervals are wildly inconsistent, lower confidence
    const variance =
      intervals.reduce((acc, v) => acc + Math.pow(v - avgIntervalDays, 2), 0) /
      intervals.length;
    const stdev = Math.sqrt(variance);
    const coeffVariance = stdev / avgIntervalDays;

    let confidence: RunningLowItem['confidence'];
    if (intervals.length >= 4 && coeffVariance < 0.35) confidence = 'high';
    else if (coeffVariance < 0.6) confidence = 'medium';
    else confidence = 'low';

    candidates.push({
      name: capitalizeFirst(key),
      avgIntervalDays,
      daysSinceLast,
      overdueBy,
      confidence,
    });
  }

  // Sort: high-confidence first, then by how overdue they are
  const confidenceWeight = { high: 0, medium: 1, low: 2 };
  candidates.sort((a, b) => {
    const w = confidenceWeight[a.confidence] - confidenceWeight[b.confidence];
    if (w !== 0) return w;
    return b.overdueBy - a.overdueBy;
  });

  return candidates.slice(0, maxResults);
}

export function formatOverdue(daysOverdue: number): string {
  const d = Math.round(daysOverdue);
  if (d <= 1) return 'overdue by a day';
  if (d < 7) return `overdue by ${d} days`;
  if (d < 14) return 'overdue by a week';
  if (d < 30) return `overdue by ${Math.round(d / 7)} weeks`;
  return `overdue by ${Math.round(d / 30)} months`;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
