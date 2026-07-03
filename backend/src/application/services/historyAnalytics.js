const DAY_MS = 24 * 60 * 60 * 1000;

function analyzeHistory(historyEntries = []) {
  const now = Date.now();

  return historyEntries.map((entry) => {
    const city = entry.location || entry.city || entry.Location || entry.City;
    const quality = Number(entry.quality || entry.Quality || 1);
    const rows = normalizeRows(entry.data || entry.Data || []);
    const filtered = removeOutliers(rows);
    const last24h = filtered.filter((row) => now - row.date.getTime() <= DAY_MS);
    const last7d = filtered.filter((row) => now - row.date.getTime() <= 7 * DAY_MS);
    const previous7d = filtered.filter((row) => now - row.date.getTime() > 7 * DAY_MS && now - row.date.getTime() <= 14 * DAY_MS);
    const newest = filtered.reduce((best, row) => (!best || row.date > best ? row.date : best), null);
    const avg7d = weightedAverage(last7d);
    const prevAvg7d = weightedAverage(previous7d);
    const volume7d = sumVolume(last7d);
    const volumePerDay = volume7d / 7;
    const ageHours = newest ? (now - newest.getTime()) / 36e5 : null;

    return {
      city,
      location: city,
      quality,
      avg24h: weightedAverage(last24h),
      avg7d,
      volume24h: sumVolume(last24h),
      volume7d,
      volumePerDay,
      trend7dPct: prevAvg7d > 0 ? ((avg7d - prevAvg7d) / prevAvg7d) * 100 : null,
      ageHours,
      newestDate: newest ? newest.toISOString() : null,
      sampleCount: filtered.length,
      removedOutliers: rows.length - filtered.length,
      liquidityScore: liquidityScore({ volumePerDay, ageHours, sampleCount: filtered.length }),
    };
  });
}

function normalizeRows(rows) {
  return rows
    .map((row) => {
      const date = parseDate(row.timestamp || row.Timestamp || row.date || row.Date);
      return {
        date,
        avgPrice: Number(row.avg_price ?? row.average_price ?? row.price ?? row.AvgPrice ?? 0),
        itemCount: Number(row.item_count ?? row.count ?? row.volume ?? row.ItemCount ?? 0),
      };
    })
    .filter((row) => row.date && row.avgPrice > 0);
}

function removeOutliers(rows) {
  if (rows.length < 6) return rows;
  const prices = rows.map((row) => row.avgPrice).sort((a, b) => a - b);
  const q1 = percentile(prices, 0.25);
  const q3 = percentile(prices, 0.75);
  const iqr = q3 - q1;
  if (iqr <= 0) return rows;
  const min = q1 - iqr * 1.5;
  const max = q3 + iqr * 1.5;
  return rows.filter((row) => row.avgPrice >= min && row.avgPrice <= max);
}

function percentile(values, ratio) {
  const index = (values.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (index - lower);
}

function weightedAverage(rows) {
  if (!rows.length) return 0;
  const weight = rows.reduce((total, row) => total + Math.max(0, row.itemCount), 0);
  if (!weight) return Math.round(rows.reduce((total, row) => total + row.avgPrice, 0) / rows.length);
  return Math.round(rows.reduce((total, row) => total + row.avgPrice * Math.max(0, row.itemCount), 0) / weight);
}

function sumVolume(rows) {
  return rows.reduce((total, row) => total + Math.max(0, row.itemCount), 0);
}

function liquidityScore({ volumePerDay, ageHours, sampleCount }) {
  if (!sampleCount || ageHours === null || ageHours > 72) return 'stale';
  if (volumePerDay >= 20 && ageHours <= 12) return 'high';
  if (volumePerDay >= 5 && ageHours <= 24) return 'medium';
  return 'low';
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = { analyzeHistory };
