# Roslyn Type Extraction

> **Status**: Implemented
> **Created**: 2026-02-03

## Summary

Extract vocabulary words from a .NET solution using Roslyn semantic analysis.

## Problem

To build a vocabulary from a codebase, we need to discover all types and their compositional relationships. .NET solutions require parsing C# source files and resolving type information to understand dependencies accurately.

## Design

### Solution Discovery

Given a folder path, the extractor:

1. Finds `.sln` files (or `.csproj` if no solution)
2. Opens the solution via Roslyn workspace API
3. Iterates all projects and their documents

### Type Discovery

For each document, walk the semantic model to find:

| Symbol Kind | Extraction |
|-------------|------------|
| Named types | Classes, structs, records, interfaces, enums |
| Type parameters | Track open generic definitions |
| Constructed generics | Track closed instantiations |

### Composition Extraction

For each discovered type, extract composition relationships:

```
Type Symbol
├── Base type (if any)
├── Implemented interfaces
├── Field types
├── Property types
├── Method parameter types
└── Method return types
```

### Handling Generics

**Open generics**: When a type declares type parameters (`class Repository<T>`), record it as an open generic word.

**Closed generics**: When a type is used with concrete arguments (`Repository<User>`), record as a composition of the open generic plus the type arguments.

**Nested generics**: `Dictionary<string, List<User>>` composes:
- `Dictionary<,>` (open)
- `string` (primitive)
- `List<User>` (which itself composes `List<>` + `User`)

### External Types

Types from external assemblies (BCL, NuGet packages) are included as words but marked as external. They participate in composition but are not analyzed internally.

Classification:
- System types (`System.*`) → primitive or BCL
- Package types → external
- Solution types → user

### Output

The extractor produces a raw graph of:
- All discovered words (type symbols)
- All composition edges (dependency relationships)
- Metadata (source locations, external markers)

Level computation happens in a separate phase (see: level-computation).

## Process Flow

```
Solution Path
     │
     ▼
┌─────────────┐
│ Find .sln   │
└─────────────┘
     │
     ▼
┌─────────────┐
│ Open with   │
│ Roslyn      │
└─────────────┘
     │
     ▼
┌─────────────┐
│ Walk each   │
│ document    │
└─────────────┘
     │
     ▼
┌─────────────┐
│ Extract     │
│ type symbols│
└─────────────┘
     │
     ▼
┌─────────────┐
│ Extract     │
│ compositions│
└─────────────┘
     │
     ▼
Raw Word Graph
```

## Scope

**In scope:**
- Solution/project discovery
- Type symbol extraction via Roslyn
- Composition relationship extraction
- Generic handling (open and closed)
- External type classification

**Out of scope:**
- Level computation (see: level-computation)
- Method body analysis (may surface too many transient dependencies)
- Attribute analysis

## Dependencies

- [vocabulary-model](vocabulary-model.md): Defines word and composition structures
