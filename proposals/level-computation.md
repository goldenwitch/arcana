# Level Computation

> **Status**: Implemented
> **Created**: 2026-02-03

## Summary

Compute vocabulary levels from a raw composition graph, handling cycles and producing the final leveled vocabulary.

## Problem

After extracting types and compositions from source code, we have a raw graph. We need to compute levels—how many composition steps each word is from primitives. This requires handling the graph topology correctly, including potential cycles.

## Design

### Algorithm

Level computation is a bottom-up traversal:

```
1. Assign level 0 to all primitives (no compositions)
2. For each remaining word:
   Level(w) = 1 + max(Level(c) for c in compositions(w))
3. Process in topological order to ensure dependencies resolve first
```

### Cycle Handling

Mutual dependencies create cycles:

```
class A { B b; }
class B { A a; }
```

Both A and B compose each other. Strategies:

| Strategy | Behavior |
|----------|----------|
| Collapse | Treat cycles as a single "super-word" at one level |
| Break | Assign both the same level (co-dependent) |
| Error | Reject cyclic vocabularies |

**Chosen approach**: Collapse. A strongly connected component (SCC) becomes one word representing the cycle. The cycle's level = 1 + max(level of external compositions).

### Strongly Connected Components

Use Tarjan's or Kosaraju's algorithm to identify SCCs:

1. Find all SCCs in the composition graph
2. For each SCC with >1 word, create a collapsed word
3. Redirect composition edges to/from the collapsed word
4. Compute levels on the resulting DAG

### Level Assignment Flow

```
Raw Graph
    │
    ▼
┌──────────────┐
│ Find SCCs    │
└──────────────┘
    │
    ▼
┌──────────────┐
│ Collapse     │
│ cycles       │
└──────────────┘
    │
    ▼
┌──────────────┐
│ Topological  │
│ sort         │
└──────────────┘
    │
    ▼
┌──────────────┐
│ Assign       │
│ levels       │
└──────────────┘
    │
    ▼
Leveled Vocabulary
```

### Level Statistics

After computation, produce summary statistics:

| Metric | Description |
|--------|-------------|
| Max level | Deepest composition chain |
| Words per level | Distribution across levels |
| Collapsed cycles | Count and members of each SCC |
| Level histogram | Visual distribution |

## Edge Cases

**Empty compositions**: A user type with no fields, no base class, and no interfaces has empty compositions. It sits at level 1 (one step from primitives—its existence is a composition of "nothing" into a named concept).

**Self-reference**: `class Node { Node? next; }` composes itself. This is a trivial SCC—the type sits at one level, self-contained.

**Deep chains**: A → B → C → D → ... → Z produces level = depth. No special handling needed.

## Scope

**In scope:**
- Topological sort of composition graph
- Strongly connected component detection
- Cycle collapse strategy
- Level assignment algorithm
- Level statistics

**Out of scope:**
- Graph extraction (see: roslyn-type-extraction)
- Visualization of levels (see: d3-visualization)

## Dependencies

- [vocabulary-model](vocabulary-model.md): Defines level semantics
