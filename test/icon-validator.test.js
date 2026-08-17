/**
 * Tests for Icon Validator
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { validateIcons } = require('../src/lib/icon-validator');

describe('Icon Validator', () => {
  let tempDir;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-validator-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should validate when all icons exist', () => {
    // Create test icon files
    fs.writeFileSync(path.join(tempDir, 'icon-192.png'), '');
    fs.writeFileSync(path.join(tempDir, 'icon-512.png'), '');

    const icons = [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ];

    const result = validateIcons(icons, tempDir);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.checked, 2);
    assert.strictEqual(result.missing.length, 0);
  });

  it('should detect missing icons', () => {
    const icons = [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ];

    const result = validateIcons(icons, tempDir);

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.checked, 2);
    assert.strictEqual(result.missing.length, 2);
    assert(result.missing[0].src.includes('icon-192.png'));
    assert(result.missing[1].src.includes('icon-512.png'));
  });

  it('should handle icons without leading slash', () => {
    fs.writeFileSync(path.join(tempDir, 'icon.png'), '');

    const icons = [{ src: 'icon.png', sizes: '512x512', type: 'image/png' }];

    const result = validateIcons(icons, tempDir);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.missing.length, 0);
  });

  it('should handle empty icon array', () => {
    const result = validateIcons([], tempDir);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.checked, 0);
  });

  it('should handle null icons', () => {
    const result = validateIcons(null, tempDir);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.checked, 0);
  });

  it('should handle icons without src', () => {
    const icons = [
      { sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512' },
    ];

    fs.writeFileSync(path.join(tempDir, 'icon-512.png'), '');

    const result = validateIcons(icons, tempDir);

    assert.strictEqual(result.checked, 1);
    assert.strictEqual(result.valid, true);
  });

  it('should include icon details in missing results', () => {
    const icons = [{ src: '/missing.png', sizes: '192x192', type: 'image/png' }];

    const result = validateIcons(icons, tempDir);

    assert.strictEqual(result.missing.length, 1);
    const missing = result.missing[0];
    assert.strictEqual(missing.src, '/missing.png');
    assert.strictEqual(missing.sizes, '192x192');
    assert.strictEqual(missing.type, 'image/png');
  });
});
