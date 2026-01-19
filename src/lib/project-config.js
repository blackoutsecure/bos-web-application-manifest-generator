/**
 * Copyright 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 *
 * Project Configuration
 * Central source of truth for project metadata, version information, and constants
 */

module.exports = {
  // Project metadata
  name: 'Blackout Secure Web Application Manifest Generator',
  shortName: 'bos-web-application-manifest-generator',
  version: '1.0.2',
  description:
    'Generate W3C-compliant web manifest files for Progressive Web Apps with full customization',
  author: 'Blackout Secure',
  license: 'Apache-2.0',
  repository: 'https://github.com/blackoutsecure/bos-web-application-manifest-generator',
  homepage: 'https://github.com/blackoutsecure/bos-web-application-manifest-generator#readme',
  issues: 'https://github.com/blackoutsecure/bos-web-application-manifest-generator/issues',
  website: 'https://blackoutsecure.app',
  copyright: '© 2025-2026 Blackout Secure',

  // Default action input values
  defaults: {
    startUrl: '/',
    scope: '/',
    display: 'standalone',
    themeColor: '#ffffff',
    backgroundColor: '#ffffff',
    name: '',
    shortName: '',
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
    iconsDir: '/icons/',
    filename: 'site.webmanifest',
    injectManifestLink: true,
    crossoriginCredentials: false,
    injectManifestLinkExts: ['html', 'htm'],
    iconValidation: 'warn',
    favicon: true,
    faviconDir: '/',
    faviconValidation: 'warn',
  },

  // W3C spec validation constants
  validation: {
    displayModes: ['fullscreen', 'standalone', 'minimal-ui', 'browser'],
    orientations: [
      'any',
      'natural',
      'landscape',
      'portrait',
      'portrait-primary',
      'portrait-secondary',
      'landscape-primary',
      'landscape-secondary',
    ],
    textDirections: ['ltr', 'rtl', 'auto'],
    iconPurposes: ['monochrome', 'maskable', 'any'],
  },

  // Default favicon manifest
  faviconDefaults: {
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
  },

  // Icon validation modes
  iconValidationModes: {
    FAIL: 'fail',
    WARN: 'warn',
    NONE: 'none',
  },
};
