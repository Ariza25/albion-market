export function createAlbionMarketRepository() {
  const albionService = require('../services/albionService');

  return {
    getPrices: albionService.getPrices,
    getPricesByCity: albionService.getPricesByCity,
    getHistory: albionService.getHistory,
    getGoldPrices: albionService.getGoldPrices,
    summarizePriceQuality: albionService.summarizePriceQuality,
  };
}
