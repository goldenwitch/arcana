// @arcana/viz - Layout computation tests

import { describe, it, expect } from "vitest";
import type { Vocabulary, Word } from "@arcana/vocabulary";
import { computeLayout, createPositionMap } from "../src/layout.js";

// Helper to create a minimal vocabulary
function createVocab(words: Word[]): Vocabulary {
  return {
    words,
    metadata: {
      source: "test",
      extracted: new Date().toISOString(),
    },
  };
}

// Helper to create a word
function word(
  id: string,
  level: number,
  composedOf: string[] = [],
  kind: Word["kind"] = "user"
): Word {
  return {
    id,
    name: id.split(".").pop() || id,
    kind,
    level,
    composedOf,
  };
}

describe("computeLayout", () => {
  describe("empty vocabulary", () => {
    it("returns empty layout for empty vocabulary", () => {
      const vocab = createVocab([]);
      const layout = computeLayout(vocab);

      expect(layout.nodes).toEqual([]);
      expect(layout.edges).toEqual([]);
      expect(layout.width).toBe(0);
      expect(layout.height).toBe(0);
    });
  });

  describe("single word", () => {
    it("places single word at centered position", () => {
      const vocab = createVocab([word("System.String", 0, [], "primitive")]);
      const layout = computeLayout(vocab);

      expect(layout.nodes).toHaveLength(1);
      expect(layout.nodes[0].id).toBe("System.String");
      // Single word at level 0 should be at x=0 (centered)
      expect(layout.nodes[0].x).toBe(0);
    });

    it("has no edges for single word", () => {
      const vocab = createVocab([word("System.String", 0)]);
      const layout = computeLayout(vocab);

      expect(layout.edges).toHaveLength(0);
    });
  });

  describe("multiple levels", () => {
    it("stacks words vertically by level", () => {
      const vocab = createVocab([
        word("System.String", 0, [], "primitive"),
        word("MyApp.Name", 1, ["System.String"]),
      ]);

      const layout = computeLayout(vocab);
      const posMap = createPositionMap(layout);

      const level0 = posMap.get("System.String")!;
      const level1 = posMap.get("MyApp.Name")!;

      // Level 0 should be below level 1 (higher Y value)
      expect(level0.y).toBeGreaterThan(level1.y);
    });

    it("creates correct number of levels", () => {
      const vocab = createVocab([
        word("A", 0),
        word("B", 1, ["A"]),
        word("C", 2, ["B"]),
        word("D", 3, ["C"]),
      ]);

      const layout = computeLayout(vocab);

      // Should have 4 nodes at different Y positions
      const yPositions = new Set(layout.nodes.map((n) => n.y));
      expect(yPositions.size).toBe(4);
    });
  });

  describe("words within level", () => {
    it("spreads words horizontally within same level", () => {
      const vocab = createVocab([
        word("A", 0),
        word("B", 0),
        word("C", 0),
      ]);

      const layout = computeLayout(vocab);

      // All should have same Y
      const yValues = layout.nodes.map((n) => n.y);
      expect(new Set(yValues).size).toBe(1);

      // X values should be different
      const xValues = layout.nodes.map((n) => n.x);
      expect(new Set(xValues).size).toBe(3);

      // Should be evenly spaced
      const sorted = [...xValues].sort((a, b) => a - b);
      const gap1 = sorted[1] - sorted[0];
      const gap2 = sorted[2] - sorted[1];
      expect(gap1).toBeCloseTo(gap2);
    });

    it("centers single word in level horizontally", () => {
      const vocab = createVocab([word("A", 0)]);
      const layout = computeLayout(vocab);

      expect(layout.nodes[0].x).toBe(0);
    });
  });

  describe("edges", () => {
    it("creates edges for composition relationships", () => {
      const vocab = createVocab([
        word("System.String", 0),
        word("MyApp.Person", 1, ["System.String"]),
      ]);

      const layout = computeLayout(vocab);

      expect(layout.edges).toHaveLength(1);
      expect(layout.edges[0]).toEqual({
        sourceId: "MyApp.Person",
        targetId: "System.String",
      });
    });

    it("excludes edges to non-existent words", () => {
      const vocab = createVocab([
        word("MyApp.Person", 1, ["System.String", "NonExistent"]),
        word("System.String", 0),
      ]);

      const layout = computeLayout(vocab);

      // Should only have edge to System.String, not NonExistent
      expect(layout.edges).toHaveLength(1);
      expect(layout.edges[0].targetId).toBe("System.String");
    });

    it("handles multiple edges from same source", () => {
      const vocab = createVocab([
        word("A", 0),
        word("B", 0),
        word("C", 1, ["A", "B"]),
      ]);

      const layout = computeLayout(vocab);

      expect(layout.edges).toHaveLength(2);
      expect(layout.edges.map((e) => e.sourceId)).toEqual(["C", "C"]);
      expect(new Set(layout.edges.map((e) => e.targetId))).toEqual(
        new Set(["A", "B"])
      );
    });
  });

  describe("options", () => {
    it("respects nodeRadius option", () => {
      const vocab = createVocab([word("A", 0)]);

      const layout1 = computeLayout(vocab, { nodeRadius: 8 });
      const layout2 = computeLayout(vocab, { nodeRadius: 16 });

      // Larger radius should result in larger bounds
      expect(layout2.width).toBeGreaterThan(layout1.width);
    });

    it("respects levelHeight option", () => {
      const vocab = createVocab([
        word("A", 0),
        word("B", 1, ["A"]),
      ]);

      const layout1 = computeLayout(vocab, { levelHeight: 80 });
      const layout2 = computeLayout(vocab, { levelHeight: 120 });

      // Different level heights should produce different vertical spacing
      const posMap1 = createPositionMap(layout1);
      const posMap2 = createPositionMap(layout2);

      const gap1 = Math.abs(posMap1.get("A")!.y - posMap1.get("B")!.y);
      const gap2 = Math.abs(posMap2.get("A")!.y - posMap2.get("B")!.y);

      expect(gap2).toBeGreaterThan(gap1);
    });

    it("respects nodeSpacing option", () => {
      const vocab = createVocab([
        word("A", 0),
        word("B", 0),
      ]);

      const layout1 = computeLayout(vocab, { nodeSpacing: 60 });
      const layout2 = computeLayout(vocab, { nodeSpacing: 100 });

      const posMap1 = createPositionMap(layout1);
      const posMap2 = createPositionMap(layout2);

      const gap1 = Math.abs(posMap1.get("A")!.x - posMap1.get("B")!.x);
      const gap2 = Math.abs(posMap2.get("A")!.x - posMap2.get("B")!.x);

      expect(gap2).toBeGreaterThan(gap1);
    });
  });

  describe("createPositionMap", () => {
    it("creates lookup map from layout", () => {
      const vocab = createVocab([
        word("A", 0),
        word("B", 1, ["A"]),
      ]);

      const layout = computeLayout(vocab);
      const posMap = createPositionMap(layout);

      expect(posMap.size).toBe(2);
      expect(posMap.has("A")).toBe(true);
      expect(posMap.has("B")).toBe(true);
      expect(posMap.get("A")).toEqual(layout.nodes.find((n) => n.id === "A"));
    });
  });
});
