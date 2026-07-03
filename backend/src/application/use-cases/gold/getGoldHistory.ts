import { createAlbionMarketRepository } from '../../repositories/albionMarketRepository';

export async function getGoldHistory(input, repository = createAlbionMarketRepository()) {
  const history = await repository.getGoldPrices({
    count: input.count,
    server: input.server,
    date: input.date,
    endDate: input.endDate,
  });

  return {
    latest_price: history.length > 0 ? history[history.length - 1] : null,
    count: history.length,
    history,
  };
}
