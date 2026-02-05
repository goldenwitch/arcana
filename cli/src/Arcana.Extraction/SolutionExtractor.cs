using Arcana.Vocabulary;
using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace Arcana.Extraction;

/// <summary>
/// Result of extracting vocabulary from a solution.
/// </summary>
public sealed record ExtractionResult
{
    /// <summary>Extracted words.</summary>
    public required IReadOnlyList<Word> Words { get; init; }

    /// <summary>Warnings encountered during extraction.</summary>
    public required IReadOnlyList<string> Warnings { get; init; }
}

/// <summary>
/// Extracts vocabulary from .NET solutions using Roslyn.
/// </summary>
public sealed class SolutionExtractor : IDisposable
{
    private static bool _msbuildRegistered;
    private static readonly object _lock = new();
    private MSBuildWorkspace? _workspace;

    /// <summary>
    /// Ensures MSBuild is registered. Safe to call multiple times.
    /// </summary>
    public static void EnsureMSBuildRegistered()
    {
        if (_msbuildRegistered) return;

        lock (_lock)
        {
            if (_msbuildRegistered) return;

            if (!MSBuildLocator.IsRegistered)
            {
                MSBuildLocator.RegisterDefaults();
            }

            _msbuildRegistered = true;
        }
    }

    /// <summary>
    /// Extracts vocabulary words from a path.
    /// The path can be a folder, .sln file, or .csproj file.
    /// </summary>
    public async Task<ExtractionResult> ExtractAsync(string path, CancellationToken cancellationToken = default)
    {
        EnsureMSBuildRegistered();

        var warnings = new List<string>();
        var solutionPath = ResolveSolutionPath(path, warnings);

        if (solutionPath == null)
        {
            return new ExtractionResult
            {
                Words = [],
                Warnings = ["No .sln or .csproj file found at the specified path."]
            };
        }

        _workspace = MSBuildWorkspace.Create();
        _workspace.WorkspaceFailed += (_, e) =>
        {
            if (e.Diagnostic.Kind == WorkspaceDiagnosticKind.Failure)
            {
                warnings.Add(e.Diagnostic.Message);
            }
        };

        var words = solutionPath.EndsWith(".sln", StringComparison.OrdinalIgnoreCase)
            ? await ExtractFromSolutionAsync(solutionPath, warnings, cancellationToken)
            : await ExtractFromProjectAsync(solutionPath, warnings, cancellationToken);

        return new ExtractionResult
        {
            Words = words,
            Warnings = warnings
        };
    }

    /// <summary>
    /// Resolves a path to a solution or project file.
    /// </summary>
    private static string? ResolveSolutionPath(string path, List<string> warnings)
    {
        if (File.Exists(path))
        {
            var ext = Path.GetExtension(path);
            if (ext.Equals(".sln", StringComparison.OrdinalIgnoreCase) ||
                ext.Equals(".csproj", StringComparison.OrdinalIgnoreCase))
            {
                return path;
            }

            warnings.Add($"File '{path}' is not a .sln or .csproj file.");
            return null;
        }

        if (Directory.Exists(path))
        {
            // Prefer .sln files
            var slnFiles = Directory.GetFiles(path, "*.sln");
            if (slnFiles.Length == 1)
            {
                return slnFiles[0];
            }

            if (slnFiles.Length > 1)
            {
                warnings.Add($"Multiple .sln files found in '{path}'. Using first: {Path.GetFileName(slnFiles[0])}");
                return slnFiles[0];
            }

            // Fall back to .csproj
            var csprojFiles = Directory.GetFiles(path, "*.csproj");
            if (csprojFiles.Length == 1)
            {
                return csprojFiles[0];
            }

            if (csprojFiles.Length > 1)
            {
                warnings.Add($"Multiple .csproj files found in '{path}'. Using first: {Path.GetFileName(csprojFiles[0])}");
                return csprojFiles[0];
            }
        }

        return null;
    }

    /// <summary>
    /// Extracts words from a solution file.
    /// </summary>
    private async Task<List<Word>> ExtractFromSolutionAsync(
        string solutionPath,
        List<string> warnings,
        CancellationToken cancellationToken)
    {
        var solution = await _workspace!.OpenSolutionAsync(solutionPath, cancellationToken: cancellationToken);
        return await ExtractFromProjectsAsync(solution.Projects, warnings, cancellationToken);
    }

    /// <summary>
    /// Extracts words from a project file.
    /// </summary>
    private async Task<List<Word>> ExtractFromProjectAsync(
        string projectPath,
        List<string> warnings,
        CancellationToken cancellationToken)
    {
        var project = await _workspace!.OpenProjectAsync(projectPath, cancellationToken: cancellationToken);
        return await ExtractFromProjectsAsync([project], warnings, cancellationToken);
    }

    /// <summary>
    /// Extracts words from a collection of projects.
    /// </summary>
    private async Task<List<Word>> ExtractFromProjectsAsync(
        IEnumerable<Project> projects,
        List<string> warnings,
        CancellationToken cancellationToken)
    {
        var comparer = SymbolEqualityComparer.Default;
        var userTypes = new Dictionary<INamedTypeSymbol, string>(comparer);
        var allTypes = new Dictionary<string, INamedTypeSymbol>();
        var constructedGenerics = new Dictionary<string, INamedTypeSymbol>();

        // Phase 1: Discover all user-defined types
        foreach (var project in projects)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var compilation = await project.GetCompilationAsync(cancellationToken);
            if (compilation == null)
            {
                warnings.Add($"Failed to compile project: {project.Name}");
                continue;
            }

            foreach (var document in project.Documents)
            {
                if (document.SourceCodeKind != SourceCodeKind.Regular)
                {
                    continue;
                }

                var semanticModel = await document.GetSemanticModelAsync(cancellationToken);
                if (semanticModel == null)
                {
                    continue;
                }

                var root = await document.GetSyntaxRootAsync(cancellationToken);
                if (root == null)
                {
                    continue;
                }

                // Check for syntax errors
                var diagnostics = semanticModel.GetDiagnostics(cancellationToken: cancellationToken);
                var errors = diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error).ToList();
                if (errors.Count > 0)
                {
                    warnings.Add($"Skipping {document.FilePath}: {errors.Count} syntax errors");
                    continue;
                }

                // Find all type declarations
                foreach (var node in root.DescendantNodes())
                {
                    var symbol = semanticModel.GetDeclaredSymbol(node, cancellationToken);
                    if (symbol is INamedTypeSymbol namedType && TypeClassifier.ShouldExtract(namedType))
                    {
                        var id = SymbolNaming.GetId(namedType);

                        // Handle partial classes by only keeping one reference
                        if (!userTypes.ContainsKey(namedType))
                        {
                            userTypes[namedType] = id;
                            allTypes[id] = namedType;
                        }
                    }
                }
            }
        }

        // Build set of user type IDs for classification
        var userTypeIds = new HashSet<string>(userTypes.Values);

        // Phase 2: Extract compositions and collect all referenced types
        var words = new Dictionary<string, Word>();

        foreach (var (symbol, id) in userTypes)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var dependencies = CompositionWalker.GetDependencies(symbol, comparer);
            var composedOfIds = new List<string>();

            foreach (var dep in dependencies)
            {
                string depId;

                if (dep is INamedTypeSymbol named && SymbolNaming.IsConcreteConstructedGeneric(named))
                {
                    // Constructed generic with concrete type arguments: track it and add to words
                    depId = SymbolNaming.GetConstructedGenericId(named);
                    constructedGenerics.TryAdd(depId, named);
                }
                else
                {
                    depId = SymbolNaming.GetId(dep);
                }

                composedOfIds.Add(depId);

                // Ensure dependency exists as a word
                if (!words.ContainsKey(depId) && !userTypeIds.Contains(depId))
                {
                    EnsureWord(dep, depId, userTypeIds, words, constructedGenerics);
                }
            }

            // Create word for user type
            var kind = TypeClassifier.Classify(symbol, userTypeIds);
            words[id] = new Word
            {
                Id = id,
                Name = SymbolNaming.GetDisplayName(symbol),
                Kind = kind,
                Level = 0,
                ComposedOf = composedOfIds.Distinct().OrderBy(x => x).ToList()
            };
        }

        // Phase 3: Add constructed generics as words
        // Take snapshot to avoid modifying during iteration
        var constructedSnapshot = constructedGenerics.ToList();
        var processed = new HashSet<string>();

        while (constructedSnapshot.Count > 0)
        {
            foreach (var (cgId, cgSymbol) in constructedSnapshot)
            {
                if (words.ContainsKey(cgId) || processed.Contains(cgId))
                {
                    processed.Add(cgId);
                    continue;
                }

                var cgComposedOf = new List<string>();

                // Add open generic
                var openId = SymbolNaming.GetId(cgSymbol.OriginalDefinition);
                cgComposedOf.Add(openId);
                EnsureWordNoRecurse(cgSymbol.OriginalDefinition, openId, userTypeIds, words);

                // Add type arguments
                foreach (var arg in cgSymbol.TypeArguments)
                {
                    if (arg is ITypeParameterSymbol)
                    {
                        continue;
                    }

                    string argId;
                    if (arg is INamedTypeSymbol namedArg && namedArg.IsGenericType && !namedArg.IsUnboundGenericType)
                    {
                        argId = SymbolNaming.GetConstructedGenericId(namedArg);
                        constructedGenerics.TryAdd(argId, namedArg);
                    }
                    else
                    {
                        argId = SymbolNaming.GetId(arg);
                        EnsureWordNoRecurse(arg, argId, userTypeIds, words);
                    }

                    cgComposedOf.Add(argId);
                }

                words[cgId] = new Word
                {
                    Id = cgId,
                    Name = SymbolNaming.GetDisplayName(cgSymbol),
                    Kind = WordKind.Constructed,
                    Level = 0,
                    ComposedOf = cgComposedOf.Distinct().OrderBy(x => x).ToList()
                };

                processed.Add(cgId);
            }

            // Check for newly added constructed generics
            constructedSnapshot = constructedGenerics
                .Where(kvp => !processed.Contains(kvp.Key))
                .ToList();
        }

        return words.Values.OrderBy(w => w.Id).ToList();
    }

    /// <summary>
    /// Ensures a word exists for a type symbol (non-constructed only).
    /// </summary>
    private static void EnsureWordNoRecurse(
        ITypeSymbol symbol,
        string id,
        HashSet<string> userTypeIds,
        Dictionary<string, Word> words)
    {
        if (words.ContainsKey(id))
        {
            return;
        }

        // Skip type parameters
        if (symbol is ITypeParameterSymbol)
        {
            return;
        }

        // Skip constructed generics with concrete type arguments - they're handled separately
        if (symbol is INamedTypeSymbol named && SymbolNaming.IsConcreteConstructedGeneric(named))
        {
            return;
        }

        var kind = TypeClassifier.Classify(symbol, userTypeIds);
        words[id] = new Word
        {
            Id = id,
            Name = SymbolNaming.GetDisplayName(symbol),
            Kind = kind,
            Level = 0,
            ComposedOf = []
        };
    }

    /// <summary>
    /// Ensures a word exists for a type symbol.
    /// </summary>
    private static void EnsureWord(
        ITypeSymbol symbol,
        string id,
        HashSet<string> userTypeIds,
        Dictionary<string, Word> words,
        Dictionary<string, INamedTypeSymbol> constructedGenerics)
    {
        if (words.ContainsKey(id))
        {
            return;
        }

        // Skip type parameters
        if (symbol is ITypeParameterSymbol)
        {
            return;
        }

        // Handle constructed generics with concrete type arguments separately
        if (symbol is INamedTypeSymbol named && SymbolNaming.IsConcreteConstructedGeneric(named))
        {
            constructedGenerics.TryAdd(id, named);
            return;
        }

        var kind = TypeClassifier.Classify(symbol, userTypeIds);
        words[id] = new Word
        {
            Id = id,
            Name = SymbolNaming.GetDisplayName(symbol),
            Kind = kind,
            Level = 0,
            ComposedOf = []
        };
    }

    /// <summary>
    /// Disposes the MSBuild workspace.
    /// </summary>
    public void Dispose()
    {
        _workspace?.Dispose();
        _workspace = null;
    }
}
