const { connect, StringCodec } = require('nats');
const config = require('../../config/config');
const { ingestMarketMessage, getLocalMarketStats } = require('./localMarketStore');

const codec = StringCodec();

const status = {
  enabled: config.albionNats.enabled,
  connected: false,
  url: config.albionNats.url,
  topic: config.albionNats.topic,
  messages: 0,
  orders: 0,
  lastMessageAt: null,
  lastError: null,
};

let connection = null;
let started = false;

async function startAlbionNats() {
  if (!config.albionNats.enabled || started) return;
  started = true;

  try {
    connection = await connect({
      ...buildNatsConnectionOptions(config.albionNats.url),
      name: 'albion-market-backend',
      timeout: 10000,
      reconnect: true,
      maxReconnectAttempts: -1,
    });
    status.connected = true;

    const subscription = connection.subscribe(config.albionNats.topic);
    console.log(`[Albion NATS] Connected to ${config.albionNats.url}, subscribed to ${config.albionNats.topic}`);

    (async () => {
      for await (const message of subscription) {
        try {
          const payload = JSON.parse(codec.decode(message.data));
          const orderCount = ingestMarketMessage(payload);
          status.messages += 1;
          status.orders += orderCount;
          status.lastMessageAt = new Date().toISOString();
        } catch (err) {
          status.lastError = err.message;
          console.error('[Albion NATS] Failed to process message:', err.message);
        }
      }
    })().catch((err) => {
      status.connected = false;
      status.lastError = err.message;
      console.error('[Albion NATS] Subscription stopped:', err.message);
    });

    connection.closed().then((err) => {
      status.connected = false;
      if (err) status.lastError = err.message;
    });
  } catch (err) {
    status.connected = false;
    status.lastError = err.message;
    console.error('[Albion NATS] Connection failed:', err.message);
  }
}

function getAlbionNatsStatus() {
  return {
    ...status,
    local_market: getLocalMarketStats(),
  };
}

function buildNatsConnectionOptions(url) {
  const parsed = new URL(url);
  const user = decodeURIComponent(parsed.username || '');
  const pass = decodeURIComponent(parsed.password || '');
  parsed.username = '';
  parsed.password = '';

  const options: any = { servers: parsed.toString() };
  if (user) options.user = user;
  if (pass) options.pass = pass;
  return options;
}

module.exports = { startAlbionNats, getAlbionNatsStatus };

export {};
