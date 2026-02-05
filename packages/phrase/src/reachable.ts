// @arcana/phrase - Reachability computation

import type { Vocabulary } from "@arcana/vocabulary";

/**
 * Get all word IDs reachable from a starting word (including the word itself).
 * Follows composedOf edges to find all transitively composed words.
 *
 * @param vocab - The vocabulary to traverse
 * @param wordId - The starting word ID
 * @returns Set of all reachable word IDs (including the starting word if it exists)
 */
export function reachableFrom(vocab: Vocabulary, wordId: string): Set<string> {
  const result = new Set<string>();

  // Build a lookup map for efficient word access
  const wordMap = new Map(vocab.words.map((w) => [w.id, w]));

  // If the starting word doesn't exist, return empty set
  const startWord = wordMap.get(wordId);
  if (!startWord) {
    return result;
  }

  // BFS traversal
  const queue: string[] = [wordId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    // Skip if already visited
    if (result.has(currentId)) {
      continue;
    }

    const word = wordMap.get(currentId);
    if (!word) {
      // Referenced word doesn't exist in vocabulary, skip
      continue;
    }

    result.add(currentId);

    // Add all composed words to the queue
    for (const composedId of word.composedOf) {
      if (!result.has(composedId)) {
        queue.push(composedId);
      }
    }
  }

  return result;
}
