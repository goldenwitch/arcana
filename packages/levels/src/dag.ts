// @arcana/levels - Cycle collapse logic to produce a DAG

import type { RawWord, DAGWord, Cycle } from "./types.js";
import { findSCCs, isCycle } from "./scc.js";

/**
 * Find all cycles (SCCs that represent true cycles).
 * A cycle is either an SCC with >1 member or a single member with a self-loop.
 *
 * @param words - Array of raw words
 * @returns Array of cycles (members only, level will be computed later)
 */
export function findCycles(words: RawWord[]): Cycle[] {
  const sccs = findSCCs(words);
  const cycles: Cycle[] = [];

  for (const scc of sccs) {
    if (isCycle(scc, words)) {
      cycles.push({
        members: scc,
        level: -1, // Will be computed during level assignment
      });
    }
  }

  return cycles;
}

/**
 * Collapse cycles into single nodes, producing a DAG.
 *
 * Process:
 * 1. Find all SCCs
 * 2. For each non-trivial SCC (cycle), create a single "super-node"
 * 3. Redirect all edges to point to/from the super-node
 * 4. Return the resulting DAG
 *
 * @param words - Array of raw words with potential cycles
 * @returns Array of DAG words (acyclic)
 */
export function collapseToDAG(words: RawWord[]): DAGWord[] {
  const sccs = findSCCs(words);
  const wordMap = new Map<string, RawWord>();
  for (const word of words) {
    wordMap.set(word.id, word);
  }

  // Create mapping from original word ID to collapsed node ID
  const collapseMap = new Map<string, string>();

  // Track which SCCs are cycles
  const cycleSccs: string[][] = [];
  const nonCycleIds = new Set<string>();

  for (const scc of sccs) {
    if (isCycle(scc, words)) {
      cycleSccs.push(scc);
      // All members of the cycle map to the first member's ID (used as cycle ID)
      const cycleId = `cycle:${scc.sort().join("+")}`;
      for (const id of scc) {
        collapseMap.set(id, cycleId);
      }
    } else {
      // Non-cycle SCCs (single nodes without self-loops) map to themselves
      for (const id of scc) {
        collapseMap.set(id, id);
        nonCycleIds.add(id);
      }
    }
  }

  const dagWords: DAGWord[] = [];

  // Add non-cycle words
  for (const id of nonCycleIds) {
    const word = wordMap.get(id)!;
    const composedOf = word.composedOf
      .filter((cid) => wordMap.has(cid)) // Only include edges to known words
      .map((cid) => collapseMap.get(cid)!)
      .filter((cid) => cid !== id); // Remove self-references that don't form cycles

    // Deduplicate compositions
    const uniqueComposedOf = [...new Set(composedOf)];

    dagWords.push({
      id: word.id,
      name: word.name,
      kind: word.kind,
      composedOf: uniqueComposedOf,
    });
  }

  // Add collapsed cycle nodes
  for (const scc of cycleSccs) {
    const cycleId = `cycle:${scc.sort().join("+")}`;

    // Collect all external compositions from cycle members
    const externalCompositions = new Set<string>();
    const memberNames: string[] = [];

    for (const id of scc) {
      const word = wordMap.get(id)!;
      memberNames.push(word.name);
      for (const composedId of word.composedOf) {
        if (!wordMap.has(composedId)) continue;
        const collapsedId = collapseMap.get(composedId)!;
        // Only include edges to nodes outside this cycle
        if (collapsedId !== cycleId) {
          externalCompositions.add(collapsedId);
        }
      }
    }

    dagWords.push({
      id: cycleId,
      name: `[${memberNames.sort().join(", ")}]`,
      kind: "cycle",
      composedOf: [...externalCompositions],
      originalMembers: [...scc],
    });
  }

  return dagWords;
}
