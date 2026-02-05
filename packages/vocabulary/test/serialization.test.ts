// @arcana/vocabulary - Serialization tests

import { describe, it, expect } from "vitest";
import {
  parseVocabulary,
  serializeVocabulary,
  VocabularyParseError,
} from "../src/serialization.js";
import type { Vocabulary } from "../src/types.js";

describe("parseVocabulary", () => {
  const validVocabularyJson = {
    words: [
      { id: "System.String", name: "string", kind: "primitive", level: 0, composedOf: [] },
      { id: "System.Int32", name: "int", kind: "primitive", level: 0, composedOf: [] },
      {
        id: "MyApp.User",
        name: "User",
        kind: "user",
        level: 1,
        composedOf: ["System.String", "System.Int32"],
      },
    ],
    metadata: {
      source: "C:\\Projects\\MyApp\\MyApp.sln",
      extracted: "2026-02-03T10:00:00.000Z",
    },
  };

  it("parses valid vocabulary", () => {
    const result = parseVocabulary(validVocabularyJson);
    expect(result.words).toHaveLength(3);
    expect(result.words[0].id).toBe("System.String");
    expect(result.metadata.source).toBe("C:\\Projects\\MyApp\\MyApp.sln");
  });

  it("parses empty vocabulary", () => {
    const empty = {
      words: [],
      metadata: {
        source: "/empty",
        extracted: "2026-02-03T10:00:00.000Z",
      },
    };
    const result = parseVocabulary(empty);
    expect(result.words).toHaveLength(0);
  });

  it("throws VocabularyParseError on invalid input", () => {
    expect(() => parseVocabulary(null)).toThrow(VocabularyParseError);
    expect(() => parseVocabulary({})).toThrow(VocabularyParseError);
    expect(() => parseVocabulary("string")).toThrow(VocabularyParseError);
  });

  it("provides descriptive error messages", () => {
    try {
      parseVocabulary({
        words: [{ id: "", name: "test", kind: "primitive", level: 0, composedOf: [] }],
        metadata: { source: "", extracted: "invalid" },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(VocabularyParseError);
      expect((error as VocabularyParseError).message).toContain("Invalid vocabulary");
      expect((error as VocabularyParseError).message).toContain("words.0.id");
    }
  });

  it("includes Zod error as cause", () => {
    try {
      parseVocabulary({});
    } catch (error) {
      expect(error).toBeInstanceOf(VocabularyParseError);
      expect((error as VocabularyParseError).cause).toBeDefined();
    }
  });
});

describe("serializeVocabulary", () => {
  const vocabulary: Vocabulary = {
    words: [
      { id: "System.String", name: "string", kind: "primitive", level: 0, composedOf: [] },
      {
        id: "MyApp.User",
        name: "User",
        kind: "user",
        level: 1,
        composedOf: ["System.String"],
      },
    ],
    metadata: {
      source: "/project/app.sln",
      extracted: "2026-02-03T10:00:00.000Z",
    },
  };

  it("produces valid JSON", () => {
    const json = serializeVocabulary(vocabulary);
    const parsed = JSON.parse(json);
    expect(parsed.words).toHaveLength(2);
    expect(parsed.metadata.source).toBe("/project/app.sln");
  });

  it("produces formatted output with 2-space indentation", () => {
    const json = serializeVocabulary(vocabulary);
    expect(json).toContain("\n");
    expect(json).toContain("  ");
  });

  it("preserves word order", () => {
    const json = serializeVocabulary(vocabulary);
    const indexString = json.indexOf("System.String");
    const indexUser = json.indexOf("MyApp.User");
    expect(indexString).toBeLessThan(indexUser);
  });

  it("serializes empty vocabulary", () => {
    const empty: Vocabulary = {
      words: [],
      metadata: {
        source: "/empty",
        extracted: "2026-02-03T10:00:00.000Z",
      },
    };
    const json = serializeVocabulary(empty);
    const parsed = JSON.parse(json);
    expect(parsed.words).toEqual([]);
  });
});

describe("round-trip serialization", () => {
  const testCases: { name: string; vocabulary: Vocabulary }[] = [
    {
      name: "full vocabulary",
      vocabulary: {
        words: [
          { id: "System.String", name: "string", kind: "primitive", level: 0, composedOf: [] },
          { id: "System.Int32", name: "int", kind: "primitive", level: 0, composedOf: [] },
          {
            id: "System.Collections.Generic.List`1",
            name: "List<T>",
            kind: "generic",
            level: 1,
            composedOf: [],
          },
          {
            id: "System.Collections.Generic.List`1[[System.String]]",
            name: "List<string>",
            kind: "constructed",
            level: 2,
            composedOf: ["System.Collections.Generic.List`1", "System.String"],
          },
          {
            id: "MyApp.User",
            name: "User",
            kind: "user",
            level: 1,
            composedOf: ["System.String", "System.Int32"],
          },
        ],
        metadata: {
          source: "C:\\Projects\\MyApp\\MyApp.sln",
          extracted: "2026-02-03T10:00:00.000Z",
        },
      },
    },
    {
      name: "empty vocabulary",
      vocabulary: {
        words: [],
        metadata: {
          source: "/empty/project",
          extracted: "2026-01-01T00:00:00.000Z",
        },
      },
    },
    {
      name: "single word",
      vocabulary: {
        words: [
          { id: "System.Object", name: "object", kind: "primitive", level: 0, composedOf: [] },
        ],
        metadata: {
          source: "/single",
          extracted: "2026-02-03T12:00:00.000Z",
        },
      },
    },
    {
      name: "primitives only",
      vocabulary: {
        words: [
          { id: "System.String", name: "string", kind: "primitive", level: 0, composedOf: [] },
          { id: "System.Int32", name: "int", kind: "primitive", level: 0, composedOf: [] },
          { id: "System.Boolean", name: "bool", kind: "primitive", level: 0, composedOf: [] },
          { id: "System.Double", name: "double", kind: "primitive", level: 0, composedOf: [] },
        ],
        metadata: {
          source: "/primitives",
          extracted: "2026-02-03T10:00:00.000Z",
        },
      },
    },
  ];

  it.each(testCases)("$name: parse(serialize(v)) equals v", ({ vocabulary }) => {
    const serialized = serializeVocabulary(vocabulary);
    const parsed = parseVocabulary(JSON.parse(serialized));
    expect(parsed).toEqual(vocabulary);
  });

  it.each(testCases)(
    "$name: serialize(parse(serialize(v))) === serialize(v)",
    ({ vocabulary }) => {
      const serialized1 = serializeVocabulary(vocabulary);
      const parsed = parseVocabulary(JSON.parse(serialized1));
      const serialized2 = serializeVocabulary(parsed);
      expect(serialized2).toBe(serialized1);
    }
  );

  it("produces deterministic output across multiple serializations", () => {
    const vocabulary: Vocabulary = {
      words: [
        { id: "A", name: "A", kind: "primitive", level: 0, composedOf: [] },
        { id: "B", name: "B", kind: "user", level: 1, composedOf: ["A"] },
      ],
      metadata: {
        source: "/test",
        extracted: "2026-02-03T10:00:00.000Z",
      },
    };

    const results = Array.from({ length: 10 }, () => serializeVocabulary(vocabulary));
    expect(new Set(results).size).toBe(1);
  });
});
