/**
 * Copyright 2025 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 *
 * Page Manifest Link Injector
 * Injects or updates manifest link tags in page files
 */

const fs = require('fs');
const path = require('path');

/**
 * Generates the manifest link tag
 * @param {string} filename - Manifest filename
 * @param {boolean} useCredentials - Whether to add crossorigin="use-credentials"
 * @returns {string} The link tag HTML
 */
function generateManifestLink(filename, useCredentials = false) {
  const crossorigin = useCredentials ? ' crossorigin="use-credentials"' : '';
  return `<link rel="manifest" href="/${filename}"${crossorigin}>`;
}

/**
 * Checks if page content already has a manifest link
 * @param {string} content - Page file content
 * @returns {object} Object with found: boolean, link: string (or null)
 */
function findManifestLink(content) {
  const regex = /<link\s+rel=["']manifest["'][^>]*>/gi;
  const matches = content.match(regex);

  if (matches && matches.length > 0) {
    return { found: true, link: matches[0] };
  }

  return { found: false, link: null };
}

/**
 * Updates an existing manifest link in page content
 * @param {string} content - Page file content
 * @param {string} filename - Manifest filename
 * @param {boolean} useCredentials - Whether to add crossorigin="use-credentials"
 * @returns {string} Updated page content
 */
function updateManifestLink(content, filename, useCredentials = false) {
  const newLink = generateManifestLink(filename, useCredentials);
  const regex = /<link\s+rel=["']manifest["'][^>]*>/gi;
  return content.replace(regex, newLink);
}

/**
 * Injects manifest link into page content
 * If link exists, updates it. If not, inserts it in the <head> tag.
 * @param {string} content - Page file content
 * @param {string} filename - Manifest filename
 * @param {boolean} useCredentials - Whether to add crossorigin="use-credentials"
 * @returns {string} Updated page content
 */
function injectManifestLink(content, filename, useCredentials = false) {
  const { found } = findManifestLink(content);

  // If manifest link already exists, update it
  if (found) {
    return updateManifestLink(content, filename, useCredentials);
  }

  // Otherwise, insert it into the <head> tag
  const newLink = generateManifestLink(filename, useCredentials);
  const headRegex = /<\/head>/i;

  // Check if </head> exists
  if (headRegex.test(content)) {
    return content.replace(headRegex, `  ${newLink}\n</head>`);
  }

  // If no </head> tag, insert at the beginning after <html>
  const htmlRegex = /<html[^>]*>/i;
  if (htmlRegex.test(content)) {
    return content.replace(htmlRegex, (match) => `${match}\n<head>\n  ${newLink}\n</head>`);
  }

  // Fallback: prepend to content
  return `${newLink}\n${content}`;
}

/**
 * Processes all HTML files in a directory
 * @param {string} dirPath - Directory path to scan
 * @param {string[]} extensions - File extensions to process (e.g., ['html', 'htm'])
 * @param {string} filename - Manifest filename
 * @param {boolean} useCredentials - Whether to add crossorigin="use-credentials"
 * @returns {object} Results with injected: number, skipped: number, errors: array
 */
function processPageFiles(dirPath, extensions, filename, useCredentials = false) {
  const results = {
    injected: 0,
    skipped: 0,
    errors: [],
    files: [],
  };

  if (!fs.existsSync(dirPath)) {
    results.skipped++;
    return results;
  }

  try {
    const files = fs.readdirSync(dirPath, { recursive: true });

    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      // Skip directories
      if (stat.isDirectory()) {
        return;
      }

      // Check file extension
      const ext = path.extname(file).toLowerCase().slice(1);
      if (!extensions.includes(ext)) {
        return;
      }

      try {
        // Read file
        const content = fs.readFileSync(filePath, 'utf8');

        // Inject manifest link
        const updated = injectManifestLink(content, filename, useCredentials);

        // Check if content changed
        if (updated !== content) {
          fs.writeFileSync(filePath, updated, 'utf8');
          results.injected++;
          results.files.push(filePath);
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push({
          file: filePath,
          error: error.message,
        });
      }
    });
  } catch (error) {
    results.errors.push({
      directory: dirPath,
      error: error.message,
    });
  }

  return results;
}

/**
 * Class wrapper to match src/index.js usage
 */
class PageInjector {
  /**
   * Inject manifest link into the given file path
   * @param {string} filePath
   * @param {string} filename
   * @param {boolean} useCredentials
   */
  injectManifestLink(filePath, filename, useCredentials = false) {
    const content = fs.readFileSync(filePath, 'utf8');
    const updated = injectManifestLink(content, filename, useCredentials);
    if (updated !== content) {
      fs.writeFileSync(filePath, updated, 'utf8');
    }
  }
}

module.exports = PageInjector;
// Attach named utility exports preserved
module.exports.generateManifestLink = generateManifestLink;
module.exports.findManifestLink = findManifestLink;
module.exports.updateManifestLink = updateManifestLink;
module.exports.injectManifestLink = injectManifestLink;
module.exports.processPageFiles = processPageFiles;
