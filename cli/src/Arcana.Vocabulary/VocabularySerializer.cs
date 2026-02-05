using System.Text.Json;
using System.Text.Json.Serialization;

namespace Arcana.Vocabulary;

/// <summary>
/// Serialization utilities for vocabulary types.
/// </summary>
public static class VocabularySerializer
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        Converters =
        {
            new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)
        }
    };

    /// <summary>
    /// Serializes a vocabulary to JSON.
    /// </summary>
    public static string Serialize(Vocabulary vocabulary)
    {
        return JsonSerializer.Serialize(vocabulary, Options);
    }

    /// <summary>
    /// Deserializes a vocabulary from JSON.
    /// </summary>
    public static Vocabulary? Deserialize(string json)
    {
        return JsonSerializer.Deserialize<Vocabulary>(json, Options);
    }

    /// <summary>
    /// Serializes a vocabulary to a stream.
    /// </summary>
    public static async Task SerializeAsync(Stream stream, Vocabulary vocabulary, CancellationToken cancellationToken = default)
    {
        await JsonSerializer.SerializeAsync(stream, vocabulary, Options, cancellationToken);
    }

    /// <summary>
    /// Deserializes a vocabulary from a stream.
    /// </summary>
    public static async Task<Vocabulary?> DeserializeAsync(Stream stream, CancellationToken cancellationToken = default)
    {
        return await JsonSerializer.DeserializeAsync<Vocabulary>(stream, Options, cancellationToken);
    }
}
