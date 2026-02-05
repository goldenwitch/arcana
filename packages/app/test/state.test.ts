// @arcana/app - State management tests

import { describe, it, expect } from "vitest";
import type { Vocabulary, Word } from "@arcana/vocabulary";
import {
  createAppState,
  setVocabulary,
  setSelectedWord,
  setSearchQuery,
  toggleDetailPanel,
  getFilteredWords,
  getSelectedWord,
  getLevelStats,
  getDependents,
} from "../src/state.js";

// Test fixtures
const mockWords: Word[] = [
  { id: "string", name: "string", kind: "primitive", level: 0, composedOf: [] },
  { id: "int", name: "int", kind: "primitive", level: 0, composedOf: [] },
  {
    id: "List<T>",
    name: "List<T>",
    kind: "generic",
    level: 1,
    composedOf: [],
  },
  {
    id: "List<string>",
    name: "List<string>",
    kind: "constructed",
    level: 1,
    composedOf: ["string"],
  },
  {
    id: "User",
    name: "User",
    kind: "user",
    level: 1,
    composedOf: ["string", "int"],
  },
  {
    id: "UserList",
    name: "UserList",
    kind: "user",
    level: 2,
    composedOf: ["User", "List<T>"],
  },
];

const mockVocabulary: Vocabulary = {
  words: mockWords,
  metadata: {
    source: "test.sln",
    extracted: "2024-01-01T00:00:00Z",
  },
};

describe("createAppState", () => {
  it("creates initial state with null vocabulary", () => {
    const state = createAppState();
    expect(state.vocabulary).toBeNull();
    expect(state.selectedWordId).toBeNull();
    expect(state.searchQuery).toBe("");
    expect(state.detailPanelOpen).toBe(false);
  });
});

describe("setVocabulary", () => {
  it("updates state with vocabulary", () => {
    const initial = createAppState();
    const updated = setVocabulary(initial, mockVocabulary);

    expect(updated.vocabulary).toBe(mockVocabulary);
    expect(updated.selectedWordId).toBeNull();
    expect(updated.detailPanelOpen).toBe(false);
  });

  it("resets selection when vocabulary changes", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSelectedWord(state, "User");
    state = setVocabulary(state, mockVocabulary);

    expect(state.selectedWordId).toBeNull();
  });

  it("returns new object (immutable)", () => {
    const initial = createAppState();
    const updated = setVocabulary(initial, mockVocabulary);

    expect(updated).not.toBe(initial);
  });
});

describe("setSelectedWord", () => {
  it("updates selected word ID", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSelectedWord(state, "User");

    expect(state.selectedWordId).toBe("User");
  });

  it("opens detail panel when word selected", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSelectedWord(state, "User");

    expect(state.detailPanelOpen).toBe(true);
  });

  it("clears selection with null", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSelectedWord(state, "User");
    state = setSelectedWord(state, null);

    expect(state.selectedWordId).toBeNull();
  });

  it("closes detail panel when selection cleared", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSelectedWord(state, "User");
    state = setSelectedWord(state, null);

    expect(state.detailPanelOpen).toBe(false);
  });

  it("returns new object (immutable)", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    const before = state;
    state = setSelectedWord(state, "User");

    expect(state).not.toBe(before);
  });
});

describe("setSearchQuery", () => {
  it("updates search query", () => {
    let state = createAppState();
    state = setSearchQuery(state, "user");

    expect(state.searchQuery).toBe("user");
  });

  it("returns new object (immutable)", () => {
    const initial = createAppState();
    const updated = setSearchQuery(initial, "test");

    expect(updated).not.toBe(initial);
  });
});

describe("toggleDetailPanel", () => {
  it("toggles panel open", () => {
    let state = createAppState();
    state = toggleDetailPanel(state);

    expect(state.detailPanelOpen).toBe(true);
  });

  it("toggles panel closed", () => {
    let state = createAppState();
    state = toggleDetailPanel(state);
    state = toggleDetailPanel(state);

    expect(state.detailPanelOpen).toBe(false);
  });

  it("returns new object (immutable)", () => {
    const initial = createAppState();
    const updated = toggleDetailPanel(initial);

    expect(updated).not.toBe(initial);
  });
});

describe("getFilteredWords", () => {
  it("returns empty array when no vocabulary", () => {
    const state = createAppState();
    const filtered = getFilteredWords(state);

    expect(filtered).toEqual([]);
  });

  it("returns all words when no search query", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    const filtered = getFilteredWords(state);

    expect(filtered).toEqual(mockWords);
  });

  it("filters by name containing query (case-insensitive)", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSearchQuery(state, "user");
    const filtered = getFilteredWords(state);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((w) => w.id)).toContain("User");
    expect(filtered.map((w) => w.id)).toContain("UserList");
  });

  it("filters by partial match", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSearchQuery(state, "list");
    const filtered = getFilteredWords(state);

    expect(filtered).toHaveLength(3);
    expect(filtered.map((w) => w.id)).toContain("List<T>");
    expect(filtered.map((w) => w.id)).toContain("List<string>");
    expect(filtered.map((w) => w.id)).toContain("UserList");
  });

  it("returns empty array when no matches", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSearchQuery(state, "xyz");
    const filtered = getFilteredWords(state);

    expect(filtered).toEqual([]);
  });

  it("handles whitespace in query", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSearchQuery(state, "  user  ");
    const filtered = getFilteredWords(state);

    expect(filtered).toHaveLength(2);
  });
});

describe("getSelectedWord", () => {
  it("returns null when no vocabulary", () => {
    const state = createAppState();
    const word = getSelectedWord(state);

    expect(word).toBeNull();
  });

  it("returns null when no selection", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    const word = getSelectedWord(state);

    expect(word).toBeNull();
  });

  it("returns selected word", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSelectedWord(state, "User");
    const word = getSelectedWord(state);

    expect(word).not.toBeNull();
    expect(word?.id).toBe("User");
    expect(word?.name).toBe("User");
  });

  it("returns null for invalid word ID", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSelectedWord(state, "NonExistent");
    const word = getSelectedWord(state);

    expect(word).toBeNull();
  });
});

describe("getLevelStats", () => {
  it("returns zeros when no vocabulary", () => {
    const state = createAppState();
    const stats = getLevelStats(state);

    expect(stats).toEqual({ current: 0, max: 0, count: 0 });
  });

  it("returns correct max level and count", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    const stats = getLevelStats(state);

    expect(stats.max).toBe(2);
    expect(stats.count).toBe(6);
  });

  it("returns selected word level as current", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSelectedWord(state, "UserList");
    const stats = getLevelStats(state);

    expect(stats.current).toBe(2);
  });

  it("returns 0 as current when no selection", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    const stats = getLevelStats(state);

    expect(stats.current).toBe(0);
  });

  it("handles empty vocabulary", () => {
    const emptyVocab: Vocabulary = {
      words: [],
      metadata: { source: "test.sln", extracted: "2024-01-01T00:00:00Z" },
    };
    let state = createAppState();
    state = setVocabulary(state, emptyVocab);
    const stats = getLevelStats(state);

    expect(stats).toEqual({ current: 0, max: 0, count: 0 });
  });
});

describe("getDependents", () => {
  it("returns empty array when no vocabulary", () => {
    const state = createAppState();
    const deps = getDependents(state);

    expect(deps).toEqual([]);
  });

  it("returns empty array when no selection", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    const deps = getDependents(state);

    expect(deps).toEqual([]);
  });

  it("returns words that depend on selected word", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSelectedWord(state, "string");
    const deps = getDependents(state);

    expect(deps).toHaveLength(2);
    expect(deps.map((w) => w.id)).toContain("List<string>");
    expect(deps.map((w) => w.id)).toContain("User");
  });

  it("returns empty array when no dependents", () => {
    let state = createAppState();
    state = setVocabulary(state, mockVocabulary);
    state = setSelectedWord(state, "UserList");
    const deps = getDependents(state);

    expect(deps).toEqual([]);
  });
});
