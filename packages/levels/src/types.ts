// @arcana/levels - Type definitions

/**
 * Input type - word before level computation
 */
export interface RawWord {
  id: string;
  name: string;
  kind: "primitive" | "generic" | "constructed" | "user";
  composedOf: string[]; // IDs of composed words
}

/**
 * Output type - word after level computation
 */
export interface LeveledWord extends RawWord {
  level: number;
}

/**
 * Cycle information - represents a strongly connected component
 */
export interface Cycle {
  members: string[]; // IDs of words in the cycle
  level: number; // computed level of the cycle
}

/**
 * DAG word after cycle collapse (for internal use)
 * Cycles are collapsed into single nodes with kind "cycle"
 */
export interface DAGWord {
  id: string;
  name: string;
  kind: "primitive" | "generic" | "constructed" | "user" | "cycle";
  composedOf: string[];
  originalMembers?: string[]; // For cycle nodes, the original word IDs
}
