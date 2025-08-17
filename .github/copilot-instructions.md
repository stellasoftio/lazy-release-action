# Copilot Instructions for Lazy Release Action

## Project Overview
This is a GitHub Action that automates versioning, publishing, and changelog generation for JavaScript/TypeScript projects using Conventional Commits. It operates on a two-stage workflow: creating release PRs when regular PRs merge, then publishing when release PRs merge.

## Architecture & Data Flow

### Core Workflow (src/index.ts)
1. **PR Merge Detection**: Distinguishes between regular PRs and release PRs using `isLastCommitAReleaseCommit()`
2. **Release PR Creation**: Analyzes commits → generates changelogs → updates versions → creates release PR
3. **Publishing**: Parses release PR body → publishes packages → creates GitHub releases

### Key Components
- **api/**: External integrations (git, github, npm)
- **core/**: Business logic (changelog, comments, publish, release, version)
- **utils/**: Pure functions for data transformation and validation
- **types/**: TypeScript interfaces, especially `PackageInfo` and `Changelog`

## Development Patterns

### Conventional Commits Processing
- PR titles/bodies use conventional commit syntax: `type(scope): description` or `type(scope)!: breaking change`
- Explicit version bumps: `#major`, `#minor`, `#patch` tags override semantic versioning
- Multi-package support: `feat(package-a,package-b): description`
- Breaking changes: `!` suffix or explicit `#major` tag

### Package Management
- Supports both monorepos and single packages via `getPackagePaths()` and `getPackageInfos()`
- Root package detection: `isRoot` flag in `PackageInfo`
- Dependency updates: `updateIndirectPackageJsonFile()` handles transitive version bumps
- Package naming: Use `getPackageNameWithoutScope()` for display names

### Version Calculation
- `applyNewVersion()` in `core/version.ts` implements semantic versioning logic
- Breaking changes (!) always bump major version
- Explicit version tags override conventional commit semantics
- Version updates cascade through dependency graphs

### Testing Strategy
- Vitest with globals enabled (`vitest.config.ts`)
- Test files co-located with source: `*.test.ts` pattern
- Focus on pure functions in `utils/` for easier testing
- Mock external APIs in `api/` layer

## Build & Development

### Commands
```bash
npm run build        # TypeScript check + esbuild bundle to dist/index.js
npm run test         # Vitest with watch mode
npm run type-check   # TypeScript compilation check
npm run start        # Run locally with tsx
```

### Build Process
- esbuild bundles to single `dist/index.js` for GitHub Actions
- Node 20 runtime specified in `action.yml`
- No external dependencies at runtime (all bundled)

### Environment Variables
Input parameters are accessed via `process.env['INPUT_*']` pattern in `constants.ts`:
- `INPUT_GITHUB-TOKEN`, `INPUT_NPM-TOKEN`, `INPUT_SNAPSHOTS`, etc.

## Critical Implementation Details

### Git Operations
- Uses `execFileSync()` for git commands (see `api/git.ts`)
- Release branch naming: `lazy-release/main` (stored in `RELEASE_BRANCH`)
- Automatic git config setup for github-actions bot user

### Markdown Generation
- Release PR body contains structured markdown with release IDs for parsing
- `parseReleasePRBody()` extracts changelog data from PR descriptions
- `appendReleaseIdToMarkdown()` adds metadata for later processing

### Package Publishing
- Supports both npm and GitHub Packages registries
- Token configuration in `setNpmConfig()` function
- Tag creation via `createTags()` before publishing

### Error Handling
- Graceful handling of missing packages, invalid PR titles, empty changelogs
- Early returns with console logging for debugging
- PR status comments via `createOrUpdatePRStatusComment()`

## Common Modifications

### Adding New Commit Types
1. Update `TYPE_TO_CHANGELOG_TYPE` in `constants.ts`
2. Add emoji, display name, and sort order
3. Update `COMMIT_TYPE_PATTERN` regex if needed

### Extending Package Support
- Modify `getPackagePaths()` in `utils/package.ts` for new file patterns
- Update `PackageInfo` interface if additional metadata needed

### Customizing Changelog Format
- Edit `generateMarkdown()` in `utils/markdown.ts`
- Modify `createOrUpdateChangelog()` in `core/changelog.ts` for file format changes

### Testing New Features
- Add tests alongside source files with `.test.ts` suffix
- Use `describe` and `it` blocks (Vitest globals enabled)
- Mock external dependencies in `api/` layer for unit tests
