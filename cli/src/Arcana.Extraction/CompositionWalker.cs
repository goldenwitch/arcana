using Microsoft.CodeAnalysis;

namespace Arcana.Extraction;

/// <summary>
/// Extracts composition relationships (dependencies) from a type symbol.
/// </summary>
public static class CompositionWalker
{
    /// <summary>
    /// Extracts all type dependencies for a given type symbol.
    /// </summary>
    public static HashSet<ITypeSymbol> GetDependencies(
        INamedTypeSymbol symbol,
        SymbolEqualityComparer comparer)
    {
        var dependencies = new HashSet<ITypeSymbol>(comparer);

        // Base type
        if (symbol.BaseType != null && !IsObjectOrValueType(symbol.BaseType))
        {
            AddTypeWithComponents(symbol.BaseType, dependencies, comparer);
        }

        // Implemented interfaces
        foreach (var iface in symbol.Interfaces)
        {
            AddTypeWithComponents(iface, dependencies, comparer);
        }

        // Fields
        foreach (var field in symbol.GetMembers().OfType<IFieldSymbol>())
        {
            if (!field.IsImplicitlyDeclared && field.DeclaredAccessibility != Accessibility.Private)
            {
                AddTypeWithComponents(field.Type, dependencies, comparer);
            }
        }

        // Properties
        foreach (var property in symbol.GetMembers().OfType<IPropertySymbol>())
        {
            if (!property.IsImplicitlyDeclared)
            {
                AddTypeWithComponents(property.Type, dependencies, comparer);
            }
        }

        // Methods (public only to avoid noise)
        foreach (var method in symbol.GetMembers().OfType<IMethodSymbol>())
        {
            if (method.IsImplicitlyDeclared)
            {
                continue;
            }

            if (method.MethodKind is MethodKind.Ordinary or MethodKind.Constructor)
            {
                // Return type (skip void and constructors)
                if (method.MethodKind != MethodKind.Constructor &&
                    method.ReturnType.SpecialType != SpecialType.System_Void)
                {
                    AddTypeWithComponents(method.ReturnType, dependencies, comparer);
                }

                // Parameters
                foreach (var param in method.Parameters)
                {
                    AddTypeWithComponents(param.Type, dependencies, comparer);
                }
            }
        }

        // Remove self-reference
        dependencies.Remove(symbol);
        dependencies.Remove(symbol.OriginalDefinition);

        return dependencies;
    }

    /// <summary>
    /// Adds a type and its component types (for generics) to the dependency set.
    /// </summary>
    private static void AddTypeWithComponents(
        ITypeSymbol type,
        HashSet<ITypeSymbol> dependencies,
        SymbolEqualityComparer comparer)
    {
        // Unwrap nullable
        if (type is INamedTypeSymbol { OriginalDefinition.SpecialType: SpecialType.System_Nullable_T } nullable)
        {
            type = nullable.TypeArguments[0];
        }

        // Handle arrays
        if (type is IArrayTypeSymbol array)
        {
            AddTypeWithComponents(array.ElementType, dependencies, comparer);
            return;
        }

        // Skip type parameters (they're not concrete dependencies)
        if (type is ITypeParameterSymbol)
        {
            return;
        }

        // Skip error types
        if (type is IErrorTypeSymbol)
        {
            return;
        }

        // Skip void
        if (type.SpecialType == SpecialType.System_Void)
        {
            return;
        }

        // Add the type itself
        dependencies.Add(type);

        // For constructed generics with concrete type arguments, also add the open generic and type arguments
        if (type is INamedTypeSymbol named && SymbolNaming.IsConcreteConstructedGeneric(named))
        {
            // Add the open generic definition
            dependencies.Add(named.OriginalDefinition);

            // Add type arguments recursively (skip type parameters)
            foreach (var arg in named.TypeArguments)
            {
                AddTypeWithComponents(arg, dependencies, comparer);
            }
        }
    }

    /// <summary>
    /// Checks if a type is System.Object or System.ValueType.
    /// </summary>
    private static bool IsObjectOrValueType(INamedTypeSymbol type)
    {
        return type.SpecialType is SpecialType.System_Object or SpecialType.System_ValueType;
    }

    /// <summary>
    /// Converts a set of type symbols to their word IDs.
    /// </summary>
    public static List<string> GetDependencyIds(
        INamedTypeSymbol symbol,
        SymbolEqualityComparer comparer)
    {
        var dependencies = GetDependencies(symbol, comparer);
        var ids = new HashSet<string>();

        foreach (var dep in dependencies)
        {
            if (dep is INamedTypeSymbol named && SymbolNaming.IsConcreteConstructedGeneric(named))
            {
                // For constructed generics with concrete type arguments, use the constructed ID
                ids.Add(SymbolNaming.GetConstructedGenericId(named));
            }
            else
            {
                ids.Add(SymbolNaming.GetId(dep));
            }
        }

        return ids.OrderBy(x => x).ToList();
    }
}
