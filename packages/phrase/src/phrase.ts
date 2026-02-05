// @arcana/phrase - Phrase computation

import type { Vocabulary } from "@arcana/vocabulary";
import { reachableFrom } from "./reachable.js";

/**
 * Compute a phrase - vocabulary filtered to entry points and their transitive compositions.
 *
 * A phrase is a subset of vocabulary containing:
 * - All entry point words that exist in the vocabulary
 * - All words transitively composed by those entry points
 *
 * @param vocab - The source vocabulary
 * @param entryPoints - Word IDs defining the phrase entry points
 * @returns A new vocabulary containing only the phrase words, with preserved metadata
 */
export function computePhrase(
  vocab: Vocabulary,
  entryPoints: string[]
): Vocabulary {
  // Compute the union of all reachable words from all entry points
  const reachableIds = new Set<string>();

  for (const entryPoint of entryPoints) {
    const reachable = reachableFrom(vocab, entryPoint);
    for (const id of reachable) {
      reachableIds.add(id);
    }
  }

  // Filter vocabulary words to only those in the reachable set
  const phraseWords = vocab.words.filter((word) => reachableIds.has(word.id));

  return {
    words: phraseWords,
    metadata: vocab.metadata,
  };
}
