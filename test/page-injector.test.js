/**
 * Tests for Page Injector
 */

const assert = require('assert');
const {
  generateManifestLink,
  findManifestLink,
  updateManifestLink,
  injectManifestLink,
} = require('../src/lib/page-injector');

describe('Page Injector', () => {
  describe('generateManifestLink', () => {
    it('should generate manifest link without credentials', () => {
      const link = generateManifestLink('site.webmanifest', false);
      assert.strictEqual(link, '<link rel="manifest" href="/site.webmanifest">');
    });

    it('should generate manifest link with credentials', () => {
      const link = generateManifestLink('site.webmanifest', true);
      assert.strictEqual(
        link,
        '<link rel="manifest" href="/site.webmanifest" crossorigin="use-credentials">'
      );
    });
  });

  describe('findManifestLink', () => {
    it('should find existing manifest link', () => {
      const html = '<head><link rel="manifest" href="/manifest.json"></head>';
      const result = findManifestLink(html);
      assert.strictEqual(result.found, true);
      assert(result.link.includes('rel="manifest"'));
    });

    it('should handle missing manifest link', () => {
      const html = '<head><title>Test</title></head>';
      const result = findManifestLink(html);
      assert.strictEqual(result.found, false);
      assert.strictEqual(result.link, null);
    });
  });

  describe('updateManifestLink', () => {
    it('should update existing manifest link', () => {
      const html = '<head><link rel="manifest" href="/old.json"></head>';
      const updated = updateManifestLink(html, 'site.webmanifest', false);
      assert(updated.includes('href="/site.webmanifest"'));
      assert(!updated.includes('href="/old.json"'));
    });

    it('should add credentials to manifest link on update', () => {
      const html = '<head><link rel="manifest" href="/site.webmanifest"></head>';
      const updated = updateManifestLink(html, 'site.webmanifest', true);
      assert(updated.includes('crossorigin="use-credentials"'));
    });
  });

  describe('injectManifestLink', () => {
    it('should insert manifest link into head tag', () => {
      const html = '<head><title>Test</title></head>';
      const result = injectManifestLink(html, 'site.webmanifest', false);
      assert(result.includes('<link rel="manifest"'));
      assert(result.includes('</head>'));
    });

    it('should update existing manifest link instead of inserting new one', () => {
      const html = '<head><link rel="manifest" href="/old.json"></head>';
      const result = injectManifestLink(html, 'site.webmanifest', false);
      const count = (result.match(/rel="manifest"/g) || []).length;
      assert.strictEqual(count, 1);
      assert(result.includes('href="/site.webmanifest"'));
    });

    it('should handle HTML without head tag', () => {
      const html = '<html><body>Content</body></html>';
      const result = injectManifestLink(html, 'site.webmanifest', false);
      assert(result.includes('<link rel="manifest"'));
    });

    it('should inject with credentials when specified', () => {
      const html = '<head></head>';
      const result = injectManifestLink(html, 'site.webmanifest', true);
      assert(result.includes('crossorigin="use-credentials"'));
    });
  });
});
