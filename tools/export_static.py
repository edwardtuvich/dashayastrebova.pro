#!/usr/bin/env python3
"""Export the artifact-hosted site into a self-contained static folder.

  python3 export_static.py --src /home/claude/site --out /home/claude/yfs/q2_work/dist
                           [--base-url https://example.com] [--analytics snippet.html] [--all-pages]

What it does (the source folder is only read, never written):
  1. Finds the published pages: depth-first walk over <a href="*.html"> starting at index.html.
     Links carrying the `hidden` attribute are not followed (the retired Studio hub worlds.html).
     Old unused html files stay behind (use --all-pages to export everything).
  2. Builds the reverse registry  /_blob/<id> -> local file  from
       assets.json  (key or "file" for the served version, "orig" -> the key itself),
       thumbs.json  (name -> t/<name>.webp),  mids.json (name -> m/<name>.webp).
  3. Rewrites every /_blob/<id> in the pages to the relative local path and copies only the
     files that are really referenced (images, video, css, js).
  4. With --base-url also writes sitemap.xml and robots.txt and adds <link rel="canonical">
     and og:url to every page.
     Extra pages that nothing links to (404.html) are exported too. In 404.html every local path becomes
     root-absolute, because the server shows it for any broken address. Files named in css url(...) (fonts)
     and in og:image / twitter:image are copied as well. favicon.ico is copied when it exists.
     --analytics FILE puts the content of FILE in place of the <!--analytics--> marker of every page.
  5. Verifies the result: no /_blob/ left, every local reference and every #anchor resolves.
     Exit code 1 if anything is unresolved. Writes export_report.json next to the pages.
"""
import argparse, collections, json, os, re, shutil, sys
from html.parser import HTMLParser

BLOB = re.compile(r'/_blob/[0-9a-f]{32}')
SKIP = re.compile(r'^(https?:|mailto:|tel:|javascript:|data:|blob:|//)', re.I)
HIDDEN_A = re.compile(r'<a\b(?=[^>]*\shidden[\s>])[^>]*\shref="([^"#?]+\.html)[^"]*"[^>]*>.*?</a>', re.S)
EXTRA_PAGES = ('404.html', 'privacy.html')      # exported even when no page links to them
ROOT_FILES = ('favicon.ico',)                    # copied to the root when present
NO_SITEMAP = ('404.html',)
CSS_URL = re.compile(r'url\(\s*["\']?([^"\')]+)["\']?\s*\)')
META_IMG = re.compile(r'<meta (?:property|name)="(?:og:image|twitter:image)" content="([^"]+)"')
RES_ATTRS = ('src', 'data-src', 'data-lz', 'data-full', 'poster', 'srcset', 'data-set', 'data-imgs')


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links, self.ids, self.res, self.hidden_links = [], set(), [], []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if d.get('id'): self.ids.add(d['id'])
        if tag == 'a' and d.get('name'): self.ids.add(d['name'])
        if tag == 'a' and d.get('href'):
            if 'hidden' in d: self.hidden_links.append(d['href'])   # retired links (site.js removes them)
            else: self.links.append(d['href'])
        if tag == 'link' and d.get('href') and 'preconnect' not in (d.get('rel') or ''):
            self.res.append(d['href'])
        for k in RES_ATTRS:
            v = d.get(k)
            if not v: continue
            if k in ('srcset', 'data-set', 'data-imgs'):
                self.res += [x.strip().split(' ')[0] for x in v.split(',') if x.strip()]
            else:
                self.res.append(v)


def parse(text):
    p = Page(); p.feed(text); return p


def clean(u):
    return u.split('#')[0].split('?')[0]


def registry(src):
    j = lambda n: json.load(open(os.path.join(src, n), encoding='utf-8')) if os.path.exists(os.path.join(src, n)) else {}
    reg = {}
    for key, v in j('assets.json').items():
        reg[v['url']] = v.get('file', key)
        if v.get('orig'): reg[v['orig']] = key
    for n, u in j('thumbs.json').items(): reg[u] = 't/%s.webp' % n
    for n, u in j('mids.json').items(): reg[u] = 'm/%s.webp' % n
    return reg


def published(src, start='index.html'):
    seen, stack, order = set(), [start], []
    while stack:
        f = stack.pop()
        if f in seen or not os.path.isfile(os.path.join(src, f)): continue
        seen.add(f); order.append(f)
        p = parse(open(os.path.join(src, f), encoding='utf-8').read())
        for h in reversed(p.links):
            if SKIP.match(h): continue
            t = clean(h)
            if t.endswith('.html') and t not in seen: stack.append(t)
    return order


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='/home/claude/site')
    ap.add_argument('--out', required=True)
    ap.add_argument('--base-url', default='', help='https://domain.tld : enables sitemap.xml, robots.txt, canonical')
    ap.add_argument('--analytics', default='', help='file with the analytics snippet; replaces the <!--analytics--> marker')
    ap.add_argument('--all-pages', action='store_true')
    a = ap.parse_args()
    src, out = os.path.abspath(a.src), os.path.abspath(a.out)
    if out == src or src.startswith(out + os.sep) or out.startswith(src + os.sep):
        sys.exit('refusing: --out must be outside --src')
    base = a.base_url.rstrip('/')
    reg = registry(src)
    pages = sorted(f for f in os.listdir(src) if f.endswith('.html')) if a.all_pages else published(src)
    pages += [f for f in EXTRA_PAGES if f not in pages and os.path.isfile(os.path.join(src, f))]
    snippet = open(a.analytics, encoding='utf-8').read().strip() if a.analytics else ''
    pageset = set(pages)
    if os.path.isdir(out): shutil.rmtree(out)
    os.makedirs(out)

    need, unmapped, missing = set(), collections.defaultdict(list), collections.defaultdict(list)
    texts = {}
    for f in pages:
        h = open(os.path.join(src, f), encoding='utf-8').read()

        def sw(m, f=f):
            loc = reg.get(m.group(0))
            if not loc:
                unmapped[m.group(0)].append(f); return m.group(0)
            need.add(loc); return loc
        h = BLOB.sub(sw, h)
        # hidden links to pages that are not exported are dropped from the markup
        h = HIDDEN_A.sub(lambda m: '' if clean(m.group(1)) not in pageset else m.group(0), h)
        h = h.replace('<!--analytics-->', snippet)
        # v8x F3: a redirect stub (old address) is never indexed and points search engines at the absolute new address
        if 'http-equiv="refresh"' in h:
            if 'name="robots"' not in h: h = re.sub(r'(<head[^>]*>)', r'\1\n<meta name="robots" content="noindex">', h, count=1)
            if base: h = re.sub(r'(<link rel="canonical" href=")(?!https?:)([^"]+)"', lambda m: '%s%s/%s"' % (m.group(1), base, m.group(2).lstrip('/')), h)
        if base and f not in NO_SITEMAP:
            url = base + '/' + ('' if f == 'index.html' else f)
            add = ''
            if 'rel="canonical"' not in h: add += '\n<link rel="canonical" href="%s">' % url
            if 'property="og:url"' not in h: add += '\n<meta property="og:url" content="%s">' % url
            if add: h = h.replace('</title>', '</title>' + add, 1)
        # link-preview pictures are absolute urls on the final domain: copy the files they point to
        for u in META_IMG.findall(h):
            m = re.match(r'https?://[^/]+/(.+)$', u)
            if m and os.path.isfile(os.path.join(src, clean(m.group(1)))): need.add(clean(m.group(1)))
            elif m: missing['og:' + m.group(1)].append(f)
            if base and m and not u.startswith(base + '/'): h = h.replace(u, base + '/' + m.group(1))
        for r in parse(h).res:
            if SKIP.match(r): continue
            r = clean(r)
            if r: need.add(r)
        if f == '404.html':
            # shown by the server for any broken address, also in sub-folders: local paths must start at the root
            h = re.sub(r'((?:href|src|poster|data-lz|data-src|data-full)=")(?!https?:|mailto:|tel:|data:|#|/)([^"]+")', r'\1/\2', h)
        texts[f] = h
    # files named inside the stylesheets (fonts)
    for rel in sorted(x for x in need if x.endswith('.css')):
        p = os.path.join(src, rel)
        if not os.path.isfile(p): continue
        for u in CSS_URL.findall(open(p, encoding='utf-8').read()):
            if SKIP.match(u): continue
            need.add(os.path.normpath(os.path.join(os.path.dirname(rel), clean(u))).replace(os.sep, '/'))
    for rel in ROOT_FILES:
        if os.path.isfile(os.path.join(src, rel)): need.add(rel)

    copied = 0; size = collections.Counter()
    for rel in sorted(need):
        s = os.path.join(src, rel)
        if not os.path.isfile(s):
            missing[rel].append('?'); continue
        d = os.path.join(out, rel)
        os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copy2(s, d); copied += 1
        size[rel.split('/')[0] if '/' in rel else 'root'] += os.path.getsize(s)
    for f, h in texts.items():
        open(os.path.join(out, f), 'w', encoding='utf-8').write(h)
        size['html'] += len(h.encode('utf-8'))

    if base:
        open(os.path.join(out, 'robots.txt'), 'w').write('User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n' % base)
        sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        # v8x F3: <lastmod> is the date the source page was last built
        import datetime
        lm = lambda f: datetime.datetime.fromtimestamp(os.path.getmtime(os.path.join(src, f)), datetime.timezone.utc).strftime('%Y-%m-%d')
        sm += ['  <url><loc>%s/%s</loc><lastmod>%s</lastmod></url>' % (base, '' if f == 'index.html' else f, lm(f)) for f in pages
               if f not in NO_SITEMAP and 'http-equiv="refresh"' not in texts[f] and 'content="noindex"' not in texts[f]]
        open(os.path.join(out, 'sitemap.xml'), 'w').write('\n'.join(sm + ['</urlset>']) + '\n')

    # ---- verify the exported folder itself
    left, bad_ref, bad_link, bad_anchor = [], [], [], []
    parsed = {f: parse(open(os.path.join(out, f), encoding='utf-8').read()) for f in pages}
    for f in pages:
        if BLOB.search(open(os.path.join(out, f), encoding='utf-8').read()): left.append(f)
        for r in parsed[f].res:
            if SKIP.match(r) or not clean(r): continue
            if not os.path.isfile(os.path.join(out, clean(r).lstrip('/'))): bad_ref.append((f, r))
        for h in parsed[f].links:
            if SKIP.match(h): continue
            t, _, anc = h.partition('#'); t = clean(t).lstrip('/') or f
            if not os.path.isfile(os.path.join(out, t)): bad_link.append((f, h)); continue
            if anc and t in parsed and anc not in parsed[t].ids: bad_anchor.append((f, h))
    for d in ('css', 'js'):
        p = os.path.join(out, d)
        for n in (os.listdir(p) if os.path.isdir(p) else []):
            txt = open(os.path.join(p, n), encoding='utf-8').read()
            if BLOB.search(txt): left.append(d + '/' + n)
            if d == 'css':
                for u in CSS_URL.findall(txt):
                    if not SKIP.match(u) and not os.path.isfile(os.path.normpath(os.path.join(p, clean(u)))): bad_ref.append((d + '/' + n, u))
    google = sorted(f for f in pages if 'fonts.googleapis.com' in open(os.path.join(out, f), encoding='utf-8').read())

    total = sum(size.values())
    heavy = sorted(((os.path.getsize(os.path.join(out, r)), r) for r in need if os.path.isfile(os.path.join(out, r))), reverse=True)[:15]
    rep = dict(pages=len(pages), files_copied=copied, total_bytes=total, by_folder=dict(size),
               unmapped_blobs={k: v for k, v in unmapped.items()}, missing_local=sorted(missing),
               blob_left_in=left, broken_refs=bad_ref, broken_links=bad_link, broken_anchors=bad_anchor,
               heaviest=[[r, s] for s, r in heavy], pages_with_google_fonts=google, analytics=bool(snippet),
               not_exported_html=sorted(set(f for f in os.listdir(src) if f.endswith('.html')) - set(pages)))
    json.dump(rep, open(os.path.join(out, 'export_report.json'), 'w'), ensure_ascii=False, indent=1)
    print('pages %d, files %d, total %.1f MB' % (len(pages), copied, total / 1e6))
    print('by folder (MB):', {k: round(v / 1e6, 1) for k, v in sorted(size.items())})
    print('unmapped blobs %d, missing local %d, /_blob/ left in %d files, broken refs %d, links %d, anchors %d' % (
        len(unmapped), len(missing), len(left), len(bad_ref), len(bad_link), len(bad_anchor)))
    if google: print('WARNING: %d pages still load Google Fonts (old template, rebuild them): %s' % (len(google), ', '.join(google[:8])))
    over = [(s, r) for s, r in heavy if s > 95e6]
    if over: print('WARNING: files over 95 MB, GitHub refuses 100 MB:', over)
    for s, r in heavy[:8]: print('  %6.1f MB  %s' % (s / 1e6, r))
    sys.exit(1 if (unmapped or missing or left or bad_ref or bad_link or bad_anchor) else 0)


if __name__ == '__main__':
    main()
