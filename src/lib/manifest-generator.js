/**
 * Copyright 2025 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 *
 * Web Application Manifest Generator
 * Generates site.webmanifest files according to W3C Web Application Manifest specification
 * https://w3c.github.io/manifest/
 */

const config = require('./project-config');

/**
 * Validates and processes manifest configuration according to W3C spec
 * @param {Object} cfg - Manifest configuration object
 * @returns {Object} Processed manifest object
 */
function processManifest(cfg = {}) {
  const manifest = {};

  // Required/recommended members according to W3C spec

  // name member - represents the name of the web application
  // Always include name field (even if empty) for consistency
  if (cfg.name !== undefined && typeof cfg.name === 'string') {
    manifest.name = cfg.name.trim();
  } else {
    manifest.name = '';
  }

  // short_name member - short version of the name
  // Always include short_name field (even if empty) for consistency
  if (cfg.short_name !== undefined && typeof cfg.short_name === 'string') {
    manifest.short_name = cfg.short_name.trim();
  } else {
    manifest.short_name = '';
  }

  // description member (from manifest-app-info extension)
  if (cfg.description && typeof cfg.description === 'string') {
    manifest.description = cfg.description.trim();
  }

  // start_url member - URL that loads when the user launches the application
  if (cfg.start_url && typeof cfg.start_url === 'string') {
    manifest.start_url = cfg.start_url.trim();
  } else {
    manifest.start_url = config.defaults.startUrl; // Default to root
  }

  // id member - unique identifier for the application
  if (cfg.id && typeof cfg.id === 'string') {
    manifest.id = cfg.id.trim();
  }

  // scope member - navigation scope of the web application
  if (cfg.scope && typeof cfg.scope === 'string') {
    manifest.scope = cfg.scope.trim();
  } else {
    manifest.scope = config.defaults.scope; // Default scope
  }

  // display member - preferred display mode
  if (cfg.display && config.validation.displayModes.includes(cfg.display.toLowerCase())) {
    manifest.display = cfg.display.toLowerCase();
  } else {
    manifest.display = config.defaults.display; // Default display mode
  }

  // orientation member - default screen orientation
  if (cfg.orientation && config.validation.orientations.includes(cfg.orientation.toLowerCase())) {
    manifest.orientation = cfg.orientation.toLowerCase();
  } else {
    manifest.orientation = config.defaults.orientation;
  }

  // theme_color member - default theme color for the application
  if (cfg.theme_color && typeof cfg.theme_color === 'string') {
    manifest.theme_color = cfg.theme_color.trim();
  } else {
    manifest.theme_color = config.defaults.themeColor;
  }

  // background_color member - expected background color
  if (cfg.background_color && typeof cfg.background_color === 'string') {
    manifest.background_color = cfg.background_color.trim();
  } else {
    manifest.background_color = config.defaults.backgroundColor;
  }

  // lang member - language for the manifest's values
  if (cfg.lang && typeof cfg.lang === 'string') {
    manifest.lang = cfg.lang.trim();
  }

  // dir member - text direction
  if (cfg.dir && config.validation.textDirections.includes(cfg.dir.toLowerCase())) {
    manifest.dir = cfg.dir.toLowerCase();
  }

  // icons member - array of image resources
  if (Array.isArray(cfg.icons) && cfg.icons.length > 0) {
    manifest.icons = processIcons(cfg.icons);
  } else {
    manifest.icons = processIcons(config.defaults.icons);
  }

  // shortcuts member - array of shortcut items
  if (Array.isArray(cfg.shortcuts)) {
    manifest.shortcuts = processShortcuts(cfg.shortcuts);
  }

  // categories member (from manifest-app-info extension)
  if (Array.isArray(cfg.categories)) {
    manifest.categories = cfg.categories
      .filter((cat) => typeof cat === 'string')
      .map((cat) => cat.trim());
  }

  return manifest;
}

/**
 * Process icons array according to W3C Image Resource spec
 * @param {Array} icons - Array of icon objects
 * @returns {Array} Processed icons array
 */
function processIcons(icons) {
  return icons
    .filter((icon) => icon && typeof icon === 'object' && icon.src)
    .map((icon) => {
      const processed = {
        src: icon.src.trim(),
      };

      // sizes member - space-separated list of sizes
      if (icon.sizes && typeof icon.sizes === 'string') {
        processed.sizes = icon.sizes.trim();
      }

      // type member - MIME type of the image
      if (icon.type && typeof icon.type === 'string') {
        processed.type = icon.type.trim();
      }

      // purpose member - space-separated list of purposes
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
 * @returns {Array} Processed shortcuts array
 */
function processShortcuts(shortcuts) {
  return shortcuts
    .filter((shortcut) => {
      return shortcut && typeof shortcut === 'object' && shortcut.name && shortcut.url;
    })
    .map((shortcut) => {
      const processed = {
        name: shortcut.name.trim(),
        url: shortcut.url.trim(),
      };

      if (shortcut.short_name && typeof shortcut.short_name === 'string') {
        processed.short_name = shortcut.short_name.trim();
      }

      if (shortcut.description && typeof shortcut.description === 'string') {
        processed.description = shortcut.description.trim();
      }

      if (Array.isArray(shortcut.icons)) {
        processed.icons = processIcons(shortcut.icons);
      }

      return processed;
    });
}

/**
 * Generate a site.webmanifest file from configuration
 * @param {Object} config - Manifest configuration
 * @returns {string} JSON string of the manifest
 */
function generateManifest(config) {
  const manifest = processManifest(config);
  return JSON.stringify(manifest, null, 2);
}

/**
 * Validate a manifest object against W3C spec requirements
 * @param {Object} manifest - Manifest object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateManifest(manifest) {
  const errors = [];

  // Check for recommended members
  if (!manifest.name && !manifest.short_name) {
    errors.push(
      'At least one of "name" or "short_name" should be provided for better user experience'
    );
  }

  if (!manifest.icons || !Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    errors.push('Icons array should be provided for better user experience');
  }

  // Validate icon formats
  if (manifest.icons && Array.isArray(manifest.icons)) {
    manifest.icons.forEach((icon, index) => {
      if (!icon.src) {
        errors.push(`Icon at index ${index} is missing required "src" member`);
      }

      // Discourage combined purpose values like "any maskable" per PWA best practices
      if (icon.purpose && typeof icon.purpose === 'string') {
        const purposes = icon.purpose.toLowerCase().split(/\s+/).filter(Boolean);

        const hasAny = purposes.includes('any');
        const hasMaskable = purposes.includes('maskable');

        if (hasAny && hasMaskable) {
          errors.push(
            `Icon at index ${index} uses discouraged purpose combination "any maskable"; prefer separate icons for each purpose`
          );
        }
      }
    });
  }

  // Validate shortcuts
  if (manifest.shortcuts && Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts.forEach((shortcut, index) => {
      if (!shortcut.name) {
        errors.push(`Shortcut at index ${index} is missing required "name" member`);
      }
      if (!shortcut.url) {
        errors.push(`Shortcut at index ${index} is missing required "url" member`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
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
