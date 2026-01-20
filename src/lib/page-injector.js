// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blackout Secure Web Application Manifest Generator
// Copyright © 2025-2026 Blackout Secure
// Licensed under Apache License 2.0
// Website: https://blackoutsecure.app
// Repository: https://github.com/blackoutsecure/bos-web-application-manifest-generator
// Issues: https://github.com/blackoutsecure/bos-web-application-manifest-generator/issues
// Docs: https://github.com/blackoutsecure/bos-web-application-manifest-generator#readme
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Injects manifest link tags into page files
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const { normalizePath } = require('./utils');

function generateManifestLink(filename, useCredentials = false) {
  const crossorigin = useCredentials ? ' crossorigin="use-credentials"' : '';
  return `<link rel="manifest" href="/${normalizePath(filename)}"${crossorigin}>`;
}

function findManifestLink(content) {
  const regex = /<link\s+rel=["']manifest["'][^>]*>/gi;
  const matches = content.match(regex);
  return { found: !!matches, link: matches?.[0] || null };
}

function updateManifestLink(content, filename, useCredentials = false) {
  const newLink = generateManifestLink(filename, useCredentials);
  const regex = /<link\s+rel=["']manifest["'][^>]*>/gi;
  return content.replace(regex, newLink);
}

function injectManifestLink(content, filename, useCredentials = false) {
  const { found } = findManifestLink(content);
  if (found) return updateManifestLink(content, filename, useCredentials);
  const newLink = generateManifestLink(filename, useCredentials);
  const headRegex = /<\/head>/i;
  if (headRegex.test(content)) {
    return content.replace(headRegex, `  ${newLink}\n</head>`);
  }
  const htmlRegex = /<html[^>]*>/i;
  if (htmlRegex.test(content)) {
    return content.replace(htmlRegex, (match) => `${match}\n<head>\n  ${newLink}\n</head>`);
  }
  return `${newLink}\n${content}`;
}

function processPageFiles(dirPath, extensions, filename, useCredentials = false) {
  const results = {
    injected: 0,
    skipped: 0,
    errors: [],
    files: [],
    details: [],
  };
  if (!fs.existsSync(dirPath)) return results;
  try {
    const files = fs.readdirSync(dirPath, { recursive: true });
    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) return;
        const ext = path.extname(file).toLowerCase().slice(1);
        if (!extensions.includes(ext)) return;
        const content = fs.readFileSync(filePath, 'utf8');
        const { found: _found } = findManifestLink(content);
        const updated = injectManifestLink(content, filename, useCredentials);
        if (updated !== content) {
          fs.writeFileSync(filePath, updated, 'utf8');
          results.injected++;
          results.files.push(filePath);
          results.details.push({
            file: filePath,
            status: 'injected',
            message: 'Manifest link injected',
          });
        } else {
          results.skipped++;
          results.details.push({
            file: filePath,
            status: 'skipped',
            message: 'Manifest link already present',
          });
        }
      } catch (error) {
        results.errors.push({ file: filePath, error: error.message });
        results.details.push({
          file: filePath,
          status: 'error',
          message: error.message,
        });
      }
    });
  } catch (error) {
    results.errors.push({ directory: dirPath, error: error.message });
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
