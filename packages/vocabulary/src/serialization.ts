// @arcana/vocabulary - Parse and serialize functions

import { ZodError } from "zod";
import type { Vocabulary } from "./types.js";
import { VocabularySchema } from "./schema.js";

/**
 * Error thrown when vocabulary parsing fails.
 */
export class VocabularyParseError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "VocabularyParseError";
    this.cause = cause;
  }
}

/**
 * Parse and validate a vocabulary from unknown JSON input.
 *
 * @param json - The unknown input to parse (typically from JSON.parse)
 * @returns A validated Vocabulary object
 * @throws VocabularyParseError if validation fails
 */
export function parseVocabulary(json: unknown): Vocabulary {
  try {
    return VocabularySchema.parse(json);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      throw new VocabularyParseError(`Invalid vocabulary:\n${issues}`, error);
    }
    throw new VocabularyParseError("Failed to parse vocabulary", error);
  }
}

/**
 * Serialize a vocabulary to canonical JSON.
 *
 * Produces deterministic output:
 * - Keys are in declaration order (consistent with schema)
 * - 2-space indentation for readability
 * - Words array preserves input order
 *
 * @param vocabulary - The vocabulary to serialize
 * @returns A JSON string
 */
export function serializeVocabulary(vocabulary: Vocabulary): string {
  // Ensure canonical key ordering by rebuilding the object
  const canonical: Vocabulary = {
    words: vocabulary.words.map((word) => ({
      id: word.id,
      name: word.name,
      kind: word.kind,
      level: word.level,
      composedOf: [...word.composedOf],
    })),
    metadata: {
      source: vocabulary.metadata.source,
      extracted: vocabulary.metadata.extracted,
    },
  };

  return JSON.stringify(canonical, null, 2);
}
