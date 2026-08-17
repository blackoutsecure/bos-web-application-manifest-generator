// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blackout Secure Web Application Manifest Generator
// Copyright © 2025-2026 Blackout Secure
// Licensed under Apache License 2.0
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Layered configuration loader tests.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const cfgMod = require('../src/lib/config');

function write(root, relative, contents) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, 'utf8');
  return target;
}

describe('lib/config', () => {
  const roots = [];

  afterEach(() => {
    while (roots.length) {
      fs.rmSync(roots.pop(), { recursive: true, force: true });
    }
  });

  function root() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bos-web-manifest-config-'));
    roots.push(dir);
    return dir;
  }

  it('falls back to the bundled marketplace baseline', () => {
    const cfg = cfgMod.resolve(root());
    assert.strictEqual(cfg.generate.filename, 'site.webmanifest');
    assert.strictEqual(cfg.generate.injectManifestLink, true);
    assert.strictEqual(cfg.generate.injectPwaMetaTags, true);
    assert.strictEqual(cfg.audit.failOn, 'fail');
    assert.strictEqual(cfg.audit.maxSizeKb, 128);
    assert.strictEqual(cfg.audit.rules.require_icons, 'warn');
    assert.deepStrictEqual(cfg.sourcePaths, ['bundled:marketplace-config.json']);
  });

  it('starts from built-in defaults when the baseline is disabled', () => {
    const cfg = cfgMod.resolve(root(), { useMarketplaceConfig: false });
    assert.deepStrictEqual(cfg.sourcePaths, []);
    assert.strictEqual(cfg.audit.maxSizeKb, 128);
    assert.strictEqual(cfg.audit.rules.require_id, 'skip');
  });

  it('discovers .github/bos-universal-config.json and merges it', () => {
    const dir = root();
    write(
      dir,
      '.github/bos-universal-config.json',
      JSON.stringify({
        web_manifest: { owner: 'blackoutsecure', audit: { rules: { require_icons: 'fail' } } },
      }),
    );

    const cfg = cfgMod.resolve(dir);
    assert.strictEqual(cfg.owner, 'blackoutsecure');
    assert.strictEqual(cfg.audit.rules.require_icons, 'fail');
    assert.strictEqual(cfg.audit.rules.require_name, 'warn');
  });

  it('applies global config beneath the repository config', () => {
    const dir = root();
    write(
      dir,
      '.github/blackout-secure-web-application-manifest-generator-global-config.yml',
      'web_manifest:\n  audit:\n    rules:\n      require_icons: fail\n      require_192_icon: fail\n',
    );
    write(
      dir,
      '.bos-web-manifest.yml',
      'web_manifest:\n  audit:\n    rules:\n      require_192_icon: skip\n',
    );

    const cfg = cfgMod.resolve(dir);
    assert.strictEqual(cfg.audit.rules.require_icons, 'fail');
    assert.strictEqual(cfg.audit.rules.require_192_icon, 'skip');
    assert.strictEqual(cfg.sourcePaths.length, 3);
  });

  it('honours the tri-state global config toggle', () => {
    const dir = root();
    assert.throws(() => cfgMod.resolve(dir, { useGlobalConfig: true }), cfgMod.ConfigError);
    assert.doesNotThrow(() => cfgMod.resolve(dir, { useGlobalConfig: false }));
  });

  it('accepts a bare document without the web_manifest section', () => {
    const dir = root();
    write(dir, '.bos-web-manifest.yml', 'audit:\n  fail_on: never\n');
    assert.strictEqual(cfgMod.resolve(dir).audit.failOn, 'never');
  });

  it('carries the page-injection toggles', () => {
    const dir = root();
    write(
      dir,
      '.bos-web-manifest.yml',
      'generate:\n  inject_pwa_meta_tags: false\n  inject_favicon_links: false\n',
    );
    const cfg = cfgMod.resolve(dir);
    assert.strictEqual(cfg.generate.injectPwaMetaTags, false);
    assert.strictEqual(cfg.generate.injectFaviconLinks, false);
    assert.strictEqual(cfg.generate.injectManifestLink, true);
  });

  it('defaults project_name to the repository name', () => {
    const cfg = cfgMod.resolve(root(), { repoName: 'bos-web-application-manifest-generator' });
    assert.strictEqual(cfg.projectName, 'bos-web-application-manifest-generator');
  });

  it('rejects an unknown audit rule', () => {
    const dir = root();
    write(dir, '.bos-web-manifest.yml', 'audit:\n  rules:\n    require_unicorns: warn\n');
    assert.throws(() => cfgMod.resolve(dir), /unknown rule/);
  });

  it('rejects an invalid severity', () => {
    const dir = root();
    write(dir, '.bos-web-manifest.yml', 'audit:\n  rules:\n    require_icons: explode\n');
    assert.throws(() => cfgMod.resolve(dir), /is not one of/);
  });

  it('rejects an invalid fail_on value', () => {
    const dir = root();
    write(dir, '.bos-web-manifest.yml', 'audit:\n  fail_on: sometimes\n');
    assert.throws(() => cfgMod.resolve(dir), /audit\.fail_on/);
  });

  it('rejects a filename containing a path separator', () => {
    const dir = root();
    write(dir, '.bos-web-manifest.yml', 'generate:\n  filename: nested/site.webmanifest\n');
    assert.throws(() => cfgMod.resolve(dir), /bare filename/);
  });

  it('rejects a non-boolean toggle', () => {
    const dir = root();
    write(dir, '.bos-web-manifest.yml', 'generate:\n  inject_manifest_link: yes-please\n');
    assert.throws(() => cfgMod.resolve(dir), /must be a boolean/);
  });

  it('raises for a missing explicit config path', () => {
    assert.throws(() => cfgMod.resolve(root(), { configPath: 'nope.yml' }), /config not found/);
  });

  it('deep merges nested mappings and replaces lists', () => {
    const merged = cfgMod.deepMerge(
      { a: { b: 1, c: 2 }, list: [1, 2] },
      { a: { c: 3 }, list: [9] },
    );
    assert.deepStrictEqual(merged, { a: { b: 1, c: 3 }, list: [9] });
  });

  it('exposes a severity for every known rule', () => {
    const cfg = cfgMod.resolve(root());
    for (const name of Object.keys(cfgMod.RULE_DEFAULTS)) {
      assert.ok(
        cfgMod.SEVERITIES.includes(cfg.audit.rules[name]),
        `${name} resolved to a valid severity`,
      );
    }
  });
});
