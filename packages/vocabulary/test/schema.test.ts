// @arcana/vocabulary - Schema validation tests

import { describe, it, expect } from "vitest";
import { WordSchema, WordKindSchema, VocabularySchema, VocabularyMetadataSchema } from "../src/schema.js";

describe("WordKindSchema", () => {
  it("accepts valid kinds", () => {
    expect(WordKindSchema.parse("primitive")).toBe("primitive");
    expect(WordKindSchema.parse("generic")).toBe("generic");
    expect(WordKindSchema.parse("constructed")).toBe("constructed");
    expect(WordKindSchema.parse("user")).toBe("user");
  });

  it("rejects invalid kinds", () => {
    expect(() => WordKindSchema.parse("invalid")).toThrow();
    expect(() => WordKindSchema.parse("")).toThrow();
    expect(() => WordKindSchema.parse(123)).toThrow();
    expect(() => WordKindSchema.parse(null)).toThrow();
  });
});

describe("WordSchema", () => {
  const validWord = {
    id: "System.String",
    name: "string",
    kind: "primitive",
    level: 0,
    composedOf: [],
  };

  it("accepts valid word", () => {
    const result = WordSchema.parse(validWord);
    expect(result).toEqual(validWord);
  });

  it("accepts word with composedOf references", () => {
    const word = {
      id: "MyApp.User",
      name: "User",
      kind: "user",
      level: 1,
      composedOf: ["System.String", "System.Int32"],
    };
    const result = WordSchema.parse(word);
    expect(result.composedOf).toEqual(["System.String", "System.Int32"]);
  });

  it("rejects word with empty id", () => {
    expect(() => WordSchema.parse({ ...validWord, id: "" })).toThrow(/id cannot be empty/);
  });

  it("rejects word with empty name", () => {
    expect(() => WordSchema.parse({ ...validWord, name: "" })).toThrow(/name cannot be empty/);
  });

  it("rejects word with invalid kind", () => {
    expect(() => WordSchema.parse({ ...validWord, kind: "unknown" })).toThrow();
  });

  it("rejects word with negative level", () => {
    expect(() => WordSchema.parse({ ...validWord, level: -1 })).toThrow(/non-negative/);
  });

  it("rejects word with non-integer level", () => {
    expect(() => WordSchema.parse({ ...validWord, level: 1.5 })).toThrow();
  });

  it("rejects word with missing fields", () => {
    expect(() => WordSchema.parse({ id: "test" })).toThrow();
    expect(() => WordSchema.parse({})).toThrow();
  });

  it("rejects word with extra properties (strict mode)", () => {
    expect(() => WordSchema.parse({ ...validWord, extra: "field" })).toThrow();
  });
});

describe("VocabularyMetadataSchema", () => {
  const validMetadata = {
    source: "C:\\Projects\\MyApp\\MyApp.sln",
    extracted: "2026-02-03T10:00:00.000Z",
  };

  it("accepts valid metadata", () => {
    const result = VocabularyMetadataSchema.parse(validMetadata);
    expect(result).toEqual(validMetadata);
  });

  it("rejects empty source", () => {
    expect(() =>
      VocabularyMetadataSchema.parse({ ...validMetadata, source: "" })
    ).toThrow(/Source path cannot be empty/);
  });

  it("rejects invalid timestamp", () => {
    expect(() =>
      VocabularyMetadataSchema.parse({ ...validMetadata, extracted: "not-a-date" })
    ).toThrow(/ISO 8601/);
  });

  it("rejects non-ISO timestamp formats", () => {
    expect(() =>
      VocabularyMetadataSchema.parse({ ...validMetadata, extracted: "2026-02-03" })
    ).toThrow();
  });

  it("rejects extra properties (strict mode)", () => {
    expect(() =>
      VocabularyMetadataSchema.parse({ ...validMetadata, version: "1.0" })
    ).toThrow();
  });
});

describe("VocabularySchema", () => {
  const validVocabulary = {
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

  it("accepts valid vocabulary", () => {
    const result = VocabularySchema.parse(validVocabulary);
    expect(result.words).toHaveLength(3);
    expect(result.metadata.source).toBe("C:\\Projects\\MyApp\\MyApp.sln");
  });

  it("accepts empty vocabulary", () => {
    const empty = {
      words: [],
      metadata: {
        source: "/empty/project",
        extracted: "2026-02-03T10:00:00.000Z",
      },
    };
    const result = VocabularySchema.parse(empty);
    expect(result.words).toHaveLength(0);
  });

  it("accepts vocabulary with single word", () => {
    const single = {
      words: [{ id: "System.Object", name: "object", kind: "primitive", level: 0, composedOf: [] }],
      metadata: {
        source: "/single/project",
        extracted: "2026-02-03T10:00:00.000Z",
      },
    };
    const result = VocabularySchema.parse(single);
    expect(result.words).toHaveLength(1);
  });

  it("accepts vocabulary with primitives only", () => {
    const primitives = {
      words: [
        { id: "System.String", name: "string", kind: "primitive", level: 0, composedOf: [] },
        { id: "System.Int32", name: "int", kind: "primitive", level: 0, composedOf: [] },
        { id: "System.Boolean", name: "bool", kind: "primitive", level: 0, composedOf: [] },
      ],
      metadata: {
        source: "/primitives/project",
        extracted: "2026-02-03T10:00:00.000Z",
      },
    };
    const result = VocabularySchema.parse(primitives);
    expect(result.words.every((w) => w.kind === "primitive")).toBe(true);
  });

  it("rejects vocabulary with missing words", () => {
    expect(() =>
      VocabularySchema.parse({
        metadata: validVocabulary.metadata,
      })
    ).toThrow();
  });

  it("rejects vocabulary with missing metadata", () => {
    expect(() =>
      VocabularySchema.parse({
        words: validVocabulary.words,
      })
    ).toThrow();
  });

  it("rejects vocabulary with invalid word in array", () => {
    expect(() =>
      VocabularySchema.parse({
        words: [{ id: "", name: "test", kind: "primitive", level: 0, composedOf: [] }],
        metadata: validVocabulary.metadata,
      })
    ).toThrow();
  });

  it("rejects vocabulary with extra properties (strict mode)", () => {
    expect(() =>
      VocabularySchema.parse({
        ...validVocabulary,
        version: "1.0",
      })
    ).toThrow();
  });

  it("rejects non-object input", () => {
    expect(() => VocabularySchema.parse(null)).toThrow();
    expect(() => VocabularySchema.parse(undefined)).toThrow();
    expect(() => VocabularySchema.parse("string")).toThrow();
    expect(() => VocabularySchema.parse(123)).toThrow();
    expect(() => VocabularySchema.parse([])).toThrow();
  });
});
