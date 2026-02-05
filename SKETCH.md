# Arcana: Project Sketch

> Architecture overview and implementation plan for the vocabulary analysis toolchain.

## Vision

Arcana transforms .NET solutions into **leveled vocabularies**—visual maps showing how primitive types compose into domain abstractions. The toolchain has two halves:

| Half | Language | Purpose |
|------|----------|---------|
| **Extractor** | C# | Roslyn-based analysis of .NET solutions |
| **Visualizer** | TypeScript | D3.js rendering + web shell |

This document covers the **TypeScript half**.

---

## Package Structure

Yarn 3+ workspaces with a flat monorepo:

```
arcana/
├── .yarnrc.yml              # Yarn config (nodeLinker: pnp)
├── package.json             # Workspace root
├── tsconfig.base.json       # Shared strict TS config
├── vitest.workspace.ts      # Unified test runner
│
└── packages/
    ├── vocabulary/          # Core model + validation
    ├── levels/              # Level computation algorithm
    ├── phrase/              # Solution phrase filtering
    ├── viz/                 # D3 visualization component
    └── app/                 # SPA shell
```

### Why This Split

| Package | Concern | Can be used without... |
|---------|---------|------------------------|
| `vocabulary` | Data model, schema validation, serialization | Everything else |
| `levels` | Level computation from raw graph | Visualization, app |
| `phrase` | Entry point filtering | Visualization, app |
| `viz` | D3 rendering | App shell (embeddable) |
| `app` | UI chrome, file loading | Nothing (end product) |

Each package is independently testable. The visualization can be embedded elsewhere. The model can be consumed by other tools.

---

## Dependencies

### Assumed (will use)

| Dependency | Purpose | Version |
|------------|---------|---------|
| **TypeScript** | Language | 5.4+ |
| **Yarn** | Package management | 4+ (PnP mode) |
| **Vite** | Build + dev server | 5+ |
| **Vitest** | Testing | 2+ |
| **D3** | Visualization | 7+ |
| **Zod** | Runtime schema validation | 3+ |

### Avoided (will not use)

| Category | Reason |
|----------|--------|
| React/Vue/Svelte | Overkill for this UI; vanilla + D3 suffices |
| State management libs | App state is simple; plain TS is enough |
| CSS frameworks | Minimal UI; hand-written CSS |
| Bundler plugins | Keep build simple |

### On the Fence

| Dependency | For | Against | Decision |
|------------|-----|---------|----------|
| **Preact** | JSX ergonomics | Another dep | Defer—start vanilla, add if needed |
| **Tailwind** | Rapid styling | Build complexity | Defer—start with CSS modules |

---

## TypeScript Configuration

Maximum strictness. The base config:

```jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ESNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Each package extends this and sets its `rootDir`/`outDir`.

---

## Package Details

### `@arcana/vocabulary`

**Intent**: Define what a vocabulary *is*. Provide schema validation so malformed JSON fails fast with clear errors.

**Exports**:
- `Word` — type for a vocabulary word
- `Vocabulary` — type for the full vocabulary
- `VocabularySchema` — Zod schema for runtime validation
- `parseVocabulary(json: unknown): Vocabulary` — parse + validate
- `serializeVocabulary(v: Vocabulary): string` — canonical JSON output

**Validation approach**:
1. Unit tests for schema acceptance/rejection
2. Property-based tests: `serialize(parse(serialize(v))) === serialize(v)`
3. Golden file tests with known-good vocabularies

**No dependencies** on other arcana packages.

---

### `@arcana/levels`

**Intent**: Compute levels from a raw composition graph. Handle cycles via SCC collapse.

**Exports**:
- `computeLevels(words: RawWord[]): LeveledWord[]`
- `findCycles(words: RawWord[]): Cycle[]`
- `collapseToDAG(words: RawWord[]): DAGWord[]`

**Validation approach**:
1. Unit tests for known graphs (linear chains, diamonds, cycles)
2. Property: `level(w) > level(c)` for all compositions `c` of `w`
3. Property: result is a valid DAG (no cycles after collapse)
4. Cycle detection tests with known SCCs

**Depends on**: `@arcana/vocabulary` (types only)

---

### `@arcana/phrase`

**Intent**: Filter a vocabulary to words reachable from specified entry points.

**Exports**:
- `computePhrase(vocab: Vocabulary, entryPoints: string[]): Vocabulary`
- `reachableFrom(vocab: Vocabulary, wordId: string): Set<string>`

**Validation approach**:
1. Unit tests: phrase of full vocab with root entry = full vocab
2. Unit tests: phrase of single leaf word = just that word + its compositions
3. Property: phrase is always a subset of input vocabulary
4. Property: all entry points are present in result

**Depends on**: `@arcana/vocabulary`

---

### `@arcana/viz`

**Intent**: Render a vocabulary as an interactive vertical stack. Pure visualization—no file I/O, no UI chrome.

**Exports**:
- `createVisualization(container: HTMLElement, vocab: Vocabulary): VizController`
- `VizController` — interface for zoom, pan, select, highlight, destroy

**Validation approach**:
1. Visual regression tests (screenshot comparison)
2. Interaction tests: click → selection state updates
3. Performance benchmarks: 1000 words renders in <100ms
4. Accessibility: keyboard navigation works

**Depends on**: `@arcana/vocabulary`, `d3`

---

### `@arcana/app`

**Intent**: Host the visualization with file loading, search, and detail panel. This is what `arcana serve` serves.

**Exports**: None (entry point only)

**Validation approach**:
1. E2E tests: drop file → visualization renders
2. E2E tests: search filters correctly
3. Integration with viz package
4. Build output is self-contained static files

**Depends on**: `@arcana/vocabulary`, `@arcana/viz`

---

## Yarn 3+ Setup

### `.yarnrc.yml`

```yaml
nodeLinker: pnp
enableGlobalCache: true

plugins:
  - path: .yarn/plugins/@yarnpkg/plugin-typescript.cjs
    spec: "@yarnpkg/plugin-typescript"
  - path: .yarn/plugins/@yarnpkg/plugin-workspace-tools.cjs
    spec: "@yarnpkg/plugin-workspace-tools"
```

### Root `package.json`

```json
{
  "name": "arcana",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "yarn workspaces foreach -Apt run build",
    "test": "vitest",
    "lint": "eslint packages --ext .ts,.tsx",
    "typecheck": "tsc -b packages"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^2.0.0",
    "eslint": "^9.0.0"
  }
}
```

### Package Resolution

Using PnP (Plug'n'Play) for:
- Faster installs (no node_modules)
- Stricter dependency resolution (no phantom deps)
- Better monorepo support

IDE integration via `yarn dlx @yarnpkg/sdks vscode`.

---

## Build Pipeline

```
Source (.ts)
     │
     ▼
┌─────────────┐
│ TypeScript  │  tsc -b (project references)
│ Compile     │
└─────────────┘
     │
     ▼
┌─────────────┐
│ Vitest      │  Unit + integration tests
│ Test        │
└─────────────┘
     │
     ▼
┌─────────────┐
│ Vite        │  Bundle app package only
│ Bundle      │
└─────────────┘
     │
     ▼
   dist/       Static files for arcana serve
```

Library packages (`vocabulary`, `levels`, `phrase`, `viz`) emit ESM. Only `app` bundles for distribution.

---

## File Conventions

```
packages/<name>/
├── package.json
├── tsconfig.json          # extends ../../tsconfig.base.json
├── src/
│   ├── index.ts           # public exports
│   └── *.ts               # implementation
└── test/
    └── *.test.ts          # colocated tests
```

Test files live in `test/` not next to source—keeps `src/` clean for readers.

---

## Integration with C# Extractor

The TypeScript packages don't depend on the C# extractor at runtime. The contract is:

1. C# extractor outputs `vocabulary.json` matching `VocabularySchema`
2. TypeScript tooling consumes that JSON

The Zod schema in `@arcana/vocabulary` is the **single source of truth** for the format. If the schema changes, both sides update.

---

## Open Questions

| Question | Options | Leaning |
|----------|---------|---------|
| Canvas vs SVG for viz? | SVG simpler; Canvas faster | Start SVG, optimize if needed |
| How to serve from CLI? | Embed assets in .NET binary; separate npm package | Embed (single binary) |
| Test visual regressions how? | Playwright; Percy; manual | Playwright screenshots |

---

## Next Steps

1. **Bootstrap workspace** — Set up Yarn, TypeScript, Vitest
2. **Implement `@arcana/vocabulary`** — Schema first, everything builds on this
3. **Implement `@arcana/levels`** — Algorithms, no UI
4. **Implement `@arcana/phrase`** — Simple graph traversal
5. **Implement `@arcana/viz`** — D3 rendering
6. **Implement `@arcana/app`** — Shell around viz
7. **Integrate with C# CLI** — Embed built assets
