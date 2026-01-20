// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blackout Secure Web Application Manifest Generator
// Copyright © 2025-2026 Blackout Secure
// Licensed under Apache License 2.0
// Website: https://blackoutsecure.app
// Repository: https://github.com/blackoutsecure/bos-web-application-manifest-generator
// Issues: https://github.com/blackoutsecure/bos-web-application-manifest-generator/issues
// Docs: https://github.com/blackoutsecure/bos-web-application-manifest-generator#readme
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Generates W3C-compliant web application manifest files for PWAs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const { safeJsonParse, parseList, formatFileSize } = require('./lib/utils');

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
const config = require('./lib/project-config');
const { defaults } = config;

/**
 * Main action entry point
 */
async function run() {
  try {
    core.info('━'.repeat(50));
    core.info(`🌐 ${config.name} v${config.version}`);
    core.info('━'.repeat(50));
    core.info(`${config.copyright} | ${config.license}`);
    core.info(`📦 ${config.repository}`);
    core.info(`💬 Support: ${config.issues}`);
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
    const inject_manifest_link_exts = parseList(
      core.getInput('inject_manifest_link_exts') || defaults.injectManifestLinkExts.join(' '),
      defaults.injectManifestLinkExts
    );
    const validate_manifest_assets = core.getBooleanInput('validate_manifest_assets') !== false;

    // Artifact upload configuration
    const upload_artifacts = core.getBooleanInput('upload_artifacts') !== false;
    const artifact_name = core.getInput('artifact_name') || 'web-manifest';
    const artifact_retention_days =
      parseInt(core.getInput('artifact_retention_days') || '0', 10) || undefined;

    // Parse icons from JSON input
    let icons = safeJsonParse(core.getInput('icons'), null);
    if (!icons) {
      icons = defaults.icons;
    } else if (!Array.isArray(icons)) {
      core.warning('Icons input must be a JSON array');
      icons = defaults.icons;
    }

    // Parse shortcuts from JSON input
    let shortcuts = safeJsonParse(core.getInput('shortcuts'), null);
    if (!shortcuts || !Array.isArray(shortcuts)) {
      shortcuts = [];
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
    const manifestConfig = {
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
      icons_dir,
      icons,
      shortcuts,
      categories,
    };

    core.info('');
    core.info('⚙️  Configuration:');
    core.info(`   Name: ${manifestConfig.name || '(not set)'}`);
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
    core.info(`   Public Directory: ${public_dir}`);
    core.info(`   Output Filename: ${filename}`);
    core.info(`   Page Injection: ${inject_manifest_link ? 'enabled' : 'disabled'}`);
    if (inject_manifest_link) {
      core.info(`   Injection Extensions: ${inject_manifest_link_exts.join(', ')}`);
      core.info(`   Crossorigin Credentials: ${crossorigin_credentials ? 'yes' : 'no'}`);
    }
    core.info(`   Manifest Asset Validation: ${validate_manifest_assets ? 'enabled' : 'disabled'}`);
    core.info(`   Upload Artifacts: ${upload_artifacts ? 'enabled' : 'disabled'}`);

    // Display defined icons
    if (icons.length > 0) {
      core.info('');
      core.info(`📷 Icons: ${icons.length} defined`);
      icons.forEach((icon, index) => {
        const purposes = icon.purpose ? ` [${icon.purpose}]` : '';
        core.info(
          `   ${index + 1}. ${icon.src} (${icon.sizes || 'auto'}) ${icon.type ? `${icon.type}` : ''}${purposes}`
        );
      });
    }

    // Display shortcuts if defined
    if (shortcuts.length > 0) {
      core.info('');
      core.info(`⌘ Shortcuts: ${shortcuts.length} defined`);
      shortcuts.forEach((shortcut, index) => {
        core.info(`   ${index + 1}. ${shortcut.name} → ${shortcut.url}`);
      });
    }

    // Display categories if defined
    if (categories.length > 0) {
      core.info('');
      core.info(`📂 Categories: ${categories.length} defined`);
      core.info(`   ${categories.join(', ')}`);
    }

    core.info('');
    core.info('━'.repeat(50));
    core.info('');
    core.info('📝 Generating manifest...');

    // Generate manifest
    const manifestJson = generateManifest(manifestConfig, icons_dir);
    const manifest = processManifest(manifestConfig, icons_dir);

    core.info('');
    core.info('🔍 Validation:');

    // Validate manifest
    const validation = validateManifest(manifest);
    if (!validation.isValid) {
      core.warning('⚠️  Manifest validation warnings:');
      validation.errors.forEach((error) => {
        core.warning(`   • ${error}`);
      });
    } else {
      core.info('   ✓ Manifest validation passed');
    }

    // Validate icon files if enabled (warn only)
    if (validate_manifest_assets && icons.length > 0) {
      const baseDir = path.resolve(public_dir);
      const iconValidation = validateIcons(icons, baseDir, icons_dir);

      if (iconValidation.checkedFiles.length > 0) {
        core.info('   ✓ Assets checked');
        iconValidation.checkedFiles.forEach((icon) => {
          const marker = icon.exists ? '✓' : '✕';
          const level = icon.exists ? 'info' : 'warning';
          const message = `      ${marker} ${icon.src} (${icon.sizes})`;
          core[level](message);
        });
      }

      if (iconValidation.missing.length > 0) {
        core.warning(
          `   ⚠️  ${iconValidation.missing.length} asset(s) not found in ${icons_dir} directory:`
        );
        iconValidation.missing.forEach((icon) => {
          const relativePath = path.relative(path.resolve(public_dir), icon.path);
          core.warning(`      ✕ ${relativePath}`);
        });
      }
    }

    core.info('');
    core.info('━'.repeat(50));
    core.info('');

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
    core.info(`   Size: ${formatFileSize(Buffer.byteLength(manifestJson, 'utf8'))}`);

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
      core.info('');
      core.info('━'.repeat(50));
      core.info('');
      core.info('🔗 Injecting manifest link into page files...');
      core.info(`   Scanning for files with extensions: ${inject_manifest_link_exts.join(', ')}`);
      const pageResults = processPageFiles(
        outputPath,
        inject_manifest_link_exts,
        filename,
        crossorigin_credentials
      );

      const totalDiscovered =
        pageResults.injected + pageResults.skipped + pageResults.errors.length;
      core.info('');
      core.info(
        `   📊 Results: ${pageResults.injected} injected, ${pageResults.skipped} skipped, ${pageResults.errors.length} errors`
      );

      if (pageResults.details && pageResults.details.length > 0) {
        pageResults.details.forEach((detail) => {
          const relativePath = path.relative(process.cwd(), detail.file);
          if (detail.status === 'injected') {
            core.info(`      ✅ ${relativePath}`);
          } else if (detail.status === 'skipped') {
            core.info(`      ⚠️  ${relativePath} (already present)`);
          } else if (detail.status === 'error') {
            core.warning(`      ✕ ${relativePath} - ${detail.message}`);
          }
        });
      }

      if (totalDiscovered === 0) {
        core.info(
          `   ℹ️  No page files found with extensions: ${inject_manifest_link_exts.join(', ')}`
        );
      }
    } else {
      core.info('');
      core.info('━'.repeat(50));
      core.info('');
      core.info('⏭️  Page injection disabled');
    }

    // Set outputs
    core.setOutput('manifest_path', manifestPath);
    core.setOutput('manifest_json', manifestJson);

    core.info('');
    core.info('━'.repeat(50));
    core.info('✅ Web Manifest generation complete!');
    core.info('━'.repeat(50));
    core.info(`${config.copyright}`);
    core.info(`📦 ${config.repository}`);
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
