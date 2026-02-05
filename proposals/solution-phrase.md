# Solution Phrase

> **Status**: Implemented
> **Created**: 2026-02-03

## Summary

A solution phrase selects a subset of vocabulary by specifying entry points and including their transitive dependencies.

## Problem

A full vocabulary may contain hundreds or thousands of words. When trying to understand a specific concern (e.g., "what concepts does OrderService depend on?"), the full vocabulary overwhelms. We need a way to filter down to the relevant subset.

## Design

### Solution Phrase

A **solution phrase** is a subset of vocabulary words computed from:

| Component | Description |
|-----------|-------------|
| Entry points | One or more word names that define the concern |
| Closure | All words transitively composed by entry points |

Given entry points, the closure includes every word reachable by following composition edges downward.

### Example

Full vocabulary with 50 words across 5 levels. Specifying `OrderService` as the entry point yields a phrase containing only the words `OrderService` composes:

```
Full vocabulary:              Phrase for OrderService:

Level 4:  ○ ○ ○ ○ ○           Level 4:  ●
Level 3:  ○ ○ ○ ○ ○ ○ ○       Level 3:  ● ●
Level 2:  ○ ○ ○ ○ ○ ○ ○ ○     Level 2:  ● ●
Level 1:  ○ ○ ○ ○ ○ ○ ○ ○ ○   Level 1:  ● ● ●
Level 0:  ○ ○ ○ ○ ○           Level 0:  ● ●

(● = words in phrase)
```

The phrase is visualized the same way as the full vocabulary—a vertical stack of levels—but with only the relevant words shown.

## Scope

**In scope:**
- Solution phrase definition (entry points + closure)
- Closure computation algorithm

**Out of scope:**
- Query patterns or advanced filtering

## Dependencies

- [vocabulary-model](vocabulary-model.md): Defines words, levels, and composition that phrases operate on
