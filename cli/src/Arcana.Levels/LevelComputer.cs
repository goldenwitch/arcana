using Arcana.Vocabulary;

namespace Arcana.Levels;

/// <summary>
/// Computes learning levels for vocabulary entries.
/// </summary>
public static class LevelComputer
{
    /// <summary>
    /// Computes levels for all words based on their composition relationships.
    /// </summary>
    /// <param name="words">The words with Level initially 0 and ComposedOf populated.</param>
    /// <returns>Result containing words with computed levels and statistics.</returns>
    public static LevelResult ComputeLevels(IEnumerable<Word> words)
    {
        var wordList = words.ToList();
        
        if (wordList.Count == 0)
        {
            return new LevelResult([], new LevelStatistics(0, [], 0, []));
        }

        var wordById = wordList.ToDictionary(w => w.Id);
        var wordIds = wordById.Keys.ToHashSet();

        // Find SCCs using Tarjan's algorithm
        // Only consider edges to words that exist in the vocabulary
        var sccs = TarjanScc.FindSccs(
            wordIds,
            id => wordById[id].ComposedOf.Where(wordIds.Contains));

        // Map each word to its SCC index
        var wordToSccIndex = new Dictionary<string, int>();
        for (int i = 0; i < sccs.Count; i++)
        {
            foreach (var wordId in sccs[i])
            {
                wordToSccIndex[wordId] = i;
            }
        }

        // Identify non-trivial cycles (SCCs with >1 word, or single word that references itself)
        var collapsedCycles = sccs
            .Where(scc => scc.Count > 1 || 
                         (scc.Count == 1 && wordById[scc.First()].ComposedOf.Contains(scc.First())))
            .Cast<IReadOnlySet<string>>()
            .ToList();

        // Compute levels for each SCC using topological order
        var sccLevels = ComputeSccLevels(sccs, wordById, wordIds, wordToSccIndex);

        // Apply levels to words
        var leveledWords = wordList
            .Select(w => w with { Level = sccLevels[wordToSccIndex[w.Id]] })
            .ToList();

        // Compute statistics
        var maxLevel = leveledWords.Max(w => w.Level);
        var wordsPerLevel = new int[maxLevel + 1];
        foreach (var word in leveledWords)
        {
            wordsPerLevel[word.Level]++;
        }

        var statistics = new LevelStatistics(
            MaxLevel: maxLevel,
            WordsPerLevel: wordsPerLevel,
            CollapsedCycleCount: collapsedCycles.Count,
            CollapsedCycles: collapsedCycles);

        return new LevelResult(leveledWords, statistics);
    }

    private static int[] ComputeSccLevels(
        List<HashSet<string>> sccs,
        Dictionary<string, Word> wordById,
        HashSet<string> wordIds,
        Dictionary<string, int> wordToSccIndex)
    {
        var sccCount = sccs.Count;
        var sccLevels = new int[sccCount];
        
        // Build SCC dependency graph: sccDeps[i] = set of SCC indices that SCC i depends on
        var sccDeps = new HashSet<int>[sccCount];
        for (int i = 0; i < sccCount; i++)
        {
            sccDeps[i] = [];
        }

        for (int i = 0; i < sccCount; i++)
        {
            foreach (var wordId in sccs[i])
            {
                foreach (var depId in wordById[wordId].ComposedOf)
                {
                    if (wordIds.Contains(depId))
                    {
                        var depSccIndex = wordToSccIndex[depId];
                        if (depSccIndex != i) // Exclude intra-SCC dependencies
                        {
                            sccDeps[i].Add(depSccIndex);
                        }
                    }
                }
            }
        }

        // Determine which SCCs are "base level" (no internal dependencies to other SCCs)
        // Per requirements: words with no compositions OR only external/missing deps → level 0
        var isBaseLevel = new bool[sccCount];
        for (int i = 0; i < sccCount; i++)
        {
            // An SCC is base level if all words either:
            // - Have no compositions at all, OR
            // - Only compose external/missing types (not in vocabulary), OR
            // - Only compose within the same SCC (cycles without external deps get level 0 too)
            isBaseLevel[i] = sccs[i].All(wordId =>
            {
                var word = wordById[wordId];
                // All compositions must be either external or within same SCC
                return word.ComposedOf.All(depId => 
                    !wordIds.Contains(depId) || sccs[i].Contains(depId));
            });
        }

        // Compute in-degrees for Kahn's algorithm
        var inDegree = new int[sccCount];
        var dependents = new List<int>[sccCount];
        for (int i = 0; i < sccCount; i++)
        {
            dependents[i] = [];
        }

        for (int i = 0; i < sccCount; i++)
        {
            inDegree[i] = sccDeps[i].Count;
            foreach (var dep in sccDeps[i])
            {
                dependents[dep].Add(i);
            }
        }

        // Initialize queue with SCCs that have no dependencies on other SCCs
        var queue = new Queue<int>();
        for (int i = 0; i < sccCount; i++)
        {
            if (inDegree[i] == 0)
            {
                // Base level SCCs (no internal deps) start at level 0
                sccLevels[i] = isBaseLevel[i] ? 0 : 1;
                queue.Enqueue(i);
            }
        }

        // Process in topological order
        while (queue.Count > 0)
        {
            var current = queue.Dequeue();

            foreach (var dependent in dependents[current])
            {
                // Level = 1 + max(levels of dependencies)
                sccLevels[dependent] = Math.Max(sccLevels[dependent], sccLevels[current] + 1);
                
                inDegree[dependent]--;
                if (inDegree[dependent] == 0)
                {
                    queue.Enqueue(dependent);
                }
            }
        }

        return sccLevels;
    }
}
