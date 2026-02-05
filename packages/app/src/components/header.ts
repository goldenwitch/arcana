// @arcana/app - Header component

/**
 * Callbacks for header actions.
 */
export interface HeaderCallbacks {
  onLoad: () => void;
}

/**
 * Header element references for external updates.
 */
export interface HeaderElements {
  container: HTMLElement;
  subtitle: HTMLElement;
  loadButtonContainer: HTMLElement;
  loadButton: HTMLButtonElement;
}

/**
 * Metadata to display in the header subtitle.
 */
export interface HeaderMetadata {
  source: string;
  wordCount: number;
  maxLevel: number;
}

/**
 * Create header element with title and load button.
 */
export function createHeader(callbacks: HeaderCallbacks): HeaderElements {
  const header = document.createElement("header");
  header.className = "app-header";

  const titleGroup = document.createElement("div");
  titleGroup.className = "app-title-group";

  const title = document.createElement("h1");
  title.className = "app-title";
  title.textContent = "Arcana";

  const subtitle = document.createElement("div");
  subtitle.className = "app-subtitle";
  subtitle.style.display = "none";

  titleGroup.appendChild(title);
  titleGroup.appendChild(subtitle);

  // Container for load button and dropdown
  const loadButtonContainer = document.createElement("div");
  loadButtonContainer.className = "load-button-container";

  const loadButton = document.createElement("button");
  loadButton.className = "load-button";
  loadButton.textContent = "Load";
  loadButton.type = "button";
  loadButton.addEventListener("click", callbacks.onLoad);

  loadButtonContainer.appendChild(loadButton);

  header.appendChild(titleGroup);
  header.appendChild(loadButtonContainer);

  return { container: header, subtitle, loadButtonContainer, loadButton };
}

/**
 * Update the header subtitle with vocabulary metadata.
 */
export function updateHeaderSubtitle(
  element: HTMLElement,
  metadata: HeaderMetadata | null,
): void {
  if (!metadata) {
    element.style.display = "none";
    element.textContent = "";
    return;
  }

  // Extract basename from source path
  const basename = metadata.source.split(/[\\/]/).pop() ?? metadata.source;

  element.textContent = `${basename} · ${metadata.wordCount} words · ${metadata.maxLevel} levels`;
  element.style.display = "block";
}

/**
 * Create hidden file input for loading vocabulary files.
 */
export function createFileInput(
  onFileSelected: (file: File) => void,
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.style.display = "none";

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) {
      onFileSelected(file);
      input.value = ""; // Reset for re-selection
    }
  });

  return input;
}
