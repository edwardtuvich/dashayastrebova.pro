"""Open every exported page in Chromium from a local http server; report bad requests."""
import asyncio, json, os, sys, subprocess, time, collections
from playwright.async_api import async_playwright
DIST = os.path.abspath(sys.argv[1]); PORT = 8765
pages = sorted(f for f in os.listdir(DIST) if f.endswith('.html'))
# redirect stubs (meta refresh) navigate away at once: they are only checked for their target
stubs = [f for f in pages if 'http-equiv="refresh"' in open(os.path.join(DIST, f), encoding='utf-8').read()[:400]]
pages = [f for f in pages if f not in stubs]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=DIST, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
bad = collections.defaultdict(list); errs = collections.defaultdict(list); ext = collections.Counter(); stats = {}
async def one(b, pg, sem):
    async with sem:
        c = await b.new_context(viewport={'width': 1280, 'height': 800}); q = await c.new_page()
        async def route(r):
            u = r.request.url
            if u.startswith('http://127.0.0.1'): await r.continue_()
            else:
                ext[u.split('/')[2]] += 1; await r.abort()
        await q.route('**/*', route)
        n = [0]
        def resp(r):
            n[0] += 1
            if r.status >= 400: bad[pg].append((r.status, r.url.replace('http://127.0.0.1:%d/' % PORT, '')))
            if '/_blob/' in r.url: bad[pg].append(('BLOB', r.url))
        q.on('response', resp)
        q.on('requestfailed', lambda r: bad[pg].append(('FAILED', r.url)) if r.url.startswith('http://127.0.0.1') and '.mp4' not in r.url else None)
        q.on('pageerror', lambda e: errs[pg].append(str(e)[:200]))
        q.on('console', lambda m: errs[pg].append(m.text[:200]) if m.type == 'error' and 'ERR_FAILED' not in m.text and 'fonts.g' not in m.text else None)
        await q.goto('http://127.0.0.1:%d/%s' % (PORT, pg), wait_until='load')
        h = await q.evaluate('document.body.scrollHeight')
        for y in range(0, h, 1500):
            await q.evaluate('window.scrollTo(0,%d)' % y); await q.wait_for_timeout(60)
        try: await q.wait_for_load_state('networkidle', timeout=15000)
        except Exception: pass
        broken = await q.evaluate("[...document.images].filter(i=>i.complete&&!i.naturalWidth&&i.getAttribute('src')).map(i=>i.getAttribute('src').slice(0,80))")
        left = await q.evaluate("document.documentElement.outerHTML.includes('/_blob/')")
        stats[pg] = dict(requests=n[0], broken_imgs=broken, blob_in_dom=left, title=await q.title())
        if broken: bad[pg].append(('IMG', broken[:5]))
        await c.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); sem = asyncio.Semaphore(4)
        async def safe(pg):
            try: await one(b, pg, sem)
            except Exception as e: errs[pg].append('VERIFY FAILED: ' + str(e)[:160])
        await asyncio.gather(*[safe(pg) for pg in pages]); await b.close()
try: asyncio.run(main())
finally: srv.terminate()
print('pages opened', len(stats), 'requests', sum(s['requests'] for s in stats.values()))
print('pages with bad requests', len(bad)); [print(' ', k, v[:6]) for k, v in list(bad.items())[:30]]
print('pages with js errors', len(errs)); [print(' ', k, v[:4]) for k, v in list(errs.items())[:20]]
print('blob left in DOM', [k for k, s in stats.items() if s['blob_in_dom']])
print('external hosts requested (blocked in this test)', dict(ext))
json.dump(dict(stats=stats, bad=bad, errs=errs), open(os.path.join(os.path.dirname(DIST), 'verify_report.json'), 'w'), ensure_ascii=False, indent=1)
import re
bad_stub = [f for f in stubs if not os.path.isfile(os.path.join(DIST, re.search(r'url=([^"#]+)', open(os.path.join(DIST, f)).read()).group(1)))]
print('redirect stubs', len(stubs), 'with a missing target', bad_stub)
sys.exit(1 if (bad or errs or bad_stub or any(s['blob_in_dom'] for s in stats.values())) else 0)
