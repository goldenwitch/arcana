using System.Text.Json.Serialization;

namespace Arcana.Vocabulary;

/// <summary>
/// A complete vocabulary extracted from source code.
/// </summary>
public sealed record Vocabulary
{
    /// <summary>The words in this vocabulary.</summary>
    [JsonPropertyName("words")]
    public required IReadOnlyList<Word> Words { get; init; }

    /// <summary>Metadata about the extraction.</summary>
    [JsonPropertyName("metadata")]
    public required VocabularyMetadata Metadata { get; init; }
}
