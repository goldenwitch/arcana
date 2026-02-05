// @arcana/vocabulary - Zod schemas for validation

import { z } from "zod";
import type { Word, WordKind, Vocabulary, VocabularyMetadata } from "./types.js";

/**
 * Schema for WordKind union type.
 */
export const WordKindSchema = z.enum(["primitive", "generic", "constructed", "user"]);

/**
 * Schema for a vocabulary word.
 * Strict mode: rejects objects with extra properties.
 */
export const WordSchema = z
  .object({
    id: z.string().min(1, "Word id cannot be empty"),
    name: z.string().min(1, "Word name cannot be empty"),
    kind: WordKindSchema,
    level: z.number().int().nonnegative("Level must be a non-negative integer"),
    composedOf: z.array(z.string()),
  })
  .strict() satisfies z.ZodType<Word>;

/**
 * Schema for vocabulary metadata.
 * Strict mode: rejects objects with extra properties.
 */
export const VocabularyMetadataSchema = z
  .object({
    source: z.string().min(1, "Source path cannot be empty"),
    extracted: z.string().datetime({ message: "Extracted must be a valid ISO 8601 timestamp" }),
  })
  .strict() satisfies z.ZodType<VocabularyMetadata>;

/**
 * Schema for the complete vocabulary.
 * Strict mode: rejects objects with extra properties.
 */
export const VocabularySchema = z
  .object({
    words: z.array(WordSchema),
    metadata: VocabularyMetadataSchema,
  })
  .strict() satisfies z.ZodType<Vocabulary>;

// Re-export inferred types for consumers who prefer schema-first
export type WordKindInferred = z.infer<typeof WordKindSchema>;
export type WordInferred = z.infer<typeof WordSchema>;
export type VocabularyMetadataInferred = z.infer<typeof VocabularyMetadataSchema>;
export type VocabularyInferred = z.infer<typeof VocabularySchema>;
