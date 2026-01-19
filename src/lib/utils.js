// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blackout Secure Web Application Manifest Generator
// Copyright © 2025-2026 Blackout Secure
// Licensed under Apache License 2.0
// Website: https://blackoutsecure.app
// Repository: https://github.com/blackoutsecure/bos-web-application-manifest-generator
// Issues: https://github.com/blackoutsecure/bos-web-application-manifest-generator/issues
// Docs: https://github.com/blackoutsecure/bos-web-application-manifest-generator#readme
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Common utility functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Safely trim and validate string input
 * @param {*} value - Input value to validate and trim
 * @param {string} fallback - Fallback value if validation fails
 * @returns {string} Trimmed string or fallback
 */
function safeString(value, fallback = '') {
  if (typeof value === 'string') {
    return value.trim();
  }
  return fallback;
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Parse space-separated list from input (string or array)
 * @param {string|Array} input - Input to parse
 * @param {Array} fallback - Fallback array if parsing fails
 * @returns {Array} Array of non-empty strings
 */
function parseList(input, fallback = []) {
  if (Array.isArray(input)) {
    return input.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof input === 'string') {
    return input
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return fallback;
}

/**
 * Parse comma-separated list from input
 * @param {string} input - Comma-separated input
 * @param {Array} fallback - Fallback array if parsing fails
 * @returns {Array} Array of trimmed strings
 */
function parseCommaSeparatedList(input, fallback = []) {
  if (typeof input === 'string' && input.trim().length > 0) {
    return input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
}

/**
 * Validate value against allowed list
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - List of allowed values
 * @param {*} fallback - Fallback value if validation fails
 * @returns {*} Valid value or fallback
 */
function validateEnum(value, allowedValues, fallback = null) {
  if (value && allowedValues.includes(value.toLowerCase?.() || value)) {
    return typeof value === 'string' ? value.toLowerCase() : value;
  }
  return fallback;
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Normalize file path separators (Windows/Unix compatibility)
 * @param {string} filePath - File path to normalize
 * @returns {string} Normalized path with forward slashes
 */
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

/**
 * Check if value is a valid URL
 * @param {string} str - String to check
 * @returns {boolean} True if valid URL
 */
function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  safeString,
  safeJsonParse,
  parseList,
  parseCommaSeparatedList,
  validateEnum,
  formatFileSize,
  normalizePath,
  isValidUrl,
};
