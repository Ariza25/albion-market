const axios = require('axios');

const RAW_ITEMS_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json';
const FORMATTED_ITEMS_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json';

const ITEM_GROUPS = [
  'weapon',
  'equipmentitem',
  'simpleitem',
  'consumableitem',
  'consumablefrominventoryitem',
  'mount',
  'furnitureitem',
  'farmableitem',
];

const RESOURCE_TYPES = new Set([
  'WOOD',
  'PLANKS',
  'ROCK',
  'STONEBLOCK',
  'ORE',
  'METALBAR',
  'HIDE',
  'LEATHER',
  'FIBER',
  'CLOTH',
]);

const REFINING_BONUS_BY_RESOURCE = {
  ORE: 'Thetford',
  METALBAR: 'Thetford',
  WOOD: 'Fort Sterling',
  PLANKS: 'Fort Sterling',
  FIBER: 'Lymhurst',
  CLOTH: 'Lymhurst',
  HIDE: 'Martlock',
  LEATHER: 'Martlock',
  ROCK: 'Bridgewatch',
  STONEBLOCK: 'Bridgewatch',
};

const CRAFTING_BONUS_BY_SUBCATEGORY = {
  bow: 'Lymhurst',
  crossbow: 'Bridgewatch',
  sword: 'Caerleon',
  axe: 'Bridgewatch',
  mace: 'Martlock',
  hammer: 'Fort Sterling',
  dagger: 'Caerleon',
  spear: 'Lymhurst',
  quarterstaff: 'Thetford',
  arcanestaff: 'Caerleon',
  cursedstaff: 'Thetford',
  firestaff: 'Thetford',
  froststaff: 'Fort Sterling',
  holystaff: 'Lymhurst',
  naturestaff: 'Lymhurst',
};

let rawItemsPromise = null;
let formattedItemsPromise = null;
let rawIndex = null;
let formattedIndex = null;

async function getRecipe(itemId, lang = 'PT-BR') {
  if (!itemId) return null;

  const requestedId = itemId.toUpperCase();
  const baseItemId = stripEnchantment(requestedId);
  const requestedEnchantment = getEnchantment(requestedId);
  const [itemsById, namesById] = await Promise.all([loadRawItems(), loadFormattedItems()]);
  const item = itemsById.get(baseItemId);

  if (!item || !item.craftingrequirements) return null;

  const requirement = selectPrimaryRequirement(item.craftingrequirements);
  const resources = asArray(requirement.craftresource);
  if (resources.length === 0) return null;

  const ingredients = resources.map((resource) => {
    const rawId = resource['@uniquename'];
    const requestedResourceEnchantment = getResourceEnchantment(resource, requestedEnchantment);
    const normalizedId = normalizeIngredientId(rawId, requestedResourceEnchantment);
    const returnable = Number(resource['@maxreturnamount'] ?? 1) !== 0;
    const resourceType = getResourceType(rawId);

    return {
      id: normalizedId,
      base_id: rawId,
      name: getDisplayName(normalizedId, namesById, lang),
      count: Number(resource['@count'] || 0),
      returnable,
      resource: resourceType,
      weight: Number(itemsById.get(stripEnchantment(rawId).toUpperCase())?.['@weight'] || 0),
      max_return_amount: resource['@maxreturnamount'] ? Number(resource['@maxreturnamount']) : null,
    };
  }).filter((ingredient) => ingredient.count > 0);

  const specialIngredients = ingredients.filter((ingredient) => isSpecialIngredient(ingredient.base_id));
  const fixedCostIngredients = ingredients.filter((ingredient) => !ingredient.returnable);
  const primaryResource = ingredients.find((ingredient) => ingredient.returnable)?.resource || null;
  const shopSubCategory = item['@shopsubcategory1'] || null;
  const inferredBonusCity = inferBonusCity(item, primaryResource, shopSubCategory);
  const recipeCompleteness = describeRecipeCompleteness({ item, requirement, ingredients, specialIngredients });

  return {
    item_id: requestedId,
    base_item_id: baseItemId,
    name: getDisplayName(requestedId, namesById, lang),
    label: getRecipeLabel(item, requestedId, namesById, lang),
    tier: Number(item['@tier'] || requestedId.match(/^T(\d+)/)?.[1] || 0),
    enchantment: requestedEnchantment,
    shop_category: item['@shopcategory'] || null,
    shop_sub_category: shopSubCategory,
    amount_crafted: Number(requirement['@amountcrafted'] || 1),
    crafting_focus: Number(requirement['@craftingfocus'] || 0),
    crafting_time: Number(requirement['@time'] || 0),
    weight: Number(item['@weight'] || 0),
    silver: Number(requirement['@silver'] || 0),
    bonus_city: inferredBonusCity,
    ingredients,
    special_ingredients: specialIngredients,
    fixed_cost_ingredients: fixedCostIngredients,
    recipe_family: inferRecipeFamily(item, requestedId, specialIngredients),
    special_cost_policy: recipeCompleteness.policy,
    completeness_notes: recipeCompleteness.notes,
    source: 'ao-bin-dumps/items.json',
    alternatives: asArray(item.craftingrequirements).length,
  };
}

async function loadRawItems() {
  if (rawIndex) return rawIndex;
  if (!rawItemsPromise) {
    rawItemsPromise = axios.get(RAW_ITEMS_URL, { timeout: 30000 }).then(({ data }) => {
      const index = new Map();
      for (const group of ITEM_GROUPS) {
        for (const item of asArray(data.items?.[group])) {
          const id = item['@uniquename'];
          if (id && !index.has(id)) index.set(id.toUpperCase(), item);
        }
      }
      rawIndex = index;
      return rawIndex;
    }).finally(() => {
      rawItemsPromise = null;
    });
  }
  return rawItemsPromise;
}

async function loadFormattedItems() {
  if (formattedIndex) return formattedIndex;
  if (!formattedItemsPromise) {
    formattedItemsPromise = axios.get(FORMATTED_ITEMS_URL, { timeout: 30000 }).then(({ data }) => {
      const index = new Map();
      for (const item of data || []) {
        if (item.UniqueName) index.set(item.UniqueName.toUpperCase(), item.LocalizedNames || {});
      }
      formattedIndex = index;
      return formattedIndex;
    }).finally(() => {
      formattedItemsPromise = null;
    });
  }
  return formattedItemsPromise;
}

function selectPrimaryRequirement(requirements) {
  const candidates = asArray(requirements);
  return candidates
    .slice()
    .sort((a, b) => requirementScore(b) - requirementScore(a))[0] || {};
}

function requirementScore(requirement) {
  const resources = asArray(requirement.craftresource);
  const specialScore = resources.some((resource) => isSpecialIngredient(resource['@uniquename'])) ? 1000 : 0;
  const fixedScore = resources.filter((resource) => Number(resource['@maxreturnamount'] ?? 1) === 0).length * 100;
  return specialScore + fixedScore + resources.length;
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stripEnchantment(itemId) {
  return itemId.replace(/@\d+$/, '').replace(/_LEVEL\d+$/, '');
}

function getEnchantment(itemId) {
  return Number(itemId.match(/@(\d+)$/)?.[1] || itemId.match(/_LEVEL(\d+)$/)?.[1] || 0);
}

function getResourceEnchantment(resource, requestedEnchantment) {
  const explicit = resource['@enchantmentlevel'];
  if (explicit !== undefined) return Number(explicit);
  return RESOURCE_TYPES.has(getResourceType(resource['@uniquename'])) ? requestedEnchantment : 0;
}

function normalizeIngredientId(rawId, enchantment) {
  if (!rawId || enchantment <= 0 || rawId.includes('_LEVEL') || rawId.includes('@')) return rawId;
  if (!RESOURCE_TYPES.has(getResourceType(rawId))) return rawId;
  return `${rawId}_LEVEL${enchantment}@${enchantment}`;
}

function getResourceType(itemId) {
  return String(itemId || '').replace(/^T\d+_/, '').split('_')[0];
}

function getDisplayName(itemId, namesById, lang) {
  const names = namesById.get(itemId.toUpperCase()) || namesById.get(stripEnchantment(itemId).toUpperCase());
  return names?.[lang] || names?.['PT-BR'] || names?.['EN-US'] || formatFallbackName(itemId);
}

function formatFallbackName(itemId) {
  return String(itemId || '')
    .replace(/^T(\d+)_/, 'T$1 ')
    .replace(/_LEVEL(\d+)@\d+$/, '.$1')
    .replace(/@\d+$/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRecipeLabel(item, itemId, namesById, lang) {
  const category = item['@shopcategory'] || 'craft';
  const subCategory = item['@shopsubcategory1'] || '';
  const displayName = getDisplayName(itemId, namesById, lang);
  return subCategory ? `${displayName} (${category}/${subCategory})` : `${displayName} (${category})`;
}

function inferBonusCity(item, primaryResource, shopSubCategory) {
  if (item['@shopcategory'] === 'crafting') {
    return REFINING_BONUS_BY_RESOURCE[primaryResource] || null;
  }
  return CRAFTING_BONUS_BY_SUBCATEGORY[shopSubCategory] || null;
}

function isSpecialIngredient(itemId) {
  return /(_ARTEFACT_|_TOKEN_|_ROYAL_|_RUNE|_SOUL|_RELIC|AVALON|CRYSTAL)/.test(String(itemId || ''));
}

function inferRecipeFamily(item, itemId, specialIngredients) {
  if (specialIngredients.length > 0) return 'artifact_or_special';
  if (item['@shopcategory'] === 'crafting') return 'refining';
  if (/JOURNAL|SKILLBOOK|TOKEN/.test(itemId)) return 'non_equipment_special';
  return item['@shopcategory'] || 'craft';
}

function describeRecipeCompleteness({ item, requirement, ingredients, specialIngredients }) {
  const notes = [];
  const fixed = ingredients.filter((ingredient) => !ingredient.returnable);
  if (specialIngredients.length > 0) {
    notes.push('Receita inclui ingrediente especial do dump bruto; ele entra como custo fixo sem RRR quando marcado sem retorno.');
  }
  if (fixed.length > 0) {
    notes.push('Itens com maxreturnamount=0 nao recebem retorno de recursos.');
  }
  if (asArray(item.craftingrequirements).length > 1) {
    notes.push('Item possui multiplas alternativas no dump; o backend escolhe a receita com maior prioridade para artefato/custo fixo.');
  }
  if (!requirement['@craftingfocus']) {
    notes.push('Dump nao informa foco base para esta receita; foco calculado fica zerado ate existir dado oficial no item.');
  }

  return {
    policy: specialIngredients.length > 0 ? 'dump_special_items_as_fixed_cost' : 'dump_resources_only',
    notes,
  };
}

module.exports = { getRecipe };
