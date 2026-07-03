import { describe, expect, it } from 'vitest';
import * as historyAnalytics from './historyAnalytics';

const { analyzeHistory } = historyAnalytics as any;

describe('historyAnalytics', () => {
  it('calculates liquidity and weighted prices from Albion history rows', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const rows = [
      {
        location: 'Caerleon',
        quality: 1,
        data: [
          { item_count: 10, avg_price: 100, timestamp: yesterday },
          { item_count: 20, avg_price: 200, timestamp: now.toISOString() },
        ],
      },
    ];

    const [result] = analyzeHistory(rows);

    expect(result.volume7d).toBe(30);
    expect(result.avg7d).toBe(167);
    expect(result.liquidityScore).toBe('low');
    expect(result.sampleCount).toBe(2);
  });

  it('handles empty history safely', () => {
    expect(analyzeHistory([])).toEqual([]);
  });
});
