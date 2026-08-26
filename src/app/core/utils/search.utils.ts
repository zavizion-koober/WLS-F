import { ProductFilterInput, ProductStatus } from 'src/generated/graphql';
import { ProductListItem } from '@store/products/products.models';

/**
 * Generates comprehensive case variations for a search query
 * including whitespace-collapsed variations (e.g. "bl ack" -> "black")
 * so that backends with case-sensitive filtering will match accurately.
 */
export function generateCaseVariations(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const variations = new Set<string>();

  const addCasingVariants = (term: string) => {
    if (!term || term.length < 2) return;
    const lower = term.toLowerCase();
    const upper = term.toUpperCase();
    const capitalized = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();

    variations.add(term);
    variations.add(lower);
    variations.add(upper);
    variations.add(capitalized);
  };

  // 1. Original trimmed phrase
  addCasingVariants(trimmed);

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const titleCase = words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    variations.add(titleCase);

    // 2. Whitespace-collapsed variant (e.g., "bl ack" -> "black", "can dle" -> "candle")
    const noSpaces = trimmed.replace(/\s+/g, '');
    if (noSpaces.length >= 2) {
      addCasingVariants(noSpaces);
    }

    // 3. Individual word tokens
    for (const word of words) {
      if (word.length >= 2) {
        addCasingVariants(word);
      }
    }
  }

  return Array.from(variations).filter((v) => v.length > 0);
}

/**
 * Builds a robust, case-insensitive GraphQL ProductFilterInput
 */
export function buildProductSearchFilter(query: string): ProductFilterInput {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      status: { eq: ProductStatus.Published },
      isDeleted: { eq: false },
    };
  }

  const variations = generateCaseVariations(trimmed);

  return {
    status: { eq: ProductStatus.Published },
    isDeleted: { eq: false },
    translations: {
      some: {
        or: [
          {
            name: {
              or: variations.map((v) => ({ contains: v })),
            },
          },
          {
            shortDescription: {
              or: variations.map((v) => ({ contains: v })),
            },
          },
        ],
      },
    },
  };
}

/**
 * Client-side ranker to ensure best matches (exact, whitespace-collapsed, & case-insensitive prefix)
 * appear first in search results.
 */
export function rankSearchResults(items: ProductListItem[], query: string): ProductListItem[] {
  const q = query.trim().toLowerCase();
  if (!q || items.length === 0) return items;

  const noSpaces = q.replace(/\s+/g, '');

  return [...items].sort((a, b) => {
    const aName = a.translations?.[0]?.name?.toLowerCase() || '';
    const bName = b.translations?.[0]?.name?.toLowerCase() || '';

    const aNameNoSpaces = aName.replace(/\s+/g, '');
    const bNameNoSpaces = bName.replace(/\s+/g, '');

    // 1. Exact title match (original or whitespace-collapsed)
    const aExact = aName === q || (noSpaces.length >= 2 && aNameNoSpaces === noSpaces) ? 100 : 0;
    const bExact = bName === q || (noSpaces.length >= 2 && bNameNoSpaces === noSpaces) ? 100 : 0;
    if (aExact !== bExact) return bExact - aExact;

    // 2. Title starts with query
    const aStartsWith =
      aName.startsWith(q) || (noSpaces.length >= 2 && aNameNoSpaces.startsWith(noSpaces)) ? 50 : 0;
    const bStartsWith =
      bName.startsWith(q) || (noSpaces.length >= 2 && bNameNoSpaces.startsWith(noSpaces)) ? 50 : 0;
    if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;

    // 3. Title contains query
    const aContains =
      aName.includes(q) || (noSpaces.length >= 2 && aNameNoSpaces.includes(noSpaces)) ? 25 : 0;
    const bContains =
      bName.includes(q) || (noSpaces.length >= 2 && bNameNoSpaces.includes(noSpaces)) ? 25 : 0;
    if (aContains !== bContains) return bContains - aContains;

    return 0;
  });
}
