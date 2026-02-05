using System.Text.Json.Serialization;

namespace Arcana.Vocabulary;

/// <summary>
/// Classification of a word in the vocabulary.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<WordKind>))]
public enum WordKind
{
    /// <summary>Built-in primitive type (level 0).</summary>
    Primitive,

    /// <summary>Generic type definition.</summary>
    Generic,

    /// <summary>Constructed generic type.</summary>
    Constructed,

    /// <summary>User-defined type.</summary>
    User
}
