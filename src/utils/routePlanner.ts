import { GroceryItem, NearbyStore } from '../types';
import { getMatchingItems } from './storeItemMatching';

export interface RouteStop {
  store: NearbyStore;
  items: GroceryItem[];          // items to grab AT THIS STOP (incremental, not duplicated)
  distanceMeters: number;        // from previous stop (or user start)
}

export interface RoutePlan {
  stops: RouteStop[];
  totalItemsCovered: number;
  totalItemsRequested: number;
  totalDistanceMeters: number;
  uncoveredItems: GroceryItem[]; // items no nearby store sells
}

interface StoreWithMeta {
  store: NearbyStore;
  matches: GroceryItem[];
  distanceMeters: number;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Computes a multi-stop route plan that covers as many list items as possible
 * with the fewest stores. Uses a greedy approximation of the set-cover problem,
 * with a distance tiebreaker so closer stores win on ties.
 *
 * Constraints:
 *  - Caps at maxStops (default 3) — beyond that, the marginal benefit is small
 *  - Stop is only added if it covers ≥ 1 NEW item not already covered
 *  - Returns stops in greedy order; route order is then optimized by next-nearest from user start
 */
export function planRoute(
  unchecked: GroceryItem[],
  stores: NearbyStore[],
  userLat: number,
  userLng: number,
  maxStops = 3
): RoutePlan {
  if (unchecked.length === 0 || stores.length === 0) {
    return {
      stops: [],
      totalItemsCovered: 0,
      totalItemsRequested: unchecked.length,
      totalDistanceMeters: 0,
      uncoveredItems: unchecked,
    };
  }

  // Pre-compute store metadata
  const storesMeta: StoreWithMeta[] = stores.map((s) => ({
    store: s,
    matches: getMatchingItems(unchecked, s),
    distanceMeters: haversine(
      userLat,
      userLng,
      s.geometry.location.lat,
      s.geometry.location.lng
    ),
  }));

  // Greedy set cover
  const covered = new Set<string>();
  const selected: StoreWithMeta[] = [];

  while (selected.length < maxStops && covered.size < unchecked.length) {
    // For each remaining store, count items NOT yet covered
    let best: StoreWithMeta | null = null;
    let bestNewCount = 0;
    let bestDistance = Infinity;

    for (const sm of storesMeta) {
      if (selected.includes(sm)) continue;
      const newItems = sm.matches.filter((i) => !covered.has(i.id));
      if (newItems.length === 0) continue;
      if (
        newItems.length > bestNewCount ||
        (newItems.length === bestNewCount && sm.distanceMeters < bestDistance)
      ) {
        best = sm;
        bestNewCount = newItems.length;
        bestDistance = sm.distanceMeters;
      }
    }

    if (!best) break;
    selected.push(best);
    best.matches.forEach((i) => covered.add(i.id));
  }

  // Order stops by nearest-neighbor traversal from user start
  const remaining = [...selected];
  const ordered: StoreWithMeta[] = [];
  let curLat = userLat;
  let curLng = userLng;
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i];
      const d = haversine(curLat, curLng, r.store.geometry.location.lat, r.store.geometry.location.lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push(next);
    curLat = next.store.geometry.location.lat;
    curLng = next.store.geometry.location.lng;
  }

  // Build the stop sequence — assign each item to the FIRST store in order that has it
  const seenItemIds = new Set<string>();
  const stops: RouteStop[] = [];
  let prevLat = userLat;
  let prevLng = userLng;

  for (const sm of ordered) {
    const newItems = sm.matches.filter((i) => !seenItemIds.has(i.id));
    newItems.forEach((i) => seenItemIds.add(i.id));
    const dist = haversine(prevLat, prevLng, sm.store.geometry.location.lat, sm.store.geometry.location.lng);
    stops.push({
      store: sm.store,
      items: newItems,
      distanceMeters: dist,
    });
    prevLat = sm.store.geometry.location.lat;
    prevLng = sm.store.geometry.location.lng;
  }

  const totalDist = stops.reduce((acc, s) => acc + s.distanceMeters, 0);
  const uncovered = unchecked.filter((i) => !covered.has(i.id));

  return {
    stops,
    totalItemsCovered: covered.size,
    totalItemsRequested: unchecked.length,
    totalDistanceMeters: totalDist,
    uncoveredItems: uncovered,
  };
}
