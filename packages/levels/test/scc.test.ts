// @arcana/levels - SCC detection tests

import { describe, it, expect } from "vitest";
import { findSCCs, hasSelfLoop, isCycle } from "../src/scc.js";
import type { RawWord } from "../src/types.js";

describe("findSCCs", () => {
  it("returns each word as its own SCC for linear chain (no cycles)", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "A", name: "A", kind: "user", composedOf: ["int"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
    ];

    const sccs = findSCCs(words);

    // Each word should be in its own SCC
    expect(sccs).toHaveLength(3);
    const flatScc = sccs.flat().sort();
    expect(flatScc).toEqual(["A", "B", "int"]);
    // Each SCC should have exactly one member
    for (const scc of sccs) {
      expect(scc).toHaveLength(1);
    }
  });

  it("detects simple cycle A↔B", () => {
    const words: RawWord[] = [
      { id: "A", name: "A", kind: "user", composedOf: ["B"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
    ];

    const sccs = findSCCs(words);

    // Should have one SCC with both A and B
    expect(sccs).toHaveLength(1);
    expect(sccs[0].sort()).toEqual(["A", "B"]);
  });

  it("detects self-loop A→A", () => {
    const words: RawWord[] = [
      { id: "A", name: "A", kind: "user", composedOf: ["A"] },
    ];

    const sccs = findSCCs(words);

    // Should have one SCC with A (self-loop forms trivial SCC)
    expect(sccs).toHaveLength(1);
    expect(sccs[0]).toEqual(["A"]);
  });

  it("handles complex graph with multiple SCCs", () => {
    // Graph structure:
    // Cycle 1: A↔B
    // Cycle 2: C→D→E→C
    // Isolated: X (no edges)
    // Connection: B→C (cycles are connected but don't merge)
    const words: RawWord[] = [
      { id: "A", name: "A", kind: "user", composedOf: ["B"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A", "C"] },
      { id: "C", name: "C", kind: "user", composedOf: ["D"] },
      { id: "D", name: "D", kind: "user", composedOf: ["E"] },
      { id: "E", name: "E", kind: "user", composedOf: ["C"] },
      { id: "X", name: "X", kind: "user", composedOf: [] },
    ];

    const sccs = findSCCs(words);

    // Should have 3 SCCs: {A,B}, {C,D,E}, {X}
    expect(sccs).toHaveLength(3);

    const sccSorted = sccs.map((scc) => scc.sort()).sort((a, b) => a[0].localeCompare(b[0]));
    expect(sccSorted).toEqual([["A", "B"], ["C", "D", "E"], ["X"]]);
  });

  it("handles empty input", () => {
    const sccs = findSCCs([]);
    expect(sccs).toEqual([]);
  });

  it("handles single word with no compositions", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
    ];

    const sccs = findSCCs(words);

    expect(sccs).toHaveLength(1);
    expect(sccs[0]).toEqual(["int"]);
  });

  it("ignores compositions to non-existent words", () => {
    const words: RawWord[] = [
      { id: "A", name: "A", kind: "user", composedOf: ["NonExistent", "B"] },
      { id: "B", name: "B", kind: "user", composedOf: [] },
    ];

    const sccs = findSCCs(words);

    // Should have 2 SCCs, ignoring the edge to NonExistent
    expect(sccs).toHaveLength(2);
  });
});

describe("hasSelfLoop", () => {
  it("returns true for self-referencing word", () => {
    const word: RawWord = { id: "Node", name: "Node", kind: "user", composedOf: ["Node", "Data"] };
    expect(hasSelfLoop(word)).toBe(true);
  });

  it("returns false for non-self-referencing word", () => {
    const word: RawWord = { id: "Leaf", name: "Leaf", kind: "user", composedOf: ["Data"] };
    expect(hasSelfLoop(word)).toBe(false);
  });

  it("returns false for word with no compositions", () => {
    const word: RawWord = { id: "int", name: "int", kind: "primitive", composedOf: [] };
    expect(hasSelfLoop(word)).toBe(false);
  });
});

describe("isCycle", () => {
  const words: RawWord[] = [
    { id: "A", name: "A", kind: "user", composedOf: ["B"] },
    { id: "B", name: "B", kind: "user", composedOf: ["A"] },
    { id: "C", name: "C", kind: "user", composedOf: [] },
    { id: "D", name: "D", kind: "user", composedOf: ["D"] }, // self-loop
  ];

  it("returns true for multi-member SCC", () => {
    expect(isCycle(["A", "B"], words)).toBe(true);
  });

  it("returns true for single-member SCC with self-loop", () => {
    expect(isCycle(["D"], words)).toBe(true);
  });

  it("returns false for single-member SCC without self-loop", () => {
    expect(isCycle(["C"], words)).toBe(false);
  });

  it("returns false for empty SCC", () => {
    expect(isCycle([], words)).toBe(false);
  });
});
