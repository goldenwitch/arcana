# SPA Integration

> **Status**: Implemented
> **Created**: 2026-02-03

## Summary

A TypeScript single-page application that hosts the D3 visualization. This is where all user interaction happens—the CLI only produces vocabulary JSON.

## Problem

The CLI extracts a vocabulary file. Users need a way to visualize, explore, and understand that vocabulary. The SPA is the entire UX layer.

## Design

### Application Shell

```
┌──────────────────────────────────────────────────┐
│  Arcana                          [Load] [Stats]  │  ← Header
├──────────────────────────────────────────────────┤
│                                                  │
│                                                  │
│              D3 Visualization                    │  ← Main area
│                                                  │
│                                                  │
├──────────────────────────────────────────────────┤
│  Search: [____________]   Level: 3/7   Words: 45 │  ← Controls
└──────────────────────────────────────────────────┘
```

### File Loading

**Drag and drop**: Drop a vocabulary.json onto the window to load.

**File picker**: "Load" button opens system file picker.

**URL parameter**: `?file=path/to/vocabulary.json` loads a file served from the same origin.

### UI Components

| Component | Purpose |
|-----------|---------|
| Header | App title, load button |
| Visualization | D3 canvas (see: d3-visualization) |
| Controls bar | Search, current level indicator, word count |
| Detail panel | Slide-out panel showing selected word info |

### State Management

Application state:
- Currently loaded vocabulary (or null)
- Selected word (or null)
- Search query
- Viewport (zoom level, pan position)
- UI state (detail panel open)

### Technology Choices

| Concern | Choice |
|---------|--------|
| Language | TypeScript |
| Build | Vite |
| Framework | Vanilla or lightweight (Preact/Solid) |
| Visualization | D3.js |
| Styling | CSS modules or Tailwind |

Keep dependencies minimal. The visualization is the product; the shell is scaffolding.

### Development Server

`npm run dev` starts Vite dev server with hot reload.

`npm run build` produces static assets in `dist/` that can be hosted anywhere.

Typical workflow:
1. Run `arcana ./my-solution -o vocabulary.json` to extract
2. Open the app and drop the file in, or serve both from the same origin

## Process Flow

```
User loads vocabulary.json
         │
         ▼
┌─────────────────┐
│ Parse JSON      │
│ Validate schema │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Initialize D3   │
│ visualization   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Render initial  │
│ viewport        │
└─────────────────┘
         │
         ▼
   Interactive exploration
```

## Scope

**In scope:**
- Application shell and layout
- File loading (drop, picker, URL)
- UI components (header, controls, detail panel)
- State management
- Build configuration
- Responsive layout

**Out of scope:**
- D3 visualization implementation (see: d3-visualization)
- Vocabulary editing
- User accounts or persistence
- Multiple vocabulary comparison

## Dependencies

- [vocabulary-model](vocabulary-model.md): Defines the JSON schema consumed by the app
- [d3-visualization](d3-visualization.md): Provides the visualization component
