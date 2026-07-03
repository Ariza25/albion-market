const RESOURCE_NAMES = {
  METALBAR: 'Barra de metal',
  LEATHER: 'Couro trabalhado',
  CLOTH: 'Tecido',
  PLANKS: 'Tabua de madeira',
  STONEBLOCK: 'Bloco de pedra',
};

const ARTIFACT_SUFFIXES = [
  'HERETIC',
  'UNDEAD',
  'KEEPER',
  'MORGANA',
  'HELL',
  'AVALON',
  'ROYAL',
  'FEY',
  'CRYSTAL',
];

const RECIPE_RULES = [
  { key: 'BAG', label: 'Bolsa', ingredients: [['LEATHER', 8], ['CLOTH', 8]] },
  { key: 'CAPE', label: 'Capa', ingredients: [['CLOTH', 4], ['LEATHER', 4]] },

  { key: 'ARMOR_PLATE', label: 'Armadura de placa', ingredients: [['METALBAR', 16]] },
  { key: 'HEAD_PLATE', label: 'Capacete de placa', ingredients: [['METALBAR', 8]] },
  { key: 'SHOES_PLATE', label: 'Botas de placa', ingredients: [['METALBAR', 8]] },

  { key: 'ARMOR_LEATHER', label: 'Armadura de couro', ingredients: [['LEATHER', 16]] },
  { key: 'HEAD_LEATHER', label: 'Capuz de couro', ingredients: [['LEATHER', 8]] },
  { key: 'SHOES_LEATHER', label: 'Sapatos de couro', ingredients: [['LEATHER', 8]] },

  { key: 'ARMOR_CLOTH', label: 'Robe de tecido', ingredients: [['CLOTH', 16]] },
  { key: 'HEAD_CLOTH', label: 'Capuz de tecido', ingredients: [['CLOTH', 8]] },
  { key: 'SHOES_CLOTH', label: 'Sandalias de tecido', ingredients: [['CLOTH', 8]] },

  { key: 'SHIELD', label: 'Escudo', ingredients: [['PLANKS', 4], ['METALBAR', 4]] },
  { key: 'OFF_BOOK', label: 'Livro', ingredients: [['CLOTH', 4], ['PLANKS', 4]] },
  { key: 'OFF_TORCH', label: 'Tocha', ingredients: [['PLANKS', 4], ['CLOTH', 4]] },
  { key: 'OFF_HORN', label: 'Chifre', ingredients: [['LEATHER', 4], ['METALBAR', 4]] },
  { key: 'OFF_TOTEM', label: 'Totem', ingredients: [['PLANKS', 4], ['LEATHER', 4]] },

  { key: '2H_BOW', label: 'Arco', ingredients: [['PLANKS', 32]] },
  { key: '2H_CROSSBOW', label: 'Besta', ingredients: [['PLANKS', 20], ['METALBAR', 12]] },
  { key: '2H_FIRESTAFF', label: 'Cajado de fogo 2M', ingredients: [['PLANKS', 20], ['CLOTH', 12]] },
  { key: '2H_HOLYSTAFF', label: 'Cajado sagrado 2M', ingredients: [['PLANKS', 20], ['CLOTH', 12]] },
  { key: '2H_NATURESTAFF', label: 'Cajado natural 2M', ingredients: [['PLANKS', 20], ['CLOTH', 12]] },
  { key: '2H_ARCANESTAFF', label: 'Cajado arcano 2M', ingredients: [['PLANKS', 20], ['CLOTH', 12]] },
  { key: '2H_FROSTSTAFF', label: 'Cajado de gelo 2M', ingredients: [['PLANKS', 20], ['CLOTH', 12]] },
  { key: '2H_CURSEDSTAFF', label: 'Cajado amaldicoado 2M', ingredients: [['PLANKS', 20], ['CLOTH', 12]] },

  { key: '2H', label: 'Arma de duas maos', ingredients: [['METALBAR', 20], ['LEATHER', 12]] },
  { key: 'MAIN_FIRESTAFF', label: 'Cajado de fogo', ingredients: [['PLANKS', 12], ['CLOTH', 8]] },
  { key: 'MAIN_HOLYSTAFF', label: 'Cajado sagrado', ingredients: [['PLANKS', 12], ['CLOTH', 8]] },
  { key: 'MAIN_NATURESTAFF', label: 'Cajado natural', ingredients: [['PLANKS', 12], ['CLOTH', 8]] },
  { key: 'MAIN_ARCANESTAFF', label: 'Cajado arcano', ingredients: [['PLANKS', 12], ['CLOTH', 8]] },
  { key: 'MAIN_FROSTSTAFF', label: 'Cajado de gelo', ingredients: [['PLANKS', 12], ['CLOTH', 8]] },
  { key: 'MAIN_CURSEDSTAFF', label: 'Cajado amaldicoado', ingredients: [['PLANKS', 12], ['CLOTH', 8]] },
  { key: 'MAIN_BOW', label: 'Arco de uma mao', ingredients: [['PLANKS', 16], ['LEATHER', 8]] },
  { key: 'MAIN_CROSSBOW', label: 'Besta de uma mao', ingredients: [['PLANKS', 12], ['METALBAR', 8]] },
  { key: 'MAIN_DAGGER', label: 'Adaga', ingredients: [['METALBAR', 12], ['LEATHER', 8]] },
  { key: 'MAIN', label: 'Arma de uma mao', ingredients: [['METALBAR', 12], ['LEATHER', 8]] },
];

export function getRecipe(itemId) {
  if (!itemId) return null;

  const upper = itemId.toUpperCase();
  const tier = upper.match(/^T\d+/)?.[0];
  if (!tier) return null;

  const enchantment = Number(upper.match(/@(\d+)$/)?.[1] || 0);
  const cleanName = upper.replace(/^T\d+_/, '').replace(/@\d+$/, '');
  const rule = RECIPE_RULES.find((entry) => cleanName.includes(entry.key));

  if (!rule) return null;

  const ingredients = rule.ingredients.map(([resource, count]) => {
    const id = buildResourceId(tier, resource, enchantment);
    return {
      id,
      resource,
      name: formatResourceName(id, resource),
      count,
      returnable: true,
    };
  });

  const artifact = getArtifactIngredient(tier, cleanName);
  if (artifact) ingredients.push(artifact);

  return {
    label: rule.label,
    hasArtifact: Boolean(artifact),
    ingredients,
  };
}

function buildResourceId(tier, resource, enchantment) {
  const baseId = `${tier}_${resource}`;
  return enchantment > 0 ? `${baseId}@${enchantment}` : baseId;
}

function formatResourceName(resourceId, resource) {
  const tier = resourceId.match(/^T\d+/)?.[0] || '';
  const enchantment = resourceId.includes('@') ? `.${resourceId.split('@')[1]}` : '';
  return `${tier} ${RESOURCE_NAMES[resource] || resource}${enchantment}`;
}

function getArtifactIngredient(tier, cleanName) {
  const suffix = ARTIFACT_SUFFIXES.find((entry) => cleanName.endsWith(`_${entry}`));
  if (!suffix) return null;

  const id = `${tier}_ARTEFACT_${cleanName}`;
  return {
    id,
    resource: 'ARTEFACT',
    name: formatArtifactName(id, suffix),
    count: 1,
    returnable: false,
  };
}

function formatArtifactName(artifactId, suffix) {
  const tier = artifactId.match(/^T\d+/)?.[0] || '';
  const familyNames = {
    HERETIC: 'Artefato Herege',
    UNDEAD: 'Artefato Morto-vivo',
    KEEPER: 'Artefato Guardiao',
    MORGANA: 'Artefato Morgana',
    HELL: 'Artefato Infernal',
    AVALON: 'Artefato Avaloniano',
    ROYAL: 'Artefato Real',
    FEY: 'Artefato Feerico',
    CRYSTAL: 'Artefato Cristalino',
  };

  return `${tier} ${familyNames[suffix] || 'Artefato'}`;
}
