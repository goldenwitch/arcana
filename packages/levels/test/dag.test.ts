// @arcana/levels - DAG collapse tests

import { describe, it, expect } from "vitest";
import { findCycles, collapseToDAG } from "../src/dag.js";
import type { RawWord } from "../src/types.js";

describe("findCycles", () => {
  it("returns empty array when no cycles exist", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "A", name: "A", kind: "user", composedOf: ["int"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
    ];

    const cycles = findCycles(words);
    expect(cycles).toEqual([]);
  });

  it("detects simple cycle A↔B", () => {
    const words: RawWord[] = [
      { id: "A", name: "A", kind: "user", composedOf: ["B"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
    ];

    const cycles = findCycles(words);

    expect(cycles).toHaveLength(1);
    expect(cycles[0].members.sort()).toEqual(["A", "B"]);
    expect(cycles[0].level).toBe(-1); // Not computed yet
  });

  it("detects self-loop as a cycle", () => {
    const words: RawWord[] = [
      { id: "Node", name: "Node", kind: "user", composedOf: ["Node", "Data"] },
      { id: "Data", name: "Data", kind: "user", composedOf: [] },
    ];

    const cycles = findCycles(words);

    expect(cycles).toHaveLength(1);
    expect(cycles[0].members).toEqual(["Node"]);
  });

  it("detects multiple cycles in complex graph", () => {
    const words: RawWord[] = [
      { id: "A", name: "A", kind: "user", composedOf: ["B"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
      { id: "X", name: "X", kind: "user", composedOf: ["Y"] },
      { id: "Y", name: "Y", kind: "user", composedOf: ["X"] },
      { id: "Z", name: "Z", kind: "user", composedOf: [] },
    ];

    const cycles = findCycles(words);

    expect(cycles).toHaveLength(2);
    const cycleMembers = cycles.map((c) => c.members.sort());
    expect(cycleMembers.sort()).toEqual([["A", "B"], ["X", "Y"]]);
  });
});

describe("collapseToDAG", () => {
  it("returns words unchanged when no cycles exist", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "A", name: "A", kind: "user", composedOf: ["int"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
    ];

    const dag = collapseToDAG(words);

    expect(dag).toHaveLength(3);
    const dagIds = dag.map((w) => w.id).sort();
    expect(dagIds).toEqual(["A", "B", "int"]);

    // Verify compositions are preserved
    const dagMap = new Map(dag.map((w) => [w.id, w]));
    expect(dagMap.get("A")!.composedOf).toEqual(["int"]);
    expect(dagMap.get("B")!.composedOf).toEqual(["A"]);
    expect(dagMap.get("int")!.composedOf).toEqual([]);
  });

  it("collapses simple cycle into one node", () => {
    const words: RawWord[] = [
      { id: "A", name: "A", kind: "user", composedOf: ["B"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
    ];

    const dag = collapseToDAG(words);

    expect(dag).toHaveLength(1);
    expect(dag[0].kind).toBe("cycle");
    expect(dag[0].originalMembers?.sort()).toEqual(["A", "B"]);
    expect(dag[0].composedOf).toEqual([]); // No external dependencies
  });

  it("maintains external dependencies for collapsed cycles", () => {
    const words: RawWord[] = [
      { id: "int", name: "int", kind: "primitive", composedOf: [] },
      { id: "A", name: "A", kind: "user", composedOf: ["B", "int"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
    ];

    const dag = collapseToDAG(words);

    expect(dag).toHaveLength(2);

    const cycleNode = dag.find((w) => w.kind === "cycle");
    const intNode = dag.find((w) => w.id === "int");

    expect(cycleNode).toBeDefined();
    expect(intNode).toBeDefined();
    expect(cycleNode!.originalMembers?.sort()).toEqual(["A", "B"]);
    expect(cycleNode!.composedOf).toEqual(["int"]); // External dependency preserved
  });

  it("handles self-loop by collapsing to cycle node", () => {
    const words: RawWord[] = [
      { id: "Node", name: "Node", kind: "user", composedOf: ["Node", "Data"] },
      { id: "Data", name: "Data", kind: "user", composedOf: [] },
    ];

    const dag = collapseToDAG(words);

    expect(dag).toHaveLength(2);

    const cycleNode = dag.find((w) => w.kind === "cycle");
    const dataNode = dag.find((w) => w.id === "Data");

    expect(cycleNode).toBeDefined();
    expect(dataNode).toBeDefined();
    expect(cycleNode!.originalMembers).toEqual(["Node"]);
    expect(cycleNode!.composedOf).toEqual(["Data"]);
  });

  it("produces an acyclic graph (DAG property)", () => {
    // Complex graph with multiple cycles
    const words: RawWord[] = [
      { id: "A", name: "A", kind: "user", composedOf: ["B"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A", "C"] },
      { id: "C", name: "C", kind: "user", composedOf: ["D"] },
      { id: "D", name: "D", kind: "user", composedOf: ["C"] },
    ];

    const dag = collapseToDAG(words);

    // Create a map for quick lookup
    const dagMap = new Map(dag.map((w) => [w.id, w]));

    // Verify no cycles by checking that we can topologically sort
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function hasCycle(nodeId: string): boolean {
      if (visiting.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visiting.add(nodeId);
      const node = dagMap.get(nodeId);
      if (node) {
        for (const depId of node.composedOf) {
          if (dagMap.has(depId) && hasCycle(depId)) {
            return true;
          }
        }
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    }

    for (const node of dag) {
      expect(hasCycle(node.id)).toBe(false);
    }
  });

  it("handles empty input", () => {
    const dag = collapseToDAG([]);
    expect(dag).toEqual([]);
  });

  it("deduplicates compositions after collapse", () => {
    // X composes both A and B, which are in a cycle
    const words: RawWord[] = [
      { id: "A", name: "A", kind: "user", composedOf: ["B"] },
      { id: "B", name: "B", kind: "user", composedOf: ["A"] },
      { id: "X", name: "X", kind: "user", composedOf: ["A", "B"] },
    ];

    const dag = collapseToDAG(words);

    const xNode = dag.find((w) => w.id === "X");
    expect(xNode).toBeDefined();
    // X should compose the cycle node only once, not twice
    expect(xNode!.composedOf).toHaveLength(1);
  });
});
