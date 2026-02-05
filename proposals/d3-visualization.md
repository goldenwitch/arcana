# D3 Visualization

> **Status**: Implemented
> **Created**: 2026-02-03

## Summary

An interactive D3.js visualization that renders a vocabulary as a vertical stack of levels with zoom and pan navigation.

## Problem

A vocabulary JSON file is not human-readable at scale. We need an interactive visualization that reveals the compositional structure—how primitive concepts build into domain abstractions—and allows exploration at different levels of detail.

## Design

### Layout

**Vertical stack**: Each level is a horizontal row. Level 0 at the bottom, highest level at the top. Words within a level are arranged horizontally.

```
Level 4  ┌─────────────────────────────────────┐
         │  ○ UserService    ○ OrderService    │
         └─────────────────────────────────────┘
                    │                │
Level 3  ┌─────────────────────────────────────┐
         │  ○ UserRepo  ○ OrderRepo  ○ ...     │
         └─────────────────────────────────────┘
                    │        │
Level 2  ┌─────────────────────────────────────┐
         │  ○ User  ○ Order  ○ Product  ○ ...  │
         └─────────────────────────────────────┘
                 │      │
Level 1  ┌─────────────────────────────────────┐
         │  ○ UserId  ○ OrderId  ○ Money ○ ... │
         └─────────────────────────────────────┘
                 │
Level 0  ┌─────────────────────────────────────┐
         │  ○ int  ○ string  ○ decimal  ○ ...  │
         └─────────────────────────────────────┘
```

### Edges

Composition edges connect words to their dependencies:
- Edges flow downward (from composed to composer)
- Edges are drawn as curves to avoid overlap

### Navigation

**Zoom**: Scroll wheel or pinch to zoom in/out. Zooming in reveals more detail (full type names). Zooming out shows the overall shape.

**Pan**: Click and drag to pan across the vocabulary. Large codebases will extend beyond the viewport.

### Interaction

**Hover**: Highlight a word and all its composition edges (both up and down). Show tooltip with word details.

**Click**: Select a word. Show detail panel with:
- Full name and kind
- What it composes (dependencies)
- What composes it (dependents)
- Source location (if available)

**Search**: Text input to filter/highlight words by name. Matching words pulse or highlight.

### Visual Encoding

| Element | Encoding |
|---------|----------|
| Word (node) | Circle |
| Primitive | Distinct color (e.g., gray) |
| External | Distinct color (e.g., blue) |
| User type | Distinct color (e.g., green) |
| Collapsed cycle | Special shape (e.g., hexagon) |
| Composition edge | Curved line, downward |

### Rendering Strategy

For large vocabularies (1000+ words):
- Use canvas rendering for performance (D3 + canvas)
- Level-of-detail: hide labels when zoomed out, show on zoom
- Virtualize: only render visible portion plus buffer
- Progressive loading: render level-by-level

## Data Requirements

The visualization consumes vocabulary JSON with:
- Word id, name, kind, level
- Composition relationships (composedOf array)
- Optional: location, statistics

## Scope

**In scope:**
- Vertical stack layout algorithm
- Zoom and pan controls
- Edge rendering with curves
- Hover and click interactions
- Search/filter
- Performance optimization for large graphs

**Out of scope:**
- Alternative layouts (force-directed, radial)
- Vocabulary editing
- Real-time updates
- Comparison of multiple vocabularies

## Dependencies

- [vocabulary-model](vocabulary-model.md): Defines data schema consumed by visualization
