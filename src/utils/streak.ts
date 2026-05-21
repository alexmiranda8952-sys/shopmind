import { Trip } from '../types';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

/** ISO-style week key — same week → same key. */
function weekKey(ts: number): string {
  const d = new Date(ts);
  // Shift to Monday-start
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Returns the current consecutive-week shopping streak.
 *
 * A "streak week" is any 7-day window (Mon-Sun) that contains at least one trip.
 * Streak counts backward from the current week. A grace period of one missed
 * week is NOT given — strict consecutive weeks only.
 *
 * If no trip this week yet, streak still counts as long as last week had one
 * (so the streak doesn't drop just because it's Monday morning).
 */
export function computeWeeklyStreak(trips: Trip[]): number {
  if (trips.length === 0) return 0;

  const weeksWithTrips = new Set<string>();
  for (const t of trips) {
    weeksWithTrips.add(weekKey(t.completedAt));
  }

  let streak = 0;
  let cursor = Date.now();
  let firstWeek = true;

  while (true) {
    const k = weekKey(cursor);
    if (weeksWithTrips.has(k)) {
      streak++;
    } else if (firstWeek) {
      // Allow current week to be empty; check previous week
      firstWeek = false;
      cursor -= WEEK;
      continue;
    } else {
      break;
    }
    firstWeek = false;
    cursor -= WEEK;
  }

  return streak;
}
