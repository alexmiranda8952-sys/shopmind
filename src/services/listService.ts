import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroceryItem, GroceryListDef } from '../types';

/**
 * Multi-list storage layer. Items are partitioned by `listId`. The legacy
 * single-list storage key `@shopmind_grocery_list` is migrated on first
 * access into a list named "My List" with id `default`.
 *
 * Free tier: capped at 1 list (the default). Premium: unlimited.
 */

const LISTS_DEFS_KEY = '@shopmind_lists_defs';
const LIST_ITEMS_PREFIX = '@shopmind_list_items:';
const ACTIVE_LIST_KEY = '@shopmind_active_list';
const LEGACY_LIST_KEY = '@shopmind_grocery_list';
const MIGRATION_FLAG_KEY = '@shopmind_lists_migrated';

const DEFAULT_LIST_ID = 'default';

const DEFAULT_LIST: GroceryListDef = {
  id: DEFAULT_LIST_ID,
  name: 'My List',
  icon: 'cart',
  color: '#1E1B4B',
  createdAt: 0,
};

function itemKey(listId: string): string {
  return LIST_ITEMS_PREFIX + listId;
}

async function migrateLegacyIfNeeded(): Promise<void> {
  try {
    const migrated = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrated === 'true') return;

    const legacy = await AsyncStorage.getItem(LEGACY_LIST_KEY);
    if (legacy) {
      // Move legacy items into the default list bucket
      await AsyncStorage.setItem(itemKey(DEFAULT_LIST_ID), legacy);
    }

    // Seed the default list def
    const existingDefs = await AsyncStorage.getItem(LISTS_DEFS_KEY);
    if (!existingDefs) {
      const seeded: GroceryListDef[] = [DEFAULT_LIST];
      await AsyncStorage.setItem(LISTS_DEFS_KEY, JSON.stringify(seeded));
    }

    // Set active list
    const activeId = await AsyncStorage.getItem(ACTIVE_LIST_KEY);
    if (!activeId) {
      await AsyncStorage.setItem(ACTIVE_LIST_KEY, DEFAULT_LIST_ID);
    }

    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch {
    /* swallow — non-fatal */
  }
}

export async function getLists(): Promise<GroceryListDef[]> {
  await migrateLegacyIfNeeded();
  try {
    const raw = await AsyncStorage.getItem(LISTS_DEFS_KEY);
    if (!raw) return [DEFAULT_LIST];
    const parsed = JSON.parse(raw) as GroceryListDef[];
    return parsed.length > 0 ? parsed : [DEFAULT_LIST];
  } catch {
    return [DEFAULT_LIST];
  }
}

export async function saveLists(lists: GroceryListDef[]): Promise<void> {
  await AsyncStorage.setItem(LISTS_DEFS_KEY, JSON.stringify(lists));
}

export async function getActiveListId(): Promise<string> {
  await migrateLegacyIfNeeded();
  try {
    const id = await AsyncStorage.getItem(ACTIVE_LIST_KEY);
    return id || DEFAULT_LIST_ID;
  } catch {
    return DEFAULT_LIST_ID;
  }
}

export async function setActiveListId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_LIST_KEY, id);
}

export async function getActiveList(): Promise<GroceryListDef> {
  const [lists, activeId] = await Promise.all([getLists(), getActiveListId()]);
  return lists.find((l) => l.id === activeId) || lists[0] || DEFAULT_LIST;
}

export async function createList(
  partial: Omit<GroceryListDef, 'id' | 'createdAt'>
): Promise<GroceryListDef> {
  const lists = await getLists();
  const newList: GroceryListDef = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    ...partial,
    createdAt: Date.now(),
  };
  await saveLists([...lists, newList]);
  return newList;
}

export async function renameList(id: string, name: string): Promise<void> {
  const lists = await getLists();
  await saveLists(lists.map((l) => (l.id === id ? { ...l, name } : l)));
}

export async function updateList(
  id: string,
  patch: Partial<Pick<GroceryListDef, 'name' | 'icon' | 'color'>>
): Promise<void> {
  const lists = await getLists();
  await saveLists(lists.map((l) => (l.id === id ? { ...l, ...patch } : l)));
}

export async function deleteList(id: string): Promise<void> {
  if (id === DEFAULT_LIST_ID) return; // can't delete default
  const lists = await getLists();
  const remaining = lists.filter((l) => l.id !== id);
  await saveLists(remaining);
  await AsyncStorage.removeItem(itemKey(id));
  const activeId = await getActiveListId();
  if (activeId === id) await setActiveListId(DEFAULT_LIST_ID);
}

export async function getItemsForList(listId: string): Promise<GroceryItem[]> {
  await migrateLegacyIfNeeded();
  try {
    const raw = await AsyncStorage.getItem(itemKey(listId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveItemsForList(
  listId: string,
  items: GroceryItem[]
): Promise<void> {
  await AsyncStorage.setItem(itemKey(listId), JSON.stringify(items));
}

// ─── Back-compat wrappers ──────────────────────────────────────────────
// These keep older code paths (notification background task, services that
// read "the" grocery list) working by transparently fetching items from
// whichever list is currently active.

export async function getGroceryListActive(): Promise<GroceryItem[]> {
  const activeId = await getActiveListId();
  return getItemsForList(activeId);
}

export async function saveGroceryListActive(items: GroceryItem[]): Promise<void> {
  const activeId = await getActiveListId();
  await saveItemsForList(activeId, items);
}

export const DEFAULT_LIST_ID_VALUE = DEFAULT_LIST_ID;
