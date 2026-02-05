// @arcana/viz - D3 SVG renderer

import * as d3 from "d3";
import type { Vocabulary, Word, WordKind } from "@arcana/vocabulary";
import type {
  VizOptions,
  VizColors,
  LayoutResult,
  NodePosition,
} from "./types.js";
import { defaultOptions } from "./types.js";
import { computeLayout, createPositionMap } from "./layout.js";

/**
 * State managed by the renderer.
 */
export interface RendererState {
  selectedId: string | null;
  highlightedIds: Set<string>;
  hoveredId: string | null;
}

/**
 * Event callbacks from the renderer.
 */
export interface RendererCallbacks {
  onSelect: (wordId: string | null) => void;
  onHover: (wordId: string | null) => void;
}

/**
 * D3 selections used by the renderer.
 */
interface RendererSelections {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  zoomGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  edgesGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  nodesGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  labelsGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
}

/**
 * Get the fill color for a word based on its kind.
 */
function getNodeColor(kind: WordKind, colors: Required<VizColors>): string {
  switch (kind) {
    case "primitive":
      return colors.primitive;
    case "generic":
      return colors.generic;
    case "constructed":
      return colors.constructed;
    case "user":
      return colors.user;
    default:
      return colors.primitive;
  }
}

/**
 * Generate a quadratic Bezier curve path between two points.
 * Control point is at midpoint Y with X offset for curve.
 */
function generateEdgePath(
  source: NodePosition,
  target: NodePosition,
  nodeRadius: number
): string {
  // Start from bottom of source node
  const x1 = source.x;
  const y1 = source.y + nodeRadius;

  // End at top of target node
  const x2 = target.x;
  const y2 = target.y - nodeRadius;

  // Control point at midpoint Y, offset X for curve
  const midY = (y1 + y2) / 2;
  const offsetX = (x2 - x1) * 0.2; // Slight horizontal offset for curve

  return `M ${x1} ${y1} Q ${x1 + offsetX} ${midY}, ${x2} ${y2}`;
}

/**
 * Renderer class managing D3 visualization.
 */
export class Renderer {
  private container: HTMLElement;
  private options: Required<Omit<VizOptions, "colors">> & {
    colors: Required<VizColors>;
  };
  private selections: RendererSelections | null = null;
  private vocab: Vocabulary | null = null;
  private layout: LayoutResult | null = null;
  private positionMap: Map<string, NodePosition> = new Map();
  private wordMap: Map<string, Word> = new Map();
  private state: RendererState = {
    selectedId: null,
    highlightedIds: new Set(),
    hoveredId: null,
  };
  private callbacks: RendererCallbacks = {
    onSelect: () => {},
    onHover: () => {},
  };
  private currentZoomScale: number = 1;

  constructor(container: HTMLElement, options?: VizOptions) {
    this.container = container;
    this.options = {
      ...defaultOptions,
      ...options,
      colors: { ...defaultOptions.colors, ...options?.colors },
    };
    this.initialize();
  }

  /**
   * Initialize the SVG structure.
   */
  private initialize(): void {
    const { width, height } = this.options;

    // Create SVG
    const svg = d3
      .select(this.container)
      .append("svg")
      .attr("class", "arcana-viz")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `${-width / 2} 0 ${width} ${height}`);

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
        this.currentZoomScale = event.transform.k;
        this.updateLabelScales();
      });

    svg.call(zoom);

    // Create zoom group
    const zoomGroup = svg.append("g").attr("class", "zoom-group");

    // Create edges group (below nodes)
    const edgesGroup = zoomGroup.append("g").attr("class", "edges");

    // Create nodes group
    const nodesGroup = zoomGroup.append("g").attr("class", "nodes");

    // Create labels group (above nodes for collision-free labels)
    const labelsGroup = zoomGroup.append("g").attr("class", "labels");

    this.selections = {
      svg,
      zoomGroup,
      edgesGroup,
      nodesGroup,
      labelsGroup,
      zoom,
    };
  }

  /**
   * Render or update the visualization with vocabulary data.
   */
  render(vocab: Vocabulary): void {
    if (!this.selections) return;

    this.vocab = vocab;
    this.layout = computeLayout(vocab, this.options);
    this.positionMap = createPositionMap(this.layout);

    // Build word lookup map
    this.wordMap.clear();
    for (const word of vocab.words) {
      this.wordMap.set(word.id, word);
    }

    this.renderEdges();
    this.renderNodes();
    this.updateStyles();
  }

  /**
   * Render edges between nodes.
   */
  private renderEdges(): void {
    if (!this.selections || !this.layout) return;

    const { edgesGroup } = this.selections;
    const { nodeRadius, colors } = this.options;

    // Join edges
    const edges = edgesGroup
      .selectAll<SVGPathElement, (typeof this.layout.edges)[0]>("path.edge")
      .data(this.layout.edges, (d) => `${d.sourceId}-${d.targetId}`);

    // Remove old edges
    edges.exit().remove();

    // Add new edges
    const newEdges = edges.enter().append("path").attr("class", "edge");

    // Update all edges
    edges
      .merge(newEdges)
      .attr("d", (d) => {
        const source = this.positionMap.get(d.sourceId);
        const target = this.positionMap.get(d.targetId);
        if (!source || !target) return "";
        return generateEdgePath(source, target, nodeRadius);
      })
      .attr("fill", "none")
      .attr("stroke", colors.edge)
      .attr("stroke-width", 1)
      .attr("opacity", 0.25);
  }

  /**
   * Render word nodes (circles only - labels are rendered separately).
   */
  private renderNodes(): void {
    if (!this.selections || !this.layout) return;

    const { nodesGroup } = this.selections;
    const { nodeRadius, colors } = this.options;

    // Join nodes
    const nodes = nodesGroup
      .selectAll<SVGGElement, NodePosition>("g.node")
      .data(this.layout.nodes, (d) => d.id);

    // Remove old nodes
    nodes.exit().remove();

    // Add new nodes
    const newNodes = nodes
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("data-id", (d) => d.id)
      .style("cursor", "pointer");

    // Add circle to new nodes
    newNodes.append("circle").attr("r", nodeRadius);

    // Update all nodes
    const allNodes = nodes.merge(newNodes);

    allNodes.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

    // Update circles
    allNodes.select("circle").attr("fill", (d) => {
      const word = this.wordMap.get(d.id);
      return word ? getNodeColor(word.kind, colors) : colors.primitive;
    });

    // Add event handlers
    allNodes
      .on("click", (_event, d) => {
        this.callbacks.onSelect(d.id);
      })
      .on("mouseenter", (_event, d) => {
        this.callbacks.onHover(d.id);
      })
      .on("mouseleave", () => {
        this.callbacks.onHover(null);
      });

    // Render floating labels with collision avoidance
    this.renderLabels();
  }

  /**
   * Label data with position for collision avoidance.
   */
  private labelPositions: Map<string, { x: number; y: number }> = new Map();

  /**
   * Render floating labels with collision avoidance.
   */
  private renderLabels(): void {
    if (!this.selections || !this.layout) return;

    const { labelsGroup } = this.selections;
    const { nodeRadius } = this.options;

    // Prepare label data with initial positions below nodes
    interface LabelData {
      id: string;
      nodeX: number;
      nodeY: number;
      x: number;
      y: number;
      text: string;
      width: number;
      height: number;
    }

    const labelData: LabelData[] = this.layout.nodes.map((node) => {
      const word = this.wordMap.get(node.id);
      const text = word ? word.name : node.id;
      // Estimate text width (will be measured more accurately after render)
      const estimatedWidth = text.length * 7;
      return {
        id: node.id,
        nodeX: node.x,
        nodeY: node.y,
        x: node.x,
        y: node.y + nodeRadius + 14,
        text,
        width: estimatedWidth,
        height: 16,
      };
    });

    // Join labels
    const labels = labelsGroup
      .selectAll<SVGGElement, LabelData>("g.label")
      .data(labelData, (d) => d.id);

    // Remove old labels
    labels.exit().remove();

    // Add new labels
    const newLabels = labels
      .enter()
      .append("g")
      .attr("class", "label")
      .attr("data-id", (d) => d.id)
      .style("pointer-events", "none"); // Labels don't capture events

    // Add background rect
    newLabels
      .append("rect")
      .attr("class", "label-bg")
      .attr("fill", "rgba(255, 255, 255, 0.92)")
      .attr("stroke", "rgba(0, 0, 0, 0.08)")
      .attr("stroke-width", 0.5)
      .attr("rx", 3)
      .attr("ry", 3);

    // Add text
    newLabels
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .attr("fill", "#1f2937");

    // Update all labels
    const allLabels = labels.merge(newLabels);

    // Update text content
    allLabels.select("text").text((d) => d.text);

    // Measure actual text sizes and update data
    allLabels.each(function (d) {
      const label = d3.select(this);
      const textEl = label.select("text").node() as SVGTextElement;
      if (textEl) {
        const bbox = textEl.getBBox();
        d.width = bbox.width + 8; // Add padding
        d.height = bbox.height + 4;
      }
    });

    // Apply collision avoidance using simple iterative relaxation
    this.resolveCollisions(labelData);

    // Position labels after collision resolution with counter-scaling for zoom
    const scale = 1 / this.currentZoomScale;
    allLabels.attr("transform", (d) => `translate(${d.x}, ${d.y}) scale(${scale})`);

    // Size and position background rects
    allLabels.each(function (d) {
      const label = d3.select(this);
      const rect = label.select("rect.label-bg");
      rect
        .attr("x", -d.width / 2)
        .attr("y", -d.height / 2)
        .attr("width", d.width)
        .attr("height", d.height);
    });

    // Store positions for potential future use
    labelData.forEach((d) => {
      this.labelPositions.set(d.id, { x: d.x, y: d.y });
    });
  }

  /**
   * Update label scales to maintain constant screen size during zoom.
   */
  private updateLabelScales(): void {
    if (!this.selections) return;

    const { labelsGroup } = this.selections;
    const scale = 1 / this.currentZoomScale;

    labelsGroup.selectAll<SVGGElement, { x: number; y: number }>("g.label").each(function (d) {
      d3.select(this).attr("transform", `translate(${d.x}, ${d.y}) scale(${scale})`);
    });
  }

  /**
   * Resolve label collisions using iterative relaxation.
   */
  private resolveCollisions(labels: { x: number; y: number; width: number; height: number; nodeX: number; nodeY: number }[]): void {
    const padding = 2;
    const iterations = 50;
    const damping = 0.3;

    for (let iter = 0; iter < iterations; iter++) {
      let moved = false;

      for (let i = 0; i < labels.length; i++) {
        const a = labels[i]!;
        for (let j = i + 1; j < labels.length; j++) {
          const b = labels[j]!;

          // Check for overlap
          const overlapX = (a.width + b.width) / 2 + padding - Math.abs(a.x - b.x);
          const overlapY = (a.height + b.height) / 2 + padding - Math.abs(a.y - b.y);

          if (overlapX > 0 && overlapY > 0) {
            // There's overlap - push labels apart
            moved = true;

            // Determine direction to push (prefer vertical displacement)
            const dx = a.x - b.x;
            const dy = a.y - b.y;

            if (overlapY < overlapX) {
              // Push vertically (less overlap in Y)
              const push = overlapY * damping * 0.5;
              if (dy > 0) {
                a.y += push;
                b.y -= push;
              } else {
                a.y -= push;
                b.y += push;
              }
            } else {
              // Push horizontally
              const push = overlapX * damping * 0.5;
              if (dx > 0) {
                a.x += push;
                b.x -= push;
              } else {
                a.x -= push;
                b.x += push;
              }
            }
          }
        }
      }

      // Pull labels back towards their anchor nodes (elastic constraint)
      for (const label of labels) {
        const pullStrength = 0.05;
        label.x += (label.nodeX - label.x) * pullStrength;
        // Keep labels below nodes, but allow some vertical freedom
        const targetY = label.nodeY + 20;
        label.y += (targetY - label.y) * pullStrength * 0.3;
      }

      if (!moved) break;
    }
  }

  /**
   * Update visual styles based on state.
   */
  updateStyles(): void {
    if (!this.selections) return;

    const { nodesGroup, edgesGroup } = this.selections;
    const { colors, nodeRadius } = this.options;
    const { selectedId, highlightedIds, hoveredId } = this.state;

    // Update node styles
    nodesGroup.selectAll<SVGGElement, NodePosition>("g.node").each(function (d) {
      const node = d3.select(this);
      const circle = node.select("circle");

      const isSelected = d.id === selectedId;
      const isHighlighted = highlightedIds.has(d.id);
      const isHovered = d.id === hoveredId;

      // Determine stroke
      if (isSelected) {
        circle
          .attr("stroke", colors.selected)
          .attr("stroke-width", 3)
          .attr("r", nodeRadius + 2);
      } else if (isHighlighted) {
        circle
          .attr("stroke", colors.highlighted)
          .attr("stroke-width", 2)
          .attr("r", nodeRadius + 1);
      } else if (isHovered) {
        circle
          .attr("stroke", colors.highlighted)
          .attr("stroke-width", 2)
          .attr("r", nodeRadius + 1);
      } else {
        circle.attr("stroke", "none").attr("stroke-width", 0).attr("r", nodeRadius);
      }
    });

    // Update edge styles for hover/selection
    edgesGroup
      .selectAll<SVGPathElement, { sourceId: string; targetId: string }>("path.edge")
      .each(function (d) {
        const path = d3.select(this);

        // Highlight edges connected to hovered or selected node
        const isConnected =
          d.sourceId === hoveredId ||
          d.targetId === hoveredId ||
          d.sourceId === selectedId ||
          d.targetId === selectedId;

        if (isConnected) {
          path.attr("stroke", colors.highlighted).attr("opacity", 0.8).attr("stroke-width", 2);
        } else {
          path.attr("stroke", colors.edge).attr("opacity", 0.25).attr("stroke-width", 1);
        }
      });
  }

  /**
   * Set state and update styles.
   */
  setState(state: Partial<RendererState>): void {
    Object.assign(this.state, state);
    this.updateStyles();
  }

  /**
   * Get current state.
   */
  getState(): RendererState {
    return { ...this.state };
  }

  /**
   * Set event callbacks.
   */
  setCallbacks(callbacks: Partial<RendererCallbacks>): void {
    Object.assign(this.callbacks, callbacks);
  }

  /**
   * Zoom in by a fixed factor.
   */
  zoomIn(): void {
    if (!this.selections) return;
    const { svg, zoom } = this.selections;
    svg.transition().duration(300).call(zoom.scaleBy, 1.5);
  }

  /**
   * Zoom out by a fixed factor.
   */
  zoomOut(): void {
    if (!this.selections) return;
    const { svg, zoom } = this.selections;
    svg.transition().duration(300).call(zoom.scaleBy, 0.67);
  }

  /**
   * Reset to initial view.
   */
  resetView(): void {
    if (!this.selections) return;
    const { svg, zoom } = this.selections;
    svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
  }

  /**
   * Pan to center on coordinates.
   */
  panTo(x: number, y: number): void {
    if (!this.selections) return;
    const { svg, zoom } = this.selections;
    const { width, height } = this.options;
    svg
      .transition()
      .duration(300)
      .call(zoom.transform, d3.zoomIdentity.translate(width / 2 - x, height / 2 - y));
  }

  /**
   * Pan to center on a specific level.
   */
  panToLevel(level: number): void {
    if (!this.selections || !this.layout) return;
    const y = this.layout.levelYPositions.get(level);
    if (y !== undefined) {
      // Pan to center on this level's Y position, keeping X centered
      this.panTo(0, y);
    }
  }

  /**
   * Clean up and remove the SVG.
   */
  destroy(): void {
    if (this.selections) {
      this.selections.svg.remove();
      this.selections = null;
    }
    this.vocab = null;
    this.layout = null;
    this.positionMap.clear();
    this.wordMap.clear();
  }
}
