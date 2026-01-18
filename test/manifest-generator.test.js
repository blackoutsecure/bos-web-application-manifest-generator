/**
 * Copyright 2025 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for Web Manifest Generator
 */

const { describe, it } = require('mocha');
const assert = require('assert');
const {
  generateManifest,
  processManifest,
  processIcons,
  processShortcuts,
  validateManifest,
} = require('../src/lib/manifest-generator');

describe('Web Manifest Generator', () => {
  describe('processManifest', () => {
    it('should generate a minimal valid manifest', () => {
      const config = {
        name: 'Test App',
        start_url: '/',
      };
      const manifest = processManifest(config);

      assert.strictEqual(manifest.name, 'Test App');
      assert.strictEqual(manifest.start_url, '/');
      assert.strictEqual(manifest.scope, '/');
      assert.strictEqual(manifest.display, 'standalone');
    });

    it('should process all standard members', () => {
      const config = {
        name: 'Full Featured App',
        short_name: 'App',
        description: 'A fully featured application',
        start_url: '/app',
        scope: '/app/',
        display: 'fullscreen',
        orientation: 'portrait',
        theme_color: '#000000',
        background_color: '#ffffff',
        lang: 'en-US',
        dir: 'ltr',
        id: '/app',
      };

      const manifest = processManifest(config);

      assert.strictEqual(manifest.name, 'Full Featured App');
      assert.strictEqual(manifest.short_name, 'App');
      assert.strictEqual(manifest.description, 'A fully featured application');
      assert.strictEqual(manifest.start_url, '/app');
      assert.strictEqual(manifest.scope, '/app/');
      assert.strictEqual(manifest.display, 'fullscreen');
      assert.strictEqual(manifest.orientation, 'portrait');
      assert.strictEqual(manifest.theme_color, '#000000');
      assert.strictEqual(manifest.background_color, '#ffffff');
      assert.strictEqual(manifest.lang, 'en-US');
      assert.strictEqual(manifest.dir, 'ltr');
      assert.strictEqual(manifest.id, '/app');
    });

    it('should set default values for optional members', () => {
      const config = {
        name: 'Test App',
      };
      const manifest = processManifest(config);

      assert.strictEqual(manifest.start_url, '/');
      assert.strictEqual(manifest.scope, '/');
      assert.strictEqual(manifest.display, 'standalone');
    });

    it('should validate display mode values', () => {
      const validModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];

      validModes.forEach((mode) => {
        const manifest = processManifest({ name: 'Test', display: mode });
        assert.strictEqual(manifest.display, mode);
      });

      // Invalid display mode should use default
      const invalidManifest = processManifest({
        name: 'Test',
        display: 'invalid',
      });
      assert.strictEqual(invalidManifest.display, 'standalone');
    });

    it('should validate orientation values', () => {
      const validOrientations = [
        'any',
        'natural',
        'landscape',
        'portrait',
        'portrait-primary',
        'portrait-secondary',
        'landscape-primary',
        'landscape-secondary',
      ];

      validOrientations.forEach((orientation) => {
        const manifest = processManifest({ name: 'Test', orientation });
        assert.strictEqual(manifest.orientation, orientation);
      });

      // Invalid orientation should be omitted
      const invalidManifest = processManifest({
        name: 'Test',
        orientation: 'invalid',
      });
      assert.strictEqual(invalidManifest.orientation, undefined);
    });

    it('should validate dir values', () => {
      const validDirs = ['ltr', 'rtl', 'auto'];

      validDirs.forEach((dir) => {
        const manifest = processManifest({ name: 'Test', dir });
        assert.strictEqual(manifest.dir, dir);
      });

      // Invalid dir should be omitted
      const invalidManifest = processManifest({ name: 'Test', dir: 'invalid' });
      assert.strictEqual(invalidManifest.dir, undefined);
    });
  });

  describe('processIcons', () => {
    it('should process valid icons', () => {
      const icons = [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ];

      const processed = processIcons(icons);

      assert.strictEqual(processed.length, 2);
      assert.strictEqual(processed[0].src, '/icon-192.png');
      assert.strictEqual(processed[0].sizes, '192x192');
      assert.strictEqual(processed[0].type, 'image/png');
      assert.strictEqual(processed[1].purpose, 'maskable');
    });

    it('should filter out invalid icons', () => {
      const icons = [
        { src: '/valid.png' },
        { sizes: '192x192' }, // Missing src
        null,
        undefined,
        'invalid',
      ];

      const processed = processIcons(icons);

      assert.strictEqual(processed.length, 1);
      assert.strictEqual(processed[0].src, '/valid.png');
    });

    it('should validate icon purpose values', () => {
      const icons = [
        { src: '/icon.png', purpose: 'any' },
        { src: '/icon2.png', purpose: 'maskable' },
        { src: '/icon3.png', purpose: 'monochrome' },
        { src: '/icon4.png', purpose: 'any maskable' },
        { src: '/icon5.png', purpose: 'invalid' },
      ];

      const processed = processIcons(icons);

      assert.strictEqual(processed[0].purpose, 'any');
      assert.strictEqual(processed[1].purpose, 'maskable');
      assert.strictEqual(processed[2].purpose, 'monochrome');
      assert.strictEqual(processed[3].purpose, 'any maskable');
      assert.strictEqual(processed[4].purpose, undefined); // Invalid purpose filtered out
    });
  });

  describe('processShortcuts', () => {
    it('should process valid shortcuts', () => {
      const shortcuts = [
        {
          name: 'Home',
          url: '/',
          description: 'Go to home',
        },
        {
          name: 'Profile',
          short_name: 'Prof',
          url: '/profile',
        },
      ];

      const processed = processShortcuts(shortcuts);

      assert.strictEqual(processed.length, 2);
      assert.strictEqual(processed[0].name, 'Home');
      assert.strictEqual(processed[0].url, '/');
      assert.strictEqual(processed[0].description, 'Go to home');
      assert.strictEqual(processed[1].short_name, 'Prof');
    });

    it('should filter out invalid shortcuts', () => {
      const shortcuts = [
        { name: 'Valid', url: '/valid' },
        { name: 'Missing URL' }, // Missing url
        { url: '/missing-name' }, // Missing name
        null,
        undefined,
      ];

      const processed = processShortcuts(shortcuts);

      assert.strictEqual(processed.length, 1);
      assert.strictEqual(processed[0].name, 'Valid');
    });

    it('should process shortcuts with icons', () => {
      const shortcuts = [
        {
          name: 'Home',
          url: '/',
          icons: [{ src: '/shortcut-icon.png', sizes: '96x96' }],
        },
      ];

      const processed = processShortcuts(shortcuts);

      assert.strictEqual(processed.length, 1);
      assert(Array.isArray(processed[0].icons));
      assert.strictEqual(processed[0].icons[0].src, '/shortcut-icon.png');
    });
  });

  describe('generateManifest', () => {
    it('should generate valid JSON', () => {
      const config = {
        name: 'Test App',
        start_url: '/',
      };

      const json = generateManifest(config);
      const parsed = JSON.parse(json);

      assert.strictEqual(parsed.name, 'Test App');
      assert.strictEqual(parsed.start_url, '/');
    });

    it('should format JSON with proper indentation', () => {
      const config = {
        name: 'Test App',
        icons: [{ src: '/icon.png' }],
      };

      const json = generateManifest(config);

      assert(json.includes('\n'));
      assert(json.includes('  '));
    });
  });

  describe('validateManifest', () => {
    it('should validate a complete manifest', () => {
      const manifest = {
        name: 'Test App',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
      };

      const result = validateManifest(manifest);

      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should warn when name and short_name are missing', () => {
      const manifest = {
        start_url: '/',
      };

      const result = validateManifest(manifest);

      assert.strictEqual(result.isValid, false);
      assert(result.errors.some((e) => e.includes('name')));
    });

    it('should warn when icons are missing', () => {
      const manifest = {
        name: 'Test App',
      };

      const result = validateManifest(manifest);

      assert.strictEqual(result.isValid, false);
      assert(result.errors.some((e) => e.includes('Icons')));
    });

    it('should validate icon structure', () => {
      const manifest = {
        name: 'Test App',
        icons: [
          { src: '/valid.png' },
          { sizes: '192x192' }, // Missing src
        ],
      };

      const result = validateManifest(manifest);

      assert.strictEqual(result.isValid, false);
      assert(result.errors.some((e) => e.includes('Icon at index 1')));
    });

    it('should validate shortcut structure', () => {
      const manifest = {
        name: 'Test App',
        icons: [{ src: '/icon.png' }],
        shortcuts: [
          { name: 'Valid', url: '/valid' },
          { name: 'Missing URL' }, // Missing url
        ],
      };

      const result = validateManifest(manifest);

      assert.strictEqual(result.isValid, false);
      assert(result.errors.some((e) => e.includes('Shortcut at index 1')));
    });
  });
});
