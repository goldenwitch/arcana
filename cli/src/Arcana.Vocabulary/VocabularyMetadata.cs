using System.Text.Json.Serialization;

namespace Arcana.Vocabulary;

/// <summary>
/// Metadata about a vocabulary extraction.
/// </summary>
public sealed record VocabularyMetadata
{
    /// <summary>Source path that was analyzed.</summary>
    [JsonPropertyName("source")]
    public required string Source { get; init; }

    /// <summary>ISO 8601 timestamp of extraction.</summary>
    [JsonPropertyName("extracted")]
    public required string Extracted { get; init; }
}
