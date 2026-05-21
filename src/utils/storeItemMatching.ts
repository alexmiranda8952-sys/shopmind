import { GroceryItem, ItemCategory, NearbyStore } from '../types';

const ALL: ItemCategory[] = [
  'produce', 'meat_seafood', 'dairy_eggs', 'bakery', 'pantry',
  'beverages', 'snacks', 'frozen', 'household', 'health', 'baby', 'alcohol',
];

// Known store chains → what categories they carry
const CHAIN_MAP: { keywords: string[]; categories: ItemCategory[] }[] = [
  // Full grocery / big box → everything
  {
    keywords: ['walmart', 'target', 'costco', "sam's club", 'bj\'s', 'meijer', 'super kmart'],
    categories: ALL,
  },
  {
    keywords: [
      'whole foods', 'trader joe', 'sprouts', 'fresh market', 'earth fare',
      'natural grocers', 'wegmans', 'publix', 'kroger', 'safeway', 'albertsons',
      'vons', 'ralphs', 'food lion', 'giant', 'stop & shop', 'hy-vee',
      "harris teeter", 'winn-dixie', 'piggly wiggly', 'aldi', 'lidl',
      'h-e-b', 'heb', 'market basket', 'winco', 'stater bros', 'meijer',
      'price chopper', 'shoprite', 'acme', 'shaw\'s', 'hannaford',
      'food city', 'ingles', 'bi-lo', 'save mart', 'lucky', 'save a lot',
    ],
    categories: ALL,
  },
  // Pharmacy / drug stores
  {
    keywords: ['cvs', 'walgreens', 'rite aid', 'duane reade', 'bartell'],
    categories: ['health', 'baby', 'household', 'beverages', 'snacks', 'pantry'],
  },
  // Convenience
  {
    keywords: ['7-eleven', '7 eleven', 'circle k', 'speedway', 'wawa', 'sheetz',
               'casey\'s', 'kwik trip', 'racetrac', 'pilot', 'flying j', 'quiktrip'],
    categories: ['beverages', 'snacks', 'pantry', 'health'],
  },
  // Dollar stores
  {
    keywords: ['dollar general', 'dollar tree', 'family dollar', 'five below'],
    categories: ['pantry', 'household', 'health', 'snacks', 'beverages', 'baby'],
  },
  // Bakeries
  {
    keywords: ['panera', 'bakery', 'boulangerie', 'great harvest'],
    categories: ['bakery', 'beverages'],
  },
  // Butchers / meat
  {
    keywords: ['butcher', 'meat market', 'fish market', 'seafood'],
    categories: ['meat_seafood'],
  },
  // Liquor
  {
    keywords: ['total wine', 'abc fine wine', 'binny\'s', 'bevmo', 'liquor', 'wine & spirits'],
    categories: ['alcohol', 'beverages', 'snacks'],
  },
];

// Google Places types → categories (fallback when chain name not recognized)
const PLACE_TYPE_MAP: Record<string, ItemCategory[]> = {
  supermarket: ALL,
  grocery_or_supermarket: ALL,
  department_store: ALL,
  convenience_store: ['beverages', 'snacks', 'pantry', 'health'],
  pharmacy: ['health', 'baby', 'household', 'beverages', 'snacks'],
  drugstore: ['health', 'baby', 'household', 'beverages', 'snacks'],
  bakery: ['bakery', 'beverages'],
  liquor_store: ['alcohol', 'beverages'],
  meal_delivery: [],
  restaurant: [],
};

export function getStoreIcon(store: NearbyStore): string {
  const n = store.name.toLowerCase();
  const types = store.types || [];

  if (['costco', "sam's club", "bj's"].some((kw) => n.includes(kw))) return '📦';
  if (['walmart', 'target', 'meijer', 'super kmart'].some((kw) => n.includes(kw))) return '🏬';
  if (['whole foods', 'trader joe', 'sprouts', 'fresh market', 'earth fare', 'natural grocers'].some((kw) => n.includes(kw))) return '🌿';
  if (['cvs', 'walgreens', 'rite aid', 'duane reade', 'bartell'].some((kw) => n.includes(kw))) return '💊';
  if (['7-eleven', '7 eleven', 'circle k', 'speedway', 'wawa', 'sheetz', "casey's", 'kwik trip', 'racetrac', 'pilot', 'flying j', 'quiktrip'].some((kw) => n.includes(kw))) return '⛽';
  if (['dollar general', 'dollar tree', 'family dollar', 'five below'].some((kw) => n.includes(kw))) return '💰';
  if (['panera', 'bakery', 'boulangerie', 'great harvest'].some((kw) => n.includes(kw))) return '🥐';
  if (['butcher', 'meat market', 'fish market', 'seafood'].some((kw) => n.includes(kw))) return '🥩';
  if (['total wine', 'abc fine wine', "binny's", 'bevmo', 'liquor', 'wine & spirits'].some((kw) => n.includes(kw))) return '🍷';

  // Fallback to Google Places types
  if (types.includes('pharmacy') || types.includes('drugstore')) return '💊';
  if (types.includes('convenience_store')) return '⛽';
  if (types.includes('bakery')) return '🥐';
  if (types.includes('liquor_store')) return '🍷';

  return '🛒';
}

export function getStoreCategories(store: NearbyStore): ItemCategory[] {
  const nameLower = store.name.toLowerCase();

  // Check known chains by name first (most precise)
  for (const { keywords, categories } of CHAIN_MAP) {
    if (keywords.some((kw) => nameLower.includes(kw))) {
      return categories;
    }
  }

  // Fall back to Google Places types
  for (const type of (store.types || [])) {
    if (PLACE_TYPE_MAP[type]) {
      return PLACE_TYPE_MAP[type];
    }
  }

  // Unknown store: assume it's a general grocery store
  return ALL;
}

export function getMatchingItems(
  uncheckedItems: GroceryItem[],
  store: NearbyStore
): GroceryItem[] {
  const storeCategories = getStoreCategories(store);
  if (storeCategories.length === 0) return [];
  return uncheckedItems.filter((item) => {
    const cat = getItemCategory(item.name);
    return storeCategories.includes(cat);
  });
}

export function buildNotificationBody(
  matchingItems: GroceryItem[],
  totalUnchecked: number
): string {
  if (matchingItems.length === 0) return '';
  const preview = matchingItems
    .slice(0, 3)
    .map((i) => i.name)
    .join(', ');
  const extra = matchingItems.length > 3 ? ` +${matchingItems.length - 3} more` : '';
  return `Pick up: ${preview}${extra}`;
}

// Item name → category (mirrors itemIcons logic but returns category instead of emoji)
export function getItemCategory(name: string): ItemCategory {
  const n = name.toLowerCase();

  if (/\bmilk\b|\bbutter\b|\bcheese\b|\byogurt\b|\bcream\b|\begg/.test(n)) return 'dairy_eggs';
  if (/\bbread\b|\bbagel\b|\bmuffin\b|\bcroissant\b|\broll\b|\bbun\b|\bpita\b|\btortilla\b|\bdonut\b|\bcake\b|\bpastry\b|\bscone\b/.test(n)) return 'bakery';
  if (/\bchicken\b|\bbeef\b|\bpork\b|\bsteak\b|\bsalmon\b|\bfish\b|\btuna\b|\bshrimp\b|\bseafood\b|\bbacon\b|\bsausage\b|\bham\b|\bturkey\b|\blamb\b|\bveal\b/.test(n)) return 'meat_seafood';
  if (/\bapple\b|\bbanana\b|\borange\b|\bstrawberr|\bgrape\b|\blemon\b|\blime\b|\bmelon\b|\bpeach\b|\bplum\b|\bberr|\bfruit\b|\btomato\b|\bonion\b|\bgarlic\b|\bpotato\b|\bcarrot\b|\bbroccoli\b|\blettuce\b|\bspinach\b|\bkale\b|\bcorn\b|\bpepper\b|\bcucumber\b|\bmushroom\b|\bavocado\b|\bvegetable\b|\bveggie\b|\bproduce\b/.test(n)) return 'produce';
  if (/\bbeer\b|\bwine\b|\bvodka\b|\bwhiskey\b|\bgin\b|\brum\b|\bspirits\b|\bale\b|\blager\b|\bbourbon\b|\btequila\b/.test(n)) return 'alcohol';
  if (/\bcoffee\b|\btea\b|\bjuice\b|\bwater\b|\bsoda\b|\bcola\b|\bdrink\b|\bbeverage\b|\benergy\b|\bgatorade\b|\bpowerade\b/.test(n)) return 'beverages';
  if (/\bchip\b|\bcrisp\b|\bpopcorn\b|\bpretzel\b|\bnut\b|\bcracker\b|\bcookie\b|\bcandy\b|\bchocolate\b|\bgummy\b|\bsnack\b/.test(n)) return 'snacks';
  if (/\bfrozen\b|\bice cream\b|\bgelato\b|\bpizza\b/.test(n)) return 'frozen';
  if (/\bsoap\b|\bdetergent\b|\blaundry\b|\bpaper towel\b|\btoilet paper\b|\bbleach\b|\bcleaner\b|\bsponge\b|\btrash\b|\bfoil\b|\bziploc\b/.test(n)) return 'household';
  if (/\bdiaper\b|\bbaby\b|\bformula\b|\bnappy\b|\bwipes\b/.test(n)) return 'baby';
  if (/\bvitamin\b|\bsupplement\b|\bmedicine\b|\bmedication\b|\bibuprofen\b|\btylenol\b|\badvil\b|\bbandage\b|\bfirst aid\b|\bsunscreen\b|\bshampoo\b|\btoothpaste\b|\bdeodorant\b/.test(n)) return 'health';

  // Default: treat unknown items as pantry
  return 'pantry';
}
