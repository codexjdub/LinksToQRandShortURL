import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {createShortener} from '../src/worker.mjs';

const origin = 'https://link-sheet-qr.w42425.chatgpt.site';
const request = (url, headers = {}) => new Request(origin + '/api/shorten', {
  method:'POST', headers:{'Content-Type':'application/json', Origin:origin, ...headers}, body:JSON.stringify({url})
});
test('encodes URLs once, uses a fixed upstream, and caches successful links', async () => {
  let calls = 0;
  const url = 'https://example.com/?a=1&b=%E4%B8%AD#section';
  const handler = createShortener(async (endpoint, options) => {
    calls++;
    assert.equal(endpoint, 'https://cleanuri.com/api/v1/shorten');
    assert.equal(new URLSearchParams(options.body).get('url'), url);
    assert.equal(options.method, 'POST');
    return Response.json({result_url:'https://cleanuri.com/Abc123'});
  });
  for (let n = 0; n < 2; n++) assert.deepEqual(await (await handler(request(url))).json(), {shorturl:'https://cleanuri.com/Abc123'});
  assert.equal(calls, 1);
});
test('rejects invalid URLs before sending data upstream', async () => {
  const handler = createShortener(() => { throw new Error('Must not fetch'); });
  for (const url of ['javascript:alert(1)', 'https://user:pass@example.com', 'https://example.com/'+'x'.repeat(2048)]) assert.equal((await handler(request(url))).status, 400);
});
test('coalesces identical concurrent requests and returns separate readable responses', async () => {
  let calls = 0;
  const handler = createShortener(async () => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return Response.json({result_url:'https://cleanuri.com/Same'}); });
  const responses = await Promise.all([handler(request('https://example.com')), handler(request('https://example.com'))]);
  assert.equal(calls, 1);
  for (const response of responses) assert.equal((await response.json()).shorturl, 'https://cleanuri.com/Same');
});
test('respects provider rate limits without repeated requests', async () => {
  let calls = 0;
  const handler = createShortener(async () => { calls++; return new Response('', {status:429}); });
  const first = await handler(request('https://example.com'));
  assert.equal(first.status, 429);
  assert.equal(first.headers.get('Retry-After'), '60');
  assert.equal((await handler(request('https://example.org'))).status, 429);
  assert.equal(calls, 1);
});
test('handles outages, HTML challenges, API rejection, and untrusted links explicitly', async () => {
  for (const [upstream, expected] of [
    [async () => {throw new Error('network');},502],
    [async () => new Response('<html>challenge</html>'),502],
    [async () => Response.json({error:'invalid URL'}),422],
    [async () => Response.json({result_url:'https://attacker.example/link'}),502]
  ]) {
    const response = await createShortener(upstream)(request('https://example.com'));
    assert.equal(response.status, expected);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});
const pagesOrigin = 'https://codexjdub.github.io';
test('allows only the configured GitHub Pages origin to preflight the API', async () => {
  const response = await worker.fetch(new Request(origin + '/api/shorten', {
    method:'OPTIONS', headers:{Origin:pagesOrigin, 'Access-Control-Request-Method':'POST', 'Access-Control-Request-Headers':'content-type'}
  }), {PAGES_ORIGIN:pagesOrigin});
  assert.equal(response.status,204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),pagesOrigin);
  assert.match(response.headers.get('Access-Control-Allow-Methods'),/POST/);
  assert.equal(response.headers.get('Access-Control-Allow-Headers'),'Content-Type');
});
test('accepts the configured Pages origin and rejects file and unrelated origins', async () => {
  let calls = 0;
  const handler = createShortener(async () => { calls++; return Response.json({result_url:'https://cleanuri.com/Test123'}); });
  assert.equal((await handler(request('https://example.com',{Origin:pagesOrigin,'Sec-Fetch-Site':'cross-site'}),pagesOrigin)).status,200);
  assert.equal((await handler(request('https://example.org',{Origin:'null'}),pagesOrigin)).status,403);
  assert.equal((await handler(request('https://example.net',{Origin:'https://unrelated.example'}),pagesOrigin)).status,403);
  assert.equal(calls,1);
});
