const { analyzeHistory } = require('../../services/historyAnalytics');
import { createAlbionMarketRepository } from '../../repositories/albionMarketRepository';

export async function getItemHistory(input, repository = createAlbionMarketRepository()) {
  const itemId = input.itemId.toUpperCase();
  const history = await repository.getHistory(itemId, {
    locations: input.locations,
    qualities: input.qualities,
    timescale: input.timescale,
    server: input.server,
    date: input.date,
    endDate: input.endDate,
  });

  return {
    item_id: itemId,
    history,
    metrics: analyzeHistory(history),
    metrics_source: 'Albion Data history, IQR outlier filter, weighted averages by item_count',
  };
}
