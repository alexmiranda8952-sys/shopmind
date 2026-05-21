import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroceryItem, AppSettings, Trip, PriceRecord } from '../types';

const GROCERY_LIST_KEY = '@shopmind_grocery_list';
const SETTINGS_KEY = '@shopmind_settings';
const TRIP_HISTORY_KEY = '@shopmind_trip_history';
const ONBOARDING_KEY = '@shopmind_onboarded';
const PRICE_LEDGER_KEY = '@shopmind_price_ledger';

// Locked configuration — not user-changeable.
// 3/4 mile = 1207 meters (0.75 × 1609.34).
const LOCKED_RADIUS_METERS = 1207;
const LOCKED_DISTANCE_UNIT: 'miles' = 'miles';

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  alertRadiusMeters: LOCKED_RADIUS_METERS,
  distanceUnit: LOCKED_DISTANCE_UNIT,
  googleMapsApiKey: '',
  lastNotifiedStoreId: null,
  lastNotifiedAt: 0,
  listViewMode: 'flat',
};

export async function getGroceryList(): Promise<GroceryItem[]> {
  // Delegates to the multi-list service so reads always hit the active list.
  // Imported lazily to dodge an early-evaluation cycle with listService.
  const { getGroceryListActive } = await import('./listService');
  return getGroceryListActive();
}

export async function saveGroceryList(items: GroceryItem[]): Promise<void> {
  const { saveGroceryListActive } = await import('./listService');
  return saveGroceryListActive(items);
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    const stored = data ? JSON.parse(data) : {};
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      // Always override stored values for the locked fields — even legacy
      // users with previously-customized radius/unit get 1 mile / miles.
      alertRadiusMeters: LOCKED_RADIUS_METERS,
      distanceUnit: LOCKED_DISTANCE_UNIT,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

// Returns the API key — prefers a key manually saved in Settings,
// falls back to the key bundled in .env at build time.
export async function getApiKey(): Promise<string> {
  const settings = await getSettings();
  return (
    settings.googleMapsApiKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''
  );
}

// ───────────────────────────────────────────────
// Trip history — snapshot of every completed trip
// Saved when the user taps "New Trip" so they can review past shopping runs.
// ───────────────────────────────────────────────

export async function getTripHistory(): Promise<Trip[]> {
  try {
    const data = await AsyncStorage.getItem(TRIP_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveTrip(trip: Trip): Promise<void> {
  const history = await getTripHistory();
  // Keep the most recent 100 trips
  const updated = [trip, ...history].slice(0, 100);
  await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(updated));
}

export async function clearTripHistory(): Promise<void> {
  await AsyncStorage.removeItem(TRIP_HISTORY_KEY);
}

// ───────────────────────────────────────────────
// Onboarding completion flag
// ───────────────────────────────────────────────

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ONBOARDING_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

// ───────────────────────────────────────────────
// Price ledger — per-store, per-item price history
// Used to compute cheapest-store insights over time.
// Capped at 500 records to keep storage modest.
// ───────────────────────────────────────────────

export async function getPriceLedger(): Promise<PriceRecord[]> {
  try {
    const data = await AsyncStorage.getItem(PRICE_LEDGER_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function appendPriceRecords(records: PriceRecord[]): Promise<void> {
  if (records.length === 0) return;
  const current = await getPriceLedger();
  const updated = [...records, ...current].slice(0, 500);
  await AsyncStorage.setItem(PRICE_LEDGER_KEY, JSON.stringify(updated));
}

export async function clearPriceLedger(): Promise<void> {
  await AsyncStorage.removeItem(PRICE_LEDGER_KEY);
}
