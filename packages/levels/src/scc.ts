// @arcana/levels - Tarjan's algorithm for Strongly Connected Components

import type { RawWord } from "./types.js";

/**
 * Find all Strongly Connected Components using Tarjan's algorithm.
 * Returns array of SCCs, where each SCC is an array of word IDs.
 * Time complexity: O(V + E)
 *
 * @param words - Array of raw words with composition relationships
 * @returns Array of SCCs (each SCC is array of word IDs)
 */
export function findSCCs(words: RawWord[]): string[][] {
  const wordMap = new Map<string, RawWord>();
  for (const word of words) {
    wordMap.set(word.id, word);
  }

  // Tarjan's algorithm state
  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongconnect(wordId: string): void {
    // Set the depth index for v to the smallest unused index
    indices.set(wordId, index);
    lowlinks.set(wordId, index);
    index++;
    stack.push(wordId);
    onStack.add(wordId);

    // Get the word's compositions (successors in the graph)
    const word = wordMap.get(wordId);
    if (word) {
      for (const composedId of word.composedOf) {
        // Only consider edges to words that exist in our input
        if (!wordMap.has(composedId)) continue;

        if (!indices.has(composedId)) {
          // Successor has not yet been visited; recurse on it
          strongconnect(composedId);
          lowlinks.set(
            wordId,
            Math.min(lowlinks.get(wordId)!, lowlinks.get(composedId)!)
          );
        } else if (onStack.has(composedId)) {
          // Successor is in stack and hence in the current SCC
          lowlinks.set(
            wordId,
            Math.min(lowlinks.get(wordId)!, indices.get(composedId)!)
          );
        }
      }
    }

    // If wordId is a root node, pop the stack and generate an SCC
    if (lowlinks.get(wordId) === indices.get(wordId)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== wordId);
      sccs.push(scc);
    }
  }

  // Run Tarjan's algorithm from each unvisited node
  for (const word of words) {
    if (!indices.has(word.id)) {
      strongconnect(word.id);
    }
  }

  return sccs;
}

/**
 * Detect if a word has a self-loop (references itself in compositions)
 */
export function hasSelfLoop(word: RawWord): boolean {
  return word.composedOf.includes(word.id);
}

/**
 * Determine if an SCC represents a true cycle.
 * A cycle is either:
 * - An SCC with more than one member, or
 * - An SCC with one member that has a self-loop
 */
export function isCycle(scc: string[], words: RawWord[]): boolean {
  if (scc.length > 1) return true;
  if (scc.length === 1) {
    const word = words.find((w) => w.id === scc[0]);
    return word ? hasSelfLoop(word) : false;
  }
  return false;
}
