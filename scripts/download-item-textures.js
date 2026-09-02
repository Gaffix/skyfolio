const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'cache', 'textures');
const failureFile = path.join(projectRoot, 'cache', 'texture-download-failures.json');
const userAgent = 'Skyfolio texture cache builder (https://github.com/Gaffix/skyfolio)';
const itemApi = String(process.env.SKYCRYPT_ITEM_API || 'https://sky.shiiyu.moe/api/item').replace(/\/+$/, '');

function option(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find(argument => argument.startsWith(prefix));
  if (inline) return Number(inline.slice(prefix.length));
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? Number(process.argv[index + 1]) : fallback;
}

const force = process.argv.includes('--force');
const concurrency = Math.max(1, Math.min(8, option('concurrency', 2)));
const delayMs = Math.max(0, option('delay', 250));
const limit = Math.max(0, option('limit', 0));
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function fetchWithRetry(url, attempts = 4, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(30000),
        ...options
      });
      if (response.ok || response.status === 404) return response;
      const retryAfter = Number(response.headers.get('retry-after'));
      if (response.status !== 429 && response.status < 500) return response;
      await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 750 * attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(750 * attempt);
    }
  }
  throw lastError || new Error(`Request failed: ${url}`);
}

async function fetchItemImage(url) {
  const configuredOrigin = new URL(itemApi).origin;
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetchWithRetry(url, 4, { redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    const next = new URL(location, url);
    if (['localhost', '127.0.0.1'].includes(next.hostname)) {
      const localOrigin = new URL(configuredOrigin);
      next.protocol = localOrigin.protocol;
      next.host = localOrigin.host;
    }
    url = next.href;
  }
  throw new Error('Too many redirects');
}

async function hypixelItemIds() {
  const response = await fetchWithRetry('https://api.hypixel.net/v2/resources/skyblock/items');
  if (!response.ok) throw new Error(`Hypixel item catalog returned ${response.status}`);
  const body = await response.json();
  return (body.items || []).map(item => item.id);
}

async function neuItemIds() {
  const response = await fetchWithRetry('https://api.github.com/repos/NotEnoughUpdates/NotEnoughUpdates-REPO/git/trees/master?recursive=1');
  if (!response.ok) throw new Error(`NotEnoughUpdates catalog returned ${response.status}`);
  const body = await response.json();
  if (body.truncated) console.warn('Warning: GitHub returned a truncated NotEnoughUpdates tree.');
  return (body.tree || [])
    .map(entry => entry.path?.match(/^items\/(.+)\.json$/)?.[1])
    .filter(Boolean);
}

async function discoverIds() {
  const results = await Promise.allSettled([hypixelItemIds(), neuItemIds()]);
  const ids = new Set();
  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const id of result.value) {
        if (/^[A-Za-z0-9_;:-]{1,80}$/.test(String(id))) ids.add(String(id));
      }
    } else {
      console.warn(`Catalog warning: ${result.reason.message}`);
    }
  }
  if (!ids.size) throw new Error('No item IDs could be discovered.');
  return [...ids].sort();
}

function imageType(buffer) {
  if (buffer.length >= 8 && buffer[0] === 137 && buffer.subarray(1, 4).toString() === 'PNG') return 'png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

async function download(id) {
  const file = path.join(outputRoot, `${encodeURIComponent(id)}.png`);
  if (!force && fs.existsSync(file) && fs.statSync(file).size > 0) return 'skipped';
  const url = `${itemApi}/${encodeURIComponent(id)}`;
  const response = await fetchItemImage(url);
  if (response.status === 403 && response.headers.get('cf-mitigated') === 'challenge') {
    const error = new Error('SkyCrypt is protected by a Cloudflare browser challenge');
    error.blocked = true;
    throw error;
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!imageType(buffer)) throw new Error(`Unexpected ${response.headers.get('content-type') || 'response type'}`);
  fs.writeFileSync(file, buffer);
  return 'downloaded';
}

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  let ids = await discoverIds();
  if (limit) ids = ids.slice(0, limit);
  console.log(`Found ${ids.length} item IDs. Downloading with concurrency ${concurrency}.`);

  let cursor = 0;
  let downloaded = 0;
  let skipped = 0;
  let blockedError = null;
  const failures = [];

  async function worker() {
    while (cursor < ids.length && !blockedError) {
      const index = cursor++;
      const id = ids[index];
      try {
        const result = await download(id);
        if (result === 'downloaded') downloaded++;
        else skipped++;
      } catch (error) {
        failures.push({ id, error: error.message });
        if (error.blocked) blockedError = error;
      }
      const completed = downloaded + skipped + failures.length;
      if (completed % 100 === 0 || completed === ids.length) {
        console.log(`${completed}/${ids.length} complete, ${downloaded} downloaded, ${skipped} cached, ${failures.length} failed`);
      }
      if (delayMs) await sleep(delayMs);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  if (failures.length) {
    fs.writeFileSync(failureFile, JSON.stringify(failures, null, 2));
    console.warn(`Finished with ${failures.length} failures. See ${failureFile}`);
  } else if (fs.existsSync(failureFile)) {
    fs.unlinkSync(failureFile);
  }
  console.log(`Done. Downloaded ${downloaded}; already cached ${skipped}; failed ${failures.length}.`);
  if (blockedError) {
    console.error('SkyCrypt rejected automated requests with a Cloudflare challenge. Do not attempt to bypass it. Retry later or set SKYCRYPT_ITEM_API to an authorized/self-hosted SkyCrypt backend.');
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
