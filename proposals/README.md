# Proposals

Feature proposals for Arcana.

## Active Proposals

| Proposal | Status | Dependencies | Description |
|----------|--------|--------------|-------------|
| [vocabulary-model](vocabulary-model.md) | ✅ Implemented | — | Core data model for words, levels, and composition |
| [roslyn-type-extraction](roslyn-type-extraction.md) | ✅ Implemented | vocabulary-model | Extract types from .NET solutions via Roslyn |
| [level-computation](level-computation.md) | ✅ Implemented | vocabulary-model | Compute levels from composition graph |
| [cli-analyzer](cli-analyzer.md) | ✅ Implemented | roslyn-type-extraction, level-computation | .NET CLI: solution → vocabulary.json |
| [d3-visualization](d3-visualization.md) | ✅ Implemented | vocabulary-model | D3.js vertical stack visualization |
| [spa-integration](spa-integration.md) | ✅ Implemented | vocabulary-model, d3-visualization | Web app (all UX lives here) |
| [solution-phrase](solution-phrase.md) | Draft | vocabulary-model | Filter vocabulary to entry points and their dependencies |
| [ux-improvements](ux-improvements.md) | Draft | spa-integration | Recent files, metadata display, visual clarity |

## Architecture

Two independent artifacts:

```
┌─────────────────────────────────────┐
│           .NET CLI (arcana)         │
│                                     │
│  roslyn-type-extraction             │
│         +                           │
│  level-computation                  │
│         ↓                           │
│    vocabulary.json                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         TypeScript SPA              │
│                                     │
│  vocabulary.json → d3-visualization │
│         +                           │
│  solution-phrase (filtering)        │
│         +                           │
│  all user interaction               │
└─────────────────────────────────────┘
```

The CLI produces files. The SPA consumes them. No coupling.

## Implementation Order

1. ✅ **vocabulary-model** — Foundation, shared schema
2. ✅ **roslyn-type-extraction** + **level-computation** — .NET extraction pipeline
3. ✅ **cli-analyzer** — Thin wrapper: path → JSON
4. ✅ **d3-visualization** — TypeScript visualization
5. ✅ **spa-integration** — Host app for the visualization
6. **solution-phrase** — Entry point filtering (TypeScript)
7. **ux-improvements** — Recent files, metadata display, legend
