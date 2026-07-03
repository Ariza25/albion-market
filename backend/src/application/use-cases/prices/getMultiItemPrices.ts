import { createAlbionMarketRepository } from '../../repositories/albionMarketRepository';

export async function getMultiItemPrices(input, repository = createAlbionMarketRepository()) {
  const items = input.items.map((item) => item.toUpperCase());
  const prices = await repository.getPrices(items, {
    locations: input.locations,
    qualities: input.qualities,
    server: input.server,
  });

  return {
    items,
    prices,
    data_quality: repository.summarizePriceQuality(prices),
  };
}
