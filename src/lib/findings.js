// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blackout Secure Web Application Manifest Generator
// Copyright © 2025-2026 Blackout Secure
// Licensed under Apache License 2.0
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Finding model, severity semantics, and Markdown report rendering.
//
// Severities:
//   pass  — control satisfied the configured policy
//   warn  — review recommended, not a hard block on its own
//   fail  — required control failed and should be remediated
//   error — the audit itself could not complete for this control
//   skip  — the control was disabled or lacked the evidence to assess
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const crypto = require('crypto');

const SPEC = 'https://www.w3.org/TR/appmanifest/';
const INSTALL_DOCS =
  'https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable';

/**
 * Rule family display order — drives the section banners in reports.
 * Entries are `[idPrefix, header, blurb]`.
 */
const RULE_FAMILIES = Object.freeze([
  ['WM00', 'Required members', 'Identity, icons, start URL, and display mode'],
  ['WM01', 'Icons', 'Installability sizes, maskable purpose, and asset presence'],
  ['WM02', 'Colors and display', 'Theme/background colors and enumerated members'],
  ['WM03', 'Scope and identity', 'start_url containment, app id, and language'],
  ['WM04', 'Delivery', 'HTML linkage, file size, and JSON validity'],
]);

const RULE_TITLES = Object.freeze({
  WM001: 'Application name declared',
  WM002: 'Short name declared',
  WM003: 'Icons declared',
  WM004: 'start_url declared',
  WM005: 'Display mode declared',
  WM010: 'A 192px or larger icon is declared',
  WM011: 'A 512px or larger icon is declared',
  WM012: 'A maskable icon is declared',
  WM013: 'No discouraged "any maskable" purpose',
  WM014: 'Declared icon files exist',
  WM020: 'theme_color is a valid CSS color',
  WM021: 'background_color is a valid CSS color',
  WM022: 'display is a valid display mode',
  WM023: 'orientation is a valid orientation',
  WM030: 'start_url falls inside scope',
  WM031: 'Application id declared',
  WM032: 'lang is a valid language tag',
  WM040: 'Manifest is linked from HTML',
  WM041: 'File size within limits',
  WM042: 'Manifest is valid UTF-8 JSON',
});

const RULE_HELP = Object.freeze({
  WM001: `${SPEC}#name-member`,
  WM002: `${SPEC}#short_name-member`,
  WM003: `${SPEC}#icons-member`,
  WM004: `${SPEC}#start_url-member`,
  WM005: `${SPEC}#display-member`,
  WM010: INSTALL_DOCS,
  WM011: INSTALL_DOCS,
  WM012: 'https://web.dev/articles/maskable-icon',
  WM013: 'https://web.dev/articles/maskable-icon',
  WM014: `${SPEC}#icons-member`,
  WM020: `${SPEC}#theme_color-member`,
  WM021: `${SPEC}#background_color-member`,
  WM022: `${SPEC}#display-member`,
  WM023: `${SPEC}#orientation-member`,
  WM030: `${SPEC}#scope-member`,
  WM031: `${SPEC}#id-member`,
  WM032: `${SPEC}#lang-member`,
  WM040: `${SPEC}#linking-to-a-manifest`,
  WM041: SPEC,
  WM042: `${SPEC}#processing-the-manifest`,
});

const DEFAULT_REMEDIATIONS = Object.freeze({
  WM001: 'Set the `name` input so browsers have a full application name for install prompts.',
  WM002: 'Set `short_name` so constrained surfaces (home screens, launchers) have a compact label.',
  WM003: 'Declare at least one icon via the `icons` input — a PWA is not installable without one.',
  WM004: 'Set `start_url` so the installed app opens at a known entry point.',
  WM005: 'Set `display` (usually `standalone`) so the installed app opens outside a browser tab.',
  WM010:
    'Add a 192x192 (or larger) icon — Chromium requires one before offering an install prompt.',
  WM011: 'Add a 512x512 (or larger) icon so splash screens and store listings render sharply.',
  WM012:
    'Add an icon with `"purpose": "maskable"` so Android can crop it to the platform shape without letterboxing.',
  WM013:
    'Split `"purpose": "any maskable"` into two icon entries; a single combined purpose renders poorly on at least one platform.',
  WM014: 'Publish the missing icon files into the public directory, or correct the `src` paths.',
  WM020: 'Set `theme_color` to a valid CSS color (for example `#0f172a`).',
  WM021: 'Set `background_color` to a valid CSS color (for example `#ffffff`).',
  WM022: 'Set `display` to one of fullscreen, standalone, minimal-ui, or browser.',
  WM023: 'Set `orientation` to a value from the W3C orientation enumeration, or omit it.',
  WM030:
    'Move `start_url` inside `scope`, or widen `scope` — a start URL outside scope is ignored.',
  WM031:
    'Set `id` to a stable identity string so the app keeps its installed identity across `start_url` changes.',
  WM032: 'Set `lang` to a BCP 47 language tag such as `en-US`.',
  WM040:
    'Enable `inject_manifest_link` (or add `<link rel="manifest">` manually) so browsers discover the manifest.',
  WM041: 'Trim the manifest; an oversized manifest usually means duplicated icon entries.',
  WM042:
    'Write the manifest as UTF-8 JSON without a byte-order mark — browsers reject a manifest that fails to parse.',
});

function defaultTitle(ruleId) {
  return RULE_TITLES[ruleId] || ruleId;
}

function defaultRemediation(ruleId, message) {
  return (
    DEFAULT_REMEDIATIONS[ruleId] ||
    message ||
    'Review the manifest configuration and apply the recommended control.'
  );
}

/** A single evidence-backed audit result. */
class Finding {
  /**
   * @param {object} options - Finding fields.
   * @param {string} options.ruleId - Stable rule identifier (e.g. `WM001`).
   * @param {string} options.severity - One of pass/warn/fail/error/skip.
   * @param {string} options.message - Evidence describing what was observed.
   * @param {string} [options.location] - File path or manifest member.
   * @param {string} [options.title] - Human-readable control name.
   * @param {object} [options.evidence] - Machine-readable evidence payload.
   * @param {string} [options.remediation] - Recommended remediation text.
   * @param {string} [options.source] - Emitting subsystem.
   */
  constructor({
    ruleId,
    severity,
    message,
    location = '',
    title = '',
    evidence = {},
    remediation = '',
    source = 'web-manifest-audit',
  }) {
    this.ruleId = ruleId;
    this.severity = severity;
    this.message = message;
    this.location = location;
    this.title = title || defaultTitle(ruleId);
    this.evidence = evidence || {};
    this.remediation = remediation || defaultRemediation(ruleId, message);
    this.remediationConfidence = 'deterministic';
    this.remediationSource = 'Blackout Secure Recommended Remediation';
    this.source = source;
    this.helpUri = RULE_HELP[ruleId] || SPEC;
  }

  /** Identity that stays stable as recommendation wording changes. */
  get findingKey() {
    const identity = `${this.ruleId}|${this.location || '(manifest)'}`;
    const digest = crypto.createHash('sha256').update(identity, 'utf8').digest('hex').slice(0, 16);
    return `${this.ruleId.toLowerCase()}-${digest}`;
  }

  /** @returns {object} JSON-serialisable representation. */
  toJSON() {
    return {
      finding_key: this.findingKey,
      rule_id: this.ruleId,
      severity: this.severity,
      title: this.title,
      message: this.message,
      source: this.source,
      location: this.location,
      evidence: this.evidence,
      remediation: this.remediation,
      remediation_confidence: this.remediationConfidence,
      remediation_source: this.remediationSource,
      help_uri: this.helpUri,
    };
  }

  /** @returns {object} Machine-readable recommendation contract. */
  recommendation() {
    return {
      finding_key: this.findingKey,
      rule_id: this.ruleId,
      title: this.title,
      location: this.location,
      recommendation: this.remediation,
      confidence: this.remediationConfidence,
      source: this.remediationSource,
      patch_status: 'unavailable',
    };
  }
}

/** Aggregate of every finding emitted by one audit run. */
class AuditResult {
  /**
   * @param {Finding[]} [findings] - Findings in emission order.
   * @param {object} [context] - Run context echoed into reports.
   */
  constructor(findings = [], context = {}) {
    this.findings = findings;
    this.context = context;
  }

  get passed() {
    return this.findings.filter((f) => f.severity === 'pass');
  }

  get warned() {
    return this.findings.filter((f) => f.severity === 'warn');
  }

  get failed() {
    return this.findings.filter((f) => f.severity === 'fail');
  }

  get errored() {
    return this.findings.filter((f) => f.severity === 'error');
  }

  get skipped() {
    return this.findings.filter((f) => f.severity === 'skip');
  }

  /** @returns {object} Per-severity counts. */
  totals() {
    return {
      pass: this.passed.length,
      warn: this.warned.length,
      fail: this.failed.length,
      error: this.errored.length,
      skip: this.skipped.length,
    };
  }

  /** @returns {object[]} Recommendation contracts for non-pass findings. */
  recommendations() {
    return this.findings
      .filter((f) => f.severity !== 'pass' && f.remediation.trim())
      .map((f) => f.recommendation());
  }

  /** @returns {object} Full JSON report payload. */
  toJSON() {
    return {
      schema_version: 1,
      context: this.context,
      totals: this.totals(),
      verdict: verdict(this.totals())[0],
      findings: this.findings.map((f) => f.toJSON()),
      recommendations: this.recommendations(),
    };
  }

  /** @returns {string} GitHub-flavoured Markdown audit report. */
  summaryMarkdown() {
    return renderMarkdown(this);
  }
}

function verdict(totals) {
  if (totals.error) {
    return [
      'Inconclusive',
      'One or more controls could not be evaluated. Re-run after resolving the audit errors below.',
    ];
  }
  if (totals.fail) {
    return [
      'Action required',
      'At least one required manifest control failed and should be remediated before release.',
    ];
  }
  if (totals.warn) {
    return [
      'Review recommended',
      'No blocking failures. The warnings below are worth reviewing before release.',
    ];
  }
  if (totals.pass) {
    return ['Pass', 'Every configured web app manifest control satisfied its policy.'];
  }
  return ['Not assessed', 'No controls produced an assessable result for this run.'];
}

function severityLabel(severity) {
  switch (severity) {
    case 'pass':
      return '✅ Pass';
    case 'warn':
      return '⚠️ Warning';
    case 'fail':
      return '🔴 High';
    case 'error':
      return '🔥 Critical';
    default:
      return '⚪ Not Assessed';
  }
}

function mdEscape(text) {
  return String(text ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function familyFor(ruleId) {
  return RULE_FAMILIES.findIndex(([prefix]) => ruleId.startsWith(prefix));
}

function recommendedActions(totals) {
  const actions = [];
  if (totals.fail) {
    actions.push('Remediate every 🔴 High finding — these are required controls that failed.');
  }
  if (totals.error) {
    actions.push(
      'Investigate every 🔥 Critical finding — the audit could not collect evidence for those controls.',
    );
  }
  if (totals.warn) {
    actions.push(
      'Triage the ⚠️ Warning findings and either remediate them or set the rule to `skip` in config once accepted.',
    );
  }
  if (totals.skip) {
    actions.push(
      'Review ⚪ Not Assessed controls — enable them in `web_manifest.audit.rules` when they are relevant.',
    );
  }
  if (!actions.length) {
    actions.push('No action required. Keep the audit wired into CI to catch regressions.');
  }
  return actions;
}

function renderMarkdown(result) {
  const totals = result.totals();
  const [headline, detail] = verdict(totals);
  const ctx = result.context || {};

  const lines = [
    '# Blackout Secure Web Application Manifest Generator Audit Report',
    '',
    '**Provided by [Blackout Secure](https://blackoutsecure.app)**',
    '',
    '## Summary',
    '',
    `**Verdict:** ${mdEscape(headline)}`,
    '',
    detail,
    '',
    `**Totals:** ✅ ${totals.pass} pass · ⚠️ ${totals.warn} warning · ` +
      `🔴 ${totals.fail} high · 🔥 ${totals.error} critical · ` +
      `⚪ ${totals.skip} not assessed`,
    '',
    '| Severity | Count | Meaning |',
    '| -------- | ----- | ------- |',
    `| ✅ Pass | ${totals.pass} | Control satisfied the configured policy. |`,
    `| ⚠️ Warning | ${totals.warn} | Review recommended; not usually a hard block by itself. |`,
    `| 🔴 High | ${totals.fail} | Required control failed and should be remediated. |`,
    `| 🔥 Critical | ${totals.error} | Audit execution or evidence collection error. |`,
    `| ⚪ Not Assessed | ${totals.skip} | Check was skipped or lacked sufficient evidence. |`,
    '',
  ];

  if (Object.keys(ctx).length) {
    lines.push('## Run Context', '');
    lines.push('| Field | Value |', '| ----- | ----- |');
    for (const [key, value] of Object.entries(ctx)) {
      lines.push(`| ${mdEscape(key)} | ${mdEscape(value)} |`);
    }
    lines.push('');
  }

  lines.push('## Recommended Actions', '');
  for (const action of recommendedActions(totals)) {
    lines.push(`- ${action}`);
  }
  lines.push('');

  lines.push(
    '## Scope and Methodology',
    '',
    'This automated audit reviews the generated web app manifest against the W3C Web Application Manifest specification and mainstream PWA installability requirements — required members, icon sizes and purposes, colour and enumerated member validity, scope containment, HTML linkage, and encoding. Results are evidence-based at run time and are intended to support release and PWA-readiness review.',
    '',
  );

  const recommendations = result.findings.filter(
    (f) => f.severity !== 'pass' && f.remediation.trim(),
  );
  lines.push(
    '## Recommendations',
    '',
    '| Finding Key | Rule | Assessment | Location | Evidence / Why | Recommended Action |',
    '| ----------- | ---- | ---------- | -------- | -------------- | ------------------ |',
  );
  if (recommendations.length) {
    for (const f of recommendations) {
      lines.push(
        `| \`${f.findingKey}\` | \`${f.ruleId}\` | ${severityLabel(f.severity)} | ` +
          `${mdEscape(f.location || '—')} | ${mdEscape(f.message)} | ${mdEscape(f.remediation)} |`,
      );
    }
  } else {
    lines.push('| — | — | — | — | — | — |');
  }
  lines.push('');

  if (!result.findings.length) {
    lines.push(
      '## Detailed Findings',
      '',
      '_No findings were emitted by the configured audit controls._',
      '',
    );
    return `${lines.join('\n')}\n`;
  }

  const buckets = new Map();
  for (const f of result.findings) {
    const idx = familyFor(f.ruleId);
    if (!buckets.has(idx)) buckets.set(idx, []);
    buckets.get(idx).push(f);
  }

  lines.push('## Detailed Findings', '');
  for (const idx of [...RULE_FAMILIES.map((_, i) => i), -1]) {
    const rows = buckets.get(idx);
    if (!rows || !rows.length) continue;
    const [, header, blurb] =
      idx === -1 ? ['', 'Other', 'Uncategorised controls'] : RULE_FAMILIES[idx];
    lines.push(`### ${header}`, `_${blurb}_`, '');

    const attention = rows.filter((f) => f.severity !== 'pass');
    const passed = rows.filter((f) => f.severity === 'pass');

    if (attention.length) {
      lines.push(
        '#### Findings Requiring Attention',
        '',
        '| Rule | Severity | Location | Control | Evidence | Recommended Remediation |',
        '| ---- | -------- | -------- | ------- | -------- | ----------------------- |',
      );
      for (const f of attention) {
        lines.push(
          `| \`${f.ruleId}\` | ${severityLabel(f.severity)} | ${mdEscape(f.location || '—')} | ` +
            `${mdEscape(f.title)} | ${mdEscape(f.message)} | ${mdEscape(f.remediation)} |`,
        );
      }
      lines.push('');
    }

    if (passed.length) {
      lines.push(
        '#### Passed Controls',
        '',
        '| Rule | Severity | Location | Control | Evidence |',
        '| ---- | -------- | -------- | ------- | -------- |',
      );
      for (const f of passed) {
        lines.push(
          `| \`${f.ruleId}\` | ${severityLabel(f.severity)} | ${mdEscape(f.location || '—')} | ` +
            `${mdEscape(f.title)} | ${mdEscape(f.message)} |`,
        );
      }
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  Finding,
  AuditResult,
  RULE_FAMILIES,
  RULE_TITLES,
  RULE_HELP,
  DEFAULT_REMEDIATIONS,
  severityLabel,
  verdict,
  mdEscape,
  familyFor,
};
