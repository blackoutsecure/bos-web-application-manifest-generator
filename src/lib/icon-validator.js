// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blackout Secure Web Application Manifest Generator
// Copyright © 2025-2026 Blackout Secure
// Licensed under Apache License 2.0
// Website: https://blackoutsecure.app
// Repository: https://github.com/blackoutsecure/bos-web-application-manifest-generator
// Issues: https://github.com/blackoutsecure/bos-web-application-manifest-generator/issues
// Docs: https://github.com/blackoutsecure/bos-web-application-manifest-generator#readme
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Icon file existence validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

function validateIcons(icons, baseDir, iconsDir = '') {
  const results = { valid: true, missing: [], checked: 0, checkedFiles: [] };
  if (!icons || icons.length === 0) return results;
  icons.forEach((icon) => {
    if (!icon.src) return;
    results.checked++;
    let filePath = icon.src;
    if (filePath.startsWith('/')) {
      filePath = filePath.slice(1);
    }
    const fullPath = path.join(baseDir, iconsDir, filePath);
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
