# Vocabulary Model

> **Status**: Implemented
> **Created**: 2026-02-03

## Summary

Define the core data model for representing a codebase as a leveled vocabulary of composable semantic words.

## Problem

Codebases are typically understood through their file structure or dependency graphs. Neither reveals the **conceptual architecture**—how primitive ideas compose into domain abstractions. We need a model that captures this compositional structure.

## Design

### Words

A **word** is a semantic unit in the vocabulary. In the context of .NET, words are types:

| Word Kind | Examples |
|-----------|----------|
| Primitive | `int`, `string`, `bool`, `void` |
| BCL Type | `List<>`, `Dictionary<,>`, `Task<>` |
| User Type | Classes, structs, records, interfaces, enums |

Each word has:
- **Identity**: Unique identifier within the vocabulary
- **Name**: Human-readable display name
- **Kind**: Primitive, generic template, or constructed type
- **Compositions**: The words this word is composed of

### Composition

A word **composes** other words when it depends on them structurally:

| Composition Source | Example |
|--------------------|---------|
| Base class | `class Admin : User` → Admin composes User |
| Interface | `class Repo : IRepository` → Repo composes IRepository |
| Field/property type | `User { Name: string }` → User composes string |
| Method signature | `GetUser(int id): User` → composes int, User |
| Generic instantiation | `List<User>` composes `List<>` and `User` |

### Levels

Every word has a **level** indicating its depth in the composition hierarchy:

```
Level(w) = 0                           if w is primitive
Level(w) = 1 + max(Level(c) for c in compositions(w))   otherwise
```

Words at level 0 are irreducible. Words at level N are exactly N composition steps from primitives.

### Generics

Open generic types (`List<>`, `Dictionary<,>`) are words at level 0—they are primitive templates.

Closed constructed types are compositions:
- `List<User>` composes `List<>` + `User`
- Level = 1 + max(Level(`List<>`), Level(`User`)) = 1 + max(0, N) = N + 1

This reveals which generic templates are instantiated and with what types.

### Vocabulary

A **vocabulary** is the complete set of words extracted from a codebase, with their composition relationships and computed levels.

For filtering a vocabulary to a subset of words, see [solution-phrase](solution-phrase.md).

## Data Schema

The vocabulary serializes to a structure containing:

```
Vocabulary
├── words[]
│   ├── id: unique identifier
│   ├── name: display name
│   ├── kind: "primitive" | "generic" | "constructed" | "user"
│   ├── level: computed depth
│   └── composedOf: id[] of composed words
└── metadata
    ├── source: path to analyzed solution
    └── extracted: timestamp
```

## Scope

**In scope:**
- Core model definitions (word, composition, level)
- Serialization schema
- Level computation algorithm

**Out of scope:**
- Extraction from source code (see: roslyn-type-extraction)
- Visualization (see: d3-visualization)
- CLI interface (see: cli-analyzer)

## Dependencies

None. This is the foundational proposal.
