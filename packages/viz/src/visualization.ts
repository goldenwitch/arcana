// @arcana/viz - Main entry point

import type { Vocabulary } from "@arcana/vocabulary";
import type { VizController, VizOptions } from "./types.js";
import { createController } from "./controller.js";

/**
 * Create a visualization for a vocabulary.
 *
 * @param container - The HTML element to render into
 * @param vocab - The vocabulary data to visualize
 * @param options - Optional configuration
 * @returns A controller for interacting with the visualization
 *
 * @example
 * ```typescript
 * const viz = createVisualization(
 *   document.getElementById('viz-container')!,
 *   vocabulary,
 *   { width: 1200, height: 800 }
 * );
 *
 * // Subscribe to selection events
 * viz.onSelect((wordId) => {
 *   console.log('Selected:', wordId);
 * });
 *
 * // Clean up when done
 * viz.destroy();
 * ```
 */
export function createVisualization(
  container: HTMLElement,
  vocab: Vocabulary,
  options?: VizOptions
): VizController {
  return createController(container, vocab, options);
}
