using Microsoft.CodeAnalysis;

namespace Arcana.Extraction;

/// <summary>
/// Generates consistent identifiers and display names for type symbols.
/// </summary>
public static class SymbolNaming
{
    /// <summary>
    /// Gets the unique identifier for a type symbol.
    /// For generics, uses .NET metadata format: List`1, Dictionary`2, etc.
    /// </summary>
    public static string GetId(ITypeSymbol symbol)
    {
        return symbol switch
        {
            IArrayTypeSymbol array => $"{GetId(array.ElementType)}[]",
            INamedTypeSymbol named => GetNamedTypeId(named),
            ITypeParameterSymbol param => param.Name,
            _ => symbol.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat)
                       .Replace("global::", "")
        };
    }

    /// <summary>
    /// Gets the display name for a type symbol.
    /// </summary>
    public static string GetDisplayName(ITypeSymbol symbol)
    {
        return symbol switch
        {
            IArrayTypeSymbol array => $"{GetDisplayName(array.ElementType)}[]",
            INamedTypeSymbol named => GetNamedTypeDisplayName(named),
            ITypeParameterSymbol param => param.Name,
            _ => symbol.Name
        };
    }

    private static string GetNamedTypeId(INamedTypeSymbol named)
    {
        if (named.SpecialType != SpecialType.None)
        {
            // Use keyword names for primitives
            return GetPrimitiveId(named.SpecialType) ?? GetFullyQualifiedName(named);
        }

        if (named.IsGenericType)
        {
            // For constructed generics like List<string>, we still want the base ID
            // The composition will track the type arguments separately
            var baseName = GetFullyQualifiedName(named.OriginalDefinition);

            // Append arity: List`1, Dictionary`2
            return $"{baseName}`{named.Arity}";
        }

        return GetFullyQualifiedName(named);
    }

    private static string GetFullyQualifiedName(INamedTypeSymbol symbol)
    {
        var parts = new List<string>();

        // Add containing types for nested types
        var current = symbol;
        while (current != null)
        {
            parts.Insert(0, current.Name);
            current = current.ContainingType;
        }

        var typeName = string.Join("+", parts);

        // Add namespace
        var ns = symbol.ContainingNamespace;
        if (ns != null && !ns.IsGlobalNamespace)
        {
            return $"{ns.ToDisplayString()}.{typeName}";
        }

        return typeName;
    }

    private static string GetNamedTypeDisplayName(INamedTypeSymbol named)
    {
        if (named.SpecialType != SpecialType.None)
        {
            return GetPrimitiveDisplayName(named.SpecialType) ?? named.Name;
        }

        if (named.IsGenericType && !named.IsUnboundGenericType)
        {
            // For constructed generics, show with type arguments
            var args = string.Join(", ", named.TypeArguments.Select(GetDisplayName));
            return $"{named.Name}<{args}>";
        }

        if (named.IsGenericType)
        {
            // Open generic: List<T>
            var args = string.Join(", ", named.TypeParameters.Select(p => p.Name));
            return $"{named.Name}<{args}>";
        }

        return named.Name;
    }

    private static string? GetPrimitiveId(SpecialType specialType)
    {
        return specialType switch
        {
            SpecialType.System_Boolean => "bool",
            SpecialType.System_Byte => "byte",
            SpecialType.System_SByte => "sbyte",
            SpecialType.System_Int16 => "short",
            SpecialType.System_UInt16 => "ushort",
            SpecialType.System_Int32 => "int",
            SpecialType.System_UInt32 => "uint",
            SpecialType.System_Int64 => "long",
            SpecialType.System_UInt64 => "ulong",
            SpecialType.System_Single => "float",
            SpecialType.System_Double => "double",
            SpecialType.System_Decimal => "decimal",
            SpecialType.System_Char => "char",
            SpecialType.System_String => "string",
            SpecialType.System_Object => "object",
            SpecialType.System_Void => "void",
            _ => null
        };
    }

    private static string? GetPrimitiveDisplayName(SpecialType specialType)
    {
        // Same as ID for primitives
        return GetPrimitiveId(specialType);
    }

    /// <summary>
    /// Gets the ID for a constructed generic, including its type arguments.
    /// Example: System.Collections.Generic.List`1[System.String]
    /// If all type arguments are type parameters, returns the open generic ID instead.
    /// </summary>
    public static string GetConstructedGenericId(INamedTypeSymbol symbol)
    {
        if (!symbol.IsGenericType || symbol.IsUnboundGenericType)
        {
            return GetId(symbol);
        }

        // If all type arguments are type parameters, use the open generic ID
        if (symbol.TypeArguments.All(arg => arg is ITypeParameterSymbol))
        {
            return GetId(symbol.OriginalDefinition);
        }

        var baseId = GetId(symbol.OriginalDefinition);
        var args = string.Join(",", symbol.TypeArguments.Select(GetId));
        return $"{baseId}[{args}]";
    }

    /// <summary>
    /// Returns true if the symbol is a constructed generic with at least one concrete type argument.
    /// Returns false if all type arguments are type parameters (effectively an open generic).
    /// </summary>
    public static bool IsConcreteConstructedGeneric(INamedTypeSymbol symbol)
    {
        if (!symbol.IsGenericType || symbol.IsUnboundGenericType)
        {
            return false;
        }

        return symbol.TypeArguments.Any(arg => arg is not ITypeParameterSymbol);
    }
}
