namespace TestSolution;

/// <summary>
/// Level 3: Composes User (level 2), List&lt;OrderLine&gt; (level 1), and int (primitive)
/// </summary>
public class Order
{
    public int OrderNumber { get; set; }
    public User Customer { get; set; } = new();
    public List<OrderLine> Lines { get; set; } = [];
}
