// @arcana/app - Application state management

import type { Vocabulary, Word } from "@arcana/vocabulary";
import { reachableFrom } from "@arcana/phrase";

/**
 * Application state.
 */
export interface AppState {
  /** Loaded vocabulary data */
  vocabulary: Vocabulary | null;
  /** Currently selected word ID */
  selectedWordId: string | null;
  /** Current search query */
  searchQuery: string;
  /** Whether detail panel is open */
  detailPanelOpen: boolean;
  /** Entry point IDs for phrase view (null = show full vocabulary) */
  phraseEntryPoints: string[] | null;
}

/**
 * Level statistics derived from vocabulary.
 */
export interface LevelStats {
  /** Current level (selected word's level, or 0) */
  current: number;
  /** Maximum level in vocabulary */
  max: number;
  /** Total word count */
  count: number;
}

/**
 * Create initial application state.
 */
export function createAppState(): AppState {
  return {
    vocabulary: null,
    selectedWordId: null,
    searchQuery: "",
    detailPanelOpen: false,
    phraseEntryPoints: null,
  };
}

/**
 * Set vocabulary data, resetting selection.
 */
export function setVocabulary(state: AppState, vocab: Vocabulary): AppState {
  return {
    ...state,
    vocabulary: vocab,
    selectedWordId: null,
    detailPanelOpen: false,
    phraseEntryPoints: null,
  };
}

/**
 * Set selected word ID.
 */
export function setSelectedWord(
  state: AppState,
  wordId: string | null,
): AppState {
  return {
    ...state,
    selectedWordId: wordId,
    detailPanelOpen: wordId !== null,
  };
}

/**
 * Set search query.
 */
export function setSearchQuery(state: AppState, query: string): AppState {
  return {
    ...state,
    searchQuery: query,
  };
}

/**
 * Toggle detail panel visibility.
 */
export function toggleDetailPanel(state: AppState): AppState {
  return {
    ...state,
    detailPanelOpen: !state.detailPanelOpen,
  };
}

/**
 * Get words filtered by search query.
 * Matches words whose name contains the query (case-insensitive).
 */
export function getFilteredWords(state: AppState): Word[] {
  if (!state.vocabulary) {
    return [];
  }
  const query = state.searchQuery.toLowerCase().trim();
  if (!query) {
    return state.vocabulary.words;
  }
  return state.vocabulary.words.filter((word) =>
    word.name.toLowerCase().includes(query),
  );
}

/**
 * Get the currently selected word.
 */
export function getSelectedWord(state: AppState): Word | null {
  if (!state.vocabulary || !state.selectedWordId) {
    return null;
  }
  return (
    state.vocabulary.words.find((word) => word.id === state.selectedWordId) ??
    null
  );
}

/**
 * Get level statistics from vocabulary.
 */
export function getLevelStats(state: AppState): LevelStats {
  if (!state.vocabulary || state.vocabulary.words.length === 0) {
    return { current: 0, max: 0, count: 0 };
  }

  const words = state.vocabulary.words;
  const maxLevel = Math.max(...words.map((w) => w.level));
  const selectedWord = getSelectedWord(state);
  const currentLevel = selectedWord?.level ?? 0;

  return {
    current: currentLevel,
    max: maxLevel,
    count: words.length,
  };
}

/**
 * Get words that depend on the selected word (have it in composedOf).
 */
export function getDependents(state: AppState): Word[] {
  if (!state.vocabulary || !state.selectedWordId) {
    return [];
  }
  return state.vocabulary.words.filter((word) =>
    word.composedOf.includes(state.selectedWordId!),
  );
}

/**
 * Count of words at each level.
 * Map from level number to word count.
 */
export type LevelCounts = Map<number, number>;

/**
 * Get word counts per level from vocabulary.
 */
export function getLevelCounts(state: AppState): LevelCounts {
  const counts = new Map<number, number>();
  if (!state.vocabulary) {
    return counts;
  }
  for (const word of state.vocabulary.words) {
    const current = counts.get(word.level) ?? 0;
    counts.set(word.level, current + 1);
  }
  return counts;
}

/**
 * Set phrase entry points (or null to show full vocabulary).
 */
export function setPhraseEntryPoints(
  state: AppState,
  entryPoints: string[] | null,
): AppState {
  return {
    ...state,
    phraseEntryPoints: entryPoints,
  };
}

/**
 * Toggle a word in the phrase entry points.
 * If not viewing a phrase, starts a new phrase with this word.
 * If viewing a phrase, adds or removes the word from entry points.
 */
export function togglePhraseEntryPoint(
  state: AppState,
  wordId: string,
): AppState {
  const current = state.phraseEntryPoints ?? [];
  const index = current.indexOf(wordId);
  
  let newEntryPoints: string[];
  if (index === -1) {
    // Add to phrase
    newEntryPoints = [...current, wordId];
  } else {
    // Remove from phrase
    newEntryPoints = current.filter((id) => id !== wordId);
  }
  
  // If no entry points left, exit phrase view
  if (newEntryPoints.length === 0) {
    return {
      ...state,
      phraseEntryPoints: null,
    };
  }
  
  return {
    ...state,
    phraseEntryPoints: newEntryPoints,
  };
}

/**
 * Check if currently viewing a phrase (filtered view).
 */
export function isViewingPhrase(state: AppState): boolean {
  return state.phraseEntryPoints !== null && state.phraseEntryPoints.length > 0;
}

/**
 * Get phrase entry point words.
 */
export function getPhraseEntryWords(state: AppState): Word[] {
  if (!state.vocabulary || !state.phraseEntryPoints) {
    return [];
  }
  return state.vocabulary.words.filter((w) =>
    state.phraseEntryPoints!.includes(w.id),
  );
}

/**
 * Get all words in the phrase (entry points + all their transitive dependencies).
 */
export function getPhraseMembers(state: AppState): Word[] {
  if (!state.vocabulary || !state.phraseEntryPoints || state.phraseEntryPoints.length === 0) {
    return [];
  }

  // Compute all reachable IDs from all entry points
  const phraseIds = new Set<string>();
  for (const entryId of state.phraseEntryPoints) {
    const reachable = reachableFrom(state.vocabulary, entryId);
    for (const id of reachable) {
      phraseIds.add(id);
    }
  }

  // Return words sorted by level (descending) then name
  return state.vocabulary.words
    .filter((w) => phraseIds.has(w.id))
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
}
