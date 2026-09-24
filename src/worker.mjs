/* HTML */

const reply = (data, status = 200, headers = {}) => Response.json(data, {
  status, headers: {'Cache-Control':'no-store', ...headers}
});

// The only outbound destination is this fixed API, never the supplied URL.
const ENDPOINT = 'https://cleanuri.com/api/v1/shorten';
export function createShortener(fetchUpstream = fetch, now = Date.now) {
  const cache = new Map();
  const pending = new Map();
  let nextRequest = 0;
  let cooldownUntil = 0;
  return async (request, pagesOrigin) => {
    if (request.method !== 'POST') return reply({error:'Use POST.'}, 405, {Allow:'POST'});
    const origin = request.headers.get('Origin');
    const fromPages = Boolean(pagesOrigin && origin === pagesOrigin);
    if ((origin && origin !== new URL(request.url).origin && !fromPages) ||
        (request.headers.get('Sec-Fetch-Site') === 'cross-site' && !fromPages)) {
      return reply({error:'Open Link Sheet to create a short link.'}, 403);
    }
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({error:'Send a JSON URL.'}, 415);
    let input;
    try {
      // Bound the stream before parsing, including requests without Content-Length.
      const reader = request.body?.getReader();
      if (!reader) throw new Error();
      let size = 0;
      const chunks = [];
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 16384) { await reader.cancel(); return reply({error:'URL is too long.'}, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch { return reply({error:'Enter a valid website URL.'}, 400); }
    let url;
    try {
      if (typeof input?.url !== 'string' || input.url.length > 2048 || /\s/.test(input.url)) throw new Error();
      url = new URL(input.url);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password || url.href.length > 2048) throw new Error();
    } catch { return reply({error:'Enter an HTTP or HTTPS URL up to 2,048 characters.'}, 400); }
    const key = url.href;
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return reply({shorturl:cached.url});
    cache.delete(key);
    if (pending.has(key)) return pending.get(key).then(response => response.clone());
    if (now() < cooldownUntil || now() < nextRequest) {
      const retry = Math.max(1, Math.ceil((Math.max(cooldownUntil, nextRequest) - now()) / 1000));
      return reply({error:'Please wait a moment before generating another short link.', retryAfter:retry}, 429, {'Retry-After':String(retry)});
    }
    // Best-effort, per-isolate pacing under CleanURI's two requests/second limit.
    nextRequest = now() + 600;
    const task = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetchUpstream(ENDPOINT, {
          method:'POST', redirect:'manual', signal:controller.signal,
          headers:{'Content-Type':'application/x-www-form-urlencoded', Accept:'application/json'},
          body:new URLSearchParams({url:key})
        });
        if (response.status === 429) {
          cooldownUntil = now() + 60000;
          return reply({error:'The shortening service is busy. Try again in a minute.', retryAfter:60}, 429, {'Retry-After':'60'});
        }
        if (!response.ok) return reply({error:'The shortening service is temporarily unavailable. Try again shortly.'}, 502);
        const data = await response.json();
        if (data.error) return reply({error:'CleanURI could not shorten this URL. Check that it opens normally.'}, 422);
        if (!/^https:\/\/cleanuri\.com\/[a-zA-Z0-9_-]+$/.test(data.result_url || '')) return reply({error:'The shortening service returned an invalid link.'}, 502);
        if (cache.size >= 256) cache.delete(cache.keys().next().value);
        cache.set(key, {url:data.result_url, expires:now() + 86400000});
        return reply({shorturl:data.result_url});
      } catch (error) {
        console.error('CleanURI transport failure:', error?.name, error?.message);
        return reply({error:'The shortening service did not respond. Please try again shortly.'}, 502);
      } finally { clearTimeout(timer); }
    })();
    pending.set(key, task);
    try { return (await task).clone(); }
    finally { pending.delete(key); }
  };
}

const shorten = createShortener();
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/shorten') {
      const pagesOrigin = env?.PAGES_ORIGIN;
      const fromPages = Boolean(pagesOrigin && request.headers.get('Origin') === pagesOrigin);
      const cors = fromPages ? {
        'Access-Control-Allow-Origin':pagesOrigin,
        'Access-Control-Allow-Methods':'POST, OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type',
        Vary:'Origin'
      } : {};
      if (fromPages && request.method === 'OPTIONS') return new Response(null, {status:204,headers:{...cors,'Access-Control-Max-Age':'600'}});
      const response = await shorten(request, pagesOrigin);
      const headers = new Headers(response.headers);
      for (const [key,value] of Object.entries(cors)) headers.set(key,value);
      return new Response(response.body,{status:response.status,headers});
    }
    if ((path === '/' || path === '/index.html') && ['GET','HEAD'].includes(request.method)) {
      return new Response(request.method === 'HEAD' ? null : HTML, {headers:{
        'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer'
      }});
    }
    return new Response('Not found', {status:404});
  }
};
