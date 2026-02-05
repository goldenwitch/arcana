namespace TestSolution;

/// <summary>
/// Level 2: Composes List&lt;Product&gt; (level 1) and string (primitive)
/// </summary>
public class Catalog
{
    public string Name { get; set; } = string.Empty;
    public List<Product> Products { get; set; } = [];
}
