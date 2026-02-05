import { describe, it, expect } from "vitest";
import { reachableFrom, computePhrase } from "../src/index.js";
import type { Vocabulary, Word } from "@arcana/vocabulary";

// Helper to create test vocabularies
function createVocabulary(words: Word[]): Vocabulary {
  return {
    words,
    metadata: { source: "test.sln", extracted: "2026-02-03T00:00:00Z" },
  };
}

// Standard test vocabulary
const standardVocab = createVocabulary([
  { id: "int", name: "int", kind: "primitive", level: 0, composedOf: [] },
  { id: "string", name: "string", kind: "primitive", level: 0, composedOf: [] },
  { id: "bool", name: "bool", kind: "primitive", level: 0, composedOf: [] },
  {
    id: "User",
    name: "User",
    kind: "user",
    level: 1,
    composedOf: ["int", "string"],
  },
  {
    id: "Order",
    name: "Order",
    kind: "user",
    level: 2,
    composedOf: ["User", "int"],
  },
  {
    id: "Unrelated",
    name: "Unrelated",
    kind: "user",
    level: 1,
    composedOf: ["string"],
  },
]);

describe("reachableFrom", () => {
  it("returns empty set for non-existent word", () => {
    const result = reachableFrom(standardVocab, "nonexistent");
    expect(result.size).toBe(0);
  });

  it("returns only the word itself for a primitive (leaf)", () => {
    const result = reachableFrom(standardVocab, "int");
    expect(result).toEqual(new Set(["int"]));
  });

  it("returns word and its compositions for level 1 word", () => {
    const result = reachableFrom(standardVocab, "User");
    expect(result).toEqual(new Set(["User", "int", "string"]));
  });

  it("returns full transitive closure for level 2 word", () => {
    const result = reachableFrom(standardVocab, "Order");
    // Order -> User, int -> string (User composes int, string)
    expect(result).toEqual(new Set(["Order", "User", "int", "string"]));
  });

  it("handles empty vocabulary", () => {
    const emptyVocab = createVocabulary([]);
    const result = reachableFrom(emptyVocab, "anything");
    expect(result.size).toBe(0);
  });

  it("handles self-referential word without infinite loop", () => {
    const selfRefVocab = createVocabulary([
      { id: "A", name: "A", kind: "user", level: 0, composedOf: ["A"] },
    ]);
    const result = reachableFrom(selfRefVocab, "A");
    expect(result).toEqual(new Set(["A"]));
  });

  it("handles circular references without infinite loop", () => {
    const circularVocab = createVocabulary([
      { id: "A", name: "A", kind: "user", level: 0, composedOf: ["B"] },
      { id: "B", name: "B", kind: "user", level: 0, composedOf: ["A"] },
    ]);
    const result = reachableFrom(circularVocab, "A");
    expect(result).toEqual(new Set(["A", "B"]));
  });

  it("ignores references to non-existent words", () => {
    const partialVocab = createVocabulary([
      {
        id: "User",
        name: "User",
        kind: "user",
        level: 1,
        composedOf: ["int", "missing"],
      },
      { id: "int", name: "int", kind: "primitive", level: 0, composedOf: [] },
    ]);
    const result = reachableFrom(partialVocab, "User");
    expect(result).toEqual(new Set(["User", "int"]));
  });
});

describe("computePhrase", () => {
  describe("basic cases", () => {
    it("returns full vocabulary when root entry reaches all words", () => {
      // Create a vocab where one root reaches everything
      const connectedVocab = createVocabulary([
        { id: "int", name: "int", kind: "primitive", level: 0, composedOf: [] },
        {
          id: "string",
          name: "string",
          kind: "primitive",
          level: 0,
          composedOf: [],
        },
        {
          id: "User",
          name: "User",
          kind: "user",
          level: 1,
          composedOf: ["int", "string"],
        },
        {
          id: "Root",
          name: "Root",
          kind: "user",
          level: 2,
          composedOf: ["User"],
        },
      ]);

      const phrase = computePhrase(connectedVocab, ["Root"]);
      expect(phrase.words).toHaveLength(4);
      expect(phrase.words.map((w) => w.id).sort()).toEqual([
        "Root",
        "User",
        "int",
        "string",
      ]);
    });

    it("returns single word for leaf entry point", () => {
      const phrase = computePhrase(standardVocab, ["int"]);
      expect(phrase.words).toHaveLength(1);
      expect(phrase.words[0].id).toBe("int");
    });

    it("includes compositions for mid-level entry point", () => {
      const phrase = computePhrase(standardVocab, ["User"]);
      expect(phrase.words).toHaveLength(3);
      expect(phrase.words.map((w) => w.id).sort()).toEqual([
        "User",
        "int",
        "string",
      ]);
    });

    it("excludes unrelated words", () => {
      const phrase = computePhrase(standardVocab, ["Order"]);
      expect(phrase.words.map((w) => w.id)).not.toContain("Unrelated");
      expect(phrase.words.map((w) => w.id)).not.toContain("bool");
    });
  });

  describe("multiple entry points", () => {
    it("computes union of reachable words", () => {
      const phrase = computePhrase(standardVocab, ["Order", "Unrelated"]);
      // Order reaches: Order, User, int, string
      // Unrelated reaches: Unrelated, string
      // Union: Order, User, Unrelated, int, string (5 words, excludes bool)
      expect(phrase.words).toHaveLength(5);
      expect(phrase.words.map((w) => w.id).sort()).toEqual([
        "Order",
        "Unrelated",
        "User",
        "int",
        "string",
      ]);
    });

    it("handles overlapping reachability", () => {
      const phrase = computePhrase(standardVocab, ["User", "Unrelated"]);
      // Both reach string, User also reaches int
      expect(phrase.words).toHaveLength(4);
      expect(phrase.words.map((w) => w.id).sort()).toEqual([
        "Unrelated",
        "User",
        "int",
        "string",
      ]);
    });

    it("deduplicates words from multiple entry points", () => {
      const phrase = computePhrase(standardVocab, ["int", "int", "int"]);
      expect(phrase.words).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("returns empty words for empty vocabulary", () => {
      const emptyVocab = createVocabulary([]);
      const phrase = computePhrase(emptyVocab, ["anything"]);
      expect(phrase.words).toHaveLength(0);
      expect(phrase.metadata).toEqual(emptyVocab.metadata);
    });

    it("returns empty words for empty entry points", () => {
      const phrase = computePhrase(standardVocab, []);
      expect(phrase.words).toHaveLength(0);
      expect(phrase.metadata).toEqual(standardVocab.metadata);
    });

    it("ignores non-existent entry points", () => {
      const phrase = computePhrase(standardVocab, ["nonexistent"]);
      expect(phrase.words).toHaveLength(0);
    });

    it("includes existing entry points, ignores non-existent", () => {
      const phrase = computePhrase(standardVocab, ["int", "nonexistent"]);
      expect(phrase.words).toHaveLength(1);
      expect(phrase.words[0].id).toBe("int");
    });

    it("preserves metadata from original vocabulary", () => {
      const customMetadata = {
        source: "custom.sln",
        extracted: "2026-01-01T12:00:00Z",
      };
      const vocab: Vocabulary = {
        words: [
          { id: "A", name: "A", kind: "primitive", level: 0, composedOf: [] },
        ],
        metadata: customMetadata,
      };
      const phrase = computePhrase(vocab, ["A"]);
      expect(phrase.metadata).toEqual(customMetadata);
    });
  });

  describe("property-based invariants", () => {
    it("phrase is always a subset of input vocabulary", () => {
      const phrase = computePhrase(standardVocab, ["Order"]);
      const inputIds = new Set(standardVocab.words.map((w) => w.id));
      for (const word of phrase.words) {
        expect(inputIds.has(word.id)).toBe(true);
      }
    });

    it("all existing entry points are present in result", () => {
      const entryPoints = ["Order", "int", "nonexistent"];
      const phrase = computePhrase(standardVocab, entryPoints);
      const phraseIds = new Set(phrase.words.map((w) => w.id));

      // Only existing entry points should be present
      expect(phraseIds.has("Order")).toBe(true);
      expect(phraseIds.has("int")).toBe(true);
      expect(phraseIds.has("nonexistent")).toBe(false);
    });

    it("result word count is at most input word count", () => {
      const phrase = computePhrase(standardVocab, ["Order"]);
      expect(phrase.words.length).toBeLessThanOrEqual(
        standardVocab.words.length
      );
    });

    it("preserves word structure unchanged", () => {
      const phrase = computePhrase(standardVocab, ["User"]);
      const userWord = phrase.words.find((w) => w.id === "User");
      const originalUser = standardVocab.words.find((w) => w.id === "User");

      expect(userWord).toEqual(originalUser);
    });
  });

  describe("example from spec", () => {
    it("computes Order phrase correctly", () => {
      const vocab = createVocabulary([
        { id: "int", name: "int", kind: "primitive", level: 0, composedOf: [] },
        {
          id: "string",
          name: "string",
          kind: "primitive",
          level: 0,
          composedOf: [],
        },
        {
          id: "User",
          name: "User",
          kind: "user",
          level: 1,
          composedOf: ["int", "string"],
        },
        {
          id: "Order",
          name: "Order",
          kind: "user",
          level: 2,
          composedOf: ["User", "int"],
        },
        {
          id: "Unrelated",
          name: "Unrelated",
          kind: "user",
          level: 1,
          composedOf: ["string"],
        },
      ]);

      const phrase = computePhrase(vocab, ["Order"]);
      expect(phrase.words).toHaveLength(4);
      expect(phrase.words.map((w) => w.id).sort()).toEqual([
        "Order",
        "User",
        "int",
        "string",
      ]);
    });

    it("computes int phrase correctly", () => {
      const vocab = createVocabulary([
        { id: "int", name: "int", kind: "primitive", level: 0, composedOf: [] },
        {
          id: "string",
          name: "string",
          kind: "primitive",
          level: 0,
          composedOf: [],
        },
        {
          id: "User",
          name: "User",
          kind: "user",
          level: 1,
          composedOf: ["int", "string"],
        },
      ]);

      const phrase = computePhrase(vocab, ["int"]);
      expect(phrase.words).toHaveLength(1);
      expect(phrase.words[0].id).toBe("int");
    });
  });
});
