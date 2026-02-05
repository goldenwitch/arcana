// @arcana/viz - Phrase-focused layout computation

import type { Vocabulary, Word } from "@arcana/vocabulary";
import type {
  NodePosition,
  LayoutResult,
  PhraseFocusOptions,
} from "./types.js";
import { defaultPhraseFocusOptions } from "./types.js";
import { groupByLevel } from "./layout.js";

/**
 * Result of phrase-focused layout computation.
 */
export interface PhraseFocusedLayout {
  /** Target positions for all nodes */
  positions: Map<string, NodePosition>;
  /** IDs of nodes that are part of the phrase */
  phraseIds: Set<string>;
}

/**
 * Compute target positions for phrase-focused layout.
 *
 * When a phrase is focused:
 * - Phrase members cluster on the left side of each level
 * - Non-phrase members are pushed to the right with a separation gap
 * - Y positions remain fixed (nodes stay on their assigned level)
 * - Original relative ordering is preserved within each group
 */
export function computePhraseFocusedLayout(
  vocab: Vocabulary,
  phraseIds: Set<string>,
  baseLayout: LayoutResult,
  options?: Partial<PhraseFocusOptions>
): PhraseFocusedLayout {
  const opts = { ...defaultPhraseFocusOptions, ...options };
  const { separationGap } = opts;

  // Create a lookup for base positions
  const basePositions = new Map<string, NodePosition>();
  for (const node of baseLayout.nodes) {
    basePositions.set(node.id, node);
  }

  // Group words by level
  const levelGroups = groupByLevel(vocab.words);

  // Compute new positions
  const positions = new Map<string, NodePosition>();

  // Get node spacing from base layout (infer from level 0 if possible)
  const nodeSpacing = inferNodeSpacing(baseLayout);

  for (const [level, words] of levelGroups) {
    // Get Y position for this level from base layout
    const levelY = baseLayout.levelYPositions.get(level);
    if (levelY === undefined) continue;

    // Partition into phrase members and others, preserving original X order
    const sortedWords = [...words].sort((a, b) => {
      const posA = basePositions.get(a.id);
      const posB = basePositions.get(b.id);
      return (posA?.x ?? 0) - (posB?.x ?? 0);
    });

    const phraseWords = sortedWords.filter((w) => phraseIds.has(w.id));
    const otherWords = sortedWords.filter((w) => !phraseIds.has(w.id));

    // Phrase words cluster on the left, centered around negative X
    const phraseCount = phraseWords.length;
    const otherCount = otherWords.length;

    if (phraseCount > 0) {
      // Position phrase members in a tight cluster
      const phraseWidth = (phraseCount - 1) * nodeSpacing;
      const phraseStartX = -phraseWidth / 2 - separationGap / 2;

      phraseWords.forEach((word, i) => {
        positions.set(word.id, {
          id: word.id,
          x: phraseStartX + i * nodeSpacing,
          y: levelY,
        });
      });

      // Position other words to the right with separation gap
      if (otherCount > 0) {
        const otherStartX = phraseStartX + phraseWidth + separationGap;

        otherWords.forEach((word, i) => {
          positions.set(word.id, {
            id: word.id,
            x: otherStartX + i * nodeSpacing,
            y: levelY,
          });
        });
      }
    } else {
      // No phrase members at this level, keep original positions
      for (const word of words) {
        const basePos = basePositions.get(word.id);
        if (basePos) {
          positions.set(word.id, { ...basePos });
        }
      }
    }
  }

  return { positions, phraseIds };
}

/**
 * Compute positions when clearing phrase focus (return to default layout).
 */
export function computeDefaultLayout(
  baseLayout: LayoutResult
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  for (const node of baseLayout.nodes) {
    positions.set(node.id, { ...node });
  }
  return positions;
}

/**
 * Infer node spacing from the base layout by examining positions.
 */
function inferNodeSpacing(layout: LayoutResult): number {
  // Default fallback
  const DEFAULT_SPACING = 120;

  if (layout.nodes.length < 2) {
    return DEFAULT_SPACING;
  }

  // Find two adjacent nodes on the same Y level
  const nodesByY = new Map<number, NodePosition[]>();
  for (const node of layout.nodes) {
    const key = Math.round(node.y);
    if (!nodesByY.has(key)) {
      nodesByY.set(key, []);
    }
    nodesByY.get(key)!.push(node);
  }

  // Find a level with multiple nodes
  for (const nodes of nodesByY.values()) {
    if (nodes.length >= 2) {
      const sorted = [...nodes].sort((a, b) => a.x - b.x);
      const spacing = sorted[1]!.x - sorted[0]!.x;
      if (spacing > 0) {
        return spacing;
      }
    }
  }

  return DEFAULT_SPACING;
}

/**
 * Determine visual properties for a node based on phrase focus state.
 */
export interface PhraseVisualState {
  opacity: number;
  strokeWidth: number;
  labelVisible: boolean;
}

export function getPhraseVisualState(
  wordId: string,
  phraseIds: Set<string> | null,
  isHovered: boolean
): PhraseVisualState {
  // No phrase focus - everything visible
  if (!phraseIds || phraseIds.size === 0) {
    return {
      opacity: 1.0,
      strokeWidth: 1.5,
      labelVisible: true,
    };
  }

  const inPhrase = phraseIds.has(wordId);

  if (inPhrase) {
    return {
      opacity: 1.0,
      strokeWidth: 2.5,
      labelVisible: true,
    };
  } else {
    // Non-phrase nodes: dimmed but labels always visible
    return {
      opacity: 0.4,
      strokeWidth: 1.0,
      labelVisible: true,
    };
  }
}

/**
 * Determine visual properties for an edge based on phrase focus state.
 */
export interface EdgeVisualState {
  opacity: number;
  strokeWidth: number;
}

export function getEdgeVisualState(
  sourceId: string,
  targetId: string,
  phraseIds: Set<string> | null
): EdgeVisualState {
  // No phrase focus - normal visibility
  if (!phraseIds || phraseIds.size === 0) {
    return {
      opacity: 0.6,
      strokeWidth: 1.5,
    };
  }

  const sourceInPhrase = phraseIds.has(sourceId);
  const targetInPhrase = phraseIds.has(targetId);

  if (sourceInPhrase && targetInPhrase) {
    // Both in phrase - full visibility
    return {
      opacity: 1.0,
      strokeWidth: 2.0,
    };
  } else {
    // Any edge involving non-phrase nodes is completely hidden
    return {
      opacity: 0,
      strokeWidth: 0,
    };
  }
}
