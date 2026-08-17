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

/** Favicon links injected alongside the manifest link. */
const FAVICON_LINKS = Object.freeze([
  { rel: 'icon', href: '/icons/favicon.ico', extra: '' },
  { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png', extra: ' sizes="180x180"' },
]);

/**
 * Build the PWA meta tags derived from the manifest.
 * @param {object} [manifest] - Processed manifest object.
 * @param {object} [options] - Injection toggles.
 * @param {boolean} [options.mobileWebAppCapable] - Emit the capability tags.
 * @returns {string[]} Meta tag strings.
 */
function generatePwaMetaTags(manifest = {}, { mobileWebAppCapable = true } = {}) {
  const tags = [];
  if (manifest.theme_color) {
    tags.push(`<meta name="theme-color" content="${manifest.theme_color}">`);
  }
  if (manifest.name || manifest.short_name) {
    const label = manifest.short_name || manifest.name;
    tags.push(`<meta name="application-name" content="${label}">`);
    tags.push(`<meta name="apple-mobile-web-app-title" content="${label}">`);
  }
  if (mobileWebAppCapable) {
    tags.push('<meta name="mobile-web-app-capable" content="yes">');
    tags.push('<meta name="apple-mobile-web-app-capable" content="yes">');
  }
  return tags;
}

/** Build the favicon link tags. */
function generateFaviconLinks() {
  return FAVICON_LINKS.map(({ rel, href, extra }) => `<link rel="${rel}" href="${href}"${extra}>`);
}

/**
 * Insert tags into `<head>`, skipping any already present.
 *
 * Presence is matched on the tag's identifying attribute rather than the
 * whole string, so a page that already sets its own theme-color keeps it.
 *
 * @param {string} content - Page content.
 * @param {string[]} tags - Tags to insert.
 * @returns {string} Updated content.
 */
function injectHeadTags(content, tags) {
  const missing = tags.filter((tag) => {
    const name = tag.match(/name="([^"]+)"/i);
    if (name) return !new RegExp(`name=["']?${escapeRegExp(name[1])}["']?`, 'i').test(content);
    const rel = tag.match(/rel="([^"]+)"/i);
    if (rel) return !new RegExp(`rel=["']?${escapeRegExp(rel[1])}["']?`, 'i').test(content);
    return !content.includes(tag);
  });
  if (!missing.length) return content;

  const block = missing.map((tag) => `  ${tag}`).join('\n');
  if (/<\/head>/i.test(content)) return content.replace(/<\/head>/i, `${block}\n</head>`);
  if (/<html[^>]*>/i.test(content)) {
    return content.replace(/<html[^>]*>/i, (match) => `${match}\n<head>\n${block}\n</head>`);
  }
  return `${block}\n${content}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processPageFiles(dirPath, extensions, filename, useCredentials = false, options = {}) {
  const {
    injectManifest = true,
    injectPwaMetaTags = false,
    injectFaviconLinks = false,
    injectMobileWebAppCapable = true,
    manifest = {},
  } = options;

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

        let updated = content;
        if (injectManifest) {
          updated = injectManifestLink(updated, filename, useCredentials);
        }
        if (injectPwaMetaTags) {
          updated = injectHeadTags(
            updated,
            generatePwaMetaTags(manifest, { mobileWebAppCapable: injectMobileWebAppCapable }),
          );
        }
        if (injectFaviconLinks) {
          updated = injectHeadTags(updated, generateFaviconLinks());
        }

        if (updated !== content) {
          fs.writeFileSync(filePath, updated, 'utf8');
          results.injected++;
          results.files.push(filePath);
          results.details.push({
            file: filePath,
            status: 'injected',
            message: 'Manifest link and PWA tags injected',
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
module.exports.generatePwaMetaTags = generatePwaMetaTags;
module.exports.generateFaviconLinks = generateFaviconLinks;
module.exports.injectHeadTags = injectHeadTags;
