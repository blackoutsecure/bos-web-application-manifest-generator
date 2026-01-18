# Blackout Secure Web Manifest Generator

[![Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-blue?logo=github)](https://github.com/marketplace/actions/web-manifest-generator)
[![GitHub release](https://img.shields.io/github/v/release/blackoutsecure/bos-web-application-manifest-generator?sort=semver)](https://github.com/blackoutsecure/bos-web-application-manifest-generator/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![W3C Compliance](https://img.shields.io/badge/W3C-Compliant-green)](https://w3c.github.io/manifest/)

Generate W3C-compliant web manifest files for Progressive Web Apps with full customization. This GitHub Action handles all the complexity of creating valid manifests with support for icons, shortcuts, and automatic page injection.

## Features

- ✅ **W3C Compliant** - Generates valid manifests per the official specification
- 📱 **PWA Ready** - Full support for display modes, icons, shortcuts, and more
- 🎨 **Fully Customizable** - All standard manifest members supported
- 🔍 **Icon Validation** - Verify icon files exist with optional failure modes
- 💉 **Auto Page Injection** - Automatically adds manifest links to your HTML pages
- 🌐 **Internationalization** - Language and text direction support
- ⚡ **Zero Config** - Works with sensible defaults, customize as needed

## Quick Start

```yaml
- name: Generate Web Manifest
  uses: blackoutsecure/bos-web-application-manifest-generator@v1
  with:
    name: 'My App'
    short_name: 'App'
    description: 'My Progressive Web App'
    start_url: '/'
    theme_color: '#4285f4'
    background_color: '#ffffff'
    icons: |
      [
        {
          "src": "/icons/icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/icons/icon-512.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "any maskable"
        }
      ]
```

## Inputs

| Input                  | Description                                                          | Default            |
| ---------------------- | -------------------------------------------------------------------- | ------------------ |
| `name`                 | Application name                                                     | Required           |
| `short_name`           | Short name for limited space                                         | Required           |
| `description`          | Application description                                              | -                  |
| `start_url`            | App launch URL                                                       | `/`                |
| `scope`                | Navigation scope                                                     | `/`                |
| `display`              | Display mode: `standalone`, `fullscreen`, `minimal-ui`, or `browser` | `standalone`       |
| `theme_color`          | Theme color (hex)                                                    | -                  |
| `background_color`     | Background color (hex)                                               | -                  |
| `icons`                | JSON array of icon objects                                           | -                  |
| `output_dir`           | Output directory for manifest                                        | Root directory     |
| `filename`             | Output filename                                                      | `site.webmanifest` |
| `inject_manifest_link` | Auto-inject link tag into HTML pages                                 | `true`             |
| `icon_validation`      | Icon validation: `fail`, `warn`, or `none`                           | `warn`             |

See the [action.yml](action.yml) for all available inputs including internationalization, shortcuts, categories, and advanced options.

## Icon Validation

The action validates that icon files referenced in your manifest actually exist on disk:

- **`fail`** - Fails the action if any icons are missing
- **`warn`** - Warns about missing icons but continues (default)
- **`none`** - Skips validation

```yaml
- name: Generate Web Manifest
  uses: blackoutsecure/bos-web-application-manifest-generator@v1
  with:
    name: 'My App'
    icon_validation: 'fail'
    icons: |
      [
        {
          "src": "/icons/icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        }
      ]
    output_dir: 'public'
```

## Auto Page Injection

By default, the action automatically injects a manifest link into your HTML pages:

```html
<link rel="manifest" href="/site.webmanifest" />
```

Disable with `inject_manifest_link: false` or specify custom file extensions:

```yaml
- name: Generate Web Manifest
  uses: blackoutsecure/bos-web-application-manifest-generator@v1
  with:
    name: 'My App'
    inject_manifest_link_exts: 'html htm php'
    output_dir: 'public'
```

## Example Manifest Output

```json
{
  "name": "My Progressive Web App",
  "short_name": "MyPWA",
  "description": "An amazing Progressive Web Application",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#4285f4",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Linking the Manifest

Add this to your HTML `<head>`:

```html
<link rel="manifest" href="/site.webmanifest" />
```

Or let the action do it automatically with `inject_manifest_link: true`.

## Resources

- [W3C Web Application Manifest Specification](https://w3c.github.io/manifest/)
- [MDN Web App Manifests](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [MDN Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.
