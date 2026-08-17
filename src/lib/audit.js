// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blackout Secure Web Application Manifest Generator
// Copyright © 2025-2026 Blackout Secure
// Licensed under Apache License 2.0
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Deterministic W3C Web App Manifest / PWA installability audit.
//
// Every rule is driven by `web_manifest.audit.rules.<name>` in the
// layered configuration. A rule configured as `skip` still emits a
// finding so the report records that the control was deliberately not
// assessed rather than silently dropped.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const { Finding, AuditResult } = require('./findings');

const MAX_EVIDENCE_SAMPLES = 5;

const DISPLAY_MODES = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
const ORIENTATIONS = [
  'any',
  'natural',
  'landscape',
  'landscape-primary',
  'landscape-secondary',
  'portrait',
  'portrait-primary',
  'portrait-secondary',
];

/** Named CSS colours the manifest members commonly use. */
const NAMED_COLORS = [
  'black',
  'silver',
  'gray',
  'grey',
  'white',
  'maroon',
  'red',
  'purple',
  'fuchsia',
  'green',
  'lime',
  'olive',
  'yellow',
  'navy',
  'blue',
  'teal',
  'aqua',
  'transparent',
];

const HEX_COLOR = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL_COLOR = /^(rgb|rgba|hsl|hsla)\(\s*[^)]+\)$/i;
const LANG_TAG = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i;

/**
 * Run the full manifest audit.
 *
 * @param {object} options - Audit inputs.
 * @param {object} options.cfg - Resolved configuration.
 * @param {string} options.content - Manifest JSON text as written.
 * @param {string} options.filePath - Path the manifest was written to.
 * @param {string} [options.publicDir] - Published site directory.
 * @param {object} [options.pageResults] - Page-injection results, if any.
 * @returns {AuditResult} Findings plus run context.
 */
function audit({ cfg, content, filePath, publicDir = '', pageResults = null }) {
  const rules = cfg.audit.rules;
  const findings = [];
  const baseDir = publicDir || process.cwd();
  const location = filePath ? relativeTo(baseDir, filePath) : cfg.generate.filename;

  /**
   * Evaluate one rule against a boolean outcome.
   * @param {string} ruleId - Rule identifier.
   * @param {string} ruleName - Config key under `audit.rules`.
   * @param {object} outcome - Evaluation outcome.
   * @param {boolean} outcome.ok - Whether the control is satisfied.
   * @param {string} outcome.passMessage - Evidence when satisfied.
   * @param {string} outcome.failMessage - Evidence when violated.
   * @param {object} [outcome.evidence] - Machine-readable evidence.
   */
  const evaluate = (ruleId, ruleName, outcome) => {
    const severity = rules[ruleName];
    if (severity === 'skip') {
      findings.push(
        new Finding({
          ruleId,
          severity: 'skip',
          message: `Control disabled via \`web_manifest.audit.rules.${ruleName}: skip\`.`,
          location,
          evidence: { rule: ruleName },
        }),
      );
      return;
    }
    findings.push(
      new Finding({
        ruleId,
        severity: outcome.ok ? 'pass' : severity,
        message: outcome.ok ? outcome.passMessage : outcome.failMessage,
        location,
        evidence: outcome.evidence || {},
      }),
    );
  };

  const hasBom = (content || '').charCodeAt(0) === 0xfeff;
  let manifest = null;
  let parseError = '';
  try {
    manifest = JSON.parse(hasBom ? content.slice(1) : content);
  } catch (err) {
    parseError = err.message;
  }
  const doc = manifest && typeof manifest === 'object' ? manifest : {};
  const icons = Array.isArray(doc.icons) ? doc.icons : [];

  // ── WM00x: required members ──────────────────────────────────────
  evaluate('WM001', 'require_name', {
    ok: Boolean(String(doc.name || '').trim()),
    passMessage: `name is set (${doc.name}).`,
    failMessage: 'No `name` member; install prompts have no full application name.',
    evidence: { name: doc.name || '' },
  });

  evaluate('WM002', 'require_short_name', {
    ok: Boolean(String(doc.short_name || '').trim()),
    passMessage: `short_name is set (${doc.short_name}).`,
    failMessage: 'No `short_name` member; constrained surfaces have no compact label.',
    evidence: { short_name: doc.short_name || '' },
  });

  evaluate('WM003', 'require_icons', {
    ok: icons.length > 0,
    passMessage: `${icons.length} icon(s) declared.`,
    failMessage: 'No `icons` member; the app is not installable.',
    evidence: { icon_count: icons.length },
  });

  evaluate('WM004', 'require_start_url', {
    ok: Boolean(String(doc.start_url || '').trim()),
    passMessage: `start_url is set (${doc.start_url}).`,
    failMessage: 'No `start_url` member; the installed app has no defined entry point.',
    evidence: { start_url: doc.start_url || '' },
  });

  evaluate('WM005', 'require_display', {
    ok: Boolean(String(doc.display || '').trim()),
    passMessage: `display is set (${doc.display}).`,
    failMessage: 'No `display` member; the app opens in a plain browser tab.',
    evidence: { display: doc.display || '' },
  });

  // ── WM01x: icons ─────────────────────────────────────────────────
  const largest = icons.map(largestDimension).filter((n) => n > 0);
  const max = largest.length ? Math.max(...largest) : 0;

  evaluate('WM010', 'require_192_icon', {
    ok: max >= 192,
    passMessage: `Largest declared icon is ${max}px.`,
    failMessage: `Largest declared icon is ${max || 0}px; installability needs at least 192px.`,
    evidence: { largest_px: max },
  });

  evaluate('WM011', 'require_512_icon', {
    ok: max >= 512,
    passMessage: `Largest declared icon is ${max}px.`,
    failMessage: `Largest declared icon is ${max || 0}px; splash screens want at least 512px.`,
    evidence: { largest_px: max },
  });

  const maskable = icons.filter((icon) =>
    String(icon?.purpose || '')
      .toLowerCase()
      .split(/\s+/)
      .includes('maskable'),
  );
  evaluate('WM012', 'require_maskable_icon', {
    ok: maskable.length > 0,
    passMessage: `${maskable.length} maskable icon(s) declared.`,
    failMessage: 'No icon declares `"purpose": "maskable"`.',
    evidence: { maskable_count: maskable.length },
  });

  const comboIcons = icons
    .filter((icon) => {
      const purposes = String(icon?.purpose || '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      return purposes.includes('any') && purposes.includes('maskable');
    })
    .map((icon) => String(icon.src || ''));
  evaluate('WM013', 'forbid_any_maskable_combo', {
    ok: comboIcons.length === 0,
    passMessage: 'No icon combines the `any` and `maskable` purposes.',
    failMessage: `${comboIcons.length} icon(s) use the discouraged "any maskable" purpose.`,
    evidence: samples(comboIcons),
  });

  const missingIcons = publicDir
    ? icons
        .map((icon) => String(icon?.src || ''))
        .filter(Boolean)
        // Remote icons are not this action's to publish.
        .filter((src) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(src))
        .filter((src) => !existsFile(path.join(publicDir, src.replace(/^\//, ''))))
    : [];
  evaluate('WM014', 'icon_files_exist', {
    ok: missingIcons.length === 0,
    passMessage: icons.length
      ? 'Every declared local icon resolves to a published file.'
      : 'No icons to resolve.',
    failMessage: `${missingIcons.length} declared icon file(s) are missing from the public directory.`,
    evidence: samples(missingIcons),
  });

  // ── WM02x: colours and display ───────────────────────────────────
  evaluate('WM020', 'valid_theme_color', {
    ok: isValidColor(doc.theme_color),
    passMessage: `theme_color is a valid CSS color (${doc.theme_color}).`,
    failMessage: `theme_color '${doc.theme_color ?? '(unset)'}' is not a recognised CSS color.`,
    evidence: { theme_color: doc.theme_color || '' },
  });

  evaluate('WM021', 'valid_background_color', {
    ok: isValidColor(doc.background_color),
    passMessage: `background_color is a valid CSS color (${doc.background_color}).`,
    failMessage: `background_color '${doc.background_color ?? '(unset)'}' is not a recognised CSS color.`,
    evidence: { background_color: doc.background_color || '' },
  });

  evaluate('WM022', 'valid_display_mode', {
    ok: DISPLAY_MODES.includes(doc.display),
    passMessage: `display '${doc.display}' is a valid display mode.`,
    failMessage: `display '${doc.display ?? '(unset)'}' is not one of ${DISPLAY_MODES.join(', ')}.`,
    evidence: { display: doc.display || '', allowed: DISPLAY_MODES },
  });

  evaluate('WM023', 'valid_orientation', {
    ok: doc.orientation === undefined || ORIENTATIONS.includes(doc.orientation),
    passMessage: doc.orientation
      ? `orientation '${doc.orientation}' is valid.`
      : 'No orientation declared, which is valid.',
    failMessage: `orientation '${doc.orientation}' is not one of ${ORIENTATIONS.join(', ')}.`,
    evidence: { orientation: doc.orientation || '' },
  });

  // ── WM03x: scope and identity ────────────────────────────────────
  const scope = String(doc.scope || '/');
  const startUrl = String(doc.start_url || '/');
  evaluate('WM030', 'start_url_in_scope', {
    ok: withinScope(startUrl, scope),
    passMessage: `start_url '${startUrl}' falls inside scope '${scope}'.`,
    failMessage: `start_url '${startUrl}' falls outside scope '${scope}'.`,
    evidence: { start_url: startUrl, scope },
  });

  evaluate('WM031', 'require_id', {
    ok: Boolean(String(doc.id || '').trim()),
    passMessage: `id is set (${doc.id}).`,
    failMessage: 'No `id` member; the app identity is derived from start_url and can drift.',
    evidence: { id: doc.id || '' },
  });

  evaluate('WM032', 'valid_lang', {
    ok: doc.lang === undefined || LANG_TAG.test(String(doc.lang)),
    passMessage: doc.lang ? `lang '${doc.lang}' is a valid tag.` : 'No lang declared.',
    failMessage: `lang '${doc.lang}' is not a valid BCP 47 language tag.`,
    evidence: { lang: doc.lang || '' },
  });

  // ── WM04x: delivery ──────────────────────────────────────────────
  const linkedPages = pageResults
    ? (pageResults.injected || 0) + (pageResults.skipped || 0)
    : countLinkedPages(publicDir);
  evaluate('WM040', 'require_manifest_link', {
    ok: linkedPages > 0,
    passMessage: `${linkedPages} page(s) link the manifest.`,
    failMessage: 'No HTML page declares <link rel="manifest">.',
    evidence: { linked_pages: linkedPages },
  });

  const sizeBytes = Buffer.byteLength(content || '', 'utf8');
  const maxBytes = cfg.audit.maxSizeKb * 1024;
  evaluate('WM041', 'file_size_limit', {
    ok: sizeBytes <= maxBytes,
    passMessage: `File is ${sizeBytes} bytes, within the ${cfg.audit.maxSizeKb} KB limit.`,
    failMessage: `File is ${sizeBytes} bytes, beyond the ${cfg.audit.maxSizeKb} KB limit.`,
    evidence: { size_bytes: sizeBytes, max_bytes: maxBytes },
  });

  evaluate('WM042', 'valid_json', {
    ok: Boolean(manifest) && !hasBom,
    passMessage: 'Manifest is valid UTF-8 JSON without a byte-order mark.',
    failMessage: parseError
      ? `Manifest is not valid JSON: ${parseError}`
      : 'Manifest starts with a UTF-8 byte-order mark, which browsers reject.',
    evidence: { has_bom: hasBom, parse_error: parseError },
  });

  return new AuditResult(findings, {
    file_path: (filePath || '').replace(/\\/g, '/'),
    public_dir: publicDir,
    size_bytes: sizeBytes,
    icon_count: icons.length,
    largest_icon_px: max,
    linked_pages: linkedPages,
  });
}

/**
 * Decide the process exit disposition for an audit result.
 * @param {AuditResult} result - Completed audit.
 * @param {string} failOn - Either `fail` or `never`.
 * @returns {boolean} True when the run should be marked failed.
 */
function shouldFail(result, failOn) {
  if (failOn === 'never') return false;
  return result.failed.length > 0 || result.errored.length > 0;
}

/** Largest square dimension declared in a `sizes` string, or 0. */
function largestDimension(icon) {
  const sizes = String(icon?.sizes || '');
  if (/^any$/i.test(sizes)) return Number.MAX_SAFE_INTEGER;
  const dims = [...sizes.matchAll(/(\d+)\s*[x\u00d7]\s*(\d+)/gi)].map(([, w, h]) =>
    Math.min(Number(w), Number(h)),
  );
  return dims.length ? Math.max(...dims) : 0;
}

function isValidColor(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    HEX_COLOR.test(trimmed) ||
    FUNCTIONAL_COLOR.test(trimmed) ||
    NAMED_COLORS.includes(trimmed.toLowerCase())
  );
}

function withinScope(startUrl, scope) {
  // Absolute start URLs are compared by path so a same-origin app still passes.
  const startPath = pathOf(startUrl);
  const scopePath = pathOf(scope);
  return startPath.startsWith(scopePath);
}

function pathOf(value) {
  try {
    return new URL(value, 'https://placeholder.invalid').pathname;
  } catch {
    return value.startsWith('/') ? value : `/${value}`;
  }
}

function countLinkedPages(dir) {
  if (!dir) return 0;
  let count = 0;
  const walk = (current, depth) => {
    if (depth > 4) return;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        walk(full, depth + 1);
      } else if (/\.(html?|xhtml|php|phtml)$/i.test(entry.name)) {
        try {
          if (/<link\s+[^>]*rel=["']?manifest["']?/i.test(fs.readFileSync(full, 'utf8')))
            count += 1;
        } catch {
          // Unreadable file: not evidence either way.
        }
      }
    }
  };
  walk(dir, 0);
  return count;
}

function existsFile(candidate) {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function relativeTo(baseDir, filePath) {
  const relative = path.relative(baseDir, filePath);
  const chosen = relative && !relative.startsWith('..') ? relative : filePath;
  return chosen.replace(/\\/g, '/');
}

function samples(values) {
  if (!values || !values.length) return {};
  return {
    samples: values.slice(0, MAX_EVIDENCE_SAMPLES),
    sample_truncated: values.length > MAX_EVIDENCE_SAMPLES,
    total: values.length,
  };
}

module.exports = {
  audit,
  shouldFail,
  largestDimension,
  isValidColor,
  withinScope,
  DISPLAY_MODES,
  ORIENTATIONS,
  MAX_EVIDENCE_SAMPLES,
};
