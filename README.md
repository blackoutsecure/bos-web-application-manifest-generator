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
- Auto inject `<link rel="manifest">`, PWA meta tags, and favicon links into HTML
- **Layered configuration**: bundled marketplace baseline → org global config → repo config → action inputs
- **PWA readiness audit**: 20 evidence-based controls with per-rule `fail`/`warn`/`skip` severities
- **Enterprise reporting**: Markdown step summary, SARIF 2.1.0 for code scanning, JSON report, recommendations sidecar
- **AI findings summary**: optional GitHub Models summary with a deterministic local fallback
- **Local CLI**: `bos-web-manifest validate|audit|sarif` reproduces CI output on your machine
- Artifact upload for easy download from workflow runs

## 🗂️ Layered Configuration

Configuration is deep-merged, then validated. Precedence, lowest to highest:

1. **Bundled marketplace baseline** — `src/marketplace-config.json`, shipped with the action
2. **Organization global config** — `.github/blackout-secure-web-application-manifest-generator-global-config.yml`
3. **Repository config** — first match of `.github/bos-universal-config.json|yml|yaml`, `bos-universal-config.*`, or `.bos-web-manifest.yml|yaml`
4. **Action inputs** — any input you explicitly set wins over every config tier

Unknown top-level keys are ignored so the same `bos-universal-config.json` can be shared
with other Blackout Secure kits. Unknown keys **inside** `web_manifest.audit.rules` are
rejected so a typo fails fast.

```yaml
# .github/bos-universal-config.json (YAML shown for readability)
web_manifest:
  owner: blackoutsecure

  generate:
    filename: site.webmanifest
    inject_manifest_link: true
    inject_pwa_meta_tags: true
    inject_favicon_links: true
    inject_mobile_web_app_capable: true
    crossorigin_credentials: false

  audit:
    enable: true
    fail_on: fail # or `never` to keep the audit advisory
    max_size_kb: 128
    rules:
      require_icons: fail
      require_192_icon: fail
      require_id: warn

  reporting:
    step_summary: true
    sarif: true
    json_report: true
    recommendations: true

  remediation:
    enable_ai_findings_summary: true
    ai_findings_summary_provider: auto
    local_heuristic_fallback: true
```

## 📱 PWA Readiness Audit

Every control is evidence-based and configurable through `web_manifest.audit.rules.<name>`.
A rule set to `skip` still emits a finding, so the report records that the control was
deliberately not assessed.

| Rule    | Config key                  | Checks                                                        | Default |
| ------- | --------------------------- | ------------------------------------------------------------- | ------- |
| `WM001` | `require_name`              | `name` is declared                                            | `warn`  |
| `WM002` | `require_short_name`        | `short_name` is declared                                      | `warn`  |
| `WM003` | `require_icons`             | At least one icon is declared                                 | `warn`  |
| `WM004` | `require_start_url`         | `start_url` is declared                                       | `warn`  |
| `WM005` | `require_display`           | `display` is declared                                         | `warn`  |
| `WM010` | `require_192_icon`          | A ≥192px icon exists (Chromium installability)                | `warn`  |
| `WM011` | `require_512_icon`          | A ≥512px icon exists (splash screens)                         | `warn`  |
| `WM012` | `require_maskable_icon`     | An icon declares `"purpose": "maskable"`                      | `warn`  |
| `WM013` | `forbid_any_maskable_combo` | No icon uses the discouraged `"any maskable"` purpose         | `warn`  |
| `WM014` | `icon_files_exist`          | Local icon `src` paths resolve to published files             | `warn`  |
| `WM020` | `valid_theme_color`         | `theme_color` is a valid CSS color                            | `warn`  |
| `WM021` | `valid_background_color`    | `background_color` is a valid CSS color                       | `warn`  |
| `WM022` | `valid_display_mode`        | `display` is one of the W3C display modes                     | `warn`  |
| `WM023` | `valid_orientation`         | `orientation` is a valid W3C orientation                      | `warn`  |
| `WM030` | `start_url_in_scope`        | `start_url` falls inside `scope`                              | `warn`  |
| `WM031` | `require_id`                | `id` is declared so app identity survives `start_url` changes | `skip`  |
| `WM032` | `valid_lang`                | `lang` is a valid BCP 47 tag                                  | `skip`  |
| `WM040` | `require_manifest_link`     | At least one HTML page links the manifest                     | `warn`  |
| `WM041` | `file_size_limit`           | Manifest stays within `audit.max_size_kb`                     | `warn`  |
| `WM042` | `valid_json`                | Manifest is valid UTF-8 JSON without a byte-order mark        | `warn`  |

No rule defaults to `fail`, so adopting the audit never breaks an existing pipeline on
day one. Opt individual rules up to `fail` once your manifest is clean.

### Configuration, Audit & Reporting Inputs

| Input                    | Description                                                | Default                                                                        |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `config_path`            | Explicit repository config file                            | auto-discover                                                                  |
| `global_config_path`     | Organization-level global config                           | `.github/blackout-secure-web-application-manifest-generator-global-config.yml` |
| `use_global_config`      | Global tier: `auto`, `true` (require), `false` (disable)   | `auto`                                                                         |
| `use_marketplace_config` | Apply the bundled marketplace baseline                     | `true`                                                                         |
| `enable_audit`           | Run the W3C manifest / PWA installability audit            | `true`                                                                         |
| `audit_fail_on`          | `fail` or `never`; empty uses `web_manifest.audit.fail_on` | from config                                                                    |
| `sarif_output`           | Write SARIF 2.1.0 for GitHub code scanning                 | disabled                                                                       |
| `report_json`            | Write the machine-readable JSON audit report               | disabled                                                                       |
| `redact_sensitive`       | Redact credential-shaped values from report surfaces       | true                                                                           |
| `redaction_placeholder`  | Replacement text for redacted values                       | `***`                                                                          |
| `recommendations_json`   | Write structured remediation recommendations               | disabled                                                                       |
| `skips_json`             | Write the skipped-controls sidecar                         | disabled                                                                       |
| `step_summary`           | Append the Markdown report to `$GITHUB_STEP_SUMMARY`       | `true`                                                                         |
| `enable_ai_summary`      | Generate a natural-language findings summary               | `true`                                                                         |
| `ai_provider`            | `auto`, `none`, or a named provider                        | `auto`                                                                         |

### Additional Outputs

`manifest_path` and `manifest_json` are joined by `config_sources`, `audit_verdict`,
`audit_pass_count`, `audit_warn_count`, `audit_fail_count`, `audit_error_count`,
`audit_skip_count`, `sarif_path`, `report_json_path`, `recommendations_json_path`,
and `ai_summary`.

`skip` findings are intentionally omitted from SARIF — they would clutter the Security
tab with controls that were never assessed. Use `skips_json` when you need that record.

## 🤖 AI Findings Summary

When `enable_ai_summary` is on, the action asks a model for a three-bullet triage summary
of the non-passing findings and appends it to the step summary and JSON report.

- `ai_provider: auto` (default) uses **GitHub Models** whenever `GITHUB_MODELS_TOKEN` or
  `GITHUB_TOKEN` is exposed to the job. Grant `models: read` in the job permissions.
- `ai_provider: none` disables the model call.
- Any other name uses `<NAME>_API_KEY` plus `<NAME>_API_ENDPOINT` from the environment.

AI is never on the critical path: any missing credential, authorization failure, timeout,
or transport error falls back to a deterministic local summary, and the run continues.

## 🖥️ Local CLI

The CLI shares every module with the Action, so a local dry-run produces the same report
as CI — including auditing a manifest this action did not generate.

```bash
npm install

# Resolve and print the merged configuration cascade
npx bos-web-manifest validate

# Audit any existing manifest and write every report artefact
npx bos-web-manifest audit \
  --public-dir dist \
  --sarif manifest-audit.sarif \
  --json manifest-audit.json \
  --recommendations manifest-recommendations.json \
  --fail-on never

# Merge SARIF logs before a single code-scanning upload
npx bos-web-manifest sarif --input a.sarif --input b.sarif --output merged.sarif
```

Exit codes: `0` success, `1` audit failed under the `fail` policy, `2` usage or
configuration error.

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

<!-- >>> managed-file-sync:security_readme_pointer >>> -->
## Security & secrets

This repository is built with Blackout Secure's reusable GitHub Actions
workflows. If you fork or self-host these workflows and need to provision
your own credentials (GitHub App vs. PAT guidance, secret tiers, Docker
Hub/Cloudflare/Balena setup walkthroughs), see the
["Secrets pipelining strategy"](https://github.com/blackoutsecure/bos-automation-hub#secrets-pipelining-strategy)
section of `bos-automation-hub`. To report a vulnerability, see
[SECURITY.md](https://github.com/blackoutsecure/.github/blob/main/SECURITY.md).
<!-- <<< managed-file-sync:security_readme_pointer <<< -->
