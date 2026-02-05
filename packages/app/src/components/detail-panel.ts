// @arcana/app - Detail panel component

import type { Word } from "@arcana/vocabulary";

/**
 * Callbacks for detail panel actions.
 */
export interface DetailPanelCallbacks {
  onClose: () => void;
  onWordClick: (wordId: string) => void;
  onViewPhrase?: (wordId: string) => void;
  onExitPhrase?: () => void;
}

/**
 * Elements within the detail panel for updates.
 */
export interface DetailPanelElements {
  container: HTMLElement;
  content: HTMLElement;
}

/**
 * Options for detail panel rendering.
 */
export interface DetailPanelOptions {
  /** Whether currently viewing a phrase */
  isViewingPhrase: boolean;
  /** Entry point word names if viewing phrase */
  phraseEntryNames?: string[];
  /** Entry point word IDs if viewing phrase */
  phraseEntryIds?: string[];
  /** All words in the phrase (entry points + dependencies) */
  phraseMembers?: Word[];
}

/**
 * Create detail panel for showing word information.
 */
export function createDetailPanel(
  callbacks: DetailPanelCallbacks,
): DetailPanelElements {
  const container = document.createElement("aside");
  container.className = "detail-panel";

  // Header with close button
  const header = document.createElement("div");
  header.className = "detail-header";

  const title = document.createElement("h2");
  title.className = "detail-title";
  title.textContent = "Details";

  const closeButton = document.createElement("button");
  closeButton.className = "detail-close";
  closeButton.textContent = "×";
  closeButton.type = "button";
  closeButton.addEventListener("click", callbacks.onClose);

  header.appendChild(title);
  header.appendChild(closeButton);

  // Content area
  const content = document.createElement("div");
  content.className = "detail-content";

  container.appendChild(header);
  container.appendChild(content);

  return { container, content };
}

/**
 * Update detail panel to show word information or phrase summary.
 */
export function updateDetailPanel(
  elements: DetailPanelElements,
  word: Word | null,
  dependents: Word[],
  allWords: Word[],
  callbacks: DetailPanelCallbacks,
  options: DetailPanelOptions = { isViewingPhrase: false },
): void {
  const { container, content } = elements;

  // Show phrase summary when viewing a phrase
  if (options.isViewingPhrase && options.phraseMembers && options.phraseMembers.length > 0) {
    container.classList.add("open");
    content.innerHTML = "";

    // Phrase header
    const phraseHeader = document.createElement("div");
    phraseHeader.className = "phrase-header";

    const title = document.createElement("h3");
    title.className = "detail-word-name";
    title.textContent = "Phrase";

    const exitButton = document.createElement("button");
    exitButton.className = "phrase-exit-button";
    exitButton.textContent = "Clear";
    exitButton.type = "button";
    exitButton.title = "Exit phrase view and show full vocabulary";
    exitButton.addEventListener("click", () => callbacks.onExitPhrase?.());

    phraseHeader.appendChild(title);
    phraseHeader.appendChild(exitButton);
    content.appendChild(phraseHeader);

    // Entry points section
    if (options.phraseEntryIds && options.phraseEntryIds.length > 0) {
      const entrySection = document.createElement("div");
      entrySection.className = "detail-section";

      const entryTitle = document.createElement("h4");
      entryTitle.textContent = `Entry Points (${options.phraseEntryIds.length})`;
      entrySection.appendChild(entryTitle);

      const entryList = document.createElement("ul");
      entryList.className = "word-list";

      for (const entryId of options.phraseEntryIds) {
        const entryWord = allWords.find((w) => w.id === entryId);
        if (entryWord) {
          const li = document.createElement("li");
          const button = document.createElement("button");
          button.className = "word-link entry-point";
          button.textContent = `${entryWord.name} ✕`;
          button.type = "button";
          button.title = `Remove ${entryWord.name} from phrase`;
          button.addEventListener("click", () => callbacks.onWordClick(entryWord.id));
          li.appendChild(button);
          entryList.appendChild(li);
        }
      }

      entrySection.appendChild(entryList);
      content.appendChild(entrySection);
    }

    // Phrase members by level
    const membersByLevel = new Map<number, Word[]>();
    for (const member of options.phraseMembers) {
      const level = member.level;
      if (!membersByLevel.has(level)) {
        membersByLevel.set(level, []);
      }
      membersByLevel.get(level)!.push(member);
    }

    // Sort levels descending
    const sortedLevels = [...membersByLevel.keys()].sort((a, b) => b - a);

    const membersSection = document.createElement("div");
    membersSection.className = "detail-section";

    const membersTitle = document.createElement("h4");
    membersTitle.textContent = `Members (${options.phraseMembers.length})`;
    membersSection.appendChild(membersTitle);

    for (const level of sortedLevels) {
      const levelWords = membersByLevel.get(level)!;
      
      const levelGroup = document.createElement("div");
      levelGroup.className = "phrase-level-group";

      const levelLabel = document.createElement("span");
      levelLabel.className = "phrase-level-label";
      levelLabel.textContent = `L${level}`;
      levelGroup.appendChild(levelLabel);

      const wordList = document.createElement("span");
      wordList.className = "phrase-level-words";
      wordList.textContent = levelWords.map((w) => w.name).join(", ");
      levelGroup.appendChild(wordList);

      membersSection.appendChild(levelGroup);
    }

    content.appendChild(membersSection);
    return;
  }

  // No phrase and no selected word - close panel
  if (!word) {
    container.classList.remove("open");
    content.innerHTML = "";
    return;
  }

  // Single word view (legacy, when not in phrase mode)
  container.classList.add("open");
  content.innerHTML = "";

  // Word name
  const name = document.createElement("h3");
  name.className = "detail-word-name";
  name.textContent = word.name;
  content.appendChild(name);

  // Word ID (if different from name)
  if (word.id !== word.name) {
    const id = document.createElement("p");
    id.className = "detail-word-id";
    id.textContent = word.id;
    content.appendChild(id);
  }

  // Phrase action button - toggle word in/out of phrase
  if (callbacks.onViewPhrase) {
    const isInPhrase = options.phraseEntryIds?.includes(word.id) ?? false;
    const phraseButton = document.createElement("button");
    phraseButton.className = "view-phrase-button";
    phraseButton.textContent = isInPhrase ? "Remove from Phrase" : "Add to Phrase";
    phraseButton.type = "button";
    phraseButton.title = isInPhrase 
      ? `Remove ${word.name} from phrase entry points`
      : `Add ${word.name} and its transitive dependencies to phrase`;
    phraseButton.addEventListener("click", () => callbacks.onViewPhrase!(word.id));
    content.appendChild(phraseButton);
  }

  // Properties
  const props = document.createElement("dl");
  props.className = "detail-props";

  addProperty(props, "Kind", word.kind);
  addProperty(props, "Level", String(word.level));

  content.appendChild(props);

  // Compositions (what this word is made of)
  if (word.composedOf.length > 0) {
    const compositionsSection = document.createElement("div");
    compositionsSection.className = "detail-section";

    const compositionsTitle = document.createElement("h4");
    compositionsTitle.textContent = `Composed of (${word.composedOf.length})`;
    compositionsSection.appendChild(compositionsTitle);

    const compositionsList = document.createElement("ul");
    compositionsList.className = "word-list";

    for (const depId of word.composedOf) {
      const dep = allWords.find((w) => w.id === depId);
      const li = createWordListItem(dep ?? { id: depId, name: depId, kind: "user", level: 0, composedOf: [] }, callbacks);
      compositionsList.appendChild(li);
    }

    compositionsSection.appendChild(compositionsList);
    content.appendChild(compositionsSection);
  }

  // Dependents (what depends on this word)
  if (dependents.length > 0) {
    const dependentsSection = document.createElement("div");
    dependentsSection.className = "detail-section";

    const dependentsTitle = document.createElement("h4");
    dependentsTitle.textContent = `Used by (${dependents.length})`;
    dependentsSection.appendChild(dependentsTitle);

    const dependentsList = document.createElement("ul");
    dependentsList.className = "word-list";

    for (const dep of dependents) {
      const li = createWordListItem(dep, callbacks);
      dependentsList.appendChild(li);
    }

    dependentsSection.appendChild(dependentsList);
    content.appendChild(dependentsSection);
  }
}

function addProperty(container: HTMLElement, label: string, value: string): void {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  container.appendChild(dt);
  container.appendChild(dd);
}

function createWordListItem(word: Word, callbacks: DetailPanelCallbacks): HTMLLIElement {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.className = "word-link";
  button.textContent = word.name;
  button.type = "button";
  button.addEventListener("click", () => callbacks.onWordClick(word.id));
  li.appendChild(button);
  return li;
}
