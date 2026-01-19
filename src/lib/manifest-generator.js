/**
 * Copyright 2025 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 *
 * Web Manifest Generator
 * Generates site.webmanifest files according to W3C Web Application Manifest specification
 * https://w3c.github.io/manifest/
 */

/**
 * Validates and processes manifest configuration according to W3C spec
 * @param {Object} config - Manifest configuration object
 * @returns {Object} Processed manifest object
 */
function processManifest(config = {}) {
  const manifest = {};

  // If favicons mode is enabled, apply defaults first
  if (config.favicons) {
    // Apply default favicons manifest values
    const defaults = {
      name: '',
      short_name: '',
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
    };

    // Merge favicons_options overrides with defaults
    if (config.favicons_options && typeof config.favicons_options === 'object') {
      Object.assign(defaults, config.favicons_options);
    }

    // Apply defaults to config (but don't override explicitly set values)
    Object.keys(defaults).forEach((key) => {
      if (config[key] === undefined || config[key] === '' || 
          (Array.isArray(config[key]) && config[key].length === 0)) {
        config[key] = defaults[key];
      }
    });
  }

  // Required/recommended members according to W3C spec

  // name member - represents the name of the web application
  if (config.name && typeof config.name === 'string') {
    manifest.name = config.name.trim();
  }

  // short_name member - short version of the name
  if (config.short_name && typeof config.short_name === 'string') {
    manifest.short_name = config.short_name.trim();
  }

  // description member (from manifest-app-info extension)
  if (config.description && typeof config.description === 'string') {
    manifest.description = config.description.trim();
  }

  // start_url member - URL that loads when the user launches the application
  if (config.start_url && typeof config.start_url === 'string') {
    manifest.start_url = config.start_url.trim();
  } else {
    manifest.start_url = '/'; // Default to root
  }

  // id member - unique identifier for the application
  if (config.id && typeof config.id === 'string') {
    manifest.id = config.id.trim();
  }

  // scope member - navigation scope of the web application
  if (config.scope && typeof config.scope === 'string') {
    manifest.scope = config.scope.trim();
  } else {
    manifest.scope = '/'; // Default scope
  }

  // display member - preferred display mode
  const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
  if (config.display && validDisplayModes.includes(config.display.toLowerCase())) {
    manifest.display = config.display.toLowerCase();
  } else {
    manifest.display = 'standalone'; // Default display mode
  }

  // orientation member - default screen orientation
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
  if (config.orientation && validOrientations.includes(config.orientation.toLowerCase())) {
    manifest.orientation = config.orientation.toLowerCase();
  }

  // theme_color member - default theme color for the application
  if (config.theme_color && typeof config.theme_color === 'string') {
    manifest.theme_color = config.theme_color.trim();
  }

  // background_color member - expected background color
  if (config.background_color && typeof config.background_color === 'string') {
    manifest.background_color = config.background_color.trim();
  }

  // lang member - language for the manifest's values
  if (config.lang && typeof config.lang === 'string') {
    manifest.lang = config.lang.trim();
  }

  // dir member - text direction
  const validDirections = ['ltr', 'rtl', 'auto'];
  if (config.dir && validDirections.includes(config.dir.toLowerCase())) {
    manifest.dir = config.dir.toLowerCase();
  }

  // icons member - array of image resources
  if (Array.isArray(config.icons)) {
    manifest.icons = processIcons(config.icons);
  }

  // shortcuts member - array of shortcut items
  if (Array.isArray(config.shortcuts)) {
    manifest.shortcuts = processShortcuts(config.shortcuts);
  }

  // categories member (from manifest-app-info extension)
  if (Array.isArray(config.categories)) {
    manifest.categories = config.categories
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
      const validPurposes = ['monochrome', 'maskable', 'any'];
      if (icon.purpose && typeof icon.purpose === 'string') {
        const purposes = icon.purpose
          .toLowerCase()
          .split(/\s+/)
          .filter((p) => validPurposes.includes(p));
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
