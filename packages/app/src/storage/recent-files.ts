// @arcana/app - Recent files storage

const STORAGE_KEY = "arcana:recent-files";
const MAX_ENTRIES = 10;

/**
 * A recently loaded vocabulary file entry.
 */
export interface RecentFile {
  /** Display name (filename) */
  name: string;
  /** Original source path from vocabulary metadata */
  source: string;
  /** Word count */
  wordCount: number;
  /** Max level */
  maxLevel: number;
  /** When this file was loaded */
  loadedAt: string; // ISO timestamp
}

/**
 * Add or update a recent file entry.
 * If the file already exists (by source), it moves to the top with updated metadata.
 * Uses FIFO eviction when max entries is reached.
 */
export function addRecentFile(file: RecentFile): void {
  try {
    const files = getRecentFiles();

    // Remove existing entry with same source (will re-add at top)
    const filtered = files.filter((f) => f.source !== file.source);

    // Add new entry at the beginning
    filtered.unshift(file);

    // Trim to max entries
    const trimmed = filtered.slice(0, MAX_ENTRIES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    // Gracefully handle localStorage errors (private browsing, quota exceeded, etc.)
    console.warn("Failed to save recent file:", error);
  }
}

/**
 * Get all recent files, most recent first.
 */
export function getRecentFiles(): RecentFile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate entries have required fields
    return parsed.filter(
      (entry): entry is RecentFile =>
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.name === "string" &&
        typeof entry.source === "string" &&
        typeof entry.wordCount === "number" &&
        typeof entry.maxLevel === "number" &&
        typeof entry.loadedAt === "string",
    );
  } catch (error) {
    // Gracefully handle localStorage errors or invalid JSON
    console.warn("Failed to read recent files:", error);
    return [];
  }
}

/**
 * Clear all recent files history.
 */
export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear recent files:", error);
  }
}
