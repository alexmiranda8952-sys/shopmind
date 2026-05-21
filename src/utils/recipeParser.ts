export interface ParsedItem {
  name: string;
  quantity: string;
}

// Common quantity-leading patterns at the start of a line:
//   "2 cups flour"        → qty "2 cups", name "flour"
//   "1 1/2 lbs chicken"   → qty "1 1/2 lbs", name "chicken"
//   "1/2 cup sugar"       → qty "1/2 cup", name "sugar"
//   "3 large eggs"        → qty "3 large", name "eggs"
//   "- 2 onions, chopped" → qty "2", name "onions" (strip preparations)
//   "* 1 can tomatoes"    → qty "1 can", name "tomatoes"
const QTY_PATTERN = /^([\d¼½¾⅓⅔⅛⅜⅝⅞]+(?:[\s\/][\d¼½¾⅓⅔⅛⅜⅝⅞]+)?(?:\.\d+)?)\s*([a-zA-Z]+)?/;

const UNIT_WORDS = new Set([
  'cup', 'cups', 'tsp', 'tbsp', 'teaspoon', 'teaspoons', 'tablespoon', 'tablespoons',
  'oz', 'ounce', 'ounces', 'fl', 'lb', 'lbs', 'pound', 'pounds', 'g', 'kg', 'gram', 'grams',
  'ml', 'l', 'liter', 'liters', 'litre', 'litres', 'pint', 'pints', 'quart', 'quarts',
  'gallon', 'gallons', 'can', 'cans', 'jar', 'jars', 'bottle', 'bottles', 'box', 'boxes',
  'bag', 'bags', 'package', 'packages', 'pkg', 'pinch', 'dash', 'clove', 'cloves',
  'head', 'heads', 'bunch', 'bunches', 'piece', 'pieces', 'slice', 'slices',
  'sprig', 'sprigs', 'stalk', 'stalks', 'large', 'medium', 'small',
]);

// Stuff to strip when it appears (prep instructions, optional markers, etc.)
const STRIP_PATTERNS = [
  /,\s*(?:chopped|sliced|diced|minced|grated|crushed|peeled|cubed|shredded|melted|softened|drained|rinsed|finely\s+\w+|roughly\s+\w+|optional|to\s+taste).*$/i,
  /\s*\(.*?\)\s*/g,           // parenthetical notes
  /\s+for\s+(?:garnish|serving|topping).*$/i,
  /\s*(?:or\s+to\s+taste|to\s+taste)\s*$/i,
];

function cleanLine(raw: string): string {
  let line = raw.trim();
  // Strip leading list markers
  line = line.replace(/^[-•*▪▫◦‣⁃]\s*/, '');
  line = line.replace(/^\d+[.)]\s*/, '');  // numbered lists "1." or "1)"
  // Strip checkbox markers
  line = line.replace(/^\[[ x]\]\s*/i, '');
  return line.trim();
}

function looksLikeIngredient(line: string): boolean {
  if (!line) return false;
  if (line.length < 2) return false;
  if (line.length > 120) return false;
  // Skip lines that look like section headers (ALL CAPS, ends with colon)
  if (/^[A-Z\s]{3,}:?\s*$/.test(line)) return false;
  // Skip lines that look like instructions (start with capital verb followed by ".")
  if (/^(?:Step|Instructions?|Directions?|Method|Notes?|Tips?|Preparation):/i.test(line)) return false;
  // Skip very long sentence-like lines (likely an instruction)
  if (line.split(/\s+/).length > 12 && !line.includes(',')) return false;
  return true;
}

/**
 * Parses a multi-line block of pasted recipe ingredients into structured items.
 * Tolerant of many common formats — bulleted, numbered, plain lines, prep
 * instructions, parenthetical notes, fractional and unicode-fraction quantities.
 */
export function parseRecipeText(input: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const seenNames = new Set<string>();

  const lines = input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(cleanLine)
    .filter(looksLikeIngredient);

  for (let line of lines) {
    // Strip prep instructions and parentheticals
    for (const pattern of STRIP_PATTERNS) {
      line = line.replace(pattern, '');
    }
    line = line.trim().replace(/[.,;]\s*$/, '');
    if (!line) continue;

    // Try to extract a leading quantity (number + optional unit word)
    let quantity = '';
    let name = line;

    const qtyMatch = line.match(QTY_PATTERN);
    if (qtyMatch) {
      const number = qtyMatch[1];
      const maybeUnit = (qtyMatch[2] || '').toLowerCase();

      if (UNIT_WORDS.has(maybeUnit)) {
        quantity = `${number} ${qtyMatch[2]}`;
        name = line.slice(qtyMatch[0].length).trim();
      } else if (qtyMatch[2]) {
        // Number followed by a word that isn't a unit — only take the number
        quantity = number;
        name = line.slice(number.length).trim();
      } else {
        quantity = number;
        name = line.slice(number.length).trim();
      }
    }

    // "of" prefix is common: "1 cup of flour" → "flour"
    name = name.replace(/^of\s+/i, '').trim();

    // Title-case the first letter
    if (name) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    if (!name || name.length < 2) continue;
    const dedupKey = name.toLowerCase();
    if (seenNames.has(dedupKey)) continue;
    seenNames.add(dedupKey);

    items.push({ name, quantity });
  }

  return items;
}
