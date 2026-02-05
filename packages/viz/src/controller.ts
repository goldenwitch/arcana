// @arcana/viz - VizController implementation

import type { Vocabulary } from "@arcana/vocabulary";
import { reachableFrom } from "@arcana/phrase";
import type { VizController, VizOptions, PhraseFocusOptions } from "./types.js";
import { Renderer } from "./renderer.js";

/**
 * Callback type for event subscriptions.
 */
type SelectCallback = (wordId: string | null) => void;
type HoverCallback = (wordId: string | null) => void;
type FocusChangeCallback = (entryPointIds: string[]) => void;

/**
 * Create a VizController for managing the visualization.
 */
export function createController(
  container: HTMLElement,
  vocab: Vocabulary,
  options?: VizOptions
): VizController {
  const renderer = new Renderer(container, options);

  // Selection state
  let selectedId: string | null = null;

  // Highlighted IDs
  const highlightedIds = new Set<string>();

  // Phrase focus state
  let currentVocab = vocab;
  let phraseEntryPoints: string[] = [];

  // Event subscribers
  const selectCallbacks = new Set<SelectCallback>();
  const hoverCallbacks = new Set<HoverCallback>();
  const focusChangeCallbacks = new Set<FocusChangeCallback>();

  // Wire up renderer callbacks
  renderer.setCallbacks({
    onSelect: (wordId) => {
      // Toggle selection on click
      if (wordId === selectedId) {
        selectedId = null;
      } else {
        selectedId = wordId;
      }
      renderer.setState({ selectedId });
      // Notify subscribers
      for (const cb of selectCallbacks) {
        cb(selectedId);
      }
    },
    onHover: (wordId) => {
      renderer.setState({ hoveredId: wordId });
      // Notify subscribers
      for (const cb of hoverCallbacks) {
        cb(wordId);
      }
    },
    onFocusChange: (entryPointIds) => {
      phraseEntryPoints = entryPointIds;
      // Notify subscribers
      for (const cb of focusChangeCallbacks) {
        cb(entryPointIds);
      }
    },
  });

  // Initial render
  renderer.render(vocab);

  const controller: VizController = {
    // Navigation
    zoomIn(): void {
      renderer.zoomIn();
    },

    zoomOut(): void {
      renderer.zoomOut();
    },

    resetView(): void {
      renderer.resetView();
    },

    panTo(x: number, y: number): void {
      renderer.panTo(x, y);
    },

    panToLevel(level: number): void {
      renderer.panToLevel(level);
    },

    // Selection
    select(wordId: string | null): void {
      selectedId = wordId;
      renderer.setState({ selectedId });
      // Notify subscribers
      for (const cb of selectCallbacks) {
        cb(selectedId);
      }
    },

    getSelection(): string | null {
      return selectedId;
    },

    // Highlighting
    highlight(wordIds: string[]): void {
      highlightedIds.clear();
      for (const id of wordIds) {
        highlightedIds.add(id);
      }
      renderer.setState({ highlightedIds: new Set(highlightedIds) });
    },

    clearHighlight(): void {
      highlightedIds.clear();
      renderer.setState({ highlightedIds: new Set() });
    },

    // Lifecycle
    update(newVocab: Vocabulary): void {
      currentVocab = newVocab;
      renderer.render(newVocab);
    },

    destroy(): void {
      selectCallbacks.clear();
      hoverCallbacks.clear();
      focusChangeCallbacks.clear();
      renderer.destroy();
    },

    // Events
    onSelect(callback: SelectCallback): () => void {
      selectCallbacks.add(callback);
      return () => {
        selectCallbacks.delete(callback);
      };
    },

    onHover(callback: HoverCallback): () => void {
      hoverCallbacks.add(callback);
      return () => {
        hoverCallbacks.delete(callback);
      };
    },

    // Phrase Focus
    focusPhrase(entryPointIds: string[]): void {
      if (entryPointIds.length === 0) {
        controller.clearFocus();
        return;
      }

      // Compute phrase members using reachableFrom for each entry point
      const phraseIds = new Set<string>();
      for (const entryId of entryPointIds) {
        const reachable = reachableFrom(currentVocab, entryId);
        for (const id of reachable) {
          phraseIds.add(id);
        }
      }

      phraseEntryPoints = entryPointIds;
      renderer.focusPhrase(phraseIds, entryPointIds);
    },

    clearFocus(): void {
      phraseEntryPoints = [];
      renderer.clearFocus();
    },

    setFocusOptions(opts: Partial<PhraseFocusOptions>): void {
      renderer.setPhraseFocusOptions(opts);
    },

    onFocusChange(callback: FocusChangeCallback): () => void {
      focusChangeCallbacks.add(callback);
      return () => {
        focusChangeCallbacks.delete(callback);
      };
    },
  };

  return controller;
}
