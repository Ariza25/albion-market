// @ts-nocheck
export const MARKET_TAXES = [
  { key: 'premium', label: 'Premium 4%', rate: 0.04 },
  { key: 'standard', label: 'Sem premium 8%', rate: 0.08 },
];

export const QUALITY_CHANCES = [
  { quality: 1, key: 'q1', label: 'Normal', defaultChance: 70 },
  { quality: 2, key: 'q2', label: 'Good', defaultChance: 20 },
  { quality: 3, key: 'q3', label: 'Outstanding', defaultChance: 7 },
  { quality: 4, key: 'q4', label: 'Excellent', defaultChance: 2.5 },
  { quality: 5, key: 'q5', label: 'Masterpiece', defaultChance: 0.5 },
];

export const QUALITY_PRESETS = {
  base: { label: 'Base', chances: { q1: 70, q2: 20, q3: 7, q4: 2.5, q5: 0.5 }, qualityBonus: 0 },
  salad: { label: 'Salada', chances: { q1: 58, q2: 26, q3: 11, q4: 4, q5: 1 }, qualityBonus: 33 },
  highSpec: { label: 'Spec alta', chances: { q1: 48, q2: 30, q3: 14, q4: 6, q5: 2 }, qualityBonus: 60 },
  highSpecFood: { label: 'Spec alta + comida', chances: { q1: 38, q2: 32, q3: 18, q4: 9, q5: 3 }, qualityBonus: 95 },
};

export const CRAFTING_CALIBRATION_CASES = [
  {
    key: 'royal-no-bonus-no-focus',
    label: 'Cidade real sem bonus e sem foco',
    type: 'rrr',
    input: { craftCity: 'Martlock', bonusCity: 'Lymhurst', useFocus: false, useHideout: false },
    expected: 0.152,
    tolerance: 0.001,
  },
  {
    key: 'royal-bonus-no-focus',
    label: 'Cidade com bonus local sem foco',
    type: 'rrr',
    input: { craftCity: 'Lymhurst', bonusCity: 'Lymhurst', useFocus: false, useHideout: false },
    expected: 0.248,
    tolerance: 0.001,
  },
  {
    key: 'royal-no-bonus-focus',
    label: 'Cidade real sem bonus com foco',
    type: 'rrr',
    input: { craftCity: 'Martlock', bonusCity: 'Lymhurst', useFocus: true, useHideout: false },
    expected: 0.435,
    tolerance: 0.001,
  },
  {
    key: 'royal-bonus-focus',
    label: 'Cidade com bonus local e foco',
    type: 'rrr',
    input: { craftCity: 'Lymhurst', bonusCity: 'Lymhurst', useFocus: true, useHideout: false },
    expected: 0.479,
    tolerance: 0.001,
  },
  {
    key: 'focus-zero-spec',
    label: 'Foco base sem spec',
    type: 'focus',
    input: { baseFocus: 1000, masteryLevel: 0, specLevel: 0 },
    expected: 1000,
    tolerance: 1,
  },
];

const CITY_RRR = {
  base: { noFocus: 0.152, focus: 0.435 },
  bonus: { noFocus: 0.248, focus: 0.479 },
};

const HIDEOUT_RRR_BY_POWER = [
  { power: 0, noFocus: 0.25, focus: 0.50 },
  { power: 1, noFocus: 0.26, focus: 0.51 },
  { power: 2, noFocus: 0.27, focus: 0.52 },
  { power: 3, noFocus: 0.28, focus: 0.53 },
  { power: 4, noFocus: 0.29, focus: 0.54 },
  { power: 5, noFocus: 0.30, focus: 0.55 },
  { power: 6, noFocus: 0.31, focus: 0.56 },
  { power: 7, noFocus: 0.32, focus: 0.57 },
  { power: 8, noFocus: 0.33, focus: 0.58 },
  { power: 9, noFocus: 0.34, focus: 0.59 },
  { power: 10, noFocus: 0.35, focus: 0.60 },
];

export function calculateAlbionRrr({ craftCity, bonusCity, useFocus, useHideout, dailyBonus = 0, hideoutPower = 0, consumableRrr = 0 }) {
  const profile = useHideout
    ? hideoutProfile(hideoutPower)
    : CITY_RRR[bonusCity && craftCity === bonusCity ? 'bonus' : 'base'];
  const baseRrr = useFocus ? profile.focus : profile.noFocus;
  return clamp(baseRrr + Number(dailyBonus || 0) / 100 + Number(consumableRrr || 0) / 100, 0, 0.8);
}

export function calculateAlbionFocusCost(baseFocus, masteryLevel, specLevel) {
  const masteryReduction = Math.min(0.2, Number(masteryLevel || 0) * 0.001);
  const specReduction = Math.min(0.5, Number(specLevel || 0) * 0.004);
  return Math.max(0, Math.round(Number(baseFocus || 0) * (1 - masteryReduction) * (1 - specReduction)));
}

export function validateCraftingModel() {
  return CRAFTING_CALIBRATION_CASES.map((test) => {
    const actual = test.type === 'rrr'
      ? calculateAlbionRrr(test.input)
      : calculateAlbionFocusCost(test.input.baseFocus, test.input.masteryLevel, test.input.specLevel);
    const delta = actual - test.expected;
    return {
      ...test,
      actual,
      delta,
      passed: Math.abs(delta) <= test.tolerance,
    };
  });
}

export function qualityPresetChances(presetKey) {
  return QUALITY_PRESETS[presetKey]?.chances || QUALITY_PRESETS.base.chances;
}

export function normalizeQualityChances(chances) {
  const total = QUALITY_CHANCES.reduce((sum, row) => sum + Number(chances[row.key] || 0), 0) || 1;
  return QUALITY_CHANCES.reduce((acc, row) => ({ ...acc, [row.key]: (Number(chances[row.key] || 0) / total) * 100 }), {});
}

export function estimateRerollRounds(chances, minQualityTarget) {
  const normalized = normalizeQualityChances(chances);
  const hitChance = QUALITY_CHANCES
    .filter((quality) => quality.quality >= Number(minQualityTarget || 4))
    .reduce((total, quality) => total + Number(normalized[quality.key] || 0), 0);
  return {
    targetChance: hitChance,
    estimatedRerollRounds: hitChance > 0 ? Math.max(0, Math.ceil(100 / hitChance) - 1) : 0,
  };
}

function hideoutProfile(power) {
  const normalizedPower = Math.max(0, Math.min(10, Math.round(Number(power || 0))));
  return HIDEOUT_RRR_BY_POWER.find((entry) => entry.power === normalizedPower) || HIDEOUT_RRR_BY_POWER[0];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
