# UX Improvements

> **Status**: Implemented
> **Created**: 2026-02-04

## Summary

Improve the SPA's usability with vocabulary metadata display, a recent files history, and visual clarity enhancements.

## Problem

After validating the e2e flow, several UX gaps emerged:

| Issue | Impact |
|-------|--------|
| No vocabulary context | Users see "Arcana" but don't know what's loaded |
| No history | Must re-navigate to files each session |
| Dense visualization | 1000+ nodes overwhelm without guidance |
| Undocumented colors | Users guess what green vs blue means |

## Design

### Vocabulary Context Header

Display loaded vocabulary metadata prominently:

```
┌──────────────────────────────────────────────────────────┐
│  Arcana                                    [Load ▾]      │
│  Coven.sln · 1033 words · 8 levels                       │
└──────────────────────────────────────────────────────────┘
```

The subtitle shows:
- Source name (from `metadata.source`, basename only)
- Word count
- Max level

### Recent Files History

Store vocabulary metadata in localStorage for quick re-access:

```typescript
interface RecentFile {
  /** Display name (filename) */
  name: string;
  /** Original source path from vocabulary metadata */
  source: string;
  /** Word count */
  wordCount: number;
  /** Max level */
  maxLevel: number;
  /** When this file was loaded */
  loadedAt: string; // ISO timestamp
}
```

**Storage key**: `arcana:recent-files`
**Max entries**: 10 (FIFO eviction)

**UI**: Dropdown from Load button showing recent files. Clicking an entry opens the file picker (browser security prevents direct file access). The entry helps users remember which file to select.

```
┌─────────────────────────────────────────┐
│  ▾ Recent Files                         │
├─────────────────────────────────────────┤
│  coven-vocabulary.json                  │
│  Coven.sln · 1033 words · 2 min ago     │
├─────────────────────────────────────────┤
│  coven-tooling-vocabulary.json          │
│  Coven.sln · 687 words · 15 min ago     │
├─────────────────────────────────────────┤
│  Browse...                              │
└─────────────────────────────────────────┘
```

### Legend

Add a small legend to clarify visual encoding:

```
┌────────────────────────────────┐
│ ● User type  ● Primitive/BCL  │
└────────────────────────────────┘
```

Position: Bottom-left corner, semi-transparent, doesn't obscure visualization.

### Level Navigation

Make the level indicator interactive:

| Interaction | Action |
|-------------|--------|
| Click level N | Pan/zoom to center that level |
| Hover level N | Show "N words at level X" tooltip |

Display as clickable pills:

```
Levels: [0] [1] [2] [3] [4] [5] [6] [7] [8]
         86  200 150 243 144 110  76  21   3
```

## Implementation

### Phase 1: Metadata Display
- Extract source basename from `vocabulary.metadata.source`
- Add subtitle element to header component
- Update on vocabulary load

### Phase 2: Recent Files
- Create `src/storage/recent-files.ts` module
- Add `addRecentFile()`, `getRecentFiles()`, `clearRecentFiles()`
- Create dropdown component attached to Load button
- Wire up: on load → save to history

### Phase 3: Legend
- Create `src/components/legend.ts`
- Position absolutely in visualization container
- Style with CSS for unobtrusiveness

### Phase 4: Level Navigation (Optional)
- Extend controls component with clickable level pills
- Wire to `vizController.panToLevel(n)` (requires viz API extension)

## Scope

**In scope:**
- Vocabulary metadata in header
- Recent files list with localStorage
- Color legend
- Level indicator enhancement

**Out of scope:**
- File System Access API (browser compat concerns)
- Persistent file handles across sessions
- Cloud sync of history

## Dependencies

- [spa-integration](spa-integration.md): Base application shell
- [vocabulary-model](vocabulary-model.md): Metadata schema
