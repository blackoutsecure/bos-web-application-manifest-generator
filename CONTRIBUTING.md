# Contributing

Thank you for considering a contribution!

## Workflow Overview

1. Fork the repository and create a topic branch: `git checkout -b feat/your-feature`.
2. Install dependencies: `npm install`.
3. Make changes (add inputs? update `action.yml`, implement logic in `src/index.js`).
4. Build: `npm run build` (updates `dist/`).
5. Run quality checks:

```bash
npm run lint
npm test
npm run coverage
```

6. Update documentation (`README.md`) if you add or change inputs.
7. Commit using conventional style (examples below).
8. Push and open a Pull Request.

## Conventional Commit Examples

- `feat: support lastmod git strategy`
- `fix: correct URL normalization for windows paths`
- `docs: clarify strict_validation behavior`
- `refactor: extract html parsing into lib module`
- `chore: update dev dependencies`

## Testing Guidelines

- Unit tests: add in `test/unit/` for pure functions.
- Integration tests: extend `test/sitemap.test.js` for end-to-end scenarios.
- Edge cases: add to `test/edge-cases.test.js` for limits or unusual inputs.
- Use fixtures under `test/fixtures/` instead of inline large strings.

## Adding a New Input

1. Add input definition to `action.yml`.
2. Handle it in `src/index.js` (parse from `core.getInput`).
3. Add unit tests if logic isolated; integration test if affects full run.
4. Document in README (Inputs section + example workflow).
5. Rebuild `dist/` (`npm run build`).

## Release Process

Releases are automated using the built-in release scripts. Only maintainers should perform releases.

### Prerequisites

- Clean git working directory (all changes committed)
- All tests passing
- On `main` branch

### Release Steps

1. **Determine version bump type:**
   - `patch` - Bug fixes, minor changes (1.0.0 → 1.0.1)
   - `minor` - New features, backwards compatible (1.0.0 → 1.1.0)
   - `major` - Breaking changes (1.0.0 → 2.0.0)

2. **Run release command:**

   ```bash
   npm run release patch   # or minor/major
   # OR specify exact version
   npm run release 1.2.3
   ```

3. **Automated process:**
   - Updates version in `package.json`, `src/lib/project-config.js`, `src/index.js`
   - Builds `dist/` folder
   - Runs full test suite
   - Commits changes
   - Creates version tag (e.g., `v1.0.1`)
   - Creates/updates moving tag (e.g., `v1`)
   - Creates/updates `latest` tag
   - Pushes to GitHub

4. **Publish to Marketplace:**
   - Go to [GitHub Releases](https://github.com/blackoutsecure/bos-web-application-manifest-generator/releases)
   - Draft a new release for the created tag
   - Add release notes (features, fixes, breaking changes)
   - Check "Publish this Action to the GitHub Marketplace"
   - Select category: "Deployment" or "Continuous Integration"
   - Publish

### Version Management

Check current version:

```bash
npm run version:get
```

Manual version updates (without release):

```bash
npm run version:patch   # Increment patch
npm run version:minor   # Increment minor
npm run version:major   # Increment major
```

### What Gets Updated

The version is automatically synchronized across:

- `package.json` and `package-lock.json`
- `src/lib/project-config.js`
- `src/index.js` (version display)

### Tags Created

Each release creates three types of tags:

- **Specific version** (`v1.2.3`) - Immutable, recommended for users
- **Major version** (`v1`) - Points to latest v1.x.x, auto-updates
- **Latest** (`latest`) - Points to newest release overall

Users can reference the action with:

```yaml
uses: blackoutsecure/bos-web-application-manifest-generator@v1.2.3  # Specific
uses: blackoutsecure/bos-web-application-manifest-generator@v1      # Latest v1.x
uses: blackoutsecure/bos-web-application-manifest-generator@latest  # Latest overall
```

- Workflow builds, commits dist (if changed), creates annotated tag, updates moving major tag.
- GitHub Release generated with notes.

Do not manually push tags without running the workflow (ensures consistent build artifact).

## Code Style

- ESLint + Prettier enforce formatting.
- Avoid large inline HTML/XML in tests; store in fixtures.
- Keep functions small and focused.

## Security

See `SECURITY.md` for reporting instructions.

## Need Help?

Open a draft PR early for feedback or create an issue describing the proposal.
