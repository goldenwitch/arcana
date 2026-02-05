// @arcana/vocabulary - Type definitions

/**
 * The kind of a vocabulary word.
 * - primitive: Built-in types (string, int, bool, etc.)
 * - generic: Generic type definitions (List<T>, Dictionary<K,V>, etc.)
 * - constructed: Instantiated generics (List<string>, etc.)
 * - user: User-defined types (classes, structs, records, etc.)
 */
export type WordKind = "primitive" | "generic" | "constructed" | "user";

/**
 * A semantic unit in the vocabulary.
 */
export interface Word {
  /** Unique identifier (typically the fully qualified type name) */
  id: string;
  /** Display name */
  name: string;
  /** Classification of the word */
  kind: WordKind;
  /** Computed depth in the dependency graph (primitives = 0) */
  level: number;
  /** IDs of words this word composes/depends on */
  composedOf: string[];
}

/**
 * Metadata about the vocabulary extraction.
 */
export interface VocabularyMetadata {
  /** Source path (solution or project file) */
  source: string;
  /** ISO 8601 timestamp of extraction */
  extracted: string;
}

/**
 * Complete vocabulary extracted from a codebase.
 */
export interface Vocabulary {
  /** All words in the vocabulary */
  words: Word[];
  /** Extraction metadata */
  metadata: VocabularyMetadata;
}
