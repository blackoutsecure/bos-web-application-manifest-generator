/**
 * Copyright 2025 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 *
 * Icon Validator
 * Validates that icon files referenced in the manifest exist
 */

const fs = require('fs');
const path = require('path');

/**
 * Validates icon files exist in the project
 * @param {array} icons - Array of icon objects from manifest
 * @param {string} baseDir - Base directory to check (usually project root)
 * @returns {object} Validation result with missing icons and warnings
 */
function validateIcons(icons, baseDir) {
  const results = {
    valid: true,
    missing: [],
    checked: 0,
    checkedFiles: [],
  };

  if (!icons || icons.length === 0) {
    return results;
  }

  icons.forEach((icon) => {
    if (!icon.src) {
      return;
    }

    results.checked++;

    // Remove leading slash for file path
    const filePath = icon.src.startsWith('/') ? icon.src.slice(1) : icon.src;
    const fullPath = path.join(baseDir, filePath);

    const exists = fs.existsSync(fullPath);

    results.checkedFiles.push({
      src: icon.src,
      path: fullPath,
      sizes: icon.sizes || 'unspecified',
      type: icon.type || 'unspecified',
      exists,
    });

    if (!exists) {
      results.valid = false;
      results.missing.push({
        src: icon.src,
        path: fullPath,
        sizes: icon.sizes || 'unspecified',
        type: icon.type || 'unspecified',
      });
    }
  });

  return results;
}

/**
 * Class wrapper to match src/index.js usage
 */
class IconValidator {
  /**
   * Validate icons and return an array of missing icon entries
   * @param {Array} icons
   * @returns {Array<{src:string,path:string,sizes:string,type:string}>}
   */
  validate(icons = []) {
    const res = validateIcons(icons, process.cwd());
    return res.missing || [];
  }
}

module.exports = IconValidator;
// Attach named utility export preserved
module.exports.validateIcons = validateIcons;
