using System.Text.Json.Serialization;

namespace Arcana.Vocabulary;

/// <summary>
/// Represents a word (type) in the vocabulary.
/// </summary>
public sealed record Word
{
    /// <summary>Unique identifier (typically fully qualified type name).</summary>
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    /// <summary>Display name.</summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>Classification of the word.</summary>
    [JsonPropertyName("kind")]
    public required WordKind Kind { get; init; }

    /// <summary>Computed depth (primitives = 0).</summary>
    [JsonPropertyName("level")]
    public required int Level { get; init; }

    /// <summary>IDs of words this word depends on.</summary>
    [JsonPropertyName("composedOf")]
    public required IReadOnlyList<string> ComposedOf { get; init; }
}
