// @arcana/viz - Controller behavior tests

import { describe, it, expect, vi, beforeEach } from "vitest";

// Since controller depends on DOM and D3, we test state management logic
// by extracting and testing the pure state transitions

/**
 * Mock controller state for testing state management logic
 * without DOM dependencies.
 */
interface ControllerState {
  selectedId: string | null;
  highlightedIds: Set<string>;
}

/**
 * Create a testable state manager that mirrors controller behavior.
 */
function createStateManager() {
  let state: ControllerState = {
    selectedId: null,
    highlightedIds: new Set(),
  };

  const selectCallbacks = new Set<(id: string | null) => void>();
  const hoverCallbacks = new Set<(id: string | null) => void>();

  return {
    // Selection
    select(wordId: string | null): void {
      state.selectedId = wordId;
      for (const cb of selectCallbacks) {
        cb(wordId);
      }
    },

    toggleSelect(wordId: string): void {
      if (state.selectedId === wordId) {
        state.selectedId = null;
      } else {
        state.selectedId = wordId;
      }
      for (const cb of selectCallbacks) {
        cb(state.selectedId);
      }
    },

    getSelection(): string | null {
      return state.selectedId;
    },

    // Highlighting
    highlight(wordIds: string[]): void {
      state.highlightedIds = new Set(wordIds);
    },

    clearHighlight(): void {
      state.highlightedIds = new Set();
    },

    getHighlighted(): Set<string> {
      return new Set(state.highlightedIds);
    },

    // Events
    onSelect(callback: (id: string | null) => void): () => void {
      selectCallbacks.add(callback);
      return () => selectCallbacks.delete(callback);
    },

    onHover(callback: (id: string | null) => void): () => void {
      hoverCallbacks.add(callback);
      return () => hoverCallbacks.delete(callback);
    },

    // For testing: simulate hover event
    simulateHover(wordId: string | null): void {
      for (const cb of hoverCallbacks) {
        cb(wordId);
      }
    },

    // Cleanup
    destroy(): void {
      selectCallbacks.clear();
      hoverCallbacks.clear();
      state = { selectedId: null, highlightedIds: new Set() };
    },
  };
}

describe("Controller State Management", () => {
  let manager: ReturnType<typeof createStateManager>;

  beforeEach(() => {
    manager = createStateManager();
  });

  describe("selection", () => {
    it("starts with null selection", () => {
      expect(manager.getSelection()).toBeNull();
    });

    it("select() updates selection state", () => {
      manager.select("word-1");
      expect(manager.getSelection()).toBe("word-1");
    });

    it("select(null) clears selection", () => {
      manager.select("word-1");
      manager.select(null);
      expect(manager.getSelection()).toBeNull();
    });

    it("toggleSelect() selects when nothing selected", () => {
      manager.toggleSelect("word-1");
      expect(manager.getSelection()).toBe("word-1");
    });

    it("toggleSelect() deselects when same word clicked", () => {
      manager.select("word-1");
      manager.toggleSelect("word-1");
      expect(manager.getSelection()).toBeNull();
    });

    it("toggleSelect() changes selection to different word", () => {
      manager.select("word-1");
      manager.toggleSelect("word-2");
      expect(manager.getSelection()).toBe("word-2");
    });
  });

  describe("highlighting", () => {
    it("starts with no highlights", () => {
      expect(manager.getHighlighted().size).toBe(0);
    });

    it("highlight() sets highlighted words", () => {
      manager.highlight(["word-1", "word-2"]);
      const highlighted = manager.getHighlighted();
      expect(highlighted.has("word-1")).toBe(true);
      expect(highlighted.has("word-2")).toBe(true);
      expect(highlighted.size).toBe(2);
    });

    it("highlight() replaces previous highlights", () => {
      manager.highlight(["word-1"]);
      manager.highlight(["word-2", "word-3"]);
      const highlighted = manager.getHighlighted();
      expect(highlighted.has("word-1")).toBe(false);
      expect(highlighted.has("word-2")).toBe(true);
      expect(highlighted.has("word-3")).toBe(true);
    });

    it("clearHighlight() removes all highlights", () => {
      manager.highlight(["word-1", "word-2"]);
      manager.clearHighlight();
      expect(manager.getHighlighted().size).toBe(0);
    });
  });

  describe("event callbacks", () => {
    it("onSelect callback is invoked on selection", () => {
      const callback = vi.fn();
      manager.onSelect(callback);

      manager.select("word-1");

      expect(callback).toHaveBeenCalledWith("word-1");
    });

    it("onSelect callback receives null on deselection", () => {
      const callback = vi.fn();
      manager.onSelect(callback);

      manager.select("word-1");
      manager.select(null);

      expect(callback).toHaveBeenLastCalledWith(null);
    });

    it("multiple onSelect callbacks are all invoked", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      manager.onSelect(cb1);
      manager.onSelect(cb2);

      manager.select("word-1");

      expect(cb1).toHaveBeenCalledWith("word-1");
      expect(cb2).toHaveBeenCalledWith("word-1");
    });

    it("onSelect returns unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = manager.onSelect(callback);

      manager.select("word-1");
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.select("word-2");
      expect(callback).toHaveBeenCalledTimes(1); // Not called again
    });

    it("onHover callback is invoked on hover", () => {
      const callback = vi.fn();
      manager.onHover(callback);

      manager.simulateHover("word-1");

      expect(callback).toHaveBeenCalledWith("word-1");
    });

    it("onHover callback receives null on mouse leave", () => {
      const callback = vi.fn();
      manager.onHover(callback);

      manager.simulateHover("word-1");
      manager.simulateHover(null);

      expect(callback).toHaveBeenLastCalledWith(null);
    });

    it("onHover returns unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = manager.onHover(callback);

      manager.simulateHover("word-1");
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.simulateHover("word-2");
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("destroy", () => {
    it("destroy() clears all state", () => {
      manager.select("word-1");
      manager.highlight(["word-2"]);
      manager.destroy();

      expect(manager.getSelection()).toBeNull();
      expect(manager.getHighlighted().size).toBe(0);
    });

    it("destroy() removes all listeners", () => {
      const selectCb = vi.fn();
      const hoverCb = vi.fn();
      manager.onSelect(selectCb);
      manager.onHover(hoverCb);

      manager.destroy();

      manager.select("word-1");
      manager.simulateHover("word-2");

      expect(selectCb).not.toHaveBeenCalled();
      expect(hoverCb).not.toHaveBeenCalled();
    });
  });
});

describe("Controller Integration (conceptual)", () => {
  // These tests document the expected behavior of the full controller
  // They would require JSDOM or similar to run against the real implementation

  it.skip("createVisualization returns a VizController", () => {
    // Would test: const controller = createVisualization(container, vocab);
    // Verify controller has all required methods
  });

  it.skip("clicking a node fires onSelect callback", () => {
    // Would test: click event triggers selection callback
  });

  it.skip("hovering a node fires onHover callback", () => {
    // Would test: mouseenter/mouseleave events trigger hover callback
  });

  it.skip("zoomIn/zoomOut modify the transform", () => {
    // Would test: zoom functions change SVG transform
  });

  it.skip("update() re-renders with new vocabulary", () => {
    // Would test: calling update() changes the rendered nodes
  });

  it.skip("destroy() removes the SVG from DOM", () => {
    // Would test: destroy() cleans up the container
  });
});
