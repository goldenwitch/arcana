// @arcana/viz - Layout computation

import type { Vocabulary, Word } from "@arcana/vocabulary";
import type {
  VizOptions,
  LayoutResult,
  NodePosition,
  LayoutEdge,
} from "./types.js";
import { defaultOptions } from "./types.js";

/**
 * Group words by their level.
 */
export function groupByLevel(words: Word[]): Map<number, Word[]> {
  const levels = new Map<number, Word[]>();
  for (const word of words) {
    const level = word.level;
    if (!levels.has(level)) {
      levels.set(level, []);
    }
    levels.get(level)!.push(word);
  }
  return levels;
}

/**
 * Compute layout positions for a vocabulary.
 *
 * Layout strategy:
 * - Words are arranged in horizontal rows by level
 * - Level 0 at bottom, highest level at top
 * - Words within a level are spread evenly horizontally
 * - Edges flow downward from higher-level words to their dependencies
 */
export function computeLayout(
  vocab: Vocabulary,
  options?: VizOptions
): LayoutResult {
  const opts = {
    ...defaultOptions,
    ...options,
    colors: { ...defaultOptions.colors, ...options?.colors },
  };

  const { nodeRadius, levelHeight, nodeSpacing } = opts;

  // Handle empty vocabulary
  if (vocab.words.length === 0) {
    return {
      nodes: [],
      edges: [],
      width: 0,
      height: 0,
      levelYPositions: new Map(),
    };
  }

  // Group words by level
  const levelGroups = groupByLevel(vocab.words);
  const levels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  const maxLevel = Math.max(...levels);

  // Compute positions
  const nodes: NodePosition[] = [];
  const wordIdSet = new Set(vocab.words.map((w: Word) => w.id));
  const levelYPositions = new Map<number, number>();

  // Track max width needed
  let maxWidth = 0;

  for (const level of levels) {
    const wordsAtLevel = levelGroups.get(level)!;
    const count = wordsAtLevel.length;

    // Compute width needed for this level
    const levelWidth = count * nodeSpacing;
    maxWidth = Math.max(maxWidth, levelWidth);

    // Y position: level 0 at bottom, higher levels go up
    // We invert so level 0 is at the bottom of the visual space
    const y = (maxLevel - level) * levelHeight + nodeRadius + 20;

    // Store level Y position for navigation
    levelYPositions.set(level, y);

    // X positions: spread evenly, centered
    const startX = -(count - 1) * (nodeSpacing / 2);

    for (let i = 0; i < wordsAtLevel.length; i++) {
      const word = wordsAtLevel[i]!;
      nodes.push({
        id: word.id,
        x: startX + i * nodeSpacing,
        y,
      });
    }
  }

  // Compute edges (composition relationships)
  const edges: LayoutEdge[] = [];
  for (const word of vocab.words) {
    for (const depId of word.composedOf) {
      // Only include edges where target exists in vocabulary
      if (wordIdSet.has(depId)) {
        edges.push({
          sourceId: word.id,
          targetId: depId,
        });
      }
    }
  }

  // Compute bounds
  const height = (maxLevel + 1) * levelHeight + nodeRadius * 2 + 40;
  const width = maxWidth + nodeRadius * 2 + 40;

  return {
    nodes,
    edges,
    width,
    height,
    levelYPositions,
  };
}

/**
 * Create a position lookup map from layout result.
 */
export function createPositionMap(
  layout: LayoutResult
): Map<string, NodePosition> {
  const map = new Map<string, NodePosition>();
  for (const node of layout.nodes) {
    map.set(node.id, node);
  }
  return map;
}
