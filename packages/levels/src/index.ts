// @arcana/levels - Level computation logic

// Types
export type {
  RawWord,
  LeveledWord,
  Cycle,
  DAGWord,
} from "./types.js";

// Core functions
export { computeLevels } from "./levels.js";
export { findCycles, collapseToDAG } from "./dag.js";

// Lower-level utilities (for advanced use)
export { findSCCs, hasSelfLoop, isCycle } from "./scc.js";
