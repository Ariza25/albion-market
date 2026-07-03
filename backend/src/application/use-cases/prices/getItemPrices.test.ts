import { describe, expect, it } from 'vitest';
import * as getItemPricesModule from './getItemPrices';
import * as getMultiItemPricesModule from './getMultiItemPrices';

const { getItemPrices } = getItemPricesModule as any;
const { getMultiItemPrices } = getMultiItemPricesModule as any;

describe('price use cases', () => {
  const repository = {
    getPrices: async () => [
      {
        item_id: 'T4_BAG',
        city: 'Caerleon',
        quality: 1,
        data_quality: { confidence: 'high' },
      },
    ],
    getPricesByCity: async () => ({
      Caerleon: [{ item_id: 'T4_BAG', city: 'Caerleon', quality: 1, data_quality: { confidence: 'high' } }],
    }),
    summarizePriceQuality: (entries) => ({ total: entries.length, high: entries.length }),
  };

  it('returns normalized item prices', async () => {
    const result = await getItemPrices(
      { itemId: 't4_bag', locations: ['Caerleon'], qualities: [1], groupByCity: false, server: 'america' },
      repository,
    );

    expect(result.item_id).toBe('T4_BAG');
    expect(result.prices).toHaveLength(1);
    expect(result.data_quality).toEqual({ total: 1, high: 1 });
  });

  it('returns grouped prices when requested', async () => {
    const result = await getItemPrices(
      { itemId: 't4_bag', locations: ['Caerleon'], qualities: [1], groupByCity: true, server: 'america' },
      repository,
    );

    expect(result.grouped_by_city.Caerleon).toHaveLength(1);
    expect(result.data_quality.total).toBe(1);
  });

  it('returns multiple item prices with normalized ids', async () => {
    const result = await getMultiItemPrices(
      { items: ['t4_bag'], locations: ['Caerleon'], qualities: [1], server: 'america' },
      repository,
    );

    expect(result.items).toEqual(['T4_BAG']);
    expect(result.prices).toHaveLength(1);
  });
});
