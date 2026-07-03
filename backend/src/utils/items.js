const axios = require('axios');

// Lazy-loaded items list from the AODP GitHub repo
let itemsCache = null;
let loadPromise = null;

const ITEMS_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json';

/**
 * Load items from remote source (once).
 * Falls back to empty array on failure.
 */
async function loadItems() {
  if (itemsCache) return itemsCache;
  if (loadPromise) return loadPromise;

  loadPromise = axios
    .get(ITEMS_URL, { timeout: 20000 })
    .then(({ data }) => {
      // data is an array of { UniqueName, LocalizedNames, ... }
      itemsCache = data;
      console.log(`[Items] Loaded ${data.length} items from AODP.`);
      return itemsCache;
    })
    .catch((err) => {
      console.error('[Items] Failed to load items list:', err.message);
      itemsCache = [];
      return itemsCache;
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

/**
 * Search items by display name or unique ID.
 *
 * @param {string}  query    - Search term (case-insensitive)
 * @param {string}  [lang]   - Language code (e.g. 'EN-US', 'PT-BR')
 * @param {number}  [limit]  - Max results (default 20)
 * @returns {Promise<object[]>}
 */
async function searchItems(query, lang = 'EN-US', limit = 20) {
  const items = await loadItems();
  if (!query || items.length === 0) return [];

  const q = query.toLowerCase();
  const langUpper = lang.toUpperCase();

  const results = [];
  for (const item of items) {
    if (results.length >= limit) break;

    // Match by unique name (ID)
    if (item.UniqueName && item.UniqueName.toLowerCase().includes(q)) {
      results.push(formatItem(item, langUpper));
      continue;
    }

    // Match by localized name
    const localizedNames = item.LocalizedNames || {};
    const localName = localizedNames[langUpper] || localizedNames['EN-US'] || '';
    if (localName.toLowerCase().includes(q)) {
      results.push(formatItem(item, langUpper));
    }
  }

  return results;
}

/**
 * Get a specific item by its unique ID.
 */
async function getItemById(uniqueName) {
  const items = await loadItems();
  const item = items.find(
    (i) => i.UniqueName && i.UniqueName.toLowerCase() === uniqueName.toLowerCase()
  );
  return item ? formatItem(item, 'EN-US') : null;
}

function formatItem(item, lang) {
  const localizedNames = item.LocalizedNames || {};
  return {
    id: item.UniqueName,
    name: localizedNames[lang] || localizedNames['EN-US'] || item.UniqueName,
    name_pt: localizedNames['PT-BR'] || null,
    name_en: localizedNames['EN-US'] || null,
    shop_category: item.ShopCategory || null,
    shop_sub_category: item.ShopSubCategory1 || null,
    tier: item.Tier || null,
    enchantment: item.Enchantment || null,
  };
}

// Pre-warm the items list on module load (non-blocking)
loadItems().catch(() => {});

module.exports = { searchItems, getItemById, loadItems };
