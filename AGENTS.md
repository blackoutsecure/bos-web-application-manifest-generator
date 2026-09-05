# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## What this is

`bos-web-application-manifest-generator` is a GitHub Marketplace Action that writes a
W3C-compliant Web Application Manifest (`site.webmanifest` by default) into a published site
directory, optionally injects `<link rel="manifest">` plus PWA meta and favicon tags into the HTML
pages beside it, then audits the result against 20 PWA-installability controls. The correctness
bar is the [W3C Web Application Manifest spec](https://w3c.github.io/manifest/): only spec-defined
members are emitted, `display` / `orientation` / `dir` / icon `purpose` values are validated
against the enumerations in `src/lib/project-config.js`, and every audit rule in
`src/lib/findings.js` carries a `RULE_HELP` link to the spec section it enforces. Green tests are
not the bar; conformance is.

It ships as `runs.using: node20` with `main: dist/index.js`. `public_dir` is the only required
input; everything else layers bundled baseline, org global config, repository config, then any
explicitly-set action input. Outputs cover the manifest (`manifest_path`, `manifest_json`), the
applied tiers (`config_sources`), and the audit (`audit_verdict`, five per-severity counts,
`sarif_path`, `report_json_path`, `recommendations_json_path`, `ai_summary`). A `src/cli.js`
companion (`bos-web-manifest`) shares every module, so a local dry-run reproduces the CI report.

The verified consumer is `bos-automation-hub`'s reusable
`.github/workflows/deploy-cloudflare-pages.yml`, which SHA-pins this action at
`...@80a4378040f636d8ce2941026f47aad22bb75256 # v1.0.8`, sparse-checks out
`sync-files/config/web-manifest-generator-global-config.json` from the hub into
`hub-generator-config/`, and passes it as `global_config_path`. That org file is where severities
bite: it promotes `require_name`, `require_icons`, `require_start_url`, `require_display`,
`require_192_icon`, `require_512_icon`, `valid_theme_color`, `valid_background_color`,
`valid_display_mode`, `valid_json`, and `start_url_in_scope` to `fail`, sets
`audit.fail_on: never`, and disables the AI summary.

Stack: CommonJS JavaScript on Node `>=20` (`engines`), version `1.0.8` mirrored in `package.json`
and `src/lib/project-config.js`. Runtime deps `@actions/core ^1.11.1`, `@actions/artifact ^2.1.2`,
`js-yaml ^4.3.1`. Dev deps `@vercel/ncc ^0.38.1` (bundler), `mocha ^10.8.2` (runner),
`eslint ^9.12.0` with `@eslint/js ^9.39.1` (flat config), `prettier ^3.3.3`, `nyc ^17.1.0`, and
`chai ^4.5.0` (declared but unused — tests use Node's `assert`).

## Commands

```bash
npm ci                       # or `npm install`; package-lock.json is committed
npm run build                # ncc build src/index.js -o dist  (regenerates dist/index.js)
npm test                     # runs `pretest` (build) then `mocha`
npx mocha test/audit.test.js # single test file
npm run lint:check           # eslint .          (`npm run lint` adds --fix)
npm run format:check         # prettier --check  (`npm run format` writes)
npm run validate             # lint:check + format:check
npm run verify               # validate + test
npm run coverage             # nyc npm test
npx bos-web-manifest audit --public-dir dist --fail-on never
```

There is no `.mocharc.json`, so `mocha` uses its default spec of `./test`, expanding to the six
non-recursive `test/*.test.js` files. `npm run clean` is broken: it invokes `test/cli.js`, which
does not exist.

`dist/index.js` is committed build output produced solely by `npm run build`
(`ncc build src/index.js -o dist`). Never hand-edit it. Any `src/` change must ship a rebuilt
`dist/` in the same commit or consumers keep running the old code — `runs.main` points at the
bundle, not at `src/`. `prebuild` runs `npm run validate` and `pretest` runs `npm run build`, so
`npm test` never reaches `mocha` while lint or formatting is dirty. `dist/` is matched by the
managed `common` block in `.gitignore`; tracked files predate that rule and stage normally, but any
new file under `dist/` needs `git add -f`.

## Validating changes

CI is hub-driven. The only workflow here is
`.github/workflows/bos-universal-gatekeeper-kicker.yml`, the hub-managed front door routing
`workflow_dispatch` to the hub's release, security, sync, action-test, metadata, and Marketplace
reusables after an authorization gate. Pushes and pull requests are gated by the hub's reusable
`bos-universal-security.yml` (see below), which runs ESLint, Prettier, and the Mocha suite here,
plus `bos-code-scanning-kit`, CodeQL, dependency review, and the README-header and
conventional-commit-title compliance checks. Locally, narrowest first:

1. `npx mocha test/<the-file-you-touched>.test.js`
2. `npm run lint:check && npm run format:check`
3. `npm test` (full suite; implies a build)
4. `npm run build`, then commit the resulting `dist/index.js`

The suite proves member assembly, icon and shortcut processing, icon-file existence checks, HTML
injection idempotence, the config cascade and its `ConfigError` paths, and the
findings/SARIF/report/CLI surfaces. It proves nothing about a real runner: no test executes
`dist/index.js`, uploads an artifact, calls the GitHub Models endpoint, or confirms GHAS accepts
the emitted SARIF. Correctness for a manifest change means the document conforms to the W3C spec
and installs in a real browser, not that `mocha` is green.

## Architecture

```text
action.yml                      Manifest: 41 inputs, 13 outputs, node20 -> dist/index.js
package.json                    Scripts, deps, engines, nyc config, `bos-web-manifest` bin
src/index.js                    Entry: inputs, config, generate, inject, audit, outputs
src/cli.js                      `bos-web-manifest version|validate|audit|sarif`
src/lib/manifest-generator.js   Spec member assembly, icon/shortcut processing, validateManifest
src/lib/project-config.js       Project metadata, input defaults, injectables, spec enumerations
src/lib/config.js               Four-tier cascade, deep merge, schema validation, ConfigError
src/lib/audit.js                Deterministic WM### audit, each rule keyed by a config severity
src/lib/findings.js             Finding/AuditResult model, rule families, titles, spec help links
src/lib/icon-validator.js       Warn-only icon file existence check against the public directory
src/lib/page-injector.js        Manifest link, PWA meta, and favicon injection into page files
src/lib/sarif.js                SARIF 2.1.0 emission and merge; drops `skip` findings
src/lib/report.js               Console table, step summary, JSON report, recommendations, skips
src/lib/ai.js                   Optional findings summary with a deterministic local fallback
src/lib/metadata.js             Package identity, independent of policy config
src/lib/version.js              Version sync helper (`npm run ver:*`)
src/lib/release.js              Local release script (`npm run release`)
src/marketplace-config.json     Bundled tier-1 baseline, `require`d so ncc inlines it into dist
dist/index.js                   Committed ncc bundle - build output, never hand-edited
dist/*.html, dist/icons/        Committed sample pages and icons for manual injection checks
test/*.test.js                  Mocha + Node assert; no .mocharc.json, default ./test spec
eslint.config.js                Flat config, `sourceType: 'commonjs'`, ignores dist/ and coverage/
.prettierrc.yaml                Hub-managed: singleQuote, trailingComma all, printWidth 100
.github/bos-universal-config.json  Repo-owned overrides (managed_file_sync, marketplace paths)
```

Generation flow. `src/index.js` calls `cfgMod.resolve()`, which deep-merges bundled
`src/marketplace-config.json`, then the global config at `global_config_path` (default
`.github/blackout-secure-web-application-manifest-generator-global-config.yml`, tri-state via
`use_global_config: auto|true|false`), then the first repository file in `DEFAULT_CONFIG_PATHS`
(`.github/bos-universal-config.json` first, `.bos-web-manifest.yml` last). Every tier reads the
`web_manifest` section. Unknown top-level keys are ignored so sibling BOS kits can share one
universal config; unknown keys inside `audit.rules` raise `ConfigError` so a typo fails fast. A
non-empty action input then overrides the merged result. `processManifest()` assembles members in
spec order — `name`, `short_name`, optional `description`, `start_url`, optional `id`, `scope`,
`display`, `orientation`, `theme_color`, `background_color`, optional `lang`, optional `dir`,
`icons`, optional `shortcuts`, optional `categories` — dropping any member that is empty or fails
its enumeration, and `generateManifest()` serializes with `JSON.stringify(manifest, null, 2)`. The
file is written to `path.join(public_dir, filename)`, optionally uploaded as an artifact, and page
injection runs over `inject_manifest_link_exts`. Finally `audit()` re-parses the written JSON and
evaluates `WM001`-`WM005` (required members), `WM010`-`WM014` (icons), `WM020`-`WM023` (colors and
enumerations), `WM030`-`WM032` (scope and identity), and `WM040`-`WM042` (delivery) at the
`fail`/`warn`/`skip` severity from `audit.rules`. A `skip` still emits a finding so the report
records the control as deliberately unassessed; `skip` is dropped from SARIF and recorded only in
`skips_json`.

Action contract. Required: `public_dir`. Members: `name` (`''`), `short_name` (`''`),
`description`, `start_url` (`/`), `scope` (`/`), `id`, `display` (`standalone`), `orientation`
(`any`), `theme_color` (`#ffffff`), `background_color` (`#ffffff`), `lang`, `dir`, `icons` (JSON
array, defaults to three maskable Android Chrome icons), `shortcuts` (JSON array), `categories`
(comma-separated), `icons_dir` (`/icons/`). Injection: `inject_manifest_link` (`true`),
`inject_pwa_meta_tags` (`true`), `inject_favicon_links` (`true`), `inject_mobile_web_app_capable`
(`true`), `crossorigin_credentials` (`false`), `inject_manifest_link_exts`
(`html htm xhtml php phtml`), `validate_manifest_assets` (`true`). Output: `filename`
(`site.webmanifest`), `upload_artifacts` (`true`), `artifact_name` (`web-manifest`),
`artifact_retention_days`. Config: `config_path`, `global_config_path`, `use_global_config`
(`auto`), `use_marketplace_config` (`true`). Audit and reporting: `enable_audit` (`true`),
`audit_fail_on`, `sarif_output`, `report_json`, `recommendations_json`, `skips_json`,
`step_summary` (`true`), `enable_ai_summary` (`true`), `ai_provider` (`auto`). CLI exit codes:
`0` success, `1` audit failed under the `fail` policy, `2` usage or configuration error.

## Conventions

CommonJS throughout — `require` / `module.exports`, no ESM, no TypeScript, matching
`sourceType: 'commonjs'` in `eslint.config.js`. Every `src/` file opens with the boxed Blackout
Secure banner, public functions carry JSDoc, and comments explain why a non-obvious choice exists
rather than restating the code. Manifest members use their spec snake_case names (`short_name`,
`theme_color`), config keys are snake_case, JavaScript identifiers are camelCase. Inputs are read
through `core.getInput`, and booleans through the local `boolInput(name, fallback)` helper because
`core.getBooleanInput` throws on an unset input — an empty input means "inherit from the cascade",
never "false". Config problems raise `ConfigError` and become `core.setFailed`; recoverable
problems — a bad `icons` payload, a missing icon file, a failed artifact upload, an unavailable AI
provider — degrade to `core.warning` and the run continues. Spec enumerations live only in
`src/lib/project-config.js#validation`; check against them with `validateEnum`, never an inline
list.

```js
manifest.display = validateEnum(
  cfg.display,
  config.validation.displayModes,
  config.defaults.display,
);
```

Adding a manifest member, end to end: declare the input in `action.yml` with description and
default; add the default and any enumeration to `src/lib/project-config.js`, plus a
`generate`/`audit` key in `src/lib/config.js` and `src/marketplace-config.json` when it is
policy-controlled; read it in `src/index.js` and emit it from `processManifest()` in
`src/lib/manifest-generator.js`, dropping it when empty or invalid; add a rule to `RULE_DEFAULTS`,
`audit.js`, and `findings.js` (`RULE_TITLES`, the `RULE_HELP` spec anchor, `DEFAULT_REMEDIATIONS`)
when it is worth checking; cover it in `test/manifest-generator.test.js` and `test/audit.test.js`;
document it in the README input and rule tables; run `npm run build` and commit the rebuilt
`dist/index.js`.

Two copy-paste artefacts are real and are not documentation: `NOTICE` and the `.gitignore` header
still say "Sitemap Builder", and centrally managed `CONTRIBUTING.md` references a `test/unit/`
layout and `npm run version:get` scripts that do not exist here (the real ones are `npm run ver:*`).

## Blackout Secure conventions

These apply to every repository in the `blackoutsecure` organization.

### Branch model

- `dev` is the default branch and where all work lands.
- `main` is the promoted stable runtime that consumers reference through `@main`.
- Version tags (`vX.Y.Z` and a floating `vX`) point at promoted runtime commits.
- Promotion is driven from `bos-automation-hub` (`release-promote.yml`). Do not push
  directly to `main` and do not move tags by hand.

### Centrally managed files - do not hand-edit here

`blackoutsecure/bos-automation-hub` distributes these through
`bos-managed-file-sync-action`. Change the source under the hub's `sync-files/`, never the
copy in this repository:

- `LICENSE`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`
- `.github/FUNDING.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/`
- `.github/workflows/bos-universal-gatekeeper-kicker.yml`
- the `# >>> managed-file-sync:<service> >>> ... # <<< managed-file-sync:<service> <<<`
  delimited blocks inside `.editorconfig`, `.markdownlint.yaml`, `.shellcheckrc`,
  `.yamllint.yml`, `.gitignore`, and `README.md`

`.github/bos-universal-config.json` is repo-owned. It holds this repository's overrides on
top of the hub's global config and is the right place to change gate behaviour.

### CI gate

Pushes and pull requests run the hub's reusable `bos-universal-security.yml`, reported as a
single required check. It runs markdownlint, yamllint, shellcheck, and actionlint; ESLint,
Prettier, Ruff, pytest, and Bats where the repository has them; `bos-code-scanning-kit`
(secret scan, SAST, GHAS posture) and CodeQL; dependency review; and compliance checks for
the canonical README header and a conventional-commit PR title
(`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert: subject`).

Every `uses:` reference in a workflow must be a commit SHA with a trailing version comment,
for example `actions/checkout@<sha> # v4.2.2`.

## Boundaries

### Always

- Ship a rebuilt `dist/index.js` from `npm run build` in the same commit as any `src/` change.
- Validate enumerated members against `src/lib/project-config.js#validation` and drop invalid or
  empty members instead of emitting them.
- Add or update `test/*.test.js` coverage for any behaviour change, then run `npm run lint:check`,
  `npm run format:check`, and `npm test`.
- Keep an empty action input meaning "inherit from the cascade", and keep the cascade order
  marketplace, global, repository, input.
- Update the README input, rule, and output tables when the action contract changes.
- Keep the AI summary and the artifact upload off the critical path.

### Ask first

- Emitting a non-standard manifest member, a proposal-stage member, or a vendor extension. The
  contract here is the W3C Web Application Manifest specification; anything outside it needs an
  explicit decision and a documented reason.
- Renaming, removing, or re-defaulting any `action.yml` input or output — the hub's
  `deploy-cloudflare-pages.yml` pins this action by SHA and passes inputs by name.
- Changing a default audit severity, adding or renumbering a `WM###` rule, or altering the
  `fail`/`warn`/`skip` semantics or the decision to drop `skip` from SARIF.
- Changing the cascade order, `DEFAULT_CONFIG_PATHS`, the `web_manifest` section name, or the
  bundled `src/marketplace-config.json` baseline.
- Adding a runtime dependency, a new network call, or a new AI provider.
- Editing `sync-files/config/web-manifest-generator-global-config.json` in the hub, which changes
  audit policy for every consuming site at once.

### Never

- Never hand-edit `dist/index.js`. It is generated by `ncc` and overwritten by `npm run build`.
- Never commit secrets, tokens, or API keys, and never log an AI provider credential.
- Never hand-edit centrally managed files or the `managed-file-sync` marker blocks listed above.
- Never use an unpinned `uses:` ref; every reference is a 40-character commit SHA with a trailing
  version comment.
- Never push directly to `main` or move a version tag by hand; promotion runs from the hub.
- Never weaken a check to make a build pass — no ESLint disable, no lowered rule severity, no
  `audit_fail_on: never` to get green.
- Never let a `skip` finding be reported or treated as a `pass`.
