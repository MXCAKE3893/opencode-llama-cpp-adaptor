import { inferKind, matchesFilter, mergeFilter } from "./filter"
import type {
  DiscoveredModel,
  DiscoveryResult,
  FilterOptions,
  LlamaModel,
  ServerOptions,
} from "./types"

const DEFAULT_CONTEXT = 32_768

function isLlamaModel(value: unknown): value is LlamaModel {
  return typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string"
}

function argumentValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function presetValue(preset: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`^${escaped}\\s*=\\s*(.+)$`, "m").exec(preset)?.[1]?.trim()
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}

export function normalizeModel(server: ServerOptions, model: LlamaModel): DiscoveredModel {
  const args = model.status?.args ?? []
  const preset = model.status?.preset ?? ""
  const context =
    positiveInteger(argumentValue(args, "--ctx-size")) ??
    positiveInteger(presetValue(preset, "ctx-size")) ??
    DEFAULT_CONTEXT
  const reasoning =
    argumentValue(args, "--reasoning") === "on" || presetValue(preset, "reasoning") === "on"

  return {
    id: model.id,
    providerID: server.providerID,
    providerName: server.name ?? server.providerID,
    name: model.id,
    source: model.source ?? (model.can_remove === false ? "preset" : "unknown"),
    status: model.status?.value ?? "unknown",
    kind: inferKind(args),
    input: model.architecture?.input_modalities?.length
      ? [...model.architecture.input_modalities]
      : ["text"],
    output: model.architecture?.output_modalities?.length
      ? [...model.architecture.output_modalities]
      : ["text"],
    context,
    reasoning,
  }
}

export async function discoverServer(
  server: ServerOptions,
  globalFilter: FilterOptions | undefined,
  timeout: number,
): Promise<DiscoveryResult> {
  const response = await fetch(`${server.baseURL}/models`, {
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)

  const payload: unknown = await response.json()
  const data =
    typeof payload === "object" && payload !== null && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : undefined
  if (!data) throw new Error("Invalid /v1/models response")

  const filter = mergeFilter(globalFilter, server.filter)
  const models = data
    .filter(isLlamaModel)
    .map((model) => normalizeModel(server, model))
    .filter((model) => matchesFilter(model, filter))

  return { server, models }
}
