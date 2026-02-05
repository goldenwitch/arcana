namespace TestSolution;

/// <summary>
/// Level 1: Composes primitives and implements generic interface
/// </summary>
public class Product : IEntity<int>
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
}
