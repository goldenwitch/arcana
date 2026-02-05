namespace TestSolution;

/// <summary>
/// Interface for entity types - demonstrates interface scenario
/// </summary>
public interface IEntity<TId>
{
    TId Id { get; }
}
