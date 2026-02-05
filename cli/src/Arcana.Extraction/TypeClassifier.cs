using Arcana.Vocabulary;
using Microsoft.CodeAnalysis;

namespace Arcana.Extraction;

/// <summary>
/// Classifies type symbols into vocabulary word kinds.
/// </summary>
public static class TypeClassifier
{
    /// <summary>
    /// Determines the word kind for a type symbol.
    /// </summary>
    public static WordKind Classify(ITypeSymbol symbol, HashSet<string> userTypeIds)
    {
        // Primitives: special types + System value types
        if (IsPrimitive(symbol))
        {
            return WordKind.Primitive;
        }

        if (symbol is INamedTypeSymbol named)
        {
            // Constructed generic: has type arguments that are not type parameters
            if (named.IsGenericType && !named.IsUnboundGenericType && HasConcreteTypeArguments(named))
            {
                return WordKind.Constructed;
            }

            // Open generic: has type parameters
            if (named.IsGenericType && (named.IsUnboundGenericType || !HasConcreteTypeArguments(named)))
            {
                return WordKind.Generic;
            }
        }

        // User types: defined in the solution
        var id = SymbolNaming.GetId(symbol);
        if (userTypeIds.Contains(id))
        {
            return WordKind.User;
        }

        // External types from BCL or packages - treat as primitive for simplicity
        // (they form the "base vocabulary" we build upon)
        if (IsSystemType(symbol))
        {
            return WordKind.Primitive;
        }

        // Default to User for anything else from external assemblies
        return WordKind.User;
    }

    /// <summary>
    /// Checks if a type is a primitive (built-in) type.
    /// </summary>
    public static bool IsPrimitive(ITypeSymbol symbol)
    {
        if (symbol.SpecialType != SpecialType.None)
        {
            return symbol.SpecialType switch
            {
                SpecialType.System_Boolean => true,
                SpecialType.System_Byte => true,
                SpecialType.System_SByte => true,
                SpecialType.System_Int16 => true,
                SpecialType.System_UInt16 => true,
                SpecialType.System_Int32 => true,
                SpecialType.System_UInt32 => true,
                SpecialType.System_Int64 => true,
                SpecialType.System_UInt64 => true,
                SpecialType.System_Single => true,
                SpecialType.System_Double => true,
                SpecialType.System_Decimal => true,
                SpecialType.System_Char => true,
                SpecialType.System_String => true,
                SpecialType.System_Object => true,
                SpecialType.System_Void => true,
                _ => false
            };
        }

        return false;
    }

    /// <summary>
    /// Checks if a type is from the System namespace.
    /// </summary>
    public static bool IsSystemType(ITypeSymbol symbol)
    {
        var ns = symbol.ContainingNamespace;
        if (ns == null || ns.IsGlobalNamespace)
        {
            return false;
        }

        var nsName = ns.ToDisplayString();
        return nsName == "System" || nsName.StartsWith("System.");
    }

    /// <summary>
    /// Checks if a generic type has concrete (non-parameter) type arguments.
    /// </summary>
    private static bool HasConcreteTypeArguments(INamedTypeSymbol symbol)
    {
        return symbol.TypeArguments.Any(arg => arg is not ITypeParameterSymbol);
    }

    /// <summary>
    /// Checks if a type symbol should be extracted as a word.
    /// Excludes compiler-generated types and some special types.
    /// </summary>
    public static bool ShouldExtract(INamedTypeSymbol symbol)
    {
        // Skip compiler-generated types
        if (symbol.IsImplicitlyDeclared)
        {
            return false;
        }

        // Skip anonymous types
        if (symbol.IsAnonymousType)
        {
            return false;
        }

        // Skip tuple types (use their underlying types)
        if (symbol.IsTupleType)
        {
            return false;
        }

        // Skip types with unspeakable names (compiler-generated)
        if (symbol.Name.StartsWith("<") || symbol.Name.Contains("$"))
        {
            return false;
        }

        // Only extract classes, structs, records, interfaces, enums
        return symbol.TypeKind switch
        {
            TypeKind.Class => true,
            TypeKind.Struct => true,
            TypeKind.Interface => true,
            TypeKind.Enum => true,
            _ => false
        };
    }
}
