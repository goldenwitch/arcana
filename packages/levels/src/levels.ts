// @arcana/levels - Level computation

import type { RawWord, LeveledWord, DAGWord } from "./types.js";
import { collapseToDAG } from "./dag.js";

/**
 * Topologically sort DAG words using Kahn's algorithm.
 * Returns words in order such that all dependencies come before dependents.
 *
 * @param dagWords - Acyclic graph of words
 * @returns Topologically sorted array of DAG words
 */
function topologicalSort(dagWords: DAGWord[]): DAGWord[] {
  const wordMap = new Map<string, DAGWord>();
  for (const word of dagWords) {
    wordMap.set(word.id, word);
  }

  // Calculate in-degrees (how many words compose each word)
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>(); // word -> words that compose it

  for (const word of dagWords) {
    inDegree.set(word.id, 0);
    dependents.set(word.id, []);
  }

  for (const word of dagWords) {
    for (const composedId of word.composedOf) {
      if (wordMap.has(composedId)) {
        dependents.get(composedId)!.push(word.id);
      }
    }
  }

  // Count how many compositions each word has (that exist in the DAG)
  for (const word of dagWords) {
    let count = 0;
    for (const composedId of word.composedOf) {
      if (wordMap.has(composedId)) {
        count++;
      }
    }
    inDegree.set(word.id, count);
  }

  // Start with words that have no compositions (primitives and roots)
  const queue: string[] = [];
  for (const word of dagWords) {
    if (inDegree.get(word.id) === 0) {
      queue.push(word.id);
    }
  }

  const sorted: DAGWord[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(wordMap.get(id)!);

    // Reduce in-degree for all dependents
    for (const depId of dependents.get(id)!) {
      const newDegree = inDegree.get(depId)! - 1;
      inDegree.set(depId, newDegree);
      if (newDegree === 0) {
        queue.push(depId);
      }
    }
  }

  return sorted;
}

/**
 * Compute levels for all words in the vocabulary.
 *
 * Algorithm:
 * 1. Collapse cycles into single nodes to get a DAG
 * 2. Topologically sort the DAG
 * 3. Process in order: level = max(composed levels) + 1 (or 0 for primitives)
 * 4. Expand collapsed nodes back to original words with same level
 *
 * Level rules:
 * - Level 0: primitives only (no compositions)
 * - Level 1+: user types with no compositions start at level 1
 * - Level(w) = 1 + max(Level(c) for all compositions c)
 * - Cycles: all members get the same level
 *
 * @param words - Array of raw words with composition relationships
 * @returns Array of leveled words
 */
export function computeLevels(words: RawWord[]): LeveledWord[] {
  if (words.length === 0) return [];

  // Build lookup for original words
  const originalWordMap = new Map<string, RawWord>();
  for (const word of words) {
    originalWordMap.set(word.id, word);
  }

  // Step 1: Collapse cycles to get a DAG
  const dagWords = collapseToDAG(words);

  // Build lookup for DAG words
  const dagWordMap = new Map<string, DAGWord>();
  for (const dagWord of dagWords) {
    dagWordMap.set(dagWord.id, dagWord);
  }

  // Step 2: Topologically sort the DAG
  const sorted = topologicalSort(dagWords);

  // Step 3: Compute levels
  const levels = new Map<string, number>();

  for (const dagWord of sorted) {
    if (dagWord.kind === "primitive") {
      // Primitives are always level 0
      levels.set(dagWord.id, 0);
    } else if (dagWord.composedOf.length === 0) {
      // Non-primitive with no compositions: level 1
      // This handles user types that don't compose anything
      levels.set(dagWord.id, 1);
    } else {
      // Level = 1 + max(levels of compositions)
      let maxComposedLevel = -1;
      for (const composedId of dagWord.composedOf) {
        const composedLevel = levels.get(composedId);
        if (composedLevel !== undefined) {
          maxComposedLevel = Math.max(maxComposedLevel, composedLevel);
        }
      }
      levels.set(dagWord.id, maxComposedLevel + 1);
    }
  }

  // Step 4: Expand back to original words
  const result: LeveledWord[] = [];

  // Create mapping from original ID to its level
  const originalLevels = new Map<string, number>();

  for (const dagWord of dagWords) {
    const level = levels.get(dagWord.id)!;
    if (dagWord.kind === "cycle" && dagWord.originalMembers) {
      // Cycle: all members get the same level
      for (const memberId of dagWord.originalMembers) {
        originalLevels.set(memberId, level);
      }
    } else {
      originalLevels.set(dagWord.id, level);
    }
  }

  // Build result in original order
  for (const word of words) {
    result.push({
      ...word,
      level: originalLevels.get(word.id)!,
    });
  }

  return result;
}
