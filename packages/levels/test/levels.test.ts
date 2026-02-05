// @arcana/levels - Level computation tests

import { describe, it, expect } from "vitest";
import { computeLevels } from "../src/levels.js";
import type { RawWord, LeveledWord } from "../src/types.js";

describe("computeLevels", () => {
  it("assigns level 0 to all primitives", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "string", name: "string", kind: "primitive", composedOf: [] },
      { id: "bool", name: "bool", kind: "primitive", composedOf: [] },
    ];

    const result = computeLevels(words);

    for (const word of result) {
      expect(word.level).toBe(0);
    }
  });

  it("computes linear chain: primitive → A → B → levels 0, 1, 2", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "A", name: "A", kind: "user", composedOf: ["int"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
    ];

    const result = computeLevels(words);
    const levelMap = new Map(result.map((w) => [w.id, w.level]));

    expect(levelMap.get("int")).toBe(0);
    expect(levelMap.get("A")).toBe(1);
    expect(levelMap.get("B")).toBe(2);
  });

  it("computes diamond: primitive → A, B → C → levels 0, 1, 1, 2", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "A", name: "A", kind: "user", composedOf: ["int"] },
      { id: "B", name: "B", kind: "user", composedOf: ["int"] },
      { id: "C", name: "C", kind: "user", composedOf: ["A", "B"] },
    ];

    const result = computeLevels(words);
    const levelMap = new Map(result.map((w) => [w.id, w.level]));

    expect(levelMap.get("int")).toBe(0);
    expect(levelMap.get("A")).toBe(1);
    expect(levelMap.get("B")).toBe(1);
    expect(levelMap.get("C")).toBe(2);
  });

  it("assigns same level to cycle members: A↔B both compose primitive → both level 1", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "A", name: "A", kind: "user", composedOf: ["B", "int"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A", "int"] },
    ];

    const result = computeLevels(words);
    const levelMap = new Map(result.map((w) => [w.id, w.level]));

    expect(levelMap.get("int")).toBe(0);
    expect(levelMap.get("A")).toBe(1);
    expect(levelMap.get("B")).toBe(1);
  });

  it("assigns level 1 to user type with no compositions", () => {
    const words: RawWord[] = [
      { id: "Marker", name: "Marker", kind: "user", composedOf: [] },
    ];

    const result = computeLevels(words);

    expect(result[0].level).toBe(1);
  });

  it("assigns level 0 to primitive with no compositions", () => {
    const words: RawWord[] = [
      { id: "void", name: "void", kind: "primitive", composedOf: [] },
    ];

    const result = computeLevels(words);

    expect(result[0].level).toBe(0);
  });

  it("handles self-reference: Node → Node sits at natural level", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "Node", name: "Node", kind: "user", composedOf: ["Node", "int"] },
    ];

    const result = computeLevels(words);
    const levelMap = new Map(result.map((w) => [w.id, w.level]));

    expect(levelMap.get("int")).toBe(0);
    // Node composes int (level 0), so Node is level 1
    // Self-reference doesn't increase level
    expect(levelMap.get("Node")).toBe(1);
  });

  it("handles complex cycle with external dependencies", () => {
    // Cycle: A↔B↔C (triangle)
    // A also composes D (level 1 from primitive)
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "D", name: "D", kind: "user", composedOf: ["int"] },
      { id: "A", name: "A", kind: "user", composedOf: ["B", "D"] },
      { id: "B", name: "B", kind: "user", composedOf: ["C"] },
      { id: "C", name: "C", kind: "user", composedOf: ["A"] },
    ];

    const result = computeLevels(words);
    const levelMap = new Map(result.map((w) => [w.id, w.level]));

    expect(levelMap.get("int")).toBe(0);
    expect(levelMap.get("D")).toBe(1);
    // Cycle {A, B, C} composes D (level 1), so cycle is level 2
    expect(levelMap.get("A")).toBe(2);
    expect(levelMap.get("B")).toBe(2);
    expect(levelMap.get("C")).toBe(2);
  });

  it("property: level(w) > level(c) for all non-cycle compositions", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "string", name: "string", kind: "primitive", composedOf: [] },
      { id: "A", name: "A", kind: "user", composedOf: ["int"] },
      { id: "B", name: "B", kind: "user", composedOf: ["string"] },
      { id: "C", name: "C", kind: "user", composedOf: ["A", "B"] },
      { id: "D", name: "D", kind: "user", composedOf: ["C", "int"] },
    ];

    const result = computeLevels(words);
    const levelMap = new Map(result.map((w) => [w.id, w.level]));
    const wordMap = new Map(words.map((w) => [w.id, w]));

    for (const word of result) {
      for (const composedId of wordMap.get(word.id)!.composedOf) {
        const composedLevel = levelMap.get(composedId);
        if (composedLevel !== undefined) {
          expect(word.level).toBeGreaterThan(composedLevel);
        }
      }
    }
  });

  it("preserves original word properties in result", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "List", name: "List<T>", kind: "generic", composedOf: ["int"] },
      { id: "MyType", name: "MyType", kind: "constructed", composedOf: ["List"] },
    ];

    const result = computeLevels(words);

    expect(result).toHaveLength(3);
    const resultMap = new Map(result.map((w) => [w.id, w]));

    expect(resultMap.get("int")!.kind).toBe("primitive");
    expect(resultMap.get("List")!.kind).toBe("generic");
    expect(resultMap.get("List")!.name).toBe("List<T>");
    expect(resultMap.get("MyType")!.kind).toBe("constructed");
  });

  it("handles empty input", () => {
    const result = computeLevels([]);
    expect(result).toEqual([]);
  });

  it("maintains original order in output", () => {
    const words: RawWord[] = [
      { id: "C", name: "C", kind: "user", composedOf: ["B"] },
      { id: "A", name: "A", kind: "primitive", composedOf: [] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
    ];

    const result = computeLevels(words);

    expect(result.map((w) => w.id)).toEqual(["C", "A", "B"]);
  });

  it("handles generic and constructed types correctly", () => {
    const words: RawWord[] = [
      { id: "T", name: "T", kind: "primitive", composedOf: [] },
      { id: "List", name: "List<T>", kind: "generic", composedOf: ["T"] },
      { id: "ListInt", name: "List<int>", kind: "constructed", composedOf: ["List", "T"] },
      { id: "Container", name: "Container", kind: "user", composedOf: ["ListInt"] },
    ];

    const result = computeLevels(words);
    const levelMap = new Map(result.map((w) => [w.id, w.level]));

    expect(levelMap.get("T")).toBe(0);
    expect(levelMap.get("List")).toBe(1);
    expect(levelMap.get("ListInt")).toBe(2);
    expect(levelMap.get("Container")).toBe(3);
  });

  it("handles isolated words (no incoming or outgoing edges)", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "Isolated", name: "Isolated", kind: "user", composedOf: [] },
      { id: "A", name: "A", kind: "user", composedOf: ["int"] },
    ];

    const result = computeLevels(words);
    const levelMap = new Map(result.map((w) => [w.id, w.level]));

    expect(levelMap.get("int")).toBe(0);
    expect(levelMap.get("Isolated")).toBe(1); // User type with no deps is level 1
    expect(levelMap.get("A")).toBe(1);
  });

  it("correctly levels deeply nested hierarchy", () => {
    const words: RawWord[] = [
      { id: "L0", name: "L0", kind: "primitive", composedOf: [] },
      { id: "L1", name: "L1", kind: "user", composedOf: ["L0"] },
      { id: "L2", name: "L2", kind: "user", composedOf: ["L1"] },
      { id: "L3", name: "L3", kind: "user", composedOf: ["L2"] },
      { id: "L4", name: "L4", kind: "user", composedOf: ["L3"] },
      { id: "L5", name: "L5", kind: "user", composedOf: ["L4"] },
    ];

    const result = computeLevels(words);
    const levelMap = new Map(result.map((w) => [w.id, w.level]));

    expect(levelMap.get("L0")).toBe(0);
    expect(levelMap.get("L1")).toBe(1);
    expect(levelMap.get("L2")).toBe(2);
    expect(levelMap.get("L3")).toBe(3);
    expect(levelMap.get("L4")).toBe(4);
    expect(levelMap.get("L5")).toBe(5);
  });
});
