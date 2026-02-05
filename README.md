# Arcana

Visualize the semantic vocabulary of a .NET solution as a leveled composition graph.

## What It Does

Arcana transforms a .NET codebase into a **vocabulary**—a visual map showing how primitive types compose into domain abstractions. Think of it as an X-ray of your solution's conceptual architecture.

**The model:**

| Term | Definition |
|------|------------|
| **Word** | A type in the solution (class, struct, record, interface, enum) |
| **Level** | Composition depth from primitives. Level 0 = primitives (`int`, `string`). Level N = 1 + max(level of dependencies) |
| **Composition** | How types depend on other types through inheritance, fields, properties, and method signatures |

**The insight:** Scrolling up through levels reveals how low-level concepts combine into domain abstractions. The vocabulary graph exposes the conceptual architecture of your solution.

## Quick Start

### Prerequisites

- .NET 10 SDK
- Node.js 20+
- Yarn 4+

### Extract a Vocabulary

```bash
cd cli

# Analyze a .NET solution
dotnet run --project src/Arcana.Cli -- "path/to/Your.sln" -o vocabulary.json

# With statistics
dotnet run --project src/Arcana.Cli -- "path/to/Your.sln" -o vocabulary.json --stats
```

The CLI accepts:
- A `.sln` file directly
- A `.csproj` file
- A folder containing either (auto-discovers)

### View the Visualization

```bash
# Install dependencies (from repo root)
yarn install

# Build all packages
yarn build

# Start the development server
cd packages/app
yarn dev
```

Open http://localhost:5173, then drag-and-drop your `vocabulary.json` file onto the page.

**Interaction:**
- **Scroll/pinch** to zoom
- **Click and drag** to pan
- **Hover** over a word to highlight its composition edges
- **Click** a word to see details (dependencies, dependents)
- **Search** to filter words by name

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   CLI (C#)      │         │   SPA (TS)      │
│                 │  JSON   │                 │
│  Roslyn spider  │────────▶│  D3 level-scroll│
│  → vocabulary   │         │  visualization  │
│  → levels       │         │                 │
└─────────────────┘         └─────────────────┘
```

### CLI (`cli/`)

| Project | Purpose |
|---------|---------|
| `Arcana.Cli` | Command-line interface |
| `Arcana.Extraction` | Roslyn-based type extraction |
| `Arcana.Levels` | Level computation (Tarjan's SCC algorithm) |
| `Arcana.Vocabulary` | Data model and serialization |

### SPA (`packages/`)

| Package | Purpose |
|---------|---------|
| `@arcana/vocabulary` | Core model + Zod validation |
| `@arcana/levels` | Level computation (TypeScript) |
| `@arcana/phrase` | Filter to entry points and dependencies |
| `@arcana/viz` | D3.js visualization component |
| `@arcana/app` | SPA shell with file loading and search |

## Data Model

```json
{
  "words": [
    {
      "id": "MyApp.UserId",
      "name": "UserId",
      "kind": "user",
      "level": 1,
      "composedOf": ["System.Int32"]
    },
    {
      "id": "MyApp.User",
      "name": "User",
      "kind": "user",
      "level": 2,
      "composedOf": ["MyApp.UserId", "System.String"]
    }
  ],
  "metadata": {
    "source": "/path/to/solution",
    "extracted": "2026-02-04T10:30:00Z"
  }
}
```

### Word Kinds

| Kind | Description | Level |
|------|-------------|-------|
| `primitive` | Built-in types | 0 |
| `generic` | Open generic definitions (`List<>`) | 0 |
| `constructed` | Instantiated generics (`List<User>`) | 1 + max(type args) |
| `user` | User-defined types | 1 + max(dependencies) |

## Project Structure

```
arcana/
├── cli/                  # C# CLI - Roslyn analyzer
│   └── src/
│       ├── Arcana.Cli/
│       ├── Arcana.Extraction/
│       ├── Arcana.Levels/
│       └── Arcana.Vocabulary/
├── packages/             # TypeScript SPA
│   ├── app/              # Main application
│   ├── levels/           # Level computation
│   ├── phrase/           # Vocabulary filtering
│   ├── viz/              # D3 visualization
│   └── vocabulary/       # Core model
├── guidelines/           # Development guidelines
├── prompts/              # Agent prompt templates
└── proposals/            # Feature proposals
```

## Building

### CLI

```bash
cd cli
dotnet build           # Debug build
dotnet build -c Release # Release build
dotnet test            # Run tests
```

### SPA

```bash
# From repo root
yarn install           # Install dependencies
yarn build             # Build all packages
yarn test              # Run tests
```

## Design Decisions

**Visualization**: D3.js with vertical stack layout. Each level is a horizontal row; zoom and pan to navigate. Edges connect words to their compositions in lower levels.

**Generics**: Open generic types (`List<>`, `Dictionary<,>`) are words at level 0. Closed constructed types (`List<User>`) are compositions of the open type + its type arguments. This reveals how generic templates get instantiated across the codebase.

**Cycle Handling**: Uses Tarjan's algorithm for strongly connected components. Types in a cycle share the same level.
