# Blackout Secure Web Application Manifest Generator

[![Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-blue?logo=github)](https://github.com/marketplace/actions/web-manifest-generator)
[![GitHub release](https://img.shields.io/github/v/release/blackoutsecure/bos-web-application-manifest-generator?sort=semver)](https://github.com/blackoutsecure/bos-web-application-manifest-generator/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![W3C Compliance](https://img.shields.io/badge/W3C-Compliant-green)](https://w3c.github.io/manifest/)

Generate W3C-compliant web app manifest files for PWAs. Sensible defaults, customizable icons/shortcuts/colors (with `purpose` support, maskable-ready), optional validation, and automatic page-link injection.

## Features

- Valid W3C manifest generation with defaults
- Custom icons, shortcuts, colors, display, orientation
- Warn-only icon file validation
- Auto inject `<link rel="manifest">` into HTML
- Artifact upload for easy download from workflow runs

## Usage

```yaml
- name: Generate Web Manifest
  uses: blackoutsecure/bos-web-application-manifest-generator@v1.0.2
  with:
    public_dir: dist
    name: My App
    short_name: App
    description: My Progressive Web App
    theme_color: '#4285f4'
    background_color: '#ffffff'
    icons: |
      [
        { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
      ]
```

### Defaults (only `public_dir` provided)

```json
{
  "name": "",
  "short_name": "",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/android-chrome-256x256.png",
      "sizes": "256x256",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "any",
  "start_url": "/",
  "scope": "/"
}
```

## Inputs (most-used)

| Input                              | Description                                                               | Default                                                  |
| ---------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `public_dir`                       | Directory where the manifest is written                                   | **Required**                                             |
| `name` / `short_name`              | App name / short label                                                    | `""`                                                     |
| `description`                      | App description                                                           | -                                                        |
| `start_url`                        | Launch URL                                                                | `/`                                                      |
| `scope`                            | Navigation scope                                                          | `/`                                                      |
| `display`                          | `fullscreen`, `standalone`, `minimal-ui`, `browser`                       | `standalone`                                             |
| `orientation`                      | `any`, `natural`, `landscape*`, `portrait*`                               | `any`                                                    |
| `theme_color` / `background_color` | UI colors                                                                 | `#ffffff` / `#ffffff`                                    |
| `icons`                            | JSON array of icons (supports `purpose`: `any`, `maskable`, `monochrome`) | Android Chrome icons (192, 256, 512, purpose `maskable`) |
| `shortcuts`                        | JSON array of shortcuts                                                   | -                                                        |
| `categories`                       | Comma-separated categories                                                | -                                                        |
| `inject_manifest_link`             | Inject `<link rel="manifest">` into pages                                 | `true`                                                   |
| `inject_manifest_link_exts`        | Space-separated extensions to scan                                        | `html htm xhtml php phtml`                               |
| `crossorigin_credentials`          | Add `crossorigin="use-credentials"` to link                               | `false`                                                  |
| `validate_manifest_assets`         | Validate icon files exist (warn-only)                                     | `true`                                                   |
| `filename`                         | Manifest filename                                                         | `site.webmanifest`                                       |
| `upload_artifacts`                 | Upload manifest as artifact                                               | `true`                                                   |
| `artifact_name`                    | Artifact name                                                             | `web-manifest`                                           |
| `artifact_retention_days`          | Artifact retention (1-90)                                                 | repo default                                             |

⚠️ Using combined purposes like "any maskable" is discouraged and will be reported as a validation warning; provide separate icons for each purpose instead.

## Outputs

- `manifest_path` — Path to the generated manifest file
- `manifest_json` — Generated manifest JSON string

## Resources

- [W3C Web Application Manifest](https://w3c.github.io/manifest/)
- [MDN: Web App Manifests](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

## License

Apache License 2.0 — see [LICENSE](LICENSE).
