using Arcana.Vocabulary;

namespace Arcana.Levels;

/// <summary>
/// Result of level computation containing the leveled words and statistics.
/// </summary>
/// <param name="Words">The words with computed levels.</param>
/// <param name="Statistics">Statistics about the computation.</param>
public sealed record LevelResult(
    IReadOnlyList<Word> Words,
    LevelStatistics Statistics);
