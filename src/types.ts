export type ModelKind = "chat" | "embedding" | "reranking"

export interface FilterOptions {
  sources?: string[]
  kinds?: ModelKind[]
  include?: string[]
  exclude?: string[]
  statuses?: string[]
  modalities?: string[]
}

export interface ServerOptions {
  providerID: string
  name?: string
  baseURL: string
  filter?: FilterOptions
}

export interface PluginOptions {
  servers?: ServerOptions[]
  filter?: FilterOptions
  refreshInterval?: number
  requestTimeout?: number
}

export interface LlamaModel {
  id: string
  architecture?: {
    input_modalities?: string[]
    output_modalities?: string[]
  }
  status?: {
    value?: string
    args?: string[]
    preset?: string
  }
  source?: string
  can_remove?: boolean
}

export interface DiscoveredModel {
  id: string
  providerID: string
  providerName: string
  name: string
  source: string
  status: string
  kind: ModelKind
  input: string[]
  output: string[]
  context: number
  reasoning: boolean
}

export interface DiscoveryResult {
  server: ServerOptions
  models: DiscoveredModel[]
}

export interface RuntimeConfiguration {
  servers?: string[]
  enabledModels?: string[]
}
