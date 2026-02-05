// @arcana/app - Color legend component

/**
 * Node type colors matching @arcana/viz defaultColors.
 */
const nodeColors = {
  user: "#4ade80", // green-400 - User-defined types
  primitive: "#9ca3af", // gray-400 - Primitive/BCL types
  generic: "#60a5fa", // blue-400 - Generic types
  constructed: "#818cf8", // indigo-400 - Constructed generics
} as const;

/**
 * Legend entry configuration.
 */
interface LegendEntry {
  label: string;
  color: string;
}

/**
 * Legend entries to display (prioritized).
 */
const legendEntries: LegendEntry[] = [
  { label: "User type", color: nodeColors.user },
  { label: "Primitive/BCL", color: nodeColors.primitive },
  { label: "Generic", color: nodeColors.generic },
  { label: "Constructed", color: nodeColors.constructed },
];

/**
 * Create a single legend entry element.
 */
function createLegendEntry(entry: LegendEntry): HTMLElement {
  const entryElement = document.createElement("span");
  entryElement.className = "legend-entry";

  const dot = document.createElement("span");
  dot.className = "legend-dot";
  dot.style.backgroundColor = entry.color;

  const label = document.createElement("span");
  label.className = "legend-label";
  label.textContent = entry.label;

  entryElement.appendChild(dot);
  entryElement.appendChild(label);

  return entryElement;
}

/**
 * Create the color legend element.
 */
export function createLegend(): HTMLElement {
  const container = document.createElement("div");
  container.className = "viz-legend";

  for (const entry of legendEntries) {
    container.appendChild(createLegendEntry(entry));
  }

  return container;
}
