import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Coins, Copy, Hammer, RefreshCw } from 'lucide-react';
import { getCraftRecipe, getHistory, getMultiPrices, getPrices } from '../services/api';
import {
  MARKET_TAXES,
  QUALITY_CHANCES,
  QUALITY_PRESETS,
  calculateAlbionFocusCost,
  calculateAlbionRrr,
  estimateRerollRounds,
  qualityPresetChances,
  validateCraftingModel,
} from '../utils/craftingMath';
import { CITIES, formatDate, formatPrice, getAlbionItemIcon, getCityColor } from '../utils/constants';
import styles from './CraftPanel.module.css';

const CITY_IDS = CITIES.map((city) => city.id);
const PRICE_TYPES = {
  sell: { label: 'Ordem de venda', field: 'sell_price_min', dateField: 'sell_price_min_date' },
  buy: { label: 'Venda instantanea', field: 'buy_price_max', dateField: 'buy_price_max_date' },
  manual: { label: 'Preco manual', field: null, dateField: null },
};

const BLACK_MARKET = 'Black Market';
const SELL_LOCATIONS = [...CITY_IDS, BLACK_MARKET];
const TRANSPORT_MOUNTS = {
  ox: { label: 'Boi', capacity: 1200, riskMultiplier: 1.2 },
  bear: { label: 'Urso', capacity: 2800, riskMultiplier: 0.9 },
  boar: { label: 'Javali', capacity: 900, riskMultiplier: 0.75 },
  mammoth: { label: 'Mamute', capacity: 12000, riskMultiplier: 1.6 },
};
const ROUTE_RISK = {
  Bridgewatch: 0.08,
  Lymhurst: 0.07,
  'Fort Sterling': 0.09,
  Thetford: 0.08,
  Martlock: 0.07,
  Brecilien: 0.12,
  Caerleon: 0.02,
};

export default function CraftPanel({ item, server }) {
  const [recipe, setRecipe] = useState(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState(null);
  const [ingredientEntries, setIngredientEntries] = useState([]);
  const [itemPrices, setItemPrices] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyMetrics, setHistoryMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mode, setMode] = useState('simple');
  const [runs, setRuns] = useState(1);
  const [craftCity, setCraftCity] = useState('Lymhurst');
  const [rrrMode, setRrrMode] = useState('auto');
  const [manualRrr, setManualRrr] = useState(0.248);
  const [useFocus, setUseFocus] = useState(false);
  const [useHideout, setUseHideout] = useState(false);
  const [dailyBonus, setDailyBonus] = useState(0);
  const [stationFee, setStationFee] = useState(1000);
  const [extraCost, setExtraCost] = useState(0);
  const [materialPriceType, setMaterialPriceType] = useState('sell');
  const [productPriceType, setProductPriceType] = useState('sell');
  const [maxAgeHours, setMaxAgeHours] = useState(72);
  const [manualMaterialPrices, setManualMaterialPrices] = useState({});
  const [manualProductPrice, setManualProductPrice] = useState(0);
  const [journalEnabled, setJournalEnabled] = useState(true);
  const [manualEmptyJournalPrice, setManualEmptyJournalPrice] = useState(0);
  const [manualFullJournalPrice, setManualFullJournalPrice] = useState(0);
  const [famePerCraft, setFamePerCraft] = useState(0);
  const [qualityChances, setQualityChances] = useState(() => QUALITY_CHANCES.reduce((acc, row) => ({ ...acc, [row.key]: row.defaultChance }), {}));
  const [qualityPreset, setQualityPreset] = useState('base');
  const [minQualityTarget, setMinQualityTarget] = useState(4);
  const [rerollCost, setRerollCost] = useState(0);
  const [transportCapacity, setTransportCapacity] = useState(1200);
  const [transportCost, setTransportCost] = useState(0);
  const [shareMessage, setShareMessage] = useState('');
  const [craftPlan, setCraftPlan] = useState([]);
  const [internalCraftIds, setInternalCraftIds] = useState([]);
  const [autoOptimizeInternal, setAutoOptimizeInternal] = useState(true);
  const [internalRecipes, setInternalRecipes] = useState({});
  const [masteryLevel, setMasteryLevel] = useState(0);
  const [specLevel, setSpecLevel] = useState(0);
  const [hideoutPower, setHideoutPower] = useState(0);
  const [consumableRrr, setConsumableRrr] = useState(0);
  const [blackMarketEnabled, setBlackMarketEnabled] = useState(true);
  const [blackMarketRiskCost, setBlackMarketRiskCost] = useState(0);
  const [blackMarketRiskPercent, setBlackMarketRiskPercent] = useState(0);
  const [blackMarketRouteCost, setBlackMarketRouteCost] = useState(0);
  const [blackMarketMinProfit, setBlackMarketMinProfit] = useState(0);
  const [transportOrigin, setTransportOrigin] = useState('Lymhurst');
  const [transportDestination, setTransportDestination] = useState(BLACK_MARKET);
  const [transportMount, setTransportMount] = useState('ox');
  const [minProfitPerTrip, setMinProfitPerTrip] = useState(0);
  const [qualitySpecBonus, setQualitySpecBonus] = useState(0);
  const [qualityFoodBonus, setQualityFoodBonus] = useState(0);
  const [qualityStationBonus, setQualityStationBonus] = useState(0);
  const [planName, setPlanName] = useState('Plano principal');
  const [savedPlans, setSavedPlans] = useState([]);
  const [observedRrr, setObservedRrr] = useState(0);
  const [observedFocus, setObservedFocus] = useState(0);
  const [observedTargetChance, setObservedTargetChance] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipe() {
      setRecipe(null);
      setRecipeError(null);
      setIngredientEntries([]);
      setItemPrices([]);
      setHistoryEntries([]);
      setHistoryMetrics([]);
      setLastUpdated(null);

      if (!item) return;

      setRecipeLoading(true);
      try {
        const response = await getCraftRecipe(item.id);
        if (!cancelled) {
          setRecipe(response);
          if (response.bonus_city) setCraftCity(response.bonus_city);
        }
      } catch (err) {
        if (!cancelled) {
          setRecipe(null);
          setRecipeError(err.response?.data?.error || 'Receita nao encontrada no dump do Albion.');
        }
      } finally {
        if (!cancelled) setRecipeLoading(false);
      }
    }

    loadRecipe();
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    setIngredientEntries([]);
    setItemPrices([]);
    setHistoryEntries([]);
    setHistoryMetrics([]);
    setLastUpdated(null);
  }, [server]);

  useEffect(() => {
    const saved = readSavedPreset();
    const urlPreset = readUrlPreset();
    const preset = { ...saved, ...urlPreset };
    if (!Object.keys(preset).length) return;

    if (preset.mode) setMode(preset.mode);
    if (preset.runs) setRuns(Number(preset.runs));
    if (preset.craftCity) setCraftCity(preset.craftCity);
    if (preset.rrrMode) setRrrMode(preset.rrrMode);
    if (preset.manualRrr) setManualRrr(Number(preset.manualRrr));
    if (preset.useFocus !== undefined) setUseFocus(preset.useFocus === true || preset.useFocus === 'true');
    if (preset.useHideout !== undefined) setUseHideout(preset.useHideout === true || preset.useHideout === 'true');
    if (preset.dailyBonus) setDailyBonus(Number(preset.dailyBonus));
    if (preset.stationFee) setStationFee(Number(preset.stationFee));
    if (preset.extraCost) setExtraCost(Number(preset.extraCost));
    if (preset.materialPriceType) setMaterialPriceType(preset.materialPriceType);
    if (preset.productPriceType) setProductPriceType(preset.productPriceType);
    if (preset.maxAgeHours) setMaxAgeHours(Number(preset.maxAgeHours));
    if (preset.manualProductPrice) setManualProductPrice(Number(preset.manualProductPrice));
    if (preset.manualMaterialPrices && typeof preset.manualMaterialPrices === 'object') setManualMaterialPrices(preset.manualMaterialPrices);
    if (preset.journalEnabled !== undefined) setJournalEnabled(preset.journalEnabled === true || preset.journalEnabled === 'true');
    if (preset.manualEmptyJournalPrice) setManualEmptyJournalPrice(Number(preset.manualEmptyJournalPrice));
    if (preset.manualFullJournalPrice) setManualFullJournalPrice(Number(preset.manualFullJournalPrice));
    if (preset.famePerCraft) setFamePerCraft(Number(preset.famePerCraft));
    if (preset.qualityChances && typeof preset.qualityChances === 'object') setQualityChances(preset.qualityChances);
    if (preset.qualityPreset) setQualityPreset(normalizeQualityPresetKey(preset.qualityPreset));
    if (preset.minQualityTarget) setMinQualityTarget(Number(preset.minQualityTarget));
    if (preset.rerollCost) setRerollCost(Number(preset.rerollCost));
    if (preset.transportCapacity) setTransportCapacity(Number(preset.transportCapacity));
    if (preset.transportCost) setTransportCost(Number(preset.transportCost));
    if (preset.transportOrigin) setTransportOrigin(preset.transportOrigin);
    if (preset.transportDestination) setTransportDestination(preset.transportDestination);
    if (preset.transportMount) setTransportMount(preset.transportMount);
    if (preset.minProfitPerTrip) setMinProfitPerTrip(Number(preset.minProfitPerTrip));
    if (preset.masteryLevel) setMasteryLevel(Number(preset.masteryLevel));
    if (preset.specLevel) setSpecLevel(Number(preset.specLevel));
    if (preset.hideoutPower) setHideoutPower(Number(preset.hideoutPower));
    if (preset.consumableRrr) setConsumableRrr(Number(preset.consumableRrr));
    if (preset.blackMarketEnabled !== undefined) setBlackMarketEnabled(preset.blackMarketEnabled === true || preset.blackMarketEnabled === 'true');
    if (preset.blackMarketRiskCost) setBlackMarketRiskCost(Number(preset.blackMarketRiskCost));
    if (preset.blackMarketRiskPercent) setBlackMarketRiskPercent(Number(preset.blackMarketRiskPercent));
    if (preset.blackMarketRouteCost) setBlackMarketRouteCost(Number(preset.blackMarketRouteCost));
    if (preset.blackMarketMinProfit) setBlackMarketMinProfit(Number(preset.blackMarketMinProfit));
    if (preset.qualitySpecBonus) setQualitySpecBonus(Number(preset.qualitySpecBonus));
    if (preset.qualityFoodBonus) setQualityFoodBonus(Number(preset.qualityFoodBonus));
    if (preset.qualityStationBonus) setQualityStationBonus(Number(preset.qualityStationBonus));
    if (preset.planName) setPlanName(preset.planName);
    if (Array.isArray(preset.savedPlans)) setSavedPlans(preset.savedPlans);
    if (Array.isArray(preset.craftPlan)) setCraftPlan(preset.craftPlan);
    if (preset.autoOptimizeInternal !== undefined) setAutoOptimizeInternal(preset.autoOptimizeInternal === true || preset.autoOptimizeInternal === 'true');
    if (preset.observedRrr) setObservedRrr(Number(preset.observedRrr));
    if (preset.observedFocus) setObservedFocus(Number(preset.observedFocus));
    if (preset.observedTargetChance) setObservedTargetChance(Number(preset.observedTargetChance));
  }, []);

  useEffect(() => {
    const preset = {
      mode,
      runs,
      craftCity,
      rrrMode,
      manualRrr,
      useFocus,
      useHideout,
      dailyBonus,
      stationFee,
      extraCost,
      materialPriceType,
      productPriceType,
      maxAgeHours,
      manualProductPrice,
      manualMaterialPrices,
      journalEnabled,
      manualEmptyJournalPrice,
      manualFullJournalPrice,
      famePerCraft,
      qualityChances,
      qualityPreset,
      minQualityTarget,
      rerollCost,
      transportCapacity,
      transportCost,
      transportOrigin,
      transportDestination,
      transportMount,
      minProfitPerTrip,
      masteryLevel,
      specLevel,
      hideoutPower,
      consumableRrr,
      blackMarketEnabled,
      blackMarketRiskCost,
      blackMarketRiskPercent,
      blackMarketRouteCost,
      blackMarketMinProfit,
      qualitySpecBonus,
      qualityFoodBonus,
      qualityStationBonus,
      planName,
      savedPlans,
      autoOptimizeInternal,
      observedRrr,
      observedFocus,
      observedTargetChance,
      craftPlan,
    };
    localStorage.setItem('albion_craft_preset', JSON.stringify(preset));
  }, [autoOptimizeInternal, blackMarketEnabled, blackMarketMinProfit, blackMarketRiskCost, blackMarketRiskPercent, blackMarketRouteCost, consumableRrr, craftCity, craftPlan, dailyBonus, extraCost, famePerCraft, hideoutPower, journalEnabled, manualEmptyJournalPrice, manualFullJournalPrice, manualMaterialPrices, manualProductPrice, manualRrr, masteryLevel, materialPriceType, maxAgeHours, minProfitPerTrip, minQualityTarget, mode, observedFocus, observedRrr, observedTargetChance, planName, productPriceType, qualityChances, qualityFoodBonus, qualityPreset, qualitySpecBonus, qualityStationBonus, rerollCost, rrrMode, runs, savedPlans, specLevel, stationFee, transportCapacity, transportCost, transportDestination, transportMount, transportOrigin, useFocus, useHideout]);

  const ingredients = useMemo(() => recipe?.ingredients || [], [recipe]);
  const journalInfo = useMemo(() => inferJournalInfo(recipe), [recipe]);
  const noFocusRrr = useMemo(() => calculateAlbionRrr({ craftCity, bonusCity: recipe?.bonus_city, useFocus: false, useHideout, dailyBonus, hideoutPower, consumableRrr }), [consumableRrr, craftCity, dailyBonus, hideoutPower, recipe?.bonus_city, useHideout]);
  const focusRrr = useMemo(() => calculateAlbionRrr({ craftCity, bonusCity: recipe?.bonus_city, useFocus: true, useHideout, dailyBonus, hideoutPower, consumableRrr }), [consumableRrr, craftCity, dailyBonus, hideoutPower, recipe?.bonus_city, useHideout]);
  const effectiveRrr = useMemo(() => {
    if (mode === 'advanced' && rrrMode === 'manual') return manualRrr;
    return useFocus ? focusRrr : noFocusRrr;
  }, [focusRrr, manualRrr, mode, noFocusRrr, rrrMode, useFocus]);

  useEffect(() => {
    setQualityChances(qualityPresetChances(qualityPreset));
  }, [qualityPreset]);

  const fetchCraftData = useCallback(async () => {
    if (!item || !recipe) return;

    setLoading(true);
    try {
      const journalIds = journalInfo ? [journalInfo.emptyId, journalInfo.fullId] : [];
      const internalIngredientIds = collectRecursiveIngredientIds(internalRecipes);
      const ingredientIds = [...new Set([...ingredients.map((ingredient) => ingredient.id), ...internalIngredientIds, ...journalIds])];
      const startDate = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
      const [ingredientResponse, itemResponse, historyResponse] = await Promise.all([
        getMultiPrices(ingredientIds, CITY_IDS, [1], server),
        getPrices(item.id, SELL_LOCATIONS, [1, 2, 3, 4, 5], server),
        getHistory(item.id, SELL_LOCATIONS, [1, 2, 3, 4, 5], server, startDate, 24),
      ]);

      setIngredientEntries(ingredientResponse.prices || []);
      setItemPrices(itemResponse.prices || []);
      setHistoryEntries(historyResponse.history || []);
      setHistoryMetrics(historyResponse.metrics || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erro ao calcular craft:', err);
      setIngredientEntries([]);
      setItemPrices([]);
    } finally {
      setLoading(false);
    }
  }, [ingredients, internalRecipes, item, journalInfo, recipe, server]);

  useEffect(() => {
    fetchCraftData();
  }, [fetchCraftData]);

  useEffect(() => {
    let cancelled = false;
    const roots = autoOptimizeInternal ? ingredients.filter((ingredient) => isLikelyCraftable(ingredient.id)).map((ingredient) => ingredient.id) : internalCraftIds;
    const missing = collectMissingInternalRecipeIds(roots, internalRecipes);
    if (missing.length === 0) return;

    Promise.all(missing.map((id) => getCraftRecipe(id).then((internalRecipe) => [id, internalRecipe]).catch(() => [id, null])))
      .then((entries) => {
        if (cancelled) return;
        setInternalRecipes((prev) => {
          const next = { ...prev };
          for (const [id, internalRecipe] of entries) {
            if (internalRecipe) next[id] = internalRecipe;
          }
          return next;
        });
      });

    return () => {
      cancelled = true;
    };
  }, [autoOptimizeInternal, ingredients, internalCraftIds, internalRecipes]);

  const analysis = useMemo(() => {
    if (!recipe) return null;

    const safeRuns = Math.max(1, Number(runs) || 1);
    const producedQuantity = (recipe.amount_crafted || 1) * safeRuns;
    const focusCost = calculateAlbionFocusCost(recipe.crafting_focus || 0, masteryLevel, specLevel) * safeRuns;
    const internalOptimization = autoOptimizeInternal
      ? optimizeInternalCrafts({ ingredients, internalRecipes, ingredientEntries, runs: safeRuns, rrr: effectiveRrr, materialPriceType, maxAgeHours, manualMaterialPrices })
      : { ingredients: expandInternalCrafts({ ingredients, internalCraftIds, internalRecipes, runs: safeRuns }), decisions: [] };
    const expandedIngredients = internalOptimization.ingredients;
    const nutritionUnits = expandedIngredients.reduce((total, ingredient) => total + ingredient.count, 0) * (recipe?.tier || item?.tier || 4) * 0.15;
    const nutritionCost = Math.round((nutritionUnits / 100) * stationFee);

    const ingredientMarket = expandedIngredients.map((ingredient) => {
      const entries = ingredientEntries.filter((entry) => entry.item_id === ingredient.id);
      const manualPrice = Number(manualMaterialPrices[ingredient.id] || 0);
      const validEntries = entries
        .map((entry) => enrichEntryPrice(entry, materialPriceType, maxAgeHours))
        .filter((entry) => entry.price > 0);
      const cheapest = validEntries.reduce((best, entry) => {
        if (!best || entry.price < best.price) return entry;
        return best;
      }, null);

      const byCity = CITY_IDS.reduce((acc, city) => {
        const cityEntry = validEntries.find((entry) => entry.city === city);
        acc[city] = cityEntry || null;
        return acc;
      }, {});

      const fallbackPrice = materialPriceType === 'manual' ? manualPrice : cheapest?.price || manualPrice || 0;
      return {
        ...ingredient,
        manualPrice,
        cheapestCity: materialPriceType === 'manual' ? 'manual' : cheapest?.city || null,
        cheapestPrice: fallbackPrice,
        cheapestAge: cheapest?.date || null,
        byCity,
      };
    });

    const pickIngredientPrice = (ingredient, city = null) => {
      if (materialPriceType === 'manual') return { price: ingredient.manualPrice || 0, city: 'Manual', date: null };
      const local = city ? ingredient.byCity[city] : null;
      if (local) return { price: local.price, city, date: local.date };
      return { price: ingredient.cheapestPrice || 0, city: ingredient.cheapestCity || 'Sem preco', date: ingredient.cheapestAge };
    };

    const buildCost = (rrr, city = null) => {
      let rawCost = 0;
      let returnableCost = 0;
      let fixedCost = 0;
      const shoppingList = ingredientMarket.map((ingredient) => {
        const picked = pickIngredientPrice(ingredient, city);
        const quantity = ingredient.count;
        const total = picked.price * quantity;
        rawCost += total;
        if (ingredient.returnable) returnableCost += total;
        else fixedCost += total;
        return {
          ...ingredient,
          quantity,
          unitPrice: picked.price,
          total,
          purchaseCity: picked.city,
          age: picked.date,
        };
      });

      const returnedValue = Math.round(returnableCost * rrr);
      const materialCost = Math.round(returnableCost - returnedValue + fixedCost);
      const totalCost = materialCost + nutritionCost + extraCost;
      const leftovers = shoppingList
        .filter((ingredient) => ingredient.returnable)
        .map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          quantity: Math.floor(ingredient.quantity * rrr),
          city: craftCity,
          estimatedValue: Math.round(ingredient.unitPrice * Math.floor(ingredient.quantity * rrr)),
        }))
        .filter((leftover) => leftover.quantity > 0);

      return { rawCost, returnableCost, fixedCost, returnedValue, materialCost, nutritionCost, extraCost, totalCost, shoppingList, leftovers };
    };

    const selectedCost = buildCost(effectiveRrr);
    const noFocusCost = buildCost(noFocusRrr);
    const focusCostPlan = buildCost(focusRrr);
    const journalPlan = buildJournalPlan({
      journalInfo,
      entries: ingredientEntries,
      producedQuantity,
      journalEnabled,
      manualEmptyJournalPrice,
      manualFullJournalPrice,
      maxAgeHours,
      famePerCraft,
      runs: safeRuns,
    });
    const rerollTotal = Number(rerollCost || 0) * producedQuantity;
    const liquidityByCityQuality = buildLiquidityMap(historyEntries, historyMetrics);

    const saleEntries = itemPrices
      .map((entry) => enrichEntryPrice(entry, productPriceType, maxAgeHours, manualProductPrice))
      .filter((entry) => entry.price > 0)
      .map((entry) => {
        const liquidity = liquidityByCityQuality[`${entry.city}-${entry.quality}`] || emptyLiquidity();
        const taxResults = MARKET_TAXES.map((tax) => {
          const netRevenue = Math.round(entry.price * producedQuantity * (1 - tax.rate));
          const profit = netRevenue - selectedCost.totalCost + journalPlan.netReturn - rerollTotal;
          return {
            ...tax,
            netRevenue,
            profit,
            roi: selectedCost.totalCost > 0 ? (profit / selectedCost.totalCost) * 100 : 0,
          };
        });
        return { ...entry, liquidity, taxResults };
      })
      .sort((a, b) => b.taxResults[0].profit - a.taxResults[0].profit);

    const bestSale = saleEntries[0] || null;
    const noFocusProfit = bestSale ? Math.round(bestSale.price * producedQuantity * 0.96) - noFocusCost.totalCost + journalPlan.netReturn - rerollTotal : null;
    const focusProfit = bestSale ? Math.round(bestSale.price * producedQuantity * 0.96) - focusCostPlan.totalCost + journalPlan.netReturn - rerollTotal : null;
    const extraFocusProfit = focusProfit !== null && noFocusProfit !== null ? focusProfit - noFocusProfit : null;
    const qualityModel = buildQualityModel({
      baseChances: qualityChances,
      specBonus: qualitySpecBonus,
      foodBonus: qualityFoodBonus,
      stationBonus: qualityStationBonus,
      minQualityTarget,
      rerollCost,
      producedQuantity,
    });
    const { targetChance, estimatedRerollRounds } = qualityModel.rerollPlan;
    const targetRerollTotal = estimatedRerollRounds * Number(rerollCost || 0) * producedQuantity;
    const qualityRows = QUALITY_CHANCES.map((quality) => {
      const chance = Number(qualityModel.chances[quality.key] || 0);
      const best = itemPrices
        .filter((entry) => entry.quality === quality.quality)
        .map((entry) => enrichEntryPrice(entry, productPriceType, maxAgeHours, manualProductPrice))
        .filter((entry) => entry.price > 0)
        .sort((a, b) => b.price - a.price)[0] || null;
      const profit = best ? Math.round(best.price * producedQuantity * 0.96) - selectedCost.totalCost + journalPlan.netReturn - targetRerollTotal : null;
      return { ...quality, chance, sale: best, profit, expectedContribution: best ? Math.round((best.price * producedQuantity * 0.96 - selectedCost.totalCost + journalPlan.netReturn - targetRerollTotal) * (chance / 100)) : 0 };
    });
    const chanceTotal = qualityRows.reduce((total, row) => total + row.chance, 0) || 1;
    const expectedRevenue = qualityRows.reduce((total, row) => {
      if (!row.sale) return total;
      return total + row.sale.price * (row.chance / chanceTotal);
    }, 0);
    const expectedProfit = Math.round(expectedRevenue * producedQuantity * 0.96) - selectedCost.totalCost + journalPlan.netReturn - targetRerollTotal;
    const blackMarketSale = saleEntries.find((entry) => entry.city === BLACK_MARKET) || null;
    const royalSale = saleEntries.find((entry) => entry.city !== BLACK_MARKET) || null;
    const blackMarketPlan = buildBlackMarketPlan({
      blackMarketSale,
      royalSale,
      producedQuantity,
      selectedCost,
      journalPlan,
      rerollTotal: targetRerollTotal,
      fixedRiskCost: blackMarketRiskCost,
      riskPercent: blackMarketRiskPercent,
      routeCost: blackMarketRouteCost,
      minProfit: blackMarketMinProfit,
      craftCity,
    });
    const blackMarketProfit = blackMarketPlan.profit;
    const royalProfit = royalSale ? Math.round(royalSale.price * producedQuantity * 0.96) - selectedCost.totalCost + journalPlan.netReturn - targetRerollTotal : null;

    const saleList = bestSale ? [
      {
        id: item.id,
        name: item.name_pt || item.name,
        city: bestSale.city,
        quality: bestSale.quality_label,
        quantity: producedQuantity,
        unitPrice: bestSale.price,
        gross: bestSale.price * producedQuantity,
      },
      ...selectedCost.leftovers,
    ] : selectedCost.leftovers;

    const shoppingByCity = groupByCity(selectedCost.shoppingList, 'purchaseCity');
    const saleByCity = groupByCity(saleList, 'city');

    const bestSaleByCity = CITY_IDS.reduce((acc, city) => {
      const citySales = saleEntries.filter((entry) => entry.city === city);
      acc[city] = citySales[0] || null;
      return acc;
    }, {});

    const cityComparison = CITY_IDS.map((city) => {
      const cost = buildCost(effectiveRrr, city);
      const sale = bestSaleByCity[city];
      const premiumProfit = sale ? Math.round(sale.price * producedQuantity * 0.96) - cost.totalCost : null;
      const standardProfit = sale ? Math.round(sale.price * producedQuantity * 0.92) - cost.totalCost : null;
      const missingCount = cost.shoppingList.filter((row) => row.purchaseCity !== city && row.purchaseCity !== 'Manual').length;

      return { city, cost, sale, premiumProfit, standardProfit, missingCount };
    }).sort((a, b) => (b.premiumProfit ?? -Infinity) - (a.premiumProfit ?? -Infinity));

    return {
      ingredientMarket,
      expandedIngredients,
      selectedCost,
      noFocusCost,
      focusCostPlan,
      focusStats: {
        focusCost,
        noFocusProfit,
        focusProfit,
        extraFocusProfit,
        silverPerFocus: focusCost > 0 && extraFocusProfit !== null ? extraFocusProfit / focusCost : null,
      },
      saleEntries,
      cityComparison,
      shoppingByCity,
      saleByCity,
      producedQuantity,
      safeRuns,
      bestSale,
      journalPlan,
      qualityRows,
      expectedProfit,
      rerollTotal: targetRerollTotal,
      rerollPlan: {
        targetQuality: minQualityTarget,
        targetChance,
        estimatedRerollRounds,
      },
      qualityModel,
      qualitySimulation: simulateQualityScenarios({ qualityRows, selectedCost, journalPlan, rerollCost, minQualityTarget, producedQuantity }),
      calibration: buildCalibrationReport({
        effectiveRrr,
        focusCost,
        targetChance,
        observedRrr,
        observedFocus,
        observedTargetChance,
      }),
      internalOptimization,
      liquidity: summarizeLiquidity(saleEntries),
      blackMarket: {
        enabled: blackMarketEnabled,
        sale: blackMarketSale,
        royalSale,
        profit: blackMarketProfit,
        royalProfit,
        delta: blackMarketProfit !== null && royalProfit !== null ? blackMarketProfit - royalProfit : null,
        riskCost: Number(blackMarketRiskCost || 0),
        ...blackMarketPlan,
      },
      transport: buildTransportPlan({ selectedCost, bestSale, producedQuantity, premiumProfit: premiumResultFrom(bestSale), transportCapacity, transportCost, recipe, transportOrigin, transportDestination, transportMount, minProfitPerTrip }),
    };
  }, [autoOptimizeInternal, blackMarketEnabled, blackMarketMinProfit, blackMarketRiskCost, blackMarketRiskPercent, blackMarketRouteCost, craftCity, effectiveRrr, extraCost, famePerCraft, focusRrr, historyEntries, historyMetrics, ingredientEntries, ingredients, internalCraftIds, internalRecipes, item, itemPrices, journalEnabled, journalInfo, manualEmptyJournalPrice, manualFullJournalPrice, manualMaterialPrices, manualProductPrice, masteryLevel, materialPriceType, maxAgeHours, minProfitPerTrip, minQualityTarget, noFocusRrr, observedFocus, observedRrr, observedTargetChance, productPriceType, qualityChances, qualityFoodBonus, qualitySpecBonus, qualityStationBonus, recipe, rerollCost, runs, specLevel, stationFee, transportCapacity, transportCost, transportDestination, transportMount, transportOrigin]);

  if (!item) {
    return (
      <div className={styles.emptyState}>
        <Hammer size={48} className={styles.emptyIcon} />
        <h3>Painel de receita e lucro de craft</h3>
        <p>Selecione um item craftavel para analisar receita, custo de materiais, lucro e comparacao entre cidades.</p>
      </div>
    );
  }

  if (recipeLoading) {
    return (
      <div className={styles.emptyState}>
        <RefreshCw size={42} className={`${styles.emptyIcon} ${styles.spinning}`} />
        <h3>Carregando receita real</h3>
        <p>Buscando os requisitos de craft no dump bruto do Albion.</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className={styles.warningState}>
        <AlertTriangle size={48} className={styles.warningIcon} />
        <h3>Receita nao encontrada</h3>
        <p>{recipeError || `Nao ha requisito de craft no dump para "${item.name_pt || item.name}".`}</p>
      </div>
    );
  }

  const bestSale = analysis?.bestSale || null;
  const premiumResult = bestSale?.taxResults.find((tax) => tax.key === 'premium');

  return (
    <div className={styles.container}>
      <div className={styles.recipeHeader}>
        <div className={styles.itemMeta}>
          <img src={getAlbionItemIcon(item.id)} alt={item.name_pt || item.name} className={styles.itemImage} />
          <div>
            <h2 className={styles.itemName}>{item.name_pt || item.name}</h2>
            <span className={styles.itemId}>{item.id}</span>
            <span className={styles.recipeType}>{recipe.label}</span>
            {recipe.bonus_city && <span className={styles.recipeHint}>Bonus sugerido: {recipe.bonus_city}</span>}
          </div>
        </div>

        <div className={styles.actions}>
          {lastUpdated && <span className={styles.time}>Atualizado as {lastUpdated.toLocaleTimeString()}</span>}
          <button className={`${styles.refreshBtn} ${loading ? styles.spinning : ''}`} onClick={fetchCraftData} disabled={loading}>
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      <div className={styles.modeTabs}>
        <button className={`${styles.modeButton} ${mode === 'simple' ? styles.modeActive : ''}`} onClick={() => setMode('simple')}>Simples</button>
        <button className={`${styles.modeButton} ${mode === 'advanced' ? styles.modeActive : ''}`} onClick={() => setMode('advanced')}>Avancado</button>
      </div>

      <div className={styles.configs}>
        <ControlSelect label="Cidade de craft" value={craftCity} onChange={setCraftCity} options={CITY_IDS.map((city) => ({ value: city, label: city }))} />
        <ControlInput label="Runs" value={runs} onChange={(value) => setRuns(Math.max(1, value || 1))} />
        <ControlInput label="Taxa estacao/100 nutricao" value={stationFee} onChange={(value) => setStationFee(Math.max(0, value || 0))} />
        <div className={styles.configField}>
          <label className={styles.configLabel}>RRR efetivo</label>
          <span className={styles.readOnlyValue}>{formatPercent(effectiveRrr)}</span>
        </div>
      </div>

      {mode === 'advanced' && (
        <div className={styles.advancedGrid}>
          <label className={styles.toggleField}><input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} />Usar foco</label>
          <label className={styles.toggleField}><input type="checkbox" checked={useHideout} onChange={(e) => setUseHideout(e.target.checked)} />Craft em hideout</label>
          <ControlInput label="Bonus diario (%)" value={dailyBonus} onChange={(value) => setDailyBonus(Math.max(0, value || 0))} />
          <ControlInput label="Mastery" value={masteryLevel} onChange={(value) => setMasteryLevel(Math.max(0, Math.min(100, value || 0)))} />
          <ControlInput label="Spec" value={specLevel} onChange={(value) => setSpecLevel(Math.max(0, Math.min(120, value || 0)))} />
          <ControlInput label="Power hideout" value={hideoutPower} onChange={(value) => setHideoutPower(Math.max(0, Math.min(10, value || 0)))} />
          <ControlInput label="Bonus consumivel (%)" value={consumableRrr} onChange={(value) => setConsumableRrr(Math.max(0, value || 0))} />
          <ControlSelect label="Modo de RRR" value={rrrMode} onChange={setRrrMode} options={[{ value: 'auto', label: 'Automatico' }, { value: 'manual', label: 'Manual' }]} />
          {rrrMode === 'manual' && <ControlInput label="RRR manual (%)" value={Math.round(manualRrr * 1000) / 10} onChange={(value) => setManualRrr(Math.max(0, Math.min(80, value || 0)) / 100)} />}
          <ControlInput label="Custo extra" value={extraCost} onChange={(value) => setExtraCost(Math.max(0, value || 0))} />
          <ControlSelect label="Preco materiais" value={materialPriceType} onChange={setMaterialPriceType} options={priceOptions()} />
          <ControlSelect label="Preco produto" value={productPriceType} onChange={setProductPriceType} options={priceOptions()} />
          <ControlInput label="Ignorar dados acima de (h)" value={maxAgeHours} onChange={(value) => setMaxAgeHours(Math.max(1, value || 1))} />
          {productPriceType === 'manual' && <ControlInput label="Produto manual" value={manualProductPrice} onChange={(value) => setManualProductPrice(Math.max(0, value || 0))} />}
          <label className={styles.toggleField}><input type="checkbox" checked={journalEnabled} onChange={(e) => setJournalEnabled(e.target.checked)} />Usar journals</label>
          <ControlInput label="Journal vazio manual" value={manualEmptyJournalPrice} onChange={(value) => setManualEmptyJournalPrice(Math.max(0, value || 0))} />
          <ControlInput label="Journal cheio manual" value={manualFullJournalPrice} onChange={(value) => setManualFullJournalPrice(Math.max(0, value || 0))} />
          <ControlInput label="Fame gerada/craft" value={famePerCraft} onChange={(value) => setFamePerCraft(Math.max(0, value || 0))} />
          <ControlInput label="Custo reroll/un." value={rerollCost} onChange={(value) => setRerollCost(Math.max(0, value || 0))} />
          <ControlSelect label="Preset qualidade" value={qualityPreset} onChange={setQualityPreset} options={Object.entries(QUALITY_PRESETS).map(([value, preset]) => ({ value, label: preset.label }))} />
          <ControlInput label="Bonus spec qualidade" value={qualitySpecBonus} onChange={(value) => setQualitySpecBonus(Math.max(0, value || 0))} />
          <ControlInput label="Bonus comida qualidade" value={qualityFoodBonus} onChange={(value) => setQualityFoodBonus(Math.max(0, value || 0))} />
          <ControlInput label="Bonus estacao qualidade" value={qualityStationBonus} onChange={(value) => setQualityStationBonus(Math.max(0, value || 0))} />
          <ControlSelect label="Alvo minimo reroll" value={String(minQualityTarget)} onChange={(value) => setMinQualityTarget(Number(value))} options={QUALITY_CHANCES.map((row) => ({ value: String(row.quality), label: row.label }))} />
          <ControlInput label="Capacidade transporte kg" value={transportCapacity} onChange={(value) => setTransportCapacity(Math.max(1, value || 1))} />
          <ControlInput label="Custo transporte" value={transportCost} onChange={(value) => setTransportCost(Math.max(0, value || 0))} />
          <label className={styles.toggleField}><input type="checkbox" checked={blackMarketEnabled} onChange={(e) => setBlackMarketEnabled(e.target.checked)} />Black Market</label>
          <ControlInput label="Risco/custo BM" value={blackMarketRiskCost} onChange={(value) => setBlackMarketRiskCost(Math.max(0, value || 0))} />
          <ControlInput label="Risco BM (%)" value={blackMarketRiskPercent} onChange={(value) => setBlackMarketRiskPercent(Math.max(0, value || 0))} />
          <ControlInput label="Custo rota BM" value={blackMarketRouteCost} onChange={(value) => setBlackMarketRouteCost(Math.max(0, value || 0))} />
          <ControlInput label="Lucro minimo BM" value={blackMarketMinProfit} onChange={(value) => setBlackMarketMinProfit(Math.max(0, value || 0))} />
          <label className={styles.toggleField}><input type="checkbox" checked={autoOptimizeInternal} onChange={(e) => setAutoOptimizeInternal(e.target.checked)} />Otimizar comprar/craftar</label>
          <ControlSelect label="Origem rota" value={transportOrigin} onChange={setTransportOrigin} options={CITY_IDS.map((city) => ({ value: city, label: city }))} />
          <ControlSelect label="Destino rota" value={transportDestination} onChange={setTransportDestination} options={SELL_LOCATIONS.map((city) => ({ value: city, label: city }))} />
          <ControlSelect label="Montaria" value={transportMount} onChange={setTransportMount} options={Object.entries(TRANSPORT_MOUNTS).map(([value, mount]) => ({ value, label: mount.label }))} />
          <ControlInput label="Lucro minimo/viagem" value={minProfitPerTrip} onChange={(value) => setMinProfitPerTrip(Math.max(0, value || 0))} />
          <button className={styles.shareBtn} onClick={() => sharePreset({ item, server, state: collectPresetState({ mode, runs, craftCity, rrrMode, manualRrr, useFocus, useHideout, dailyBonus, stationFee, extraCost, materialPriceType, productPriceType, maxAgeHours, manualProductPrice, manualMaterialPrices, journalEnabled, manualEmptyJournalPrice, manualFullJournalPrice, famePerCraft, qualityChances, qualityPreset, qualitySpecBonus, qualityFoodBonus, qualityStationBonus, minQualityTarget, rerollCost, transportCapacity, transportCost, transportOrigin, transportDestination, transportMount, minProfitPerTrip, masteryLevel, specLevel, hideoutPower, consumableRrr, blackMarketEnabled, blackMarketRiskCost, blackMarketRiskPercent, blackMarketRouteCost, blackMarketMinProfit, autoOptimizeInternal }) }, setShareMessage)}>
            <Copy size={14} />
            Copiar link
          </button>
          {shareMessage && <span className={styles.shareMessage}>{shareMessage}</span>}
        </div>
      )}

      <div className={styles.planActions}>
        <button className={styles.shareBtn} onClick={() => addCurrentCraftToPlan({ item, recipe, analysis, craftCity, effectiveRrr, useFocus, craftPlan, setCraftPlan })}>
          Adicionar ao plano
        </button>
        <input className={styles.inlineInput} value={planName} onChange={(event) => setPlanName(event.target.value)} aria-label="Nome do plano" />
        <button className={styles.secondaryBtn} onClick={() => saveCraftPlan({ planName, craftPlan, savedPlans, setSavedPlans })} disabled={!craftPlan.length}>
          Salvar plano
        </button>
        {savedPlans.length > 0 && (
          <ControlSelect
            label="Planos salvos"
            value=""
            onChange={(key) => loadCraftPlan({ key, savedPlans, setPlanName, setCraftPlan })}
            options={[{ value: '', label: 'Carregar...' }, ...savedPlans.map((plan) => ({ value: plan.key, label: plan.name }))]}
          />
        )}
        {craftPlan.length > 0 && (
          <button className={styles.secondaryBtn} onClick={() => setCraftPlan([])}>
            Limpar plano
          </button>
        )}
      </div>

      <div className={styles.kpiGrid}>
        <MetricCard label="Custo final do lote" value={formatPrice(analysis?.selectedCost.totalCost)} />
        <MetricCard label="Itens produzidos" value={`${analysis?.producedQuantity || 0}x`} />
        <MetricCard label="Melhor venda" value={bestSale ? `${bestSale.city} / ${bestSale.quality_label}` : '-'} />
        <MetricCard label="Lucro premium 4%" value={formatSignedPrice(premiumResult?.profit)} tone={premiumResult?.profit >= 0 ? 'good' : 'bad'} />
      </div>

      <div className={styles.layout}>
        <div className={styles.leftCol}>
          <div className={styles.sectionCard}>
            <h3>Receita, materiais e custo</h3>
            <div className={styles.ingredientsList}>
              {analysis?.selectedCost.shoppingList.map((ingredient) => (
                <div key={ingredient.id} className={styles.ingCard}>
                  <img src={getAlbionItemIcon(ingredient.id)} alt={ingredient.name} className={styles.ingIcon} />
                  <div className={styles.ingInfo}>
                    <span className={styles.ingName}>{ingredient.name}</span>
                    <span className={styles.ingCount}>
                      {ingredient.quantity}x para {analysis.safeRuns} run(s)
                      {!ingredient.returnable && <span className={styles.fixedTag}>sem RRR</span>}
                      {ingredient.internalSource && <span className={styles.fixedTag}>interno</span>}
                    </span>
                    {mode === 'advanced' && ingredient.craftable && (
                      <label className={styles.inlineToggle}>
                        <input
                          type="checkbox"
                          checked={internalCraftIds.includes(ingredient.id)}
                          onChange={() => setInternalCraftIds((prev) => prev.includes(ingredient.id) ? prev.filter((id) => id !== ingredient.id) : [...prev, ingredient.id])}
                        />
                        craftar internamente
                      </label>
                    )}
                    {mode === 'advanced' && materialPriceType === 'manual' && (
                      <input
                        type="number"
                        className={styles.inlineInput}
                        value={manualMaterialPrices[ingredient.id] || 0}
                        onChange={(e) => setManualMaterialPrices((prev) => ({ ...prev, [ingredient.id]: Math.max(0, Number(e.target.value) || 0) }))}
                      />
                    )}
                  </div>
                  <div className={styles.ingPrice}>
                    <span className={styles.unitVal}>{ingredient.purchaseCity}</span>
                    <span className={styles.totalVal}>{formatPrice(ingredient.unitPrice)} un.</span>
                    <span className={styles.unitVal}>{formatDate(ingredient.age)}</span>
                  </div>
                </div>
              ))}
            </div>
            {analysis?.internalOptimization.decisions.length > 0 && (
              <div className={styles.cityTableWrap}>
                <table className={styles.cityTable}>
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Decisao</th>
                      <th>Comprar</th>
                      <th>Craftar</th>
                      <th>Economia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.internalOptimization.decisions.map((decision) => (
                      <tr key={decision.id}>
                        <td>{decision.name}</td>
                        <td>{decision.choice === 'craft' ? 'Craftar' : 'Comprar'}</td>
                        <td>{formatPrice(decision.buyCost)}</td>
                        <td>{formatPrice(decision.craftCost)}</td>
                        <td className={decision.savings >= 0 ? styles.greenText : styles.redText}>{formatSignedPrice(decision.savings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(recipe.special_ingredients?.length > 0 || recipe.completeness_notes?.length > 0) && (
              <div className={styles.warningBanner}>
                {recipe.special_ingredients?.length > 0 && (
                  <span>Receita especial: {recipe.special_ingredients.map((ingredient) => ingredient.name).join(', ')}.</span>
                )}
                {recipe.completeness_notes?.map((note) => <span key={note}>{note}</span>)}
              </div>
            )}

            <hr className={styles.divider} />

            <div className={styles.costSummary}>
              <SummaryRow label="Materiais brutos" value={analysis?.selectedCost.rawCost} />
              {analysis?.selectedCost.fixedCost > 0 && <SummaryRow label="Itens sem retorno" value={analysis.selectedCost.fixedCost} />}
              <SummaryRow label={`Retorno aplicado (${formatPercent(effectiveRrr)})`} value={-analysis?.selectedCost.returnedValue} tone="good" />
              <SummaryRow label="Taxa estimada da estacao" value={analysis?.selectedCost.nutritionCost} />
              {analysis?.selectedCost.extraCost > 0 && <SummaryRow label="Custo extra" value={analysis.selectedCost.extraCost} />}
              <SummaryRow label="Custo final estimado" value={analysis?.selectedCost.totalCost} total />
            </div>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.sectionCard}>
            <h3>Lucro por foco</h3>
            <div className={styles.focusGrid}>
              <MetricCard label="Lucro sem foco" value={formatSignedPrice(analysis?.focusStats.noFocusProfit)} tone={analysis?.focusStats.noFocusProfit >= 0 ? 'good' : 'bad'} />
              <MetricCard label="Lucro com foco" value={formatSignedPrice(analysis?.focusStats.focusProfit)} tone={analysis?.focusStats.focusProfit >= 0 ? 'good' : 'bad'} />
              <MetricCard label="Extra do foco" value={formatSignedPrice(analysis?.focusStats.extraFocusProfit)} tone={analysis?.focusStats.extraFocusProfit >= 0 ? 'good' : 'bad'} />
              <MetricCard label="Prata por foco" value={analysis?.focusStats.silverPerFocus === null ? '-' : formatSignedPrice(Math.round(analysis.focusStats.silverPerFocus))} tone={analysis?.focusStats.silverPerFocus >= 0 ? 'good' : 'bad'} />
              <MetricCard label="Foco por run" value={formatPrice(recipe.crafting_focus || 0)} />
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h3>Journals de trabalhador</h3>
            <div className={styles.focusGrid}>
              <MetricCard label="Tipo de journal" value={analysis?.journalPlan.name || 'Nao aplicado'} />
              <MetricCard label="Vazio -> Cheio" value={`${formatPrice(analysis?.journalPlan.emptyPrice)} -> ${formatPrice(analysis?.journalPlan.fullPrice)}`} />
              <MetricCard label="Retorno liquido" value={formatSignedPrice(analysis?.journalPlan.netReturn)} tone={analysis?.journalPlan.netReturn >= 0 ? 'good' : 'bad'} />
              <MetricCard label="Fame total" value={formatPrice(analysis?.journalPlan.fameGenerated)} />
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h3>Qualidade e reroll</h3>
            <div className={styles.qualityGrid}>
              {analysis?.qualityRows.map((row) => (
                <div key={row.key} className={styles.qualityRow}>
                  <span>{row.label}</span>
                  {mode === 'advanced' ? (
                    <input
                      type="number"
                      className={styles.smallInput}
                      value={qualityChances[row.key]}
                      onChange={(e) => setQualityChances((prev) => ({ ...prev, [row.key]: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                  ) : <span>{row.chance}%</span>}
                  <strong>{row.sale ? formatPrice(row.sale.price) : '-'}</strong>
                  <span className={row.profit >= 0 ? styles.greenText : styles.redText}>{formatSignedPrice(row.profit)}</span>
                </div>
              ))}
            </div>
            <div className={styles.costSummary}>
              <SummaryRow label="Custo total de reroll" value={analysis?.rerollTotal} />
              <PlainSummaryRow label={`Rodadas estimadas ate ${qualityName(analysis?.rerollPlan.targetQuality)}+`} value={`${analysis?.rerollPlan.estimatedRerollRounds || 0}`} />
              <PlainSummaryRow label="Chance alvo normalizada" value={`${formatNumber(analysis?.rerollPlan.targetChance)}%`} />
              <SummaryRow label="Lucro esperado por qualidade" value={analysis?.expectedProfit} tone={analysis?.expectedProfit >= 0 ? 'good' : undefined} total />
            </div>
            <div className={styles.cityTableWrap}>
              <table className={styles.cityTable}>
                <thead>
                  <tr>
                    <th>Cenario</th>
                    <th>Crafts</th>
                    <th>Lucro vender qual.</th>
                    <th>Lucro reroll alvo</th>
                    <th>Chance ruina</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis?.qualitySimulation.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.crafts}</td>
                      <td className={row.sellAllProfit >= 0 ? styles.greenText : styles.redText}>{formatSignedPrice(row.sellAllProfit)}</td>
                      <td className={row.rerollProfit >= 0 ? styles.greenText : styles.redText}>{formatSignedPrice(row.rerollProfit)}</td>
                      <td>{formatNumber(row.ruinProbability)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h3>Validacao contra o jogo</h3>
            <div className={styles.advancedGrid}>
              <ControlInput label="RRR visto no jogo (%)" value={observedRrr} onChange={(value) => setObservedRrr(Math.max(0, value || 0))} />
              <ControlInput label="Foco visto no jogo" value={observedFocus} onChange={(value) => setObservedFocus(Math.max(0, value || 0))} />
              <ControlInput label="Chance alvo vista (%)" value={observedTargetChance} onChange={(value) => setObservedTargetChance(Math.max(0, value || 0))} />
            </div>
            <div className={styles.focusGrid}>
              <MetricCard label="Delta RRR" value={analysis?.calibration.manual.rrrDelta === null ? '-' : `${formatNumber(analysis.calibration.manual.rrrDelta)}%`} tone={Math.abs(analysis?.calibration.manual.rrrDelta || 0) <= 0.2 ? 'good' : 'bad'} />
              <MetricCard label="Delta foco" value={analysis?.calibration.manual.focusDelta === null ? '-' : formatSignedPrice(analysis.calibration.manual.focusDelta)} tone={Math.abs(analysis?.calibration.manual.focusDelta || 0) <= 1 ? 'good' : 'bad'} />
              <MetricCard label="Delta qualidade" value={analysis?.calibration.manual.targetChanceDelta === null ? '-' : `${formatNumber(analysis.calibration.manual.targetChanceDelta)}%`} tone={Math.abs(analysis?.calibration.manual.targetChanceDelta || 0) <= 0.5 ? 'good' : 'bad'} />
              <MetricCard label="Casos referencia" value={`${analysis?.calibration.passed || 0}/${analysis?.calibration.total || 0}`} tone={analysis?.calibration.failed === 0 ? 'good' : 'bad'} />
            </div>
            <div className={styles.cityTableWrap}>
              <table className={styles.cityTable}>
                <thead>
                  <tr>
                    <th>Caso</th>
                    <th>Esperado</th>
                    <th>Atual</th>
                    <th>Delta</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis?.calibration.reference.map((row) => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      <td>{row.type === 'rrr' ? `${formatNumber(row.expected * 100)}%` : formatPrice(row.expected)}</td>
                      <td>{row.type === 'rrr' ? `${formatNumber(row.actual * 100)}%` : formatPrice(row.actual)}</td>
                      <td className={row.passed ? styles.greenText : styles.redText}>{row.type === 'rrr' ? `${formatNumber(row.delta * 100)}%` : formatSignedPrice(row.delta)}</td>
                      <td>{row.passed ? 'ok' : 'revisar'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h3>Volume e liquidez</h3>
            <div className={styles.focusGrid}>
              <MetricCard label="Media 24h" value={formatPrice(analysis?.liquidity.avg24h)} />
              <MetricCard label="Media 7d" value={formatPrice(analysis?.liquidity.avg7d)} />
              <MetricCard label="Volume/dia" value={formatNumber(analysis?.liquidity.volumePerDay)} />
              <MetricCard label="Idade do melhor dado" value={formatDate(analysis?.bestSale?.date)} />
              <MetricCard label="Liquidez" value={analysis?.liquidity.liquidityScore || '-'} />
              <MetricCard label="Tendencia 7d" value={analysis?.liquidity.trend7dPct === null ? '-' : `${formatNumber(analysis.liquidity.trend7dPct)}%`} tone={analysis?.liquidity.trend7dPct >= 0 ? 'good' : 'bad'} />
              <MetricCard label="Outliers removidos" value={formatNumber(analysis?.liquidity.removedOutliers)} />
            </div>
            {analysis?.liquidity.warning && <div className={styles.warningBanner}>{analysis.liquidity.warning}</div>}
          </div>

          {blackMarketEnabled && (
            <div className={styles.sectionCard}>
              <h3>Black Market</h3>
              <div className={styles.focusGrid}>
                <MetricCard label="Venda Royal" value={analysis?.blackMarket.royalSale ? `${analysis.blackMarket.royalSale.city} ${formatPrice(analysis.blackMarket.royalSale.price)}` : '-'} />
                <MetricCard label="Venda BM" value={analysis?.blackMarket.sale ? formatPrice(analysis.blackMarket.sale.price) : '-'} />
                <MetricCard label="Lucro Royal" value={formatSignedPrice(analysis?.blackMarket.royalProfit)} tone={analysis?.blackMarket.royalProfit >= 0 ? 'good' : 'bad'} />
                <MetricCard label="Lucro BM liquido" value={formatSignedPrice(analysis?.blackMarket.profit)} tone={analysis?.blackMarket.profit >= 0 ? 'good' : 'bad'} />
                <MetricCard label="Delta BM vs Royal" value={formatSignedPrice(analysis?.blackMarket.delta)} tone={analysis?.blackMarket.delta >= 0 ? 'good' : 'bad'} />
                <MetricCard label="Rota" value={`${craftCity} -> Caerleon`} />
                <MetricCard label="Reserva de risco" value={formatPrice(analysis?.blackMarket.riskReserve)} />
                <MetricCard label="Preco minimo BM" value={formatPrice(analysis?.blackMarket.minimumAcceptablePrice)} />
                <MetricCard label="Lucro acima minimo" value={formatSignedPrice(analysis?.blackMarket.marginOverMinimum)} tone={analysis?.blackMarket.marginOverMinimum >= 0 ? 'good' : 'bad'} />
                <MetricCard label="Comparacao de rota" value={analysis?.blackMarket.routeVerdict || '-'} />
              </div>
            </div>
          )}

          <div className={styles.sectionCard}>
            <h3>Rotas e transporte</h3>
            <div className={styles.focusGrid}>
              <MetricCard label="Compra" value={analysis?.transport.buyCities || '-'} />
              <MetricCard label="Craft" value={craftCity} />
              <MetricCard label="Venda" value={analysis?.transport.sellCity || '-'} />
              <MetricCard label="Montaria" value={analysis?.transport.mountLabel || '-'} />
              <MetricCard label="Risco rota" value={`${formatNumber(analysis?.transport.routeRiskPercent)}%`} tone={analysis?.transport.routeRiskPercent > 10 ? 'bad' : undefined} />
              <MetricCard label="Peso estimado" value={`${formatNumber(analysis?.transport.totalWeight)} kg`} />
              <MetricCard label="Viagens" value={formatNumber(analysis?.transport.trips)} />
              <MetricCard label="Lucro/viagem" value={formatSignedPrice(analysis?.transport.profitPerTrip)} tone={analysis?.transport.profitPerTrip >= 0 ? 'good' : 'bad'} />
              <MetricCard label="Lucro/kg" value={formatSignedPrice(analysis?.transport.profitPerKg)} tone={analysis?.transport.profitPerKg >= 0 ? 'good' : 'bad'} />
            </div>
            {analysis?.transport.warning && <div className={styles.warningBanner}>{analysis.transport.warning}</div>}
          </div>

          <div className={styles.sectionCard}>
            <h3>Melhores vendas por cidade</h3>
            {loading ? (
              <div className={styles.loader}>Calculando lucros...</div>
            ) : !analysis?.saleEntries.length ? (
              <div className={styles.noData}>Nenhum preco recente no tipo selecionado.</div>
            ) : (
              <div className={styles.profitsList}>
                {analysis.saleEntries.slice(0, 8).map((sale, idx) => (
                  <ProfitCard key={`${sale.city}-${sale.quality}-${idx}`} sale={sale} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <OperationList title="Lista de compras" groups={analysis?.shoppingByCity} type="shopping" storageKey={`current-${item.id}-shopping`} />
        <OperationList title="Lista de vendas e sobras" groups={analysis?.saleByCity} type="selling" storageKey={`current-${item.id}-selling`} />
      </div>

      <CraftPlanSummary plan={craftPlan} setCraftPlan={setCraftPlan} savedPlans={savedPlans} setSavedPlans={setSavedPlans} />

      <div className={styles.sectionCard}>
        <h3>Comparacao entre cidades</h3>
        <div className={styles.cityTableWrap}>
          <table className={styles.cityTable}>
            <thead>
              <tr>
                <th>Cidade</th>
                <th>Custo local</th>
                <th>Melhor venda local</th>
                <th>Lucro 4%</th>
                <th>Lucro 8%</th>
                <th>Dados</th>
              </tr>
            </thead>
            <tbody>
              {analysis?.cityComparison.map((row) => (
                <tr key={row.city}>
                  <td><span className={styles.cityBadge} style={{ '--city-color': getCityColor(row.city) }}>{row.city}</span></td>
                  <td>{formatPrice(row.cost.totalCost)}</td>
                  <td>{row.sale ? `${formatPrice(row.sale.price)} / ${row.sale.quality_label}` : '-'}</td>
                  <td className={row.premiumProfit >= 0 ? styles.greenText : styles.redText}>{formatSignedPrice(row.premiumProfit)}</td>
                  <td className={row.standardProfit >= 0 ? styles.greenText : styles.redText}>{formatSignedPrice(row.standardProfit)}</td>
                  <td>{row.missingCount ? `${row.missingCount} mat. via fallback` : 'local'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ControlInput({ label, value, onChange }) {
  return (
    <div className={styles.configField}>
      <label className={styles.configLabel}>{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className={styles.input} />
    </div>
  );
}

function ControlSelect({ label, value, onChange, options }) {
  return (
    <div className={styles.configField}>
      <label className={styles.configLabel}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={styles.select}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <div className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={`${styles.metricValue} ${tone === 'good' ? styles.greenText : ''} ${tone === 'bad' ? styles.redText : ''}`}>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, tone, total }) {
  return (
    <div className={`${styles.summaryRow} ${total ? styles.totalRow : ''}`}>
      <span>{label}</span>
      <span className={`${styles.silverPrice} ${tone === 'good' ? styles.greenText : ''}`}>
        <Coins size={12} />
        {formatSignedPrice(value)}
      </span>
    </div>
  );
}

function PlainSummaryRow({ label, value }) {
  return (
    <div className={styles.summaryRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfitCard({ sale }) {
  const premium = sale.taxResults.find((tax) => tax.key === 'premium');
  const standard = sale.taxResults.find((tax) => tax.key === 'standard');

  return (
    <div className={`${styles.profitCard} ${premium.profit >= 0 ? styles.profitBg : styles.lossBg}`}>
      <div className={styles.profitHeader}>
        <span className={styles.cityBadge} style={{ '--city-color': getCityColor(sale.city) }}>{sale.city}</span>
        <span className={styles.qualityLabel}>{sale.quality_label}</span>
      </div>
      <div className={styles.profitDetails}>
        <div className={styles.valCol}><span className={styles.detailLabel}>Preco</span><span className={styles.detailVal}>{formatPrice(sale.price)}</span></div>
        <ArrowRight size={16} className={styles.arrow} />
        <div className={styles.valCol}><span className={styles.detailLabel}>Premium 4%</span><span className={`${styles.detailVal} ${premium.profit >= 0 ? styles.greenText : styles.redText}`}>{formatSignedPrice(premium.profit)}</span></div>
        <div className={styles.valCol}><span className={styles.detailLabel}>Sem premium 8%</span><span className={`${styles.detailVal} ${standard.profit >= 0 ? styles.greenText : styles.redText}`}>{formatSignedPrice(standard.profit)}</span></div>
        <div className={styles.valCol}><span className={styles.detailLabel}>ROI 4%</span><span className={`${styles.badge} ${premium.profit >= 0 ? styles.badgeGreen : styles.badgeRed}`}>{premium.roi.toFixed(1)}%</span></div>
      </div>
    </div>
  );
}

function OperationList({ title, groups, type, storageKey }) {
  const [checkedRows, setCheckedRows] = useState(() => readOperationStatus(storageKey));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsedCities, setCollapsedCities] = useState({});
  const entries = Object.entries(groups || {});
  const flatRows = entries.flatMap(([city, rows]) => rows.map((row, index) => ({ ...row, city, rowKey: operationRowKey(city, row, index) })));
  const visibleRows = flatRows.filter((row) => {
    const done = Boolean(checkedRows[row.rowKey]);
    const matchesQuery = !query || `${row.city} ${row.name} ${row.id || ''}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'done' ? done : !done);
    return matchesQuery && matchesStatus;
  });
  const visibleByCity = groupOperationRows(visibleRows);
  const doneCount = flatRows.filter((row) => checkedRows[row.rowKey]).length;

  const toggleRow = (key) => {
    setCheckedRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    setCheckedRows(readOperationStatus(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (storageKey) localStorage.setItem(`operation_status_${storageKey}`, JSON.stringify(checkedRows));
  }, [checkedRows, storageKey]);

  return (
    <div className={styles.sectionCard}>
      <div className={styles.operationHeader}>
        <h3>{title}</h3>
        <div className={styles.operationTools}>
          <span className={styles.operationProgress}>{doneCount}/{flatRows.length}</span>
          <button type="button" className={styles.secondaryBtn} onClick={() => copyOperationRows(flatRows, type)} disabled={!flatRows.length}>
            Copiar
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={() => exportOperationCsv(title, flatRows, type)} disabled={!flatRows.length}>
            CSV
          </button>
        </div>
      </div>
      <div className={styles.operationFilters}>
        <input className={styles.inlineInput} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar item/cidade" />
        <select className={styles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">Todos</option>
          <option value="pending">Pendentes</option>
          <option value="done">Marcados</option>
        </select>
        <button type="button" className={styles.secondaryBtn} onClick={() => setCheckedRows({})}>Limpar marcas</button>
      </div>
      {entries.length === 0 ? (
        <div className={styles.noData}>Nada para listar.</div>
      ) : Object.entries(visibleByCity).map(([city, rows]) => (
        <div key={city} className={styles.operationGroup}>
          <button type="button" className={styles.operationCityButton} onClick={() => setCollapsedCities((prev) => ({ ...prev, [city]: !prev[city] }))}>
            <span className={styles.cityBadge} style={{ '--city-color': getCityColor(city) }}>{city}</span>
            <strong>{rows.length} itens</strong>
          </button>
          {!collapsedCities[city] && rows.map((row) => {
            const key = row.rowKey;
            return (
            <div key={key} className={`${styles.operationRow} ${checkedRows[key] ? styles.operationDone : ''}`}>
              <input type="checkbox" checked={Boolean(checkedRows[key])} onChange={() => toggleRow(key)} aria-label={`Marcar ${row.name}`} />
              <span>{row.name}</span>
              <strong>{row.quantity}x</strong>
              <span>{type === 'shopping' ? formatPrice(row.total) : formatPrice(row.gross || row.estimatedValue)}</span>
            </div>
            );
          })}
        </div>
      ))}
      {entries.length > 0 && visibleRows.length === 0 && <div className={styles.noData}>Nenhum item encontrado no filtro.</div>}
    </div>
  );
}

function CraftPlanSummary({ plan, setCraftPlan, savedPlans, setSavedPlans }) {
  const totals = useMemo(() => aggregateCraftPlan(plan), [plan]);
  if (!plan.length) return null;

  return (
    <div className={styles.sectionCard}>
      <h3>Plano de crafts</h3>
      <div className={styles.planGrid}>
        <MetricCard label="Itens no plano" value={`${plan.length}`} />
        <MetricCard label="Custo total" value={formatPrice(totals.cost)} />
        <MetricCard label="Lucro premium" value={formatSignedPrice(totals.profit)} tone={totals.profit >= 0 ? 'good' : 'bad'} />
        <MetricCard label="Peso total" value={`${formatNumber(totals.weight)} kg`} />
        <MetricCard label="Foco total" value={formatPrice(totals.focus)} />
      </div>
      <div className={styles.operationTools}>
        <button type="button" className={styles.secondaryBtn} onClick={() => copyFullPlan(plan, totals)}>Copiar plano completo</button>
        <button type="button" className={styles.secondaryBtn} onClick={() => exportFullPlanCsv(plan, totals)}>Exportar plano CSV</button>
        <button type="button" className={styles.secondaryBtn} onClick={() => printFullPlan(plan, totals)}>Imprimir</button>
      </div>
      <div className={styles.planRows}>
        {plan.map((row) => (
          <div key={row.key} className={styles.planRow}>
            <span>{row.name}</span>
            <input
              className={styles.smallInput}
              type="number"
              value={row.runs}
              onChange={(event) => updateCraftPlanRuns({ key: row.key, runs: Number(event.target.value), plan, setCraftPlan })}
            />
            <span>{row.city}</span>
            <span className={row.profit >= 0 ? styles.greenText : styles.redText}>{formatSignedPrice(row.profit)}</span>
            <button type="button" className={styles.secondaryBtn} onClick={() => setCraftPlan(plan.filter((item) => item.key !== row.key))}>Remover</button>
          </div>
        ))}
      </div>
      {savedPlans.length > 0 && (
        <div className={styles.cityTableWrap}>
          <table className={styles.cityTable}>
            <thead>
              <tr>
                <th>Cenario</th>
                <th>Itens</th>
                <th>Custo</th>
                <th>Lucro</th>
                <th>Peso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {savedPlans.map((saved) => {
                const savedTotals = aggregateCraftPlan(saved.plan || []);
                return (
                  <tr key={saved.key}>
                    <td>{saved.name}</td>
                    <td>{saved.plan?.length || 0}</td>
                    <td>{formatPrice(savedTotals.cost)}</td>
                    <td className={savedTotals.profit >= 0 ? styles.greenText : styles.redText}>{formatSignedPrice(savedTotals.profit)}</td>
                    <td>{formatNumber(savedTotals.weight)} kg</td>
                    <td><button type="button" className={styles.secondaryBtn} onClick={() => setSavedPlans(savedPlans.filter((plan) => plan.key !== saved.key))}>Excluir</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className={styles.layout}>
        <OperationList title="Compras combinadas" groups={totals.shoppingByCity} type="shopping" storageKey={`plan-${plan.map((row) => row.key).join('-')}-shopping`} />
        <OperationList title="Vendas combinadas" groups={totals.saleByCity} type="selling" storageKey={`plan-${plan.map((row) => row.key).join('-')}-selling`} />
      </div>
    </div>
  );
}

function enrichEntryPrice(entry, priceType, maxAgeHours, manualPrice = 0) {
  if (priceType === 'manual') return { ...entry, price: Number(manualPrice || 0), date: null };
  const config = PRICE_TYPES[priceType] || PRICE_TYPES.sell;
  const price = Number(entry[config.field] || 0);
  const date = entry[config.dateField] || null;
  if (!isFresh(date, maxAgeHours)) return { ...entry, price: 0, date };
  return { ...entry, price, date };
}

function isFresh(dateStr, maxAgeHours) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  return (Date.now() - date.getTime()) / 36e5 <= Number(maxAgeHours || 72);
}

function groupByCity(rows, key) {
  return rows.reduce((acc, row) => {
    const city = row[key] || 'Manual';
    if (!acc[city]) acc[city] = [];
    acc[city].push(row);
    return acc;
  }, {});
}

function priceOptions() {
  return [
    { value: 'sell', label: PRICE_TYPES.sell.label },
    { value: 'buy', label: PRICE_TYPES.buy.label },
    { value: 'manual', label: PRICE_TYPES.manual.label },
  ];
}

function formatSignedPrice(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatPrice(Math.abs(value))}`;
}

function operationRowKey(city, row, index) {
  return `${city}-${row.id || row.name}-${row.quality || ''}-${index}`;
}

function operationRowValue(row, type) {
  return type === 'shopping' ? row.total : row.gross || row.estimatedValue;
}

function readOperationStatus(storageKey) {
  if (!storageKey) return {};
  try {
    return JSON.parse(localStorage.getItem(`operation_status_${storageKey}`) || '{}');
  } catch {
    return {};
  }
}

function groupOperationRows(rows) {
  return rows.reduce((acc, row) => {
    if (!acc[row.city]) acc[row.city] = [];
    acc[row.city].push(row);
    return acc;
  }, {});
}

async function copyOperationRows(rows, type) {
  const text = rowsToText(rows, type);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function exportOperationCsv(title, rows, type) {
  const csv = rowsToCsv(rows, type);
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(title)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function rowsToText(rows, type) {
  return rows
    .map((row) => `${row.city}\t${row.name}\t${row.quantity}x\t${formatPrice(operationRowValue(row, type))}`)
    .join('\n');
}

function rowsToCsv(rows, type) {
  const header = ['cidade', 'item', 'quantidade', 'qualidade', 'valor'];
  const body = rows.map((row) => [
    row.city,
    row.name,
    row.quantity,
    row.quality || '',
    operationRowValue(row, type) || 0,
  ]);
  return [header, ...body].map((row) => row.map(csvCell).join(',')).join('\n');
}

async function copyFullPlan(plan, totals) {
  const text = fullPlanText(plan, totals);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function exportFullPlanCsv(plan, totals) {
  const rows = [
    ['tipo', 'cidade', 'item', 'quantidade', 'valor'],
    ...Object.entries(totals.shoppingByCity || {}).flatMap(([city, items]) => items.map((item) => ['compra', city, item.name, item.quantity, item.total || 0])),
    ...Object.entries(totals.saleByCity || {}).flatMap(([city, items]) => items.map((item) => ['venda', city, item.name, item.quantity, item.gross || item.estimatedValue || 0])),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plano-craft-completo.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function printFullPlan(plan, totals) {
  const printWindow = window.open('', '_blank', 'width=960,height=720');
  if (!printWindow) return;
  printWindow.document.write(`<pre>${escapeHtml(fullPlanText(plan, totals))}</pre>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function fullPlanText(plan, totals) {
  const lines = [
    'Plano de crafts',
    `Itens: ${plan.length}`,
    `Custo: ${formatPrice(totals.cost)}`,
    `Lucro: ${formatSignedPrice(totals.profit)}`,
    `Peso: ${formatNumber(totals.weight)} kg`,
    '',
    'Compras',
    rowsToText(Object.entries(totals.shoppingByCity || {}).flatMap(([city, rows]) => rows.map((row) => ({ ...row, city }))), 'shopping'),
    '',
    'Vendas',
    rowsToText(Object.entries(totals.saleByCity || {}).flatMap(([city, rows]) => rows.map((row) => ({ ...row, city }))), 'selling'),
  ];
  return lines.join('\n');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function slugify(value) {
  return String(value || 'lista').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lista';
}

function normalizeQualityPresetKey(value) {
  const legacy = { basic: 'base', spec: 'highSpec', specFood: 'highSpecFood' };
  const key = legacy[value] || value;
  return QUALITY_PRESETS[key] ? key : 'base';
}

function qualityName(qualityId) {
  return QUALITY_CHANCES.find((quality) => quality.quality === Number(qualityId))?.label || '-';
}

function emptyLiquidity() {
  return {
    avg24h: 0,
    avg7d: 0,
    volume24h: 0,
    volume7d: 0,
    volumePerDay: 0,
    newestDate: null,
    ageHours: null,
    trend7dPct: null,
    liquidityScore: 'unknown',
    removedOutliers: 0,
    warning: '',
  };
}

function buildLiquidityMap(historyEntries = [], historyMetrics = []) {
  if (historyMetrics.length > 0) {
    return historyMetrics.reduce((acc, metric) => {
      const city = metric.location || metric.city;
      const quality = Number(metric.quality || 1);
      if (!city) return acc;
      acc[`${city}-${quality}`] = {
        avg24h: Number(metric.avg24h || 0),
        avg7d: Number(metric.avg7d || 0),
        volume24h: Number(metric.volume24h || 0),
        volume7d: Number(metric.volume7d || 0),
        volumePerDay: Number(metric.volumePerDay || 0),
        newestDate: metric.newestDate ? new Date(metric.newestDate) : null,
        ageHours: metric.ageHours ?? null,
        trend7dPct: metric.trend7dPct ?? null,
        liquidityScore: metric.liquidityScore || 'unknown',
        removedOutliers: Number(metric.removedOutliers || 0),
        warning: '',
      };
      return acc;
    }, {});
  }

  const map = {};
  const now = Date.now();

  for (const entry of historyEntries) {
    const city = entry.location || entry.city || entry.Location || entry.City;
    const quality = Number(entry.quality || entry.Quality || 1);
    if (!city) continue;

    const rows = Array.isArray(entry.data) ? entry.data : Array.isArray(entry.Data) ? entry.Data : [];
    const normalized = rows
      .map((row) => ({
        date: parseHistoryDate(row),
        price: Number(row.avg_price ?? row.average_price ?? row.price ?? row.AvgPrice ?? 0),
        count: Number(row.item_count ?? row.count ?? row.volume ?? row.ItemCount ?? 0),
      }))
      .filter((row) => row.date && row.price > 0);

    const last7d = normalized.filter((row) => now - row.date.getTime() <= 7 * 864e5);
    const last24h = normalized.filter((row) => now - row.date.getTime() <= 864e5);
    const newest = normalized.reduce((best, row) => (!best || row.date > best ? row.date : best), null);

    map[`${city}-${quality}`] = {
      avg24h: weightedAverage(last24h),
      avg7d: weightedAverage(last7d),
      volume24h: sumVolume(last24h),
      volume7d: sumVolume(last7d),
      volumePerDay: sumVolume(last7d) / 7,
      newestDate: newest,
      ageHours: newest ? (now - newest.getTime()) / 36e5 : null,
      trend7dPct: null,
      liquidityScore: 'unknown',
      removedOutliers: 0,
      warning: '',
    };
  }

  return map;
}

function summarizeLiquidity(saleEntries = []) {
  const best = saleEntries[0];
  const liquidity = best?.liquidity || emptyLiquidity();
  const profit = best?.taxResults?.find((tax) => tax.key === 'premium')?.profit || 0;
  let warning = '';

  if (!liquidity.avg7d) warning = 'Sem historico recente suficiente para validar liquidez.';
  else if (profit > 0 && ['low', 'stale'].includes(liquidity.liquidityScore)) warning = 'Margem positiva, mas liquidez/idade dos dados indicam risco operacional.';
  else if (liquidity.ageHours !== null && liquidity.ageHours > 24) warning = 'Historico da melhor venda esta velho para decisao operacional.';

  return { ...liquidity, warning };
}

function parseHistoryDate(row) {
  const raw = row.timestamp || row.Timestamp || row.date || row.Date;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function weightedAverage(rows) {
  if (!rows.length) return 0;
  const weight = rows.reduce((total, row) => total + Math.max(0, row.count), 0);
  if (!weight) return Math.round(rows.reduce((total, row) => total + row.price, 0) / rows.length);
  return Math.round(rows.reduce((total, row) => total + row.price * Math.max(0, row.count), 0) / weight);
}

function sumVolume(rows) {
  return rows.reduce((total, row) => total + Math.max(0, row.count), 0);
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function inferJournalInfo(recipe) {
  if (!recipe?.tier) return null;
  const tier = `T${recipe.tier}`;
  const sub = recipe.shop_sub_category || '';
  const category = recipe.shop_category || '';
  let family = null;

  if (category === 'tools') family = 'TOOLMAKER';
  else if (['platearmor', 'sword', 'axe', 'mace', 'hammer', 'crossbow'].includes(sub)) family = 'WARRIOR';
  else if (['leatherarmor', 'bow', 'dagger', 'spear', 'quarterstaff'].includes(sub)) family = 'HUNTER';
  else if (['clotharmor', 'arcanestaff', 'cursedstaff', 'firestaff', 'froststaff', 'holystaff', 'naturestaff'].includes(sub)) family = 'MAGE';
  else if (category === 'weapons') family = 'WARRIOR';

  if (!family) return null;

  return {
    family,
    name: journalName(family),
    emptyId: `${tier}_JOURNAL_${family}_EMPTY`,
    fullId: `${tier}_JOURNAL_${family}_FULL`,
  };
}

function journalName(family) {
  const names = {
    WARRIOR: 'Ferreiro',
    HUNTER: 'Flecheiro',
    MAGE: 'Imbuidor',
    TOOLMAKER: 'Funileiro',
  };
  return names[family] || family;
}

function buildJournalPlan({ journalInfo, entries, producedQuantity, journalEnabled, manualEmptyJournalPrice, manualFullJournalPrice, maxAgeHours, famePerCraft, runs }) {
  if (!journalEnabled || !journalInfo) {
    return { name: 'Nao aplicado', emptyPrice: 0, fullPrice: 0, count: 0, netReturn: 0, fameGenerated: 0 };
  }

  const emptyPrice = Number(manualEmptyJournalPrice || 0) || bestPriceForItem(entries, journalInfo.emptyId, 'sell', maxAgeHours);
  const fullPrice = Number(manualFullJournalPrice || 0) || bestPriceForItem(entries, journalInfo.fullId, 'sell', maxAgeHours);
  const count = producedQuantity;
  const netReturn = Math.round((fullPrice - emptyPrice) * count);

  return {
    ...journalInfo,
    emptyPrice,
    fullPrice,
    count,
    netReturn,
    fameGenerated: Number(famePerCraft || 0) * Number(runs || 1),
  };
}

function bestPriceForItem(entries, itemId, priceType, maxAgeHours) {
  return entries
    .filter((entry) => entry.item_id === itemId)
    .map((entry) => enrichEntryPrice(entry, priceType, maxAgeHours))
    .filter((entry) => entry.price > 0)
    .sort((a, b) => a.price - b.price)[0]?.price || 0;
}

function premiumResultFrom(bestSale) {
  return bestSale?.taxResults?.find((tax) => tax.key === 'premium')?.profit ?? null;
}

function buildTransportPlan({ selectedCost, bestSale, producedQuantity, premiumProfit, transportCapacity, transportCost, recipe, transportOrigin, transportDestination, transportMount, minProfitPerTrip }) {
  const materialWeight = selectedCost.shoppingList.reduce((total, row) => total + Number(row.weight || 0) * row.quantity, 0);
  const productWeight = Number(recipe?.weight || 0) * producedQuantity;
  const totalWeight = materialWeight + productWeight;
  const mount = TRANSPORT_MOUNTS[transportMount] || TRANSPORT_MOUNTS.ox;
  const effectiveCapacity = Number(transportCapacity || 0) > 0 ? Number(transportCapacity) : mount.capacity;
  const trips = Math.max(1, Math.ceil(totalWeight / Math.max(1, effectiveCapacity)));
  const routeBaseRisk = transportDestination === BLACK_MARKET ? ROUTE_RISK[transportOrigin] ?? 0.1 : Math.max(0.01, (ROUTE_RISK[transportOrigin] || 0.05) / 2);
  const routeRiskPercent = routeBaseRisk * mount.riskMultiplier * 100;
  const routeCost = Number(transportCost || 0) * trips;
  const netProfit = premiumProfit === null ? null : premiumProfit - routeCost;
  const buyCities = [...new Set(selectedCost.shoppingList.map((row) => row.purchaseCity).filter(Boolean))].join(', ');
  const profitPerTrip = netProfit === null ? null : Math.round(netProfit / trips);
  let warning = '';
  if (totalWeight > effectiveCapacity * trips) warning = 'Peso excede a capacidade planejada.';
  else if (routeRiskPercent >= 12) warning = 'Rota com risco alto; valide escolta, horario e montaria.';
  else if (profitPerTrip !== null && profitPerTrip < Number(minProfitPerTrip || 0)) warning = 'Lucro por viagem abaixo do minimo configurado.';

  return {
    buyCities,
    sellCity: transportDestination || bestSale?.city || null,
    origin: transportOrigin,
    destination: transportDestination,
    mountLabel: mount.label,
    capacity: effectiveCapacity,
    routeRiskPercent,
    totalWeight,
    trips,
    routeCost,
    profitPerTrip,
    profitPerKg: netProfit === null || totalWeight <= 0 ? null : Math.round(netProfit / totalWeight),
    warning,
  };
}

function readSavedPreset() {
  try {
    return JSON.parse(localStorage.getItem('albion_craft_preset') || '{}');
  } catch {
    return {};
  }
}

function readUrlPreset() {
  const params = new URLSearchParams(window.location.search);
  const preset = {};
  for (const [key, value] of params.entries()) {
    if (key.startsWith('craft_')) {
      const cleanKey = key.replace('craft_', '');
      try {
        preset[cleanKey] = value.startsWith('{') ? JSON.parse(value) : value;
      } catch {
        preset[cleanKey] = value;
      }
    }
  }
  return preset;
}

function collectPresetState(state) {
  return state;
}

async function sharePreset({ item, server, state }, setShareMessage) {
  const params = new URLSearchParams();
  params.set('tab', 'craft');
  if (item?.id) params.set('item', item.id);
  if (server) params.set('server', server);
  for (const [key, value] of Object.entries(state)) {
    params.set(`craft_${key}`, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  try {
    await navigator.clipboard.writeText(url);
    setShareMessage('Link copiado');
  } catch {
    window.history.replaceState(null, '', url);
    setShareMessage('URL atualizada');
  }
  window.setTimeout(() => setShareMessage(''), 2500);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function expandInternalCrafts({ ingredients, internalCraftIds, internalRecipes, runs }) {
  return mergeIngredients(expandInternalRows({ rows: ingredients, internalCraftIds, internalRecipes, multiplier: runs, depth: 0, source: null }));
}

function expandInternalRows({ rows, internalCraftIds, internalRecipes, multiplier, depth, source }) {
  if (depth > 8) {
    return rows.map((row) => ({ ...row, count: row.count * multiplier, craftable: isLikelyCraftable(row.id), internalSource: source }));
  }

  return rows.flatMap((ingredient) => {
    const quantity = ingredient.count * multiplier;
    const internalRecipe = internalCraftIds.includes(ingredient.id) ? internalRecipes[ingredient.id] : null;
    if (!internalRecipe?.ingredients?.length) {
      return [{ ...ingredient, count: quantity, craftable: isLikelyCraftable(ingredient.id), internalSource: source }];
    }

    const internalRuns = Math.ceil(quantity / Math.max(1, internalRecipe.amount_crafted || 1));
    return expandInternalRows({
      rows: internalRecipe.ingredients,
      internalCraftIds,
      internalRecipes,
      multiplier: internalRuns,
      depth: depth + 1,
      source: source || ingredient.name,
    });
  });
}

function collectMissingInternalRecipeIds(internalCraftIds, internalRecipes) {
  const selected = new Set(internalCraftIds);
  const missing = new Set();

  for (const id of selected) {
    if (!internalRecipes[id]) missing.add(id);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...selected]) {
      const recipe = internalRecipes[id];
      if (!recipe?.ingredients?.length) continue;
      for (const ingredient of recipe.ingredients) {
        if (!isLikelyCraftable(ingredient.id)) continue;
        selected.add(ingredient.id);
        if (!internalRecipes[ingredient.id] && !missing.has(ingredient.id)) {
          missing.add(ingredient.id);
          changed = true;
        }
      }
    }
  }

  return [...missing];
}

function collectRecursiveIngredientIds(internalRecipes) {
  const ids = new Set();
  for (const recipe of Object.values(internalRecipes)) {
    collectRecipeIngredientIds(recipe, internalRecipes, ids, 0);
  }
  return [...ids];
}

function collectRecipeIngredientIds(recipe, internalRecipes, ids, depth) {
  if (!recipe?.ingredients?.length || depth > 8) return;
  for (const ingredient of recipe.ingredients) {
    ids.add(ingredient.id);
    collectRecipeIngredientIds(internalRecipes[ingredient.id], internalRecipes, ids, depth + 1);
  }
}

function mergeIngredients(rows) {
  const byId = new Map();
  for (const row of rows) {
    const current = byId.get(row.id);
    if (!current) {
      byId.set(row.id, { ...row });
    } else {
      current.count += row.count;
      current.internalSource = current.internalSource || row.internalSource;
      current.craftable = current.craftable || row.craftable;
    }
  }
  return [...byId.values()];
}

function isLikelyCraftable(itemId) {
  return /^T\d+_(METALBAR|PLANKS|LEATHER|CLOTH|STONEBLOCK|ARTEFACT)/.test(itemId || '');
}

function optimizeInternalCrafts({ ingredients, internalRecipes, ingredientEntries, runs, rrr, materialPriceType, maxAgeHours, manualMaterialPrices }) {
  const decisions = [];
  const rows = ingredients.flatMap((ingredient) => {
    const quantity = ingredient.count * runs;
    const decision = compareBuyVsCraft({
      ingredient,
      quantity,
      internalRecipes,
      ingredientEntries,
      rrr,
      materialPriceType,
      maxAgeHours,
      manualMaterialPrices,
      depth: 0,
    });
    if (decision) decisions.push(decision);
    return decision?.choice === 'craft' ? decision.rows : [{ ...ingredient, count: quantity, craftable: isLikelyCraftable(ingredient.id) }];
  });

  return { ingredients: mergeIngredients(rows), decisions };
}

function compareBuyVsCraft({ ingredient, quantity, internalRecipes, ingredientEntries, rrr, materialPriceType, maxAgeHours, manualMaterialPrices, depth }) {
  const recipe = internalRecipes[ingredient.id];
  if (!recipe?.ingredients?.length || depth > 8) return null;

  const buyUnit = bestIngredientUnitPrice({ itemId: ingredient.id, entries: ingredientEntries, materialPriceType, maxAgeHours, manualMaterialPrices });
  const buyCost = buyUnit * quantity;
  const internalRuns = Math.ceil(quantity / Math.max(1, recipe.amount_crafted || 1));
  const childRows = [];
  let craftRawCost = 0;
  let craftReturnableCost = 0;

  for (const child of recipe.ingredients) {
    const childQuantity = child.count * internalRuns;
    const childDecision = compareBuyVsCraft({
      ingredient: child,
      quantity: childQuantity,
      internalRecipes,
      ingredientEntries,
      rrr,
      materialPriceType,
      maxAgeHours,
      manualMaterialPrices,
      depth: depth + 1,
    });

    if (childDecision?.choice === 'craft') {
      childRows.push(...childDecision.rows.map((row) => ({ ...row, internalSource: ingredient.name || ingredient.id })));
      craftRawCost += childDecision.craftCost;
    } else {
      const unit = bestIngredientUnitPrice({ itemId: child.id, entries: ingredientEntries, materialPriceType, maxAgeHours, manualMaterialPrices });
      const total = unit * childQuantity;
      craftRawCost += total;
      if (child.returnable) craftReturnableCost += total;
      childRows.push({ ...child, count: childQuantity, craftable: isLikelyCraftable(child.id), internalSource: ingredient.name || ingredient.id });
    }
  }

  const craftCost = Math.round(craftRawCost - craftReturnableCost * Number(rrr || 0));
  const shouldCraft = craftCost > 0 && (buyCost <= 0 || craftCost < buyCost);
  return {
    id: ingredient.id,
    name: ingredient.name || ingredient.id,
    choice: shouldCraft ? 'craft' : 'buy',
    buyCost,
    craftCost,
    returnableCost: craftReturnableCost,
    savings: shouldCraft ? buyCost - craftCost : craftCost - buyCost,
    rows: childRows,
  };
}

function bestIngredientUnitPrice({ itemId, entries, materialPriceType, maxAgeHours, manualMaterialPrices }) {
  if (materialPriceType === 'manual') return Number(manualMaterialPrices[itemId] || 0);
  return entries
    .filter((entry) => entry.item_id === itemId)
    .map((entry) => enrichEntryPrice(entry, materialPriceType, maxAgeHours))
    .filter((entry) => entry.price > 0)
    .sort((a, b) => a.price - b.price)[0]?.price || Number(manualMaterialPrices[itemId] || 0);
}

function buildQualityModel({ baseChances, specBonus, foodBonus, stationBonus, minQualityTarget, rerollCost, producedQuantity }) {
  const bonus = Number(specBonus || 0) + Number(foodBonus || 0) + Number(stationBonus || 0);
  const shift = Math.min(0.65, bonus / 300);
  const chances = {};
  let carry = 0;

  for (const quality of QUALITY_CHANCES) {
    const base = Number(baseChances[quality.key] || 0);
    const moved = quality.quality < 5 ? base * shift : 0;
    chances[quality.key] = base - moved + carry;
    carry = moved;
  }

  const normalizedTotal = QUALITY_CHANCES.reduce((total, quality) => total + chances[quality.key], 0) || 1;
  for (const quality of QUALITY_CHANCES) {
    chances[quality.key] = (chances[quality.key] / normalizedTotal) * 100;
  }

  const rerollPlan = estimateRerollRounds(chances, minQualityTarget);
  const totalRerollCost = rerollPlan.estimatedRerollRounds * Number(rerollCost || 0) * Number(producedQuantity || 0);
  return { chances, bonus, rerollPlan, totalRerollCost };
}

function buildCalibrationReport({ effectiveRrr, focusCost, targetChance, observedRrr, observedFocus, observedTargetChance }) {
  const reference = validateCraftingModel();
  const manual = {
    rrrDelta: Number(observedRrr || 0) > 0 ? Number(observedRrr) - Number(effectiveRrr || 0) * 100 : null,
    focusDelta: Number(observedFocus || 0) > 0 ? Number(observedFocus) - Number(focusCost || 0) : null,
    targetChanceDelta: Number(observedTargetChance || 0) > 0 ? Number(observedTargetChance) - Number(targetChance || 0) : null,
  };
  return {
    reference,
    manual,
    total: reference.length,
    passed: reference.filter((row) => row.passed).length,
    failed: reference.filter((row) => !row.passed).length,
  };
}

function simulateQualityScenarios({ qualityRows, selectedCost, journalPlan, rerollCost, minQualityTarget, producedQuantity }) {
  const batches = [10, 100, 1000];
  const unitCount = Math.max(1, Number(producedQuantity || 1));
  const perCraftCost = selectedCost.totalCost / unitCount + Number(rerollCost || 0) - journalPlan.netReturn / unitCount;
  const targetChance = qualityRows
    .filter((row) => row.quality >= Number(minQualityTarget || 4))
    .reduce((total, row) => total + Number(row.chance || 0), 0) / 100;

  return batches.map((crafts) => {
    const expectedSellRevenue = qualityRows.reduce((total, row) => {
      const price = row.sale?.price || 0;
      return total + price * crafts * (Number(row.chance || 0) / 100) * 0.96;
    }, 0);
    const targetRows = qualityRows.filter((row) => row.quality >= Number(minQualityTarget || 4) && row.sale);
    const targetPrice = targetRows.sort((a, b) => (b.sale?.price || 0) - (a.sale?.price || 0))[0]?.sale?.price || 0;
    const expectedAttempts = targetChance > 0 ? crafts / targetChance : crafts;
    const rerollProfit = Math.round(targetPrice * crafts * 0.96 - (selectedCost.totalCost / unitCount) * crafts - Number(rerollCost || 0) * Math.max(0, expectedAttempts - crafts) + (journalPlan.netReturn / unitCount) * crafts);
    const ruinProbability = targetChance > 0 ? Math.pow(1 - targetChance, crafts) * 100 : 100;

    return {
      label: `${crafts} crafts`,
      crafts,
      sellAllProfit: Math.round(expectedSellRevenue - perCraftCost * crafts),
      rerollProfit,
      ruinProbability,
    };
  });
}

function buildBlackMarketPlan({ blackMarketSale, royalSale, producedQuantity, selectedCost, journalPlan, rerollTotal, fixedRiskCost, riskPercent, routeCost, minProfit, craftCity }) {
  if (!blackMarketSale) {
    return {
      profit: null,
      riskReserve: Number(fixedRiskCost || 0) + Number(routeCost || 0),
      minimumAcceptablePrice: null,
      marginOverMinimum: null,
      routeVerdict: 'Sem preco BM',
      route: `${craftCity} -> Caerleon`,
    };
  }

  const gross = blackMarketSale.price * producedQuantity;
  const riskReserve = Math.round(gross * (Number(riskPercent || 0) / 100)) + Number(fixedRiskCost || 0) + Number(routeCost || 0);
  const baseCost = selectedCost.totalCost - journalPlan.netReturn + rerollTotal + riskReserve;
  const netRevenue = Math.round(gross * 0.96);
  const profit = netRevenue - selectedCost.totalCost + journalPlan.netReturn - rerollTotal - riskReserve;
  const minimumAcceptablePrice = producedQuantity > 0 ? Math.ceil((baseCost + Number(minProfit || 0)) / (producedQuantity * 0.96)) : null;
  const marginOverMinimum = minimumAcceptablePrice === null ? null : Math.round((blackMarketSale.price - minimumAcceptablePrice) * producedQuantity * 0.96);
  const royalProfit = royalSale ? Math.round(royalSale.price * producedQuantity * 0.96) - selectedCost.totalCost + journalPlan.netReturn - rerollTotal : null;
  const routeVerdict = royalProfit === null ? 'Sem comparavel Royal' : profit >= royalProfit ? 'BM melhor' : 'Royal melhor';

  return {
    profit,
    riskReserve,
    minimumAcceptablePrice,
    marginOverMinimum,
    routeVerdict,
    route: `${craftCity} -> Caerleon`,
  };
}

function addCurrentCraftToPlan({ item, recipe, analysis, craftCity, effectiveRrr, useFocus, craftPlan, setCraftPlan }) {
  if (!item || !recipe || !analysis) return;
  const premiumProfit = analysis.bestSale?.taxResults?.find((tax) => tax.key === 'premium')?.profit || 0;
  const snapshot = {
    key: `${item.id}-${Date.now()}`,
    id: item.id,
    name: item.name_pt || item.name,
    runs: analysis.safeRuns,
    city: craftCity,
    rrr: effectiveRrr,
    useFocus,
    cost: analysis.selectedCost.totalCost,
    profit: premiumProfit,
    weight: analysis.transport.totalWeight,
    focus: analysis.focusStats.focusCost,
    shopping: Object.values(analysis.shoppingByCity || {}).flat(),
    sales: Object.values(analysis.saleByCity || {}).flat(),
  };
  setCraftPlan([...craftPlan, snapshot]);
}

function saveCraftPlan({ planName, craftPlan, savedPlans, setSavedPlans }) {
  if (!craftPlan.length) return;
  const name = (planName || 'Plano sem nome').trim();
  const snapshot = {
    key: `${slugify(name)}-${Date.now()}`,
    name,
    savedAt: new Date().toISOString(),
    plan: craftPlan,
  };
  setSavedPlans([snapshot, ...savedPlans.filter((plan) => plan.name !== name)].slice(0, 12));
}

function loadCraftPlan({ key, savedPlans, setPlanName, setCraftPlan }) {
  const saved = savedPlans.find((plan) => plan.key === key);
  if (!saved) return;
  setPlanName(saved.name);
  setCraftPlan(saved.plan || []);
}

function updateCraftPlanRuns({ key, runs, plan, setCraftPlan }) {
  const safeRuns = Math.max(1, Number(runs) || 1);
  setCraftPlan(plan.map((craft) => {
    if (craft.key !== key) return craft;
    const factor = safeRuns / Math.max(1, Number(craft.runs || 1));
    return {
      ...craft,
      runs: safeRuns,
      cost: Math.round((craft.cost || 0) * factor),
      profit: Math.round((craft.profit || 0) * factor),
      weight: (craft.weight || 0) * factor,
      focus: Math.round((craft.focus || 0) * factor),
      shopping: scalePlanRows(craft.shopping || [], factor),
      sales: scalePlanRows(craft.sales || [], factor),
    };
  }));
}

function scalePlanRows(rows, factor) {
  return rows.map((row) => ({
    ...row,
    quantity: Math.round((row.quantity || 0) * factor),
    total: Math.round((row.total || 0) * factor),
    gross: Math.round((row.gross || 0) * factor),
    estimatedValue: Math.round((row.estimatedValue || 0) * factor),
  }));
}

function aggregateCraftPlan(plan) {
  const totals = {
    cost: 0,
    profit: 0,
    weight: 0,
    focus: 0,
    shoppingByCity: {},
    saleByCity: {},
  };

  for (const craft of plan) {
    totals.cost += craft.cost || 0;
    totals.profit += craft.profit || 0;
    totals.weight += craft.weight || 0;
    totals.focus += craft.focus || 0;
    appendRows(totals.shoppingByCity, craft.shopping || [], 'purchaseCity');
    appendRows(totals.saleByCity, craft.sales || [], 'city');
  }

  totals.shoppingByCity = compactGroupedRows(totals.shoppingByCity);
  totals.saleByCity = compactGroupedRows(totals.saleByCity);
  return totals;
}

function appendRows(target, rows, cityKey) {
  for (const row of rows) {
    const city = row[cityKey] || 'Manual';
    if (!target[city]) target[city] = [];
    target[city].push(row);
  }
}

function compactGroupedRows(groups) {
  const compacted = {};
  for (const [city, rows] of Object.entries(groups)) {
    const byId = new Map();
    for (const row of rows) {
      const key = `${row.id}-${row.quality || ''}`;
      const current = byId.get(key);
      if (!current) byId.set(key, { ...row });
      else {
        current.quantity += row.quantity || 0;
        current.total = (current.total || 0) + (row.total || 0);
        current.gross = (current.gross || 0) + (row.gross || 0);
        current.estimatedValue = (current.estimatedValue || 0) + (row.estimatedValue || 0);
      }
    }
    compacted[city] = [...byId.values()];
  }
  return compacted;
}
