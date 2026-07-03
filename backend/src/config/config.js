const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
require('dotenv').config({ quiet: true });

const SERVERS = {
  europe: 'https://europe.albion-online-data.com',
  west: 'https://west.albion-online-data.com',
  east: 'https://east.albion-online-data.com',
};

const server = process.env.ALBION_SERVER || 'europe';

if (!SERVERS[server]) {
  throw new Error(`Invalid ALBION_SERVER: "${server}". Must be one of: ${Object.keys(SERVERS).join(', ')}`);
}

const MAIN_CITIES = [
  'Caerleon',
  'Bridgewatch',
  'Lymhurst',
  'Fort Sterling',
  'Thetford',
  'Martlock',
  'Brecilien',
];

const ALL_LOCATIONS = [
  ...MAIN_CITIES,
  'Black Market',
  'Swamp Cross',
  'Steppe Cross',
  'Forest Cross',
  'Highland Cross',
  'Mountain Cross',
];

const QUALITY_LABELS = {
  1: 'Normal',
  2: 'Good',
  3: 'Outstanding',
  4: 'Excellent',
  5: 'Masterpiece',
};

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  server,
  baseUrl: SERVERS[server],
  cacheTtl: {
    prices: parseInt(process.env.CACHE_TTL_PRICES, 10) || 300,
    history: parseInt(process.env.CACHE_TTL_HISTORY, 10) || 3600,
    gold: parseInt(process.env.CACHE_TTL_GOLD, 10) || 600,
    crafting: parseInt(process.env.CACHE_TTL_CRAFTING, 10) || 86400,
  },
  persistentCache: {
    enabled: process.env.PERSISTENT_CACHE !== 'false',
    dir: process.env.PERSISTENT_CACHE_DIR || path.join(process.cwd(), '.cache', 'albion-data'),
  },
  albionApi: {
    timeoutMs: parseInt(process.env.ALBION_API_TIMEOUT_MS, 10) || 15000,
    retries: parseInt(process.env.ALBION_API_RETRIES, 10) || 2,
    backoffMs: parseInt(process.env.ALBION_API_BACKOFF_MS, 10) || 350,
    maxBatchItems: parseInt(process.env.ALBION_API_MAX_BATCH_ITEMS, 10) || 80,
  },
  defaultLocations: (process.env.DEFAULT_LOCATIONS || MAIN_CITIES.join(',')).split(',').map(l => l.trim()),
  mainCities: MAIN_CITIES,
  allLocations: ALL_LOCATIONS,
  qualityLabels: QUALITY_LABELS,
};

module.exports = config;
