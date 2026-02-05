using System.CommandLine;
using Arcana.Extraction;
using Arcana.Levels;
using Arcana.Vocabulary;

// Register MSBuild BEFORE any code that references MSBuild types is JIT'd
SolutionExtractor.EnsureMSBuildRegistered();

var pathArgument = new Argument<string>(
    "path",
    "Path to solution folder, .sln file, or .csproj file");

var outputOption = new Option<FileInfo?>(
    ["--output", "-o"],
    "Output path (default: stdout)");

var statsOption = new Option<bool>(
    "--stats",
    "Print level statistics to stderr");

var rootCommand = new RootCommand("Arcana CLI - Extract and analyze code vocabulary")
{
    pathArgument,
    outputOption,
    statsOption
};

rootCommand.SetHandler(async (path, outputFile, showStats) =>
{
    var exitCode = await RunAsync(path, outputFile, showStats);
    Environment.ExitCode = exitCode;
}, pathArgument, outputOption, statsOption);

return await rootCommand.InvokeAsync(args);

static async Task<int> RunAsync(string path, FileInfo? outputFile, bool showStats)
{
    try
    {
        // Validate path exists
        if (!File.Exists(path) && !Directory.Exists(path))
        {
            await Console.Error.WriteLineAsync($"Error: Path not found: {path}");
            return 1;
        }

        var fullPath = Path.GetFullPath(path);

        // Step 1: Extract types using Roslyn
        await Console.Error.WriteLineAsync("Discovering projects...");

        using var extractor = new SolutionExtractor();
        var extractionResult = await extractor.ExtractAsync(fullPath);

        // Report extraction warnings
        foreach (var warning in extractionResult.Warnings)
        {
            await Console.Error.WriteLineAsync($"Warning: {warning}");
        }

        if (extractionResult.Words.Count == 0)
        {
            await Console.Error.WriteLineAsync("Error: No types found. Make sure the path points to a valid .sln, .csproj, or folder containing one.");
            return 1;
        }

        await Console.Error.WriteLineAsync("Extracting types...");

        // Step 2: Compute levels
        await Console.Error.WriteLineAsync("Computing levels...");
        var levelResult = LevelComputer.ComputeLevels(extractionResult.Words);

        // Step 3: Create vocabulary with metadata
        var vocabulary = new Vocabulary
        {
            Words = levelResult.Words,
            Metadata = new VocabularyMetadata
            {
                Source = fullPath,
                Extracted = DateTime.UtcNow.ToString("O")
            }
        };

        // Step 4: Serialize to JSON
        var json = VocabularySerializer.Serialize(vocabulary);

        // Step 5: Write output
        if (outputFile != null)
        {
            await File.WriteAllTextAsync(outputFile.FullName, json);
            await Console.Error.WriteLineAsync($"Done: {levelResult.Words.Count} words, max level {levelResult.Statistics.MaxLevel}");
            await Console.Error.WriteLineAsync($"Written to: {outputFile.FullName}");
        }
        else
        {
            await Console.Out.WriteLineAsync(json);
            await Console.Error.WriteLineAsync($"Done: {levelResult.Words.Count} words, max level {levelResult.Statistics.MaxLevel}");
        }

        // Step 6: Print statistics if requested
        if (showStats)
        {
            await Console.Error.WriteLineAsync();
            await Console.Error.WriteLineAsync("Statistics:");
            await Console.Error.WriteLineAsync($"  Total words: {levelResult.Words.Count}");
            await Console.Error.WriteLineAsync($"  Max level: {levelResult.Statistics.MaxLevel}");

            await Console.Error.WriteLineAsync("  Words per level:");
            for (int i = 0; i < levelResult.Statistics.WordsPerLevel.Count; i++)
            {
                await Console.Error.WriteLineAsync($"    Level {i}: {levelResult.Statistics.WordsPerLevel[i]}");
            }

            if (levelResult.Statistics.CollapsedCycleCount > 0)
            {
                await Console.Error.WriteLineAsync($"  Collapsed cycles: {levelResult.Statistics.CollapsedCycleCount}");
            }
        }

        return 0;
    }
    catch (Exception ex)
    {
        await Console.Error.WriteLineAsync($"Error: {ex.Message}");
        return 1;
    }
}
