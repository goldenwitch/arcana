# Phrase-Focused Layout

> **Status**: Draft
> **Created**: 2026-02-04

## Summary

When a word is clicked to add it to the phrase, the visualization reorders nodes within each level to cluster phrase members together and push unrelated nodes away—using a physical simulation metaphor.

## Problem

Currently, when selecting a word as a phrase entry point, the visualization highlights the phrase members but leaves all nodes in their original positions. This makes it hard to trace the compositional structure of the phrase because its members are scattered horizontally across each level, interleaved with unrelated words.

**Current behavior:**
```
Level 3:  ○ ● ○ ○ ● ○ ○     (phrase members scattered)
Level 2:  ○ ○ ● ○ ○ ● ○ ○
Level 1:  ● ○ ○ ● ○ ○ ○ ●
Level 0:  ○ ● ○ ○ ● ○
```

**Desired behavior:**
```
Level 3:  ● ●       ○ ○ ○ ○   (phrase members clustered, others pushed aside)
Level 2:  ● ●       ○ ○ ○ ○
Level 1:  ● ● ●     ○ ○ ○ ○
Level 0:  ● ●       ○ ○ ○ ○
```

## Design

### Physical Simulation Metaphor

The layout uses a **magnetic attraction/repulsion** model:

| Force | Applied To | Effect |
|-------|-----------|--------|
| **Attraction** | Phrase members | Pull toward the phrase centroid |
| **Repulsion** | Non-phrase nodes | Push away from phrase members |
| **Constraint** | All nodes | Stay on their assigned level (Y fixed) |

This creates the visual effect of the phrase "crystallizing" into a compact structure while unrelated nodes scatter to the periphery.

### Force Parameters

```typescript
interface PhraseFocusOptions {
  /** Attraction strength for phrase members (0-1) */
  phraseAttraction: number;
  /** Repulsion strength pushing non-phrase nodes away (0-1) */
  nonPhraseRepulsion: number;
  /** Animation duration in milliseconds */
  animationDuration: number;
  /** Minimum gap between phrase cluster and other nodes */
  separationGap: number;
}
```

Default values:
- `phraseAttraction`: 0.8
- `nonPhraseRepulsion`: 0.6
- `animationDuration`: 500
- `separationGap`: 60 (pixels)

### Layout Algorithm

**Phase 1: Identify phrase members**
1. Compute transitive closure from entry point(s)
2. Mark all phrase member IDs

**Phase 2: Compute target positions**
For each level:
1. Partition nodes into phrase members and non-members
2. Position phrase members in a tight cluster at center-left
3. Position non-members to the right with separation gap
4. Maintain original relative ordering within each group

**Phase 3: Animate transition**
1. Use D3 transitions to smoothly move nodes to target positions
2. Update edge paths during animation
3. Optionally fade non-phrase nodes to reduced opacity

### Visual Treatment

| Element | In Phrase | Outside Phrase |
|---------|-----------|----------------|
| Node opacity | 1.0 | 0.4 |
| Node stroke | Bold | Thin |
| Edge opacity | 1.0 | 0.15 |
| Label visibility | Always | On hover only |

### Edge Routing

With nodes clustered, edges need adjustment:
- **Phrase edges**: Route normally, composition flows clearly
- **Cross edges**: Edges between phrase and non-phrase nodes use longer curves
- **External edges**: Edges entirely outside phrase are dimmed

### Interaction States

```
┌─────────────────┐     Click word      ┌──────────────────┐
│  Default View   │ ─────────────────▶  │  Phrase Focused  │
│  (all visible)  │                     │  (clustered)     │
└─────────────────┘                     └──────────────────┘
        ▲                                       │
        │         Click background              │
        └───────────────────────────────────────┘
                  or clear selection
```

**Click a word** → Add to phrase, trigger clustering animation
**Click another word** → Replace phrase entry (or extend if shift-held)
**Click background** → Clear phrase, animate back to default layout
**Search** → Highlight matches but don't affect layout

### Animation

Smooth transitions using D3:
```typescript
nodes.transition()
  .duration(options.animationDuration)
  .ease(d3.easeCubicOut)
  .attr("transform", d => `translate(${d.targetX}, ${d.y})`);
```

Edges animate simultaneously, redrawing curves as nodes move.

## API Changes

### VizController additions

```typescript
interface VizController {
  // ... existing methods ...

  /** 
   * Focus visualization on a phrase defined by entry points.
   * Clusters phrase members and pushes others aside.
   */
  focusPhrase(entryPointIds: string[]): void;

  /**
   * Clear phrase focus, return to default layout.
   */
  clearFocus(): void;

  /**
   * Configure phrase focus behavior.
   */
  setFocusOptions(options: Partial<PhraseFocusOptions>): void;
}
```

### Events

```typescript
interface VizController {
  /** Subscribe to phrase focus changes */
  onFocusChange(callback: (entryPointIds: string[]) => void): () => void;
}
```

## Implementation

### New files

| File | Purpose |
|------|---------|
| `packages/viz/src/phrase-layout.ts` | Phrase-focused position computation |
| `packages/viz/src/forces.ts` | Force simulation utilities |

### Modified files

| File | Changes |
|------|---------|
| `packages/viz/src/types.ts` | Add `PhraseFocusOptions`, extend `VizController` |
| `packages/viz/src/renderer.ts` | Handle phrase focus state, animate transitions |
| `packages/viz/src/layout.ts` | Export utilities for position calculation |

### Algorithm detail

```typescript
function computePhraseFocusedLayout(
  vocab: Vocabulary,
  phraseIds: Set<string>,
  baseLayout: LayoutResult,
  options: PhraseFocusOptions
): Map<string, { x: number; y: number }> {
  const result = new Map();
  const levelGroups = groupByLevel(vocab.words);

  for (const [level, words] of levelGroups) {
    const phraseWords = words.filter(w => phraseIds.has(w.id));
    const otherWords = words.filter(w => !phraseIds.has(w.id));

    // Phrase words cluster on the left
    const phraseStartX = -((phraseWords.length - 1) * nodeSpacing) / 2 - separationGap;
    phraseWords.forEach((w, i) => {
      result.set(w.id, { x: phraseStartX + i * nodeSpacing, y: levelY });
    });

    // Other words go to the right
    const otherStartX = phraseStartX + phraseWords.length * nodeSpacing + separationGap;
    otherWords.forEach((w, i) => {
      result.set(w.id, { x: otherStartX + i * nodeSpacing, y: levelY });
    });
  }

  return result;
}
```

## Scope

**In scope:**
- Phrase member clustering within levels
- Smooth animation between layouts  
- Visual dimming of non-phrase elements
- API for programmatic phrase focus

**Out of scope:**
- Full force-directed layout (Y positions remain fixed by level)
- Multiple simultaneous phrase foci
- Saved/named phrases

## Dependencies

- [solution-phrase](solution-phrase.md): Provides phrase computation logic
- [d3-visualization](d3-visualization.md): Base visualization being extended

## Open Questions

| Question | Options | Leaning |
|----------|---------|---------|
| Keep original X ordering within groups? | Yes (stable) / No (optimize for edge length) | Yes—predictable |
| Allow extending phrase with shift-click? | Yes / No | Yes—common pattern |
| Animate edges during transition? | Smooth morph / Instant redraw | Smooth morph |
