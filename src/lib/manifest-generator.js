// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blackout Secure Web Application Manifest Generator
// Copyright © 2025-2026 Blackout Secure
// Licensed under Apache License 2.0
// Website: https://blackoutsecure.app
// Repository: https://github.com/blackoutsecure/bos-web-application-manifest-generator
// Issues: https://github.com/blackoutsecure/bos-web-application-manifest-generator/issues
// Docs: https://github.com/blackoutsecure/bos-web-application-manifest-generator#readme
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Manifest generation and validation (W3C spec)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const config = require('./project-config');
const { safeString, validateEnum } = require('./utils');

/**
 * Validates and processes manifest configuration according to W3C spec
 * @param {Object} cfg - Manifest configuration object
 * @param {String} iconsDir - Icons directory path (e.g., '/assets')
 * @returns {Object} Processed manifest object
 */
function processManifest(cfg = {}, iconsDir = '') {
  const manifest = {};

  const processStringMember = (value, defaultValue = '', trimmed = true) => {
    if (typeof value === 'string') {
      const trimmedValue = trimmed ? value.trim() : value;
      return trimmedValue.length > 0 ? trimmedValue : defaultValue;
    }
    return defaultValue;
  };

  const processUrlMember = (value, defaultValue = '/') => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : defaultValue;
    }
    return defaultValue;
  };

  manifest.name = processStringMember(cfg.name, '');
  manifest.short_name = processStringMember(cfg.short_name, '');

  if (typeof cfg.description === 'string' && cfg.description.trim().length > 0) {
    manifest.description = cfg.description.trim();
  }

  manifest.start_url = processUrlMember(cfg.start_url, config.defaults.startUrl);

  if (typeof cfg.id === 'string' && cfg.id.trim().length > 0) {
    manifest.id = cfg.id.trim();
  }

  manifest.scope = processUrlMember(cfg.scope, config.defaults.scope);
  manifest.display = validateEnum(
    cfg.display,
    config.validation.displayModes,
    config.defaults.display
  );
  manifest.orientation = validateEnum(
    cfg.orientation,
    config.validation.orientations,
    config.defaults.orientation
  );
  manifest.theme_color = processStringMember(cfg.theme_color, config.defaults.themeColor);
  manifest.background_color = processStringMember(
    cfg.background_color,
    config.defaults.backgroundColor
  );

  if (typeof cfg.lang === 'string' && cfg.lang.trim().length > 0) {
    manifest.lang = cfg.lang.trim();
  }

  if (cfg.dir) {
    const validDir = validateEnum(cfg.dir, config.validation.textDirections, null);
    if (validDir) {
      manifest.dir = validDir;
    }
  }

  if (Array.isArray(cfg.icons) && cfg.icons.length > 0) {
    manifest.icons = processIcons(cfg.icons, iconsDir);
  } else {
    manifest.icons = processIcons(config.defaults.icons, iconsDir);
  }

  if (Array.isArray(cfg.shortcuts)) {
    manifest.shortcuts = processShortcuts(cfg.shortcuts, iconsDir);
  }

  if (Array.isArray(cfg.categories)) {
    manifest.categories = cfg.categories
      .filter((cat) => typeof cat === 'string' && cat.trim().length > 0)
      .map((cat) => cat.trim());
  }

  return manifest;
}

/**
 * Process icons array according to W3C Image Resource spec
 * @param {Array} icons - Array of icon objects
 * @param {String} iconsDir - Icons directory path (e.g., '/assets')
 * @returns {Array} Processed icons array
 */
function processIcons(icons, iconsDir = '') {
  const normalizeIconPath = (src, dir) => {
    const cleanSrc = safeString(src);
    if (!cleanSrc) return cleanSrc;
    if (!dir || dir === '') return cleanSrc;
    // Remove leading slash from src to avoid double slashes when joining
    const srcWithoutLeadingSlash = cleanSrc.startsWith('/') ? cleanSrc.slice(1) : cleanSrc;
    const normalizedDir = dir.startsWith('/') ? dir : '/' + dir;
    // Ensure normalizedDir ends without slash to join cleanly
    const dirWithoutTrailingSlash = normalizedDir.endsWith('/')
      ? normalizedDir.slice(0, -1)
      : normalizedDir;
    return dirWithoutTrailingSlash + '/' + srcWithoutLeadingSlash;
  };
  return icons
    .filter((icon) => icon && typeof icon === 'object' && icon.src)
    .map((icon) => {
      const processed = { src: normalizeIconPath(icon.src, iconsDir) };
      if (icon.sizes) processed.sizes = safeString(icon.sizes);
      if (icon.type) processed.type = safeString(icon.type);
      if (icon.purpose && typeof icon.purpose === 'string') {
        const purposes = icon.purpose
          .toLowerCase()
          .split(/\s+/)
          .filter((p) => config.validation.iconPurposes.includes(p));
        if (purposes.length > 0) {
          processed.purpose = purposes.join(' ');
        }
      }
      return processed;
    });
}

/**
 * Process shortcuts array according to W3C spec
 * @param {Array} shortcuts - Array of shortcut objects
 * @param {String} iconsDir - Icons directory path (e.g., '/assets')
 * @returns {Array} Processed shortcuts array
 */
function processShortcuts(shortcuts, iconsDir = '') {
  return shortcuts
    .filter(
      (shortcut) =>
        shortcut &&
        typeof shortcut === 'object' &&
        typeof shortcut.name === 'string' &&
        typeof shortcut.url === 'string' &&
        shortcut.name.trim().length > 0 &&
        shortcut.url.trim().length > 0
    )
    .map((shortcut) => {
      const processed = {
        name: safeString(shortcut.name),
        url: safeString(shortcut.url),
      };
      if (shortcut.short_name) processed.short_name = safeString(shortcut.short_name);
      if (shortcut.description) processed.description = safeString(shortcut.description);
      if (Array.isArray(shortcut.icons)) processed.icons = processIcons(shortcut.icons, iconsDir);
      return processed;
    });
}

/**
 * Generate a site.webmanifest file from configuration
 * @param {Object} config - Manifest configuration
 * @param {String} iconsDir - Icons directory path (e.g., '/assets')
 * @returns {string} JSON string of the manifest
 */
function generateManifest(config, iconsDir = '') {
  const manifest = processManifest(config, iconsDir);
  return JSON.stringify(manifest, null, 2);
}

/**
 * Validate a manifest object against W3C spec requirements
 * @param {Object} manifest - Manifest object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateManifest(manifest) {
  const errors = [];
  if (!manifest.name && !manifest.short_name) {
    errors.push(
      'At least one of "name" or "short_name" should be provided for better user experience'
    );
  }
  if (!manifest.icons || !Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    errors.push('Icons array should be provided for better user experience');
  }
  if (manifest.icons && Array.isArray(manifest.icons)) {
    manifest.icons.forEach((icon, index) => {
      if (!icon.src) {
        errors.push(`Icon at index ${index} is missing required "src" member`);
      }
      if (icon.purpose && typeof icon.purpose === 'string') {
        const purposes = icon.purpose.toLowerCase().split(/\s+/).filter(Boolean);
        if (purposes.includes('any') && purposes.includes('maskable')) {
          errors.push(
            `Icon at index ${index} uses discouraged purpose combination "any maskable"; prefer separate icons for each purpose`
          );
        }
      }
    });
  }
  if (manifest.shortcuts && Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts.forEach((shortcut, index) => {
      if (!shortcut.name)
        errors.push(`Shortcut at index ${index} is missing required "name" member`);
      if (!shortcut.url) errors.push(`Shortcut at index ${index} is missing required "url" member`);
    });
  }
  return { isValid: errors.length === 0, errors };
}

/**
 * Class wrapper to match src/index.js usage
 */
class ManifestGenerator {
  /**
   * Generate manifest object from options (returns object, not string)
   * @param {Object} config
   * @returns {Object}
   */
  generateManifest(config = {}) {
    return processManifest(config);
  }
}

module.exports = ManifestGenerator;
// Attach named utility exports for direct use/testing
module.exports.generateManifest = generateManifest;
module.exports.processManifest = processManifest;
module.exports.processIcons = processIcons;
module.exports.processShortcuts = processShortcuts;
module.exports.validateManifest = validateManifest;
