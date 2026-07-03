import { createAlbionMarketRepository } from '../../repositories/albionMarketRepository';

export async function getItemPrices(input, repository = createAlbionMarketRepository()) {
  const itemId = input.itemId.toUpperCase();
  const options = {
    locations: input.locations,
    qualities: input.qualities,
    server: input.server,
  };

  if (input.groupByCity) {
    const grouped = await repository.getPricesByCity(itemId, options);
    const flat = Object.values(grouped).flat();
    return {
      item_id: itemId,
      grouped_by_city: grouped,
      data_quality: repository.summarizePriceQuality(flat),
    };
  }

  const prices = await repository.getPrices(itemId, options);
  return {
    item_id: itemId,
    prices,
    data_quality: repository.summarizePriceQuality(prices),
  };
}
