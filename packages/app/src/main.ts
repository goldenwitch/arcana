// @arcana/app - Application entry point

import { parseVocabulary } from "@arcana/vocabulary";
import { createVisualization, type VizController } from "@arcana/viz";

import {
  createAppState,
  setVocabulary,
  setSelectedWord,
  setSearchQuery,
  setPhraseEntryPoints,
  togglePhraseEntryPoint,
  isViewingPhrase,
  getPhraseEntryWords,
  getPhraseMembers,
  getFilteredWords,
  getSelectedWord,
  getLevelStats,
  getLevelCounts,
  getDependents,
  type AppState,
} from "./state.js";

import {
  createHeader,
  createFileInput,
  updateHeaderSubtitle,
  type HeaderElements,
} from "./components/header.js";
import {
  createRecentFilesDropdown,
  toggleDropdown,
  hideDropdown,
  isDropdownVisible,
  type RecentFilesDropdownElements,
  type RecentFilesDropdownCallbacks,
} from "./components/recent-files-dropdown.js";
import {
  addRecentFile,
} from "./storage/recent-files.js";
import {
  createControls,
  updateLevelIndicator,
  updateWordCount,
  type ControlsElements,
} from "./components/controls.js";
import {
  createDetailPanel,
  updateDetailPanel,
  type DetailPanelElements,
} from "./components/detail-panel.js";
import { createLegend } from "./components/legend.js";

import "./styles/main.css";

// Application state
let state: AppState = createAppState();
let vizController: VizController | null = null;

// UI element references
let headerElements: HeaderElements;
let controlsElements: ControlsElements;
let detailPanelElements: DetailPanelElements;
let vizContainer: HTMLElement;
let recentFilesDropdown: RecentFilesDropdownElements;
let fileInput: HTMLInputElement;

/**
 * Update state and re-render affected components.
 */
function updateState(newState: AppState): void {
  const prevState = state;
  state = newState;

  // Always use full vocabulary for stats and visualization
  const vocab = state.vocabulary;

  // Update controls based on full vocabulary
  const stats = getLevelStats(state);
  const levelCounts = getLevelCounts(state);
  updateLevelIndicator(
    controlsElements.levelIndicator, 
    stats, 
    levelCounts, 
    controlsElements.onLevelClick
  );

  const totalWords = vocab?.words.length ?? 0;
  const filteredWords = getFilteredWords(state);
  
  // Show phrase indicator in word count if viewing phrase
  if (isViewingPhrase(state)) {
    updateWordCount(controlsElements.wordCount, totalWords, filteredWords.length, true);
  } else {
    updateWordCount(controlsElements.wordCount, totalWords, filteredWords.length, false);
  }

  // Update detail panel with phrase options
  const selectedWord = getSelectedWord(state);
  const dependents = getDependents(state);
  const phraseEntryWords = getPhraseEntryWords(state);
  const phraseMembers = getPhraseMembers(state);
  updateDetailPanel(
    detailPanelElements,
    selectedWord,
    dependents,
    vocab?.words ?? [],
    {
      onClose: () => {
        updateState(setSelectedWord(state, null));
        if (isViewingPhrase(state)) {
          updateState(setPhraseEntryPoints(state, null));
        }
      },
      onWordClick: (wordId) => {
        // Clicking a word in the panel toggles it in the phrase
        updateState(togglePhraseEntryPoint(state, wordId));
      },
      onViewPhrase: (wordId) => {
        updateState(togglePhraseEntryPoint(state, wordId));
      },
      onExitPhrase: () => {
        updateState(setPhraseEntryPoints(state, null));
      },
    },
    {
      isViewingPhrase: isViewingPhrase(state),
      phraseEntryNames: phraseEntryWords.map((w) => w.name),
      phraseEntryIds: state.phraseEntryPoints ?? [],
      phraseMembers,
    },
  );

  // Update visualization phrase focus when phrase entry points change
  if (
    state.phraseEntryPoints !== prevState.phraseEntryPoints &&
    vizController
  ) {
    if (state.phraseEntryPoints && state.phraseEntryPoints.length > 0) {
      // Focus on phrase - clusters phrase members and dims others
      vizController.focusPhrase(state.phraseEntryPoints);
    } else {
      // Clear phrase focus - return to default layout
      vizController.clearFocus();
    }
  }

  // Update visualization highlighting for search
  if (state.searchQuery !== prevState.searchQuery && vizController) {
    const matchingIds = filteredWords.map((w) => w.id);
    if (state.searchQuery.trim()) {
      vizController.highlight(matchingIds);
    } else {
      vizController.clearHighlight();
    }
  }

  // Sync visualization selection
  if (state.selectedWordId !== prevState.selectedWordId && vizController) {
    vizController.select(state.selectedWordId);
  }
}

/**
 * Load vocabulary from JSON data.
 */
function loadVocabulary(json: unknown, fileName?: string): void {
  try {
    const vocab = parseVocabulary(json);

    // Update state
    updateState(setVocabulary(state, vocab));

    // Calculate max level
    const maxLevel = Math.max(...vocab.words.map((w) => w.level));

    // Update header subtitle with vocabulary metadata
    updateHeaderSubtitle(headerElements.subtitle, {
      source: vocab.metadata.source,
      wordCount: vocab.words.length,
      maxLevel,
    });

    // Add to recent files history
    const displayName = fileName ?? vocab.metadata.source.split(/[\\/]/).pop() ?? "vocabulary.json";
    addRecentFile({
      name: displayName,
      source: vocab.metadata.source,
      wordCount: vocab.words.length,
      maxLevel,
      loadedAt: new Date().toISOString(),
    });

    // Create or update visualization
    if (vizController) {
      vizController.update(vocab);
    } else {
      vizController = createVisualization(vizContainer, vocab, {
        width: vizContainer.clientWidth,
        height: vizContainer.clientHeight,
      });

      // Wire up visualization events
      vizController.onSelect((wordId) => {
        // Clicking a node adds it to the phrase (or removes if already in phrase)
        if (wordId) {
          updateState(togglePhraseEntryPoint(state, wordId));
        }
      });

      vizController.onHover((wordId) => {
        // Skip hover highlighting in phrase mode (phrase dimming handles visibility)
        if (isViewingPhrase(state)) return;
        
        if (wordId && !state.searchQuery.trim()) {
          vizController?.highlight([wordId]);
        } else if (!state.searchQuery.trim()) {
          vizController?.clearHighlight();
        }
      });
    }

    // Remove empty state
    const emptyState = vizContainer.querySelector(".empty-state");
    if (emptyState) {
      emptyState.remove();
    }
  } catch (error) {
    console.error("Failed to load vocabulary:", error);
    alert(
      `Failed to load vocabulary: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Handle file selection or drop.
 */
async function handleFile(file: File): Promise<void> {
  if (!file.name.endsWith(".json")) {
    alert("Please select a JSON file.");
    return;
  }

  try {
    const text = await file.text();
    const json = JSON.parse(text);
    loadVocabulary(json, file.name);
  } catch (error) {
    console.error("Failed to read file:", error);
    alert("Failed to read file. Please ensure it's a valid JSON file.");
  }
}

/**
 * Set up drag and drop on the window.
 */
function setupDragAndDrop(): void {
  const dropZone = document.createElement("div");
  dropZone.className = "drop-zone";
  dropZone.innerHTML = `
    <div class="drop-zone-content">
      <h2>Drop Vocabulary File</h2>
      <p>Release to load vocabulary.json</p>
    </div>
  `;
  vizContainer.appendChild(dropZone);

  let dragCounter = 0;

  document.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    dropZone.classList.add("active");
  });

  document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      dropZone.classList.remove("active");
    }
  });

  document.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  document.addEventListener("drop", async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropZone.classList.remove("active");

    const file = e.dataTransfer?.files[0];
    if (file) {
      await handleFile(file);
    }
  });
}

/**
 * Initialize the application.
 */
function init(): void {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("App container not found");
  }

  // Create file input
  fileInput = createFileInput(handleFile);
  app.appendChild(fileInput);

  // Dropdown callbacks
  const dropdownCallbacks: RecentFilesDropdownCallbacks = {
    onBrowse: () => {
      hideDropdown(recentFilesDropdown.dropdown);
      fileInput.click();
    },
    onSelect: () => {
      // Due to browser security, we can't directly load the file
      // Clicking an entry opens the file picker as a hint
      hideDropdown(recentFilesDropdown.dropdown);
      fileInput.click();
    },
  };

  // Create header with dropdown
  headerElements = createHeader({
    onLoad: () => {
      toggleDropdown(recentFilesDropdown.dropdown, dropdownCallbacks);
    },
  });

  // Create recent files dropdown and attach to header
  recentFilesDropdown = createRecentFilesDropdown(dropdownCallbacks);
  headerElements.loadButtonContainer.appendChild(recentFilesDropdown.dropdown);

  app.appendChild(headerElements.container);

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const target = e.target as Node;
    const isInsideDropdown = recentFilesDropdown.dropdown.contains(target);
    const isLoadButton = headerElements.loadButton.contains(target);

    if (!isInsideDropdown && !isLoadButton && isDropdownVisible(recentFilesDropdown.dropdown)) {
      hideDropdown(recentFilesDropdown.dropdown);
    }
  });

  // Create main content area
  const mainContent = document.createElement("main");
  mainContent.className = "main-content";

  // Create visualization container
  vizContainer = document.createElement("div");
  vizContainer.className = "viz-container";

  // Create empty state
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.innerHTML = `
    <h2>No Vocabulary Loaded</h2>
    <p>Drag and drop a vocabulary.json file or click Load to get started.</p>
  `;
  vizContainer.appendChild(emptyState);

  // Create color legend
  const legend = createLegend();
  vizContainer.appendChild(legend);

  // Create detail panel
  detailPanelElements = createDetailPanel({
    onClose: () => updateState(setSelectedWord(state, null)),
    onWordClick: (wordId) => {
      updateState(setSelectedWord(state, wordId));
      vizController?.select(wordId);
    },
  });

  mainContent.appendChild(vizContainer);
  mainContent.appendChild(detailPanelElements.container);
  app.appendChild(mainContent);

  // Create controls bar
  controlsElements = createControls({
    onSearchChange: (query) => updateState(setSearchQuery(state, query)),
    onLevelClick: (level) => vizController?.panToLevel(level),
  });
  app.appendChild(controlsElements.container);

  // Set up drag and drop
  setupDragAndDrop();

  // Handle window resize
  window.addEventListener("resize", () => {
    if (vizController && state.vocabulary) {
      vizController.update(state.vocabulary);
    }
  });

  // Initial render
  updateState(state);
}

// Start application
init();
