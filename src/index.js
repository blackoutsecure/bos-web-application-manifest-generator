/**
 * Copyright 2025 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 *
 * Web Application Manifest Generator - Main Entry Point
 * Generates site.webmanifest files according to W3C Web Application Manifest specification
 */

const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

// Initialize artifact client (supports both old and new @actions/artifact APIs)
let artifactClient = null;
try {
  if (process.env.GITHUB_ACTIONS === 'true') {
    const artifact = require('@actions/artifact');
    if (artifact?.DefaultArtifactClient) {
      artifactClient = new artifact.DefaultArtifactClient();
    } else if (artifact?.default?.uploadArtifact) {
      artifactClient = artifact.default;
    }
  }
} catch {
  // Artifact client not available in local dev
}

const { generateManifest, validateManifest, processManifest } = require('./lib/manifest-generator');
const { processPageFiles } = require('./lib/page-injector');
const { validateIcons } = require('./lib/icon-validator');
const { version, defaults } = require('./lib/project-config');

/**
 * Main action entry point
 */
async function run() {
  try {
    core.info('━'.repeat(50));
    core.info(`🌐 Web Application Manifest Generator v${version}`);
    core.info('━'.repeat(50));
    core.info('© 2025 Blackout Secure | Apache License 2.0');
    core.info('📦 github.com/blackoutsecure/bos-web-application-manifest-generator');
    core.info(
      '💬 Support: github.com/blackoutsecure/bos-web-application-manifest-generator/issues'
    );
    core.info('━'.repeat(50));
    core.info('');

    // Get inputs from action configuration
    const name = core.getInput('name') || defaults.name;
    const short_name = core.getInput('short_name') || defaults.shortName;
    const description = core.getInput('description');
    const start_url = core.getInput('start_url') || defaults.startUrl;
    const scope = core.getInput('scope') || defaults.scope;
    const display = core.getInput('display') || defaults.display;
    const theme_color = core.getInput('theme_color') || defaults.themeColor;
    const background_color = core.getInput('background_color') || defaults.backgroundColor;
    const orientation = core.getInput('orientation') || defaults.orientation;
    const lang = core.getInput('lang');
    const dir = core.getInput('dir');
    const id = core.getInput('id');
    const icons_dir = core.getInput('icons_dir') || defaults.iconsDir;
    const public_dir = core.getInput('public_dir');
    const filename = core.getInput('filename') || defaults.filename;
    const inject_manifest_link = core.getBooleanInput('inject_manifest_link') !== false;
    const crossorigin_credentials = core.getBooleanInput('crossorigin_credentials') === true;
    const inject_manifest_link_exts = (
      core.getInput('inject_manifest_link_exts') || defaults.injectManifestLinkExts.join(' ')
    )
      .split(/\s+/)
      .filter(Boolean);
    const validate_manifest_assets = core.getBooleanInput('validate_manifest_assets') !== false;

    // Artifact upload configuration
    const upload_artifacts = core.getBooleanInput('upload_artifacts') !== false;
    const artifact_name = core.getInput('artifact_name') || 'web-manifest';
    const artifact_retention_days =
      parseInt(core.getInput('artifact_retention_days') || '0', 10) || undefined;

    // Parse icons from JSON input
    let icons = [];
    const iconsInput = core.getInput('icons');
    if (iconsInput) {
      try {
        icons = JSON.parse(iconsInput);
      } catch (e) {
        core.warning(`Failed to parse icons JSON: ${e.message}`);
      }
    }

    if (!iconsInput) {
      icons = defaults.icons;
    }

    // Parse shortcuts from JSON input
    let shortcuts = [];
    const shortcutsInput = core.getInput('shortcuts');
    if (shortcutsInput) {
      try {
        shortcuts = JSON.parse(shortcutsInput);
      } catch (e) {
        core.warning(`Failed to parse shortcuts JSON: ${e.message}`);
      }
    }

    // Parse categories from comma-separated input
    let categories = [];
    const categoriesInput = core.getInput('categories');
    if (categoriesInput) {
      categories = categoriesInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
    }

    // Build configuration object
    const config = {
      name,
      short_name,
      description,
      start_url,
      scope,
      display,
      theme_color,
      background_color,
      orientation,
      lang,
      dir,
      id,
      icons,
      shortcuts,
      categories,
    };

    core.info('📋 Configuration:');
    core.info(`   Name: ${config.name || '(not set)'}`);
    core.info(`   Short Name: ${config.short_name || '(not set)'}`);
    core.info(`   Description: ${config.description || '(not set)'}`);
    core.info(`   Start URL: ${start_url}`);
    core.info(`   Scope: ${scope}`);
    core.info(`   Display: ${display}`);
    core.info(`   Orientation: ${orientation || '(not set)'}`);
    core.info(`   Theme Color: ${theme_color || '(not set)'}`);
    core.info(`   Background Color: ${background_color || '(not set)'}`);
    core.info(`   Language: ${lang || '(not set)'}`);
    core.info(`   Text Direction: ${dir || '(not set)'}`);
    core.info(`   App ID: ${id || '(not set)'}`);
    core.info(`   Icons Directory: ${icons_dir}`);
    core.info(`   Icons: ${icons.length} defined`);
    core.info(`   Shortcuts: ${shortcuts.length} defined`);
    core.info(`   Categories: ${categories.length > 0 ? categories.join(', ') : '(none)'}`);
    core.info(`   Public Directory: ${public_dir}`);
    core.info(`   Output Filename: ${filename}`);
    core.info(`   Page Injection: ${inject_manifest_link ? 'enabled' : 'disabled'}`);
    if (inject_manifest_link) {
      core.info(`   Injection Extensions: ${inject_manifest_link_exts.join(', ')}`);
      core.info(`   Crossorigin Credentials: ${crossorigin_credentials ? 'yes' : 'no'}`);
    }
    core.info(`   Manifest Asset Validation: ${validate_manifest_assets ? 'enabled' : 'disabled'}`);
    core.info(`   Upload Artifacts: ${upload_artifacts ? 'enabled' : 'disabled'}`);
    core.info('━'.repeat(50));

    // Generate manifest
    const manifestJson = generateManifest(config);
    const manifest = processManifest(config);

    // Validate manifest
    const validation = validateManifest(manifest);
    if (!validation.isValid) {
      core.warning('⚠️  Manifest validation warnings:');
      validation.errors.forEach((error) => {
        core.warning(`   • ${error}`);
      });
    } else {
      core.info('✅ Manifest validation passed');
    }

    // Validate icon files if enabled (warn only)
    if (validate_manifest_assets && icons.length > 0) {
      const baseDir = path.resolve(public_dir);
      const iconValidation = validateIcons(icons, baseDir);

      if (iconValidation.checkedFiles.length > 0) {
        core.info('🔍 Manifest asset check (icons):');
        iconValidation.checkedFiles.forEach((icon) => {
          const marker = icon.exists ? '✓' : '✕';
          const level = icon.exists ? 'info' : 'warning';
          const message = `   ${marker} ${icon.src} (${icon.sizes}) -> ${icon.path}`;
          core[level](message);
        });
      }

      if (iconValidation.missing.length > 0) {
        core.warning(`⚠️  Manifest asset check: ${iconValidation.missing.length} missing file(s)`);
      }
    }

    // Ensure public directory exists
    const outputPath = path.resolve(public_dir);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
      core.info(`📁 Created public directory: ${outputPath}`);
    }

    // Write manifest file
    const manifestPath = path.join(outputPath, filename);
    fs.writeFileSync(manifestPath, manifestJson, 'utf-8');
    core.info(`✅ Generated manifest: ${manifestPath}`);
    core.info(`   File size: ${Buffer.byteLength(manifestJson, 'utf8')} bytes`);

    // Optional artifact upload
    if (upload_artifacts && artifactClient) {
      try {
        const files = [manifestPath];
        const uploadOptions = { retentionDays: artifact_retention_days };
        core.info('');
        core.info('📦 Uploading artifacts...');
        await artifactClient.uploadArtifact(artifact_name, files, outputPath, uploadOptions);
        core.info(`✅ Artifact uploaded: ${artifact_name}`);
      } catch (err) {
        core.warning(
          `⚠️  Failed to upload artifacts: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Inject manifest link into page files if enabled
    if (inject_manifest_link) {
      core.info('🔗 Injecting manifest link into page files...');
      core.info(`   Scanning for files with extensions: ${inject_manifest_link_exts.join(', ')}`);
      const pageResults = processPageFiles(
        outputPath,
        inject_manifest_link_exts,
        filename,
        crossorigin_credentials
      );

      const totalDiscovered = pageResults.injected + pageResults.skipped;
      core.info(`   📊 Discovery Results:`);
      core.info(`      Total pages discovered: ${totalDiscovered}`);

      if (pageResults.injected > 0) {
        core.info(`   ✅ Injection Results:`);
        core.info(`      Pages injected/updated: ${pageResults.injected}`);
        pageResults.files.forEach((file) => {
          const relativePath = path.relative(process.cwd(), file);
          core.info(`         • ${relativePath}`);
        });
      }

      if (pageResults.skipped > 0) {
        core.info(`   ℹ️  Pages already containing manifest link: ${pageResults.skipped}`);
      }

      if (totalDiscovered === 0) {
        core.info(
          `   ℹ️  No page files found with extensions: ${inject_manifest_link_exts.join(', ')}`
        );
      }

      if (pageResults.errors.length > 0) {
        core.info(`   ⚠️  Errors encountered (${pageResults.errors.length}):`);
        pageResults.errors.forEach((err) => {
          core.warning(`      • ${err.file || err.directory}: ${err.error}`);
        });
      }
    } else {
      core.info('⏭️  Page injection disabled');
    }

    // Set outputs
    core.setOutput('manifest_path', manifestPath);
    core.setOutput('manifest_json', manifestJson);

    core.info('');
    core.info('━'.repeat(50));
    core.info('✅ Web Manifest generation complete!');
    core.info('━'.repeat(50));
    core.info('© 2025 Blackout Secure | Apache License 2.0');
    core.info('📦 github.com/blackoutsecure/bos-web-application-manifest-generator');
    core.info('━'.repeat(50));
  } catch (error) {
    core.setFailed(`❌ Action failed: ${error.message}`);
    if (error.stack) {
      core.debug(error.stack);
    }
  }
}

// Run the action if called directly
if (require.main === module) {
  run();
}

module.exports = { run };
