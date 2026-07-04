const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
require('dotenv').config({ quiet: true });

const SERVERS = {
  america: 'https://west.albion-online-data.com',
  europe: 'https://europe.albion-online-data.com',
  west: 'https://west.albion-online-data.com',
  east: 'https://east.albion-online-data.com',
};

const server = process.env.ALBION_SERVER || 'america';

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
  albionApi: {
    timeoutMs: parseInt(process.env.ALBION_API_TIMEOUT_MS, 10) || 15000,
    retries: parseInt(process.env.ALBION_API_RETRIES, 10) || 2,
    backoffMs: parseInt(process.env.ALBION_API_BACKOFF_MS, 10) || 350,
    maxBatchItems: parseInt(process.env.ALBION_API_MAX_BATCH_ITEMS, 10) || 80,
  },
  albionNats: {
    enabled: process.env.ALBION_NATS_ENABLED === 'true',
    url: process.env.ALBION_NATS_URL || 'nats://public:thenewalbiondata@nats.albion-online-data.com:4222',
    topic: process.env.ALBION_NATS_TOPIC || 'marketorders.deduped',
    maxAgeSeconds: parseInt(process.env.ALBION_NATS_MAX_AGE_SECONDS, 10) || 21600,
  },
  defaultLocations: (process.env.DEFAULT_LOCATIONS || MAIN_CITIES.join(',')).split(',').map(l => l.trim()),
  mainCities: MAIN_CITIES,
  allLocations: ALL_LOCATIONS,
  qualityLabels: QUALITY_LABELS,
};

module.exports = config;

export {};
