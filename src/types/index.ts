export interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  createdAt: number;
  // New — priority items float to the top with an urgent style
  priority?: boolean;
  // New — analytics for "frequent item" suggestions & stats
  boughtCount?: number;
  lastBoughtAt?: number;
}

export interface NearbyStore {
  place_id: string;
  name: string;
  vicinity: string;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface AppSettings {
  notificationsEnabled: boolean;
  alertRadiusMeters: number;
  distanceUnit: 'km' | 'miles';
  googleMapsApiKey: string;
  lastNotifiedStoreId: string | null;
  lastNotifiedAt: number;
  // New — preferred list grouping
  listViewMode?: 'flat' | 'aisle';
  // New — user's free Google Gemini API key for the AI assistant
  geminiApiKey?: string;
}

// A snapshot of a completed shopping trip, saved on "New Trip" reset
export interface Trip {
  id: string;
  startedAt: number;     // when items were first added/uncheck began (createdAt of oldest)
  completedAt: number;   // when the user tapped "New Trip"
  itemNames: string[];   // names of items that were checked off
  totalItemCount: number; // total items on the list at completion
  // Per-store price log — optional, recorded during checkout
  storeName?: string;        // where the trip happened
  totalSpent?: number;       // total $ paid
  itemPrices?: { name: string; price: number }[]; // optional itemized prices
}

// Long-running price ledger — separate from trip history so we can compute
// "cheapest store" insights even after old trips age out.
export interface PriceRecord {
  itemName: string;        // canonical lowercase name
  storeName: string;
  price: number;
  recordedAt: number;
}

// A named grocery list. The user can have multiple of these (Premium feature).
// Free tier users get a single "main" list seeded on first launch.
export interface GroceryListDef {
  id: string;
  name: string;
  icon: string;              // Ionicon name OR a plain emoji
  color: string;             // accent color stored as hex
  createdAt: number;
}

export type ItemCategory =
  | 'produce'
  | 'meat_seafood'
  | 'dairy_eggs'
  | 'bakery'
  | 'pantry'
  | 'beverages'
  | 'snacks'
  | 'frozen'
  | 'household'
  | 'health'
  | 'baby'
  | 'alcohol';
