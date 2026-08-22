import type { DiscoveredModel, FilterOptions, ModelKind } from "./types"

export const DEFAULT_FILTER: Required<Pick<FilterOptions, "sources" | "kinds" | "include" | "exclude">> = {
  sources: ["preset"],
  kinds: ["chat"],
  include: ["*"],
  exclude: [],
}

export function mergeFilter(globalFilter?: FilterOptions, localFilter?: FilterOptions): FilterOptions {
  return {
    ...DEFAULT_FILTER,
    ...globalFilter,
    ...localFilter,
  }
}

export function inferKind(args: string[]): ModelKind {
  if (args.includes("--embeddings") || args.includes("--embedding")) return "embedding"
  if (args.includes("--reranking")) return "reranking"
  return "chat"
}

function glob(pattern: string): RegExp {
  let source = "^"
  for (const character of pattern) {
    if (character === "*") source += ".*"
    else if (character === "?") source += "."
    else source += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
  }
  return new RegExp(`${source}$`, "i")
}

function matchesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => glob(pattern).test(value))
}

export function matchesFilter(model: DiscoveredModel, options: FilterOptions): boolean {
  const filter = mergeFilter(options)
  if (filter.sources?.length && !filter.sources.includes(model.source)) return false
  if (filter.kinds?.length && !filter.kinds.includes(model.kind)) return false
  if (filter.statuses?.length && !filter.statuses.includes(model.status)) return false
  if (filter.modalities?.length && !filter.modalities.every((item) => model.input.includes(item))) return false
  if (filter.include?.length && !matchesAny(model.id, filter.include)) return false
  if (filter.exclude?.length && matchesAny(model.id, filter.exclude)) return false
  return true
}
