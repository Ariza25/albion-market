const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config/config');

const cacheDir = config.persistentCache.dir;

function get(cacheType, key, ttlSeconds, options: any = {}) {
  if (!config.persistentCache.enabled) return null;
  const file = cacheFile(cacheType, key);
  try {
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ageSeconds = (Date.now() - Date.parse(payload.stored_at)) / 1000;
    const expired = ageSeconds > ttlSeconds;
    if (expired && !options.allowStale) return null;
    return {
      data: payload.data,
      stored_at: payload.stored_at,
      age_seconds: Math.max(0, Math.round(ageSeconds)),
      expired,
      source: expired ? 'persistent-cache-stale' : 'persistent-cache',
    };
  } catch {
    return null;
  }
}

function set(cacheType, key, data) {
  if (!config.persistentCache.enabled) return;
  const file = cacheFile(cacheType, key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ stored_at: new Date().toISOString(), data }));
}

function stats() {
  if (!fs.existsSync(cacheDir)) return { enabled: config.persistentCache.enabled, entries: 0, bytes: 0, dir: cacheDir };
  let entries = 0;
  let bytes = 0;
  for (const file of walk(cacheDir)) {
    entries += 1;
    bytes += fs.statSync(file).size;
  }
  return { enabled: config.persistentCache.enabled, entries, bytes, dir: cacheDir };
}

function cacheFile(cacheType, key) {
  const digest = crypto.createHash('sha1').update(key).digest('hex');
  return path.join(cacheDir, cacheType, `${digest}.json`);
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

module.exports = { get, set, stats };

export {};
