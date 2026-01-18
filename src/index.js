/**
 * Copyright 2025 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 *
 * Web Manifest Generator - Main Entry Point
 * Generates site.webmanifest files according to W3C Web Application Manifest specification
 */

const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const { generateManifest, validateManifest, processManifest } = require('./lib/manifest-generator');
const { processPageFiles } = require('./lib/page-injector');
const { validateIcons } = require('./lib/icon-validator');

/**
 * Main action entry point
 */
async function run() {
  try {
    core.info('━'.repeat(50));
    core.info('🌐 Web Manifest Generator v1.0.0');
    core.info('━'.repeat(50));
    core.info('© 2025 Blackout Secure | Apache License 2.0');
    core.info('📦 github.com/blackoutmode/bos-sitewebmanifest');
    core.info('💬 Support: github.com/blackoutmode/bos-sitewebmanifest/issues');
    core.info('━'.repeat(50));
    core.info('');

    // Get inputs from action configuration
    const name = core.getInput('name');
    const short_name = core.getInput('short_name');
    const description = core.getInput('description');
    const start_url = core.getInput('start_url') || '/';
    const scope = core.getInput('scope') || '/';
    const display = core.getInput('display') || 'standalone';
    const theme_color = core.getInput('theme_color');
    const background_color = core.getInput('background_color');
    const orientation = core.getInput('orientation');
    const lang = core.getInput('lang');
    const dir = core.getInput('dir');
    const id = core.getInput('id');
    const icons_dir = core.getInput('icons_dir') || '/icons/';
    const output_dir = core.getInput('output_dir') || 'public';
    const filename = core.getInput('filename') || 'site.webmanifest';
    const inject_manifest_link = core.getBooleanInput('inject_manifest_link') !== false;
    const crossorigin_credentials = core.getBooleanInput('crossorigin_credentials') === true;
    const inject_manifest_link_exts = (core.getInput('inject_manifest_link_exts') || 'html htm')
      .split(/\s+/)
      .filter(Boolean);
    const icon_validation = core.getInput('icon_validation') || 'warn';

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
    core.info(`   Output Directory: ${output_dir}`);
    core.info(`   Output Filename: ${filename}`);
    core.info(`   Page Injection: ${inject_manifest_link ? 'enabled' : 'disabled'}`);
    if (inject_manifest_link) {
      core.info(`   Injection Extensions: ${inject_manifest_link_exts.join(', ')}`);
      core.info(`   Crossorigin Credentials: ${crossorigin_credentials ? 'yes' : 'no'}`);
    }
    core.info(`   Icon Validation: ${icon_validation}`);
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

    // Validate icon files if validation is enabled
    if (icon_validation !== 'none' && icons.length > 0) {
      const iconValidation = validateIcons(icons, process.cwd());

      if (iconValidation.missing.length > 0) {
        const message = `Found ${iconValidation.missing.length} missing icon file(s):`;
        const details = iconValidation.missing.map(
          (icon) => `   • ${icon.src} (${icon.sizes} @ ${icon.path})`
        );

        if (icon_validation === 'fail') {
          core.setFailed(`❌ Icon validation failed: ${message}\n${details.join('\n')}`);
          return;
        } else if (icon_validation === 'warn') {
          core.warning(`⚠️  ${message}`);
          details.forEach((detail) => {
            core.warning(detail);
          });
        }
      } else if (iconValidation.checked > 0) {
        core.info(`✅ Icon validation passed (${iconValidation.checked} icon(s) verified)`);
      }
    }

    // Ensure output directory exists
    const outputPath = path.resolve(output_dir);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
      core.info(`📁 Created output directory: ${outputPath}`);
    }

    // Write manifest file
    const manifestPath = path.join(outputPath, filename);
    fs.writeFileSync(manifestPath, manifestJson, 'utf-8');
    core.info(`✅ Generated manifest: ${manifestPath}`);
    core.info(`   File size: ${Buffer.byteLength(manifestJson, 'utf8')} bytes`);

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
    core.info('📦 github.com/blackoutmode/bos-sitewebmanifest');
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
