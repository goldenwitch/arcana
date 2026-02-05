// @arcana/app - Controls bar component

import type { LevelStats, LevelCounts } from "../state.js";

/**
 * Callbacks for control actions.
 */
export interface ControlsCallbacks {
  onSearchChange: (query: string) => void;
  onLevelClick?: (level: number) => void;
}

/**
 * Elements within the controls bar for updates.
 */
export interface ControlsElements {
  container: HTMLElement;
  searchInput: HTMLInputElement;
  levelIndicator: HTMLElement;
  wordCount: HTMLElement;
  /** Callback for level clicks - stored for dynamic pill creation */
  onLevelClick: ((level: number) => void) | undefined;
}

/**
 * Create controls bar with search, level indicator, and word count.
 */
export function createControls(callbacks: ControlsCallbacks): ControlsElements {
  const container = document.createElement("div");
  container.className = "controls-bar";

  // Search input with debounce
  const searchWrapper = document.createElement("div");
  searchWrapper.className = "search-wrapper";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "search-input";
  searchInput.placeholder = "Search words...";

  let debounceTimer: ReturnType<typeof setTimeout>;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      callbacks.onSearchChange(searchInput.value);
    }, 200);
  });

  searchWrapper.appendChild(searchInput);

  // Level indicator container for pills
  const levelIndicator = document.createElement("div");
  levelIndicator.className = "level-indicator";
  
  // Label
  const levelLabel = document.createElement("span");
  levelLabel.className = "level-label";
  levelLabel.textContent = "Levels:";
  levelIndicator.appendChild(levelLabel);

  // Pills container
  const pillsContainer = document.createElement("div");
  pillsContainer.className = "level-pills";
  levelIndicator.appendChild(pillsContainer);

  // Word count
  const wordCount = document.createElement("div");
  wordCount.className = "word-count";
  wordCount.textContent = "0 words";

  container.appendChild(searchWrapper);
  container.appendChild(levelIndicator);
  container.appendChild(wordCount);

  return { container, searchInput, levelIndicator, wordCount, onLevelClick: callbacks.onLevelClick };
}

/**
 * Update the level indicator display with clickable pills.
 */
export function updateLevelIndicator(
  element: HTMLElement,
  stats: LevelStats,
  levelCounts?: LevelCounts,
  onLevelClick?: (level: number) => void,
): void {
  const pillsContainer = element.querySelector(".level-pills");
  if (!pillsContainer) {
    // Fallback for old structure
    if (stats.max === 0) {
      element.textContent = "Level: -/-";
    } else {
      element.textContent = `Level: ${stats.current}/${stats.max}`;
    }
    return;
  }

  // Clear existing pills
  pillsContainer.innerHTML = "";

  if (stats.max === 0) {
    const emptyPill = document.createElement("span");
    emptyPill.className = "level-pill level-pill-empty";
    emptyPill.textContent = "-";
    pillsContainer.appendChild(emptyPill);
    return;
  }

  // Create a pill for each level
  for (let level = 0; level <= stats.max; level++) {
    const count = levelCounts?.get(level) ?? 0;
    const isCurrentLevel = level === stats.current;

    const pill = document.createElement("button");
    pill.className = "level-pill";
    if (isCurrentLevel) {
      pill.classList.add("level-pill-active");
    }
    pill.textContent = String(level);
    pill.title = `${count} word${count !== 1 ? "s" : ""} at level ${level}`;
    pill.setAttribute("aria-label", `Navigate to level ${level}`);

    if (onLevelClick) {
      pill.addEventListener("click", () => onLevelClick(level));
    }

    pillsContainer.appendChild(pill);
  }
}

/**
 * Update the word count display.
 */
export function updateWordCount(
  element: HTMLElement,
  total: number,
  filtered: number,
  isPhrase: boolean = false,
): void {
  if (total === 0) {
    element.textContent = "0 words";
  } else if (isPhrase) {
    element.textContent = `${total} words (phrase)`;
    element.classList.add("phrase-active");
  } else if (filtered === total) {
    element.textContent = `${total} words`;
    element.classList.remove("phrase-active");
  } else {
    element.textContent = `${filtered}/${total} words`;
    element.classList.remove("phrase-active");
  }
}
