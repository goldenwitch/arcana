namespace TestSolution;

/// <summary>
/// Level 2: Composes UserId (level 1) and string (primitive)
/// </summary>
public class User
{
    public UserId Id { get; set; } = new(0);
    public string Name { get; set; } = string.Empty;
}
