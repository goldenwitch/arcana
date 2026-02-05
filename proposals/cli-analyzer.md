# CLI Analyzer

> **Status**: Implemented
> **Created**: 2026-02-03

## Summary

A .NET command-line tool that analyzes a solution and outputs a vocabulary JSON file.

## Problem

Users need one thing from the CLI: point at a .NET solution, get a vocabulary file. Everything else—visualization, exploration, filtering—happens in the browser.

## Design

### Command

```
arcana <path> [options]

Arguments:
  path    Path to solution folder, .sln file, or .csproj file

Options:
  -o, --output <file>    Output path (default: stdout)
  --stats                Print level statistics to stderr
```

No subcommands. One job: extract vocabulary.

### Output Format

JSON output:

```
{
  "metadata": {
    "source": "/path/to/solution",
    "extracted": "2026-02-03T10:30:00Z",
    "stats": {
      "totalWords": 150,
      "maxLevel": 7,
      "collapsedCycles": 2
    }
  },
  "vocabulary": [
    {
      "id": "w1",
      "name": "UserId",
      "kind": "user",
      "level": 1,
      "composedOf": ["int"],
      "location": "src/Domain/UserId.cs"
    }
  ]
}
```

### Error Handling

| Condition | Behavior |
|-----------|----------|
| Path not found | Exit 1, error message |
| No solution/project found | Exit 1, suggest valid paths |
| Roslyn parse errors | Warn to stderr, continue with valid files |
| Circular dependency | Warn about collapsed cycles, continue |

### Progress Reporting

For large solutions, report progress to stderr:

```
Discovering projects... 12 found
Analyzing src/Domain... 45 types
Analyzing src/Application... 120 types
Computing levels... done
Writing vocabulary.json... 165 words, max level 6
```

## Process Flow

```
arcana ./solution -o vocabulary.json
         │
         ▼
┌─────────────────┐
│ Resolve path    │
│ to .sln/.csproj │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Extract types   │
│ (Roslyn)        │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Compute levels  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Serialize JSON  │
└─────────────────┘
         │
         ▼
   vocabulary.json
```

## Scope

**In scope:**
- CLI argument parsing
- Path resolution
- Orchestrating extraction and level computation
- JSON serialization to stdout or file
- Progress and error reporting to stderr

**Out of scope:**
- Serving or hosting visualization (see: spa-integration)
- Type extraction implementation (see: roslyn-type-extraction)
- Level computation implementation (see: level-computation)

## Dependencies

- [roslyn-type-extraction](roslyn-type-extraction.md): Provides type extraction
- [level-computation](level-computation.md): Provides level assignment
