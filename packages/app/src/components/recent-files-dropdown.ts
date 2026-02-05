// @arcana/app - Recent files dropdown component

import { getRecentFiles, type RecentFile } from "../storage/recent-files.js";

/**
 * Callbacks for recent files dropdown actions.
 */
export interface RecentFilesDropdownCallbacks {
  onBrowse: () => void;
  onSelect: (file: RecentFile) => void;
}

/**
 * Recent files dropdown element references.
 */
export interface RecentFilesDropdownElements {
  container: HTMLElement;
  dropdown: HTMLElement;
}

/**
 * Format a timestamp as a relative time string (e.g., "2 min ago").
 */
function formatRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return "just now";
  } else if (diffMin < 60) {
    return `${diffMin} min ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Extract basename from a file path.
 */
function getBasename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/**
 * Create a recent file entry element.
 */
function createRecentFileEntry(
  file: RecentFile,
  onClick: () => void,
): HTMLElement {
  const entry = document.createElement("button");
  entry.className = "recent-file-entry";
  entry.type = "button";

  const nameEl = document.createElement("div");
  nameEl.className = "recent-file-name";
  nameEl.textContent = file.name;

  const metaEl = document.createElement("div");
  metaEl.className = "recent-file-meta";
  const sourceBasename = getBasename(file.source);
  const relativeTime = formatRelativeTime(file.loadedAt);
  metaEl.textContent = `${sourceBasename} · ${file.wordCount} words · ${relativeTime}`;

  entry.appendChild(nameEl);
  entry.appendChild(metaEl);
  entry.addEventListener("click", onClick);

  return entry;
}

/**
 * Create the recent files dropdown component.
 */
export function createRecentFilesDropdown(
  callbacks: RecentFilesDropdownCallbacks,
): RecentFilesDropdownElements {
  // Container wraps the load button and dropdown for positioning
  const container = document.createElement("div");
  container.className = "recent-files-container";

  // Dropdown panel
  const dropdown = document.createElement("div");
  dropdown.className = "recent-files-dropdown";
  dropdown.style.display = "none";

  container.appendChild(dropdown);

  return { container, dropdown };
}

/**
 * Update the dropdown content with current recent files.
 */
export function updateDropdownContent(
  dropdown: HTMLElement,
  callbacks: RecentFilesDropdownCallbacks,
): void {
  dropdown.innerHTML = "";

  const files = getRecentFiles();

  // Header
  const header = document.createElement("div");
  header.className = "recent-files-header";
  header.textContent = "▾ Recent Files";
  dropdown.appendChild(header);

  // File entries
  if (files.length > 0) {
    const list = document.createElement("div");
    list.className = "recent-files-list";

    for (const file of files) {
      const entry = createRecentFileEntry(file, () => {
        callbacks.onSelect(file);
      });
      list.appendChild(entry);
    }

    dropdown.appendChild(list);
  } else {
    const empty = document.createElement("div");
    empty.className = "recent-files-empty";
    empty.textContent = "No recent files";
    dropdown.appendChild(empty);
  }

  // Browse button
  const browseBtn = document.createElement("button");
  browseBtn.className = "recent-files-browse";
  browseBtn.type = "button";
  browseBtn.textContent = "Browse...";
  browseBtn.addEventListener("click", callbacks.onBrowse);
  dropdown.appendChild(browseBtn);
}

/**
 * Show the dropdown.
 */
export function showDropdown(
  dropdown: HTMLElement,
  callbacks: RecentFilesDropdownCallbacks,
): void {
  updateDropdownContent(dropdown, callbacks);
  dropdown.style.display = "block";
}

/**
 * Hide the dropdown.
 */
export function hideDropdown(dropdown: HTMLElement): void {
  dropdown.style.display = "none";
}

/**
 * Toggle the dropdown visibility.
 */
export function toggleDropdown(
  dropdown: HTMLElement,
  callbacks: RecentFilesDropdownCallbacks,
): void {
  if (dropdown.style.display === "none") {
    showDropdown(dropdown, callbacks);
  } else {
    hideDropdown(dropdown);
  }
}

/**
 * Check if the dropdown is currently visible.
 */
export function isDropdownVisible(dropdown: HTMLElement): boolean {
  return dropdown.style.display !== "none";
}
