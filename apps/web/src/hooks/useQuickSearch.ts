export function useQuickSearch<T>(items: T[], query: string, toText: (item: T) => string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => toText(item).toLowerCase().includes(normalizedQuery));
}
