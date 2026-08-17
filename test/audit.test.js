// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blackout Secure Web Application Manifest Generator
// Copyright © 2025-2026 Blackout Secure
// Licensed under Apache License 2.0
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// W3C manifest audit rules and the PWA tag injection helpers.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const cfgMod = require('../src/lib/config');
const {
  audit,
  shouldFail,
  largestDimension,
  isValidColor,
  withinScope,
} = require('../src/lib/audit');
const {
  generatePwaMetaTags,
  generateFaviconLinks,
  injectHeadTags,
  processPageFiles,
} = require('../src/lib/page-injector');

function configWith(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bos-web-manifest-cfg-'));
  fs.writeFileSync(
    path.join(dir, '.bos-web-manifest.yml'),
    JSON.stringify({ web_manifest: overrides }),
    'utf8',
  );
  const cfg = cfgMod.resolve(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  return cfg;
}

function compliant(overrides = {}) {
  return JSON.stringify(
    {
      name: 'Example App',
      short_name: 'Example',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      theme_color: '#0f172a',
      background_color: '#ffffff',
      lang: 'en-US',
      id: '/?source=pwa',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      ...overrides,
    },
    null,
    2,
  );
}

function run(content, { cfg = configWith(), publicDir = '', pageResults = { injected: 1 } } = {}) {
  return audit({
    cfg,
    content,
    filePath: path.join(publicDir || 'dist', 'site.webmanifest'),
    publicDir,
    pageResults,
  });
}

function findingFor(result, ruleId) {
  return result.findings.find((f) => f.ruleId === ruleId);
}

describe('lib/audit helpers', () => {
  it('reads the largest square dimension from a sizes string', () => {
    assert.strictEqual(largestDimension({ sizes: '48x48 192x192' }), 192);
    assert.strictEqual(largestDimension({ sizes: '512X512' }), 512);
    assert.strictEqual(largestDimension({ sizes: '' }), 0);
    assert.strictEqual(largestDimension({ sizes: 'any' }), Number.MAX_SAFE_INTEGER);
  });

  it('uses the smaller side of a non-square icon', () => {
    assert.strictEqual(largestDimension({ sizes: '512x128' }), 128);
  });

  it('validates hex, functional, and named colors', () => {
    for (const value of ['#fff', '#0f172a', '#0f172aff', 'rgb(1, 2, 3)', 'hsl(1 2% 3%)', 'white']) {
      assert.ok(isValidColor(value), value);
    }
    for (const value of ['', 'notacolor', '#12345', 42, null]) {
      assert.ok(!isValidColor(value), String(value));
    }
  });

  it('checks start_url containment inside scope', () => {
    assert.ok(withinScope('/', '/'));
    assert.ok(withinScope('/app/home', '/app/'));
    assert.ok(!withinScope('/other', '/app/'));
  });
});

describe('lib/page-injector', () => {
  it('derives PWA meta tags from the manifest', () => {
    const tags = generatePwaMetaTags({ theme_color: '#0f172a', short_name: 'Example' });
    assert.ok(tags.some((t) => t.includes('theme-color')));
    assert.ok(tags.some((t) => t.includes('application-name')));
    assert.ok(tags.some((t) => t.includes('mobile-web-app-capable')));
  });

  it('omits the capability tags when disabled', () => {
    const tags = generatePwaMetaTags({ theme_color: '#000' }, { mobileWebAppCapable: false });
    assert.ok(!tags.some((t) => t.includes('mobile-web-app-capable')));
  });

  it('emits favicon links', () => {
    const links = generateFaviconLinks();
    assert.ok(links.some((l) => l.includes('rel="icon"')));
    assert.ok(links.some((l) => l.includes('apple-touch-icon')));
  });

  it('inserts tags into head and skips ones already present', () => {
    const html = '<html><head><meta name="theme-color" content="#abcdef"></head></html>';
    const updated = injectHeadTags(html, [
      '<meta name="theme-color" content="#000000">',
      '<meta name="mobile-web-app-capable" content="yes">',
    ]);
    assert.ok(updated.includes('#abcdef'));
    assert.ok(!updated.includes('#000000'));
    assert.ok(updated.includes('mobile-web-app-capable'));
  });

  it('creates a head when the page has none', () => {
    const updated = injectHeadTags('<html><body>x</body></html>', ['<meta name="a" content="b">']);
    assert.match(updated, /<head>[\s\S]*<meta name="a"/);
  });

  it('injects manifest link, meta tags, and favicons into page files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bos-web-manifest-pages-'));
    try {
      fs.writeFileSync(path.join(dir, 'index.html'), '<html><head></head></html>', 'utf8');
      const results = processPageFiles(dir, ['html'], 'site.webmanifest', false, {
        injectManifest: true,
        injectPwaMetaTags: true,
        injectFaviconLinks: true,
        manifest: { theme_color: '#0f172a', short_name: 'Example' },
      });
      assert.strictEqual(results.injected, 1);
      const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
      assert.match(html, /rel="manifest"/);
      assert.match(html, /name="theme-color"/);
      assert.match(html, /rel="apple-touch-icon"/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('injects only the manifest link when the other toggles are off', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bos-web-manifest-pages-'));
    try {
      fs.writeFileSync(path.join(dir, 'index.html'), '<html><head></head></html>', 'utf8');
      processPageFiles(dir, ['html'], 'site.webmanifest', false, { injectManifest: true });
      const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
      assert.match(html, /rel="manifest"/);
      assert.ok(!/theme-color/.test(html));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('lib/audit', () => {
  it('emits a finding for every known rule', () => {
    const result = run(compliant());
    assert.strictEqual(result.findings.length, Object.keys(cfgMod.RULE_DEFAULTS).length);
  });

  it('passes every non-skipped control for a compliant manifest', () => {
    const result = run(compliant());
    const attention = result.findings.filter((f) => f.severity !== 'pass' && f.severity !== 'skip');
    assert.deepStrictEqual(
      attention.map((f) => f.ruleId),
      [],
    );
  });

  it('records disabled controls as skip rather than dropping them', () => {
    const cfg = configWith({ audit: { rules: { require_name: 'skip' } } });
    const finding = findingFor(run('{}', { cfg }), 'WM001');
    assert.strictEqual(finding.severity, 'skip');
    assert.match(finding.message, /Control disabled/);
  });

  it('flags missing required members', () => {
    const result = run('{}');
    for (const ruleId of ['WM001', 'WM002', 'WM003', 'WM004', 'WM005']) {
      assert.strictEqual(findingFor(result, ruleId).severity, 'warn', ruleId);
    }
  });

  it('flags icons below the installability thresholds', () => {
    const result = run(compliant({ icons: [{ src: '/i.png', sizes: '64x64' }] }));
    assert.strictEqual(findingFor(result, 'WM010').severity, 'warn');
    assert.strictEqual(findingFor(result, 'WM011').severity, 'warn');
    assert.strictEqual(findingFor(result, 'WM012').severity, 'warn');
  });

  it('flags the discouraged any-maskable purpose combination', () => {
    const result = run(
      compliant({
        icons: [{ src: '/i.png', sizes: '512x512', purpose: 'any maskable' }],
      }),
    );
    const finding = findingFor(result, 'WM013');
    assert.strictEqual(finding.severity, 'warn');
    assert.deepStrictEqual(finding.evidence.samples, ['/i.png']);
  });

  it('checks that declared icon files exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bos-web-manifest-icons-'));
    try {
      const missing = run(compliant(), { publicDir: dir });
      assert.strictEqual(findingFor(missing, 'WM014').severity, 'warn');

      fs.mkdirSync(path.join(dir, 'icons'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'icons', 'icon-192.png'), 'x', 'utf8');
      fs.writeFileSync(path.join(dir, 'icons', 'icon-512.png'), 'x', 'utf8');
      const present = run(compliant(), { publicDir: dir });
      assert.strictEqual(findingFor(present, 'WM014').severity, 'pass');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ignores remote icon URLs when checking for published files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bos-web-manifest-icons-'));
    try {
      const result = run(
        compliant({ icons: [{ src: 'https://cdn.test/i.png', sizes: '512x512' }] }),
        {
          publicDir: dir,
        },
      );
      assert.strictEqual(findingFor(result, 'WM014').severity, 'pass');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags invalid colors and enumerated members', () => {
    const result = run(
      compliant({
        theme_color: 'nope',
        background_color: '',
        display: 'window',
        orientation: 'sideways',
      }),
    );
    assert.strictEqual(findingFor(result, 'WM020').severity, 'warn');
    assert.strictEqual(findingFor(result, 'WM021').severity, 'warn');
    assert.strictEqual(findingFor(result, 'WM022').severity, 'warn');
    assert.strictEqual(findingFor(result, 'WM023').severity, 'warn');
  });

  it('flags a start_url outside scope', () => {
    const result = run(compliant({ scope: '/app/', start_url: '/other' }));
    assert.strictEqual(findingFor(result, 'WM030').severity, 'warn');
  });

  it('reports the optional id and lang controls when enabled', () => {
    const cfg = configWith({ audit: { rules: { require_id: 'warn', valid_lang: 'warn' } } });
    const result = run(compliant({ id: '', lang: 'not a tag' }), { cfg });
    assert.strictEqual(findingFor(result, 'WM031').severity, 'warn');
    assert.strictEqual(findingFor(result, 'WM032').severity, 'warn');
  });

  it('flags a manifest that no page links', () => {
    const result = run(compliant(), { pageResults: { injected: 0, skipped: 0 } });
    assert.strictEqual(findingFor(result, 'WM040').severity, 'warn');
  });

  it('counts linked pages from disk when no injection ran', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bos-web-manifest-pages-'));
    try {
      fs.writeFileSync(
        path.join(dir, 'index.html'),
        '<html><head><link rel="manifest" href="/site.webmanifest"></head></html>',
        'utf8',
      );
      const result = audit({
        cfg: configWith(),
        content: compliant(),
        filePath: path.join(dir, 'site.webmanifest'),
        publicDir: dir,
      });
      assert.strictEqual(findingFor(result, 'WM040').severity, 'pass');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('enforces the configured size limit', () => {
    const cfg = configWith({ audit: { max_size_kb: 1 } });
    const result = run(compliant({ description: 'x'.repeat(2048) }), { cfg });
    assert.strictEqual(findingFor(result, 'WM041').severity, 'warn');
  });

  it('flags invalid JSON and a byte-order mark', () => {
    assert.strictEqual(findingFor(run('{ not json'), 'WM042').severity, 'warn');
    assert.strictEqual(findingFor(run(`\uFEFF${compliant()}`), 'WM042').severity, 'warn');
  });

  it('drives the exit disposition from fail_on', () => {
    const cfg = configWith({ audit: { rules: { require_icons: 'fail' } } });
    const result = run('{}', { cfg });
    assert.strictEqual(shouldFail(result, 'fail'), true);
    assert.strictEqual(shouldFail(result, 'never'), false);
  });

  it('exposes run context for reporting', () => {
    const result = run(compliant());
    assert.strictEqual(result.context.icon_count, 2);
    assert.strictEqual(result.context.largest_icon_px, 512);
    assert.ok(result.context.size_bytes > 0);
  });
});
