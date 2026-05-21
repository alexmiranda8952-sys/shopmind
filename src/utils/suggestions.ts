import { Trip, GroceryItem } from '../types';

export interface Suggestion {
  name: string;          // canonical display name (capitalized)
  reason: string;        // short why-string shown to user
  confidence: number;    // 0..1, used to sort
  daysSinceLast: number;
  buyCount: number;
}

interface ItemStat {
  displayName: string;
  buyTimestamps: number[];
}

/**
 * Surface items the user is likely missing from the current list, based on
 * patterns in their trip history.
 *
 * Heuristics (in priority order):
 *  1. Item was bought ≥ 3 times historically
 *  2. NOT currently on the list (any state)
 *  3. Average buy interval has elapsed since last purchase (or close to it)
 *
 * Returns the top N suggestions ranked by confidence.
 */
export function computeSuggestions(
  trips: Trip[],
  currentList: GroceryItem[],
  maxResults = 3
): Suggestion[] {
  if (trips.length < 2) return [];

  // Build per-item stats from history
  const stats: Record<string, ItemStat> = {};
  for (const trip of trips) {
    for (const name of trip.itemNames) {
      const key = name.toLowerCase().trim();
      if (!stats[key]) {
        stats[key] = { displayName: prettyName(name), buyTimestamps: [] };
      }
      stats[key].buyTimestamps.push(trip.completedAt);
    }
  }

  // Build a set of items currently on the list to exclude
  const currentNames = new Set(currentList.map((i) => i.name.toLowerCase().trim()));

  const now = Date.now();
  const suggestions: Suggestion[] = [];

  for (const key in stats) {
    if (currentNames.has(key)) continue;
    const s = stats[key];
    const buyCount = s.buyTimestamps.length;
    if (buyCount < 3) continue;

    // Sort ascending so we can compute intervals
    const sorted = [...s.buyTimestamps].sort((a, b) => a - b);
    const lastBoughtAt = sorted[sorted.length - 1];
    const daysSinceLast = Math.floor((now - lastBoughtAt) / (24 * 60 * 60 * 1000));

    // Average days between buys
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((sorted[i] - sorted[i - 1]) / (24 * 60 * 60 * 1000));
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Has the average interval elapsed?
    if (daysSinceLast < avgInterval * 0.7) continue;

    const ratio = daysSinceLast / avgInterval; // 1.0 = right on time, >1 = overdue
    const confidence = Math.min(1, ratio / 1.5);

    suggestions.push({
      name: s.displayName,
      reason: buildReason(daysSinceLast, avgInterval, buyCount),
      confidence,
      daysSinceLast,
      buyCount,
    });
  }

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxResults);
}

function buildReason(daysSinceLast: number, avgInterval: number, buyCount: number): string {
  if (daysSinceLast >= avgInterval * 1.5) {
    return `Overdue — usually every ${formatDays(avgInterval)}`;
  }
  if (daysSinceLast >= avgInterval * 0.9) {
    return `You usually grab this every ${formatDays(avgInterval)}`;
  }
  return `Bought ${buyCount} times recently`;
}

function formatDays(d: number): string {
  if (d < 1.5) return 'day';
  if (d < 10) return `${Math.round(d)} days`;
  if (d < 21) return `${Math.round(d / 7)} week${Math.round(d / 7) !== 1 ? 's' : ''}`;
  return `${Math.round(d / 7)} weeks`;
}

function prettyName(name: string): string {
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
