import { LightCategoryColors, CategoryStyle } from '../theme';
import { ItemCategory } from '../types';
import { getItemCategory } from './storeItemMatching';

/**
 * Returns the category KEY for a given item name. Use with the theme's
 * CategoryColors to get the appropriate visual style for the current theme.
 */
export function getCategoryKey(name: string): ItemCategory {
  return getItemCategory(name);
}

/**
 * Legacy helper — returns the LIGHT-mode style. Prefer getCategoryKey + theme lookup
 * for proper dark-mode support.
 */
export function getCategoryStyle(name: string): CategoryStyle {
  const cat = getItemCategory(name);
  return LightCategoryColors[cat] || LightCategoryColors.pantry;
}

export function getCategoryStyleFor(cat: ItemCategory): CategoryStyle {
  return LightCategoryColors[cat] || LightCategoryColors.pantry;
}
