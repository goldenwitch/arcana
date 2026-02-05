namespace Arcana.Levels;

/// <summary>
/// Statistics about the level computation.
/// </summary>
/// <param name="MaxLevel">The deepest composition chain depth.</param>
/// <param name="WordsPerLevel">Count of words at each level (index = level).</param>
/// <param name="CollapsedCycleCount">Number of SCCs with more than one word.</param>
/// <param name="CollapsedCycles">The word IDs in each collapsed cycle.</param>
public sealed record LevelStatistics(
    int MaxLevel,
    IReadOnlyList<int> WordsPerLevel,
    int CollapsedCycleCount,
    IReadOnlyList<IReadOnlySet<string>> CollapsedCycles);
