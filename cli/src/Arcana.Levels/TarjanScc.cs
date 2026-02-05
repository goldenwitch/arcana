namespace Arcana.Levels;

/// <summary>
/// Implements Tarjan's algorithm for finding strongly connected components.
/// </summary>
internal static class TarjanScc
{
    /// <summary>
    /// Finds all strongly connected components in a directed graph.
    /// </summary>
    /// <param name="nodes">All node IDs in the graph.</param>
    /// <param name="edges">Function returning outgoing edge targets for a given node.</param>
    /// <returns>List of SCCs, each containing one or more node IDs.</returns>
    public static List<HashSet<string>> FindSccs(
        IEnumerable<string> nodes,
        Func<string, IEnumerable<string>> edges)
    {
        var state = new TarjanState();
        
        foreach (var node in nodes)
        {
            if (!state.Index.ContainsKey(node))
            {
                StrongConnect(node, edges, state);
            }
        }
        
        return state.Sccs;
    }

    private static void StrongConnect(
        string node,
        Func<string, IEnumerable<string>> edges,
        TarjanState state)
    {
        // Set the depth index for v to the smallest unused index
        state.Index[node] = state.CurrentIndex;
        state.LowLink[node] = state.CurrentIndex;
        state.CurrentIndex++;
        state.Stack.Push(node);
        state.OnStack.Add(node);

        // Consider successors of node
        foreach (var successor in edges(node))
        {
            // Only consider nodes that exist in our graph
            if (!state.Index.ContainsKey(successor))
            {
                // Successor has not yet been visited; recurse on it
                StrongConnect(successor, edges, state);
                state.LowLink[node] = Math.Min(state.LowLink[node], state.LowLink[successor]);
            }
            else if (state.OnStack.Contains(successor))
            {
                // Successor is in stack and hence in the current SCC
                state.LowLink[node] = Math.Min(state.LowLink[node], state.Index[successor]);
            }
        }

        // If node is a root node, pop the stack and generate an SCC
        if (state.LowLink[node] == state.Index[node])
        {
            var scc = new HashSet<string>();
            string w;
            do
            {
                w = state.Stack.Pop();
                state.OnStack.Remove(w);
                scc.Add(w);
            } while (w != node);
            
            state.Sccs.Add(scc);
        }
    }

    private sealed class TarjanState
    {
        public int CurrentIndex { get; set; }
        public Dictionary<string, int> Index { get; } = [];
        public Dictionary<string, int> LowLink { get; } = [];
        public Stack<string> Stack { get; } = new();
        public HashSet<string> OnStack { get; } = [];
        public List<HashSet<string>> Sccs { get; } = [];
    }
}
