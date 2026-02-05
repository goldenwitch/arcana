using Arcana.Vocabulary;
using Xunit;

namespace Arcana.Levels.Tests;

public class LevelComputerTests
{
    [Fact]
    public void EmptyInput_ReturnsEmptyResult()
    {
        var result = LevelComputer.ComputeLevels([]);
        
        Assert.Empty(result.Words);
        Assert.Equal(0, result.Statistics.MaxLevel);
        Assert.Empty(result.Statistics.WordsPerLevel);
        Assert.Equal(0, result.Statistics.CollapsedCycleCount);
    }

    [Fact]
    public void SinglePrimitive_LevelZero()
    {
        var words = new[]
        {
            new Word { Id = "A", Name = "A", Kind = WordKind.User, Level = 0, ComposedOf = [] }
        };

        var result = LevelComputer.ComputeLevels(words);

        Assert.Single(result.Words);
        Assert.Equal(0, result.Words[0].Level);
        Assert.Equal(0, result.Statistics.MaxLevel);
    }

    [Fact]
    public void SingleWordWithExternalDep_LevelZero()
    {
        // Word depends on something not in vocabulary (external type like int, string)
        var words = new[]
        {
            new Word { Id = "A", Name = "A", Kind = WordKind.User, Level = 0, ComposedOf = ["System.Int32"] }
        };

        var result = LevelComputer.ComputeLevels(words);

        Assert.Single(result.Words);
        Assert.Equal(0, result.Words[0].Level);
    }

    [Fact]
    public void SimpleChain_CorrectLevels()
    {
        // A depends on nothing (level 0)
        // B depends on A (level 1)
        // C depends on B (level 2)
        var words = new[]
        {
            new Word { Id = "A", Name = "A", Kind = WordKind.User, Level = 0, ComposedOf = [] },
            new Word { Id = "B", Name = "B", Kind = WordKind.User, Level = 0, ComposedOf = ["A"] },
            new Word { Id = "C", Name = "C", Kind = WordKind.User, Level = 0, ComposedOf = ["B"] }
        };

        var result = LevelComputer.ComputeLevels(words);

        var byId = result.Words.ToDictionary(w => w.Id);
        Assert.Equal(0, byId["A"].Level);
        Assert.Equal(1, byId["B"].Level);
        Assert.Equal(2, byId["C"].Level);
        Assert.Equal(2, result.Statistics.MaxLevel);
    }

    [Fact]
    public void Diamond_MaxLevelPropagates()
    {
        // A at level 0
        // B and C both depend on A (level 1)
        // D depends on both B and C (level 2)
        var words = new[]
        {
            new Word { Id = "A", Name = "A", Kind = WordKind.User, Level = 0, ComposedOf = [] },
            new Word { Id = "B", Name = "B", Kind = WordKind.User, Level = 0, ComposedOf = ["A"] },
            new Word { Id = "C", Name = "C", Kind = WordKind.User, Level = 0, ComposedOf = ["A"] },
            new Word { Id = "D", Name = "D", Kind = WordKind.User, Level = 0, ComposedOf = ["B", "C"] }
        };

        var result = LevelComputer.ComputeLevels(words);

        var byId = result.Words.ToDictionary(w => w.Id);
        Assert.Equal(0, byId["A"].Level);
        Assert.Equal(1, byId["B"].Level);
        Assert.Equal(1, byId["C"].Level);
        Assert.Equal(2, byId["D"].Level);
    }

    [Fact]
    public void SelfReference_TrivialScc()
    {
        // Node references itself - trivial SCC, should be level 0 (no external deps)
        var words = new[]
        {
            new Word { Id = "Node", Name = "Node", Kind = WordKind.User, Level = 0, ComposedOf = ["Node"] }
        };

        var result = LevelComputer.ComputeLevels(words);

        Assert.Single(result.Words);
        Assert.Equal(0, result.Words[0].Level);
        // Self-reference is a collapsed cycle
        Assert.Equal(1, result.Statistics.CollapsedCycleCount);
    }

    [Fact]
    public void MutualCycle_CollapsedToSameLevel()
    {
        // A and B reference each other - both should get the same level
        var words = new[]
        {
            new Word { Id = "A", Name = "A", Kind = WordKind.User, Level = 0, ComposedOf = ["B"] },
            new Word { Id = "B", Name = "B", Kind = WordKind.User, Level = 0, ComposedOf = ["A"] }
        };

        var result = LevelComputer.ComputeLevels(words);

        var byId = result.Words.ToDictionary(w => w.Id);
        Assert.Equal(byId["A"].Level, byId["B"].Level);
        Assert.Equal(0, byId["A"].Level); // No external deps, level 0
        Assert.Equal(1, result.Statistics.CollapsedCycleCount);
    }

    [Fact]
    public void CycleWithExternalDep_LevelBasedOnExternal()
    {
        // C is primitive (level 0)
        // A and B form a cycle, but A also depends on C
        // Both A and B should be level 1 (one above C)
        var words = new[]
        {
            new Word { Id = "C", Name = "C", Kind = WordKind.User, Level = 0, ComposedOf = [] },
            new Word { Id = "A", Name = "A", Kind = WordKind.User, Level = 0, ComposedOf = ["B", "C"] },
            new Word { Id = "B", Name = "B", Kind = WordKind.User, Level = 0, ComposedOf = ["A"] }
        };

        var result = LevelComputer.ComputeLevels(words);

        var byId = result.Words.ToDictionary(w => w.Id);
        Assert.Equal(0, byId["C"].Level);
        Assert.Equal(1, byId["A"].Level);
        Assert.Equal(1, byId["B"].Level);
        Assert.Equal(1, result.Statistics.CollapsedCycleCount);
    }

    [Fact]
    public void Statistics_WordsPerLevel()
    {
        var words = new[]
        {
            new Word { Id = "A", Name = "A", Kind = WordKind.User, Level = 0, ComposedOf = [] },
            new Word { Id = "B", Name = "B", Kind = WordKind.User, Level = 0, ComposedOf = [] },
            new Word { Id = "C", Name = "C", Kind = WordKind.User, Level = 0, ComposedOf = ["A"] },
            new Word { Id = "D", Name = "D", Kind = WordKind.User, Level = 0, ComposedOf = ["C"] }
        };

        var result = LevelComputer.ComputeLevels(words);

        Assert.Equal(2, result.Statistics.MaxLevel);
        Assert.Equal(3, result.Statistics.WordsPerLevel.Count);
        Assert.Equal(2, result.Statistics.WordsPerLevel[0]); // A, B
        Assert.Equal(1, result.Statistics.WordsPerLevel[1]); // C
        Assert.Equal(1, result.Statistics.WordsPerLevel[2]); // D
    }

    [Fact]
    public void ComplexGraph_CorrectLevels()
    {
        // Level 0: Primitive (no deps)
        // Level 1: UsesExternal (only external deps), Simple (uses Primitive)
        // Level 2: Complex (uses Simple)
        // Level 3: SuperComplex (uses Complex)
        var words = new[]
        {
            new Word { Id = "Primitive", Name = "Primitive", Kind = WordKind.User, Level = 0, ComposedOf = [] },
            new Word { Id = "UsesExternal", Name = "UsesExternal", Kind = WordKind.User, Level = 0, ComposedOf = ["System.String"] },
            new Word { Id = "Simple", Name = "Simple", Kind = WordKind.User, Level = 0, ComposedOf = ["Primitive"] },
            new Word { Id = "Complex", Name = "Complex", Kind = WordKind.User, Level = 0, ComposedOf = ["Simple", "UsesExternal"] },
            new Word { Id = "SuperComplex", Name = "SuperComplex", Kind = WordKind.User, Level = 0, ComposedOf = ["Complex"] }
        };

        var result = LevelComputer.ComputeLevels(words);

        var byId = result.Words.ToDictionary(w => w.Id);
        Assert.Equal(0, byId["Primitive"].Level);
        Assert.Equal(0, byId["UsesExternal"].Level);
        Assert.Equal(1, byId["Simple"].Level);
        Assert.Equal(2, byId["Complex"].Level);
        Assert.Equal(3, byId["SuperComplex"].Level);
    }
}
