import { Plugin } from "@opencode-ai/plugin"
import { discoverServer } from "./discover"
import { encodeServer, resolveServers } from "./servers"
import type {
  DiscoveredModel,
  DiscoveryResult,
  PluginOptions,
  RuntimeConfiguration,
  ServerOptions,
} from "./types"

const INTEGRATION_ID = "llama-cpp"
const PACKAGE = "@opencode-ai/ai/providers/openai-compatible"

function asOptions(value: Readonly<Record<string, unknown>>): PluginOptions {
  return value as PluginOptions
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined
}

function runtimeConfiguration(credential: unknown): RuntimeConfiguration {
  if (typeof credential !== "object" || credential === null) return {}
  const value = credential as {
    type?: unknown
    configuration?: Record<string, unknown>
  }
  if (value.type !== "key") return {}
  return {
    servers: stringArray(value.configuration?.servers),
    enabledModels: stringArray(value.configuration?.enabledModels),
  }
}

function fingerprint(value: unknown): string {
  return JSON.stringify(value)
}

export default Plugin.define({
  id: "llama.cpp.adaptor",
  setup: async (ctx) => {
    const options = asOptions(ctx.options)
    const interval = Math.max(options.refreshInterval ?? 30_000, 5_000)
    const timeout = Math.max(options.requestTimeout ?? 5_000, 500)
    let configuration: RuntimeConfiguration = {}
    let servers: ServerOptions[] = resolveServers(options.servers, undefined)
    let results: DiscoveryResult[] = []
    let previous = ""
    let refreshing = false

    await ctx.integration.transform((integrations) => {
      integrations.update(INTEGRATION_ID, (integration) => {
        integration.name = "llama.cpp"
      })

      const models = results.flatMap((result) => result.models)
      integrations.method.update({
        integrationID: INTEGRATION_ID,
        method: {
          type: "key",
          label: "Configure servers and models",
          form: [
            {
              key: "servers",
              type: "multiselect",
              title: "llama.cpp servers",
              description: "Select a server or add provider-id=http://host:port/v1",
              custom: true,
              required: true,
              options: servers.map((server) => ({
                value: encodeServer(server),
                label: server.name ?? server.providerID,
                description: server.baseURL,
              })),
              default: servers.map(encodeServer),
            },
            {
              key: "enabledModels",
              type: "multiselect",
              title: "Models shown in /model",
              description: "Save new servers, then reopen this form to select their models",
              custom: false,
              options: models.map((model) => ({
                value: `${model.providerID}/${model.id}`,
                label: model.name,
                description: `${model.providerName} | ${model.context.toLocaleString()} context | ${model.status}`,
              })),
              default:
                configuration.enabledModels === undefined
                  ? models.map((model) => `${model.providerID}/${model.id}`)
                  : configuration.enabledModels,
            },
          ],
        },
      })
    })

    await ctx.catalog.transform((catalog) => {
      const enabled =
        configuration.enabledModels === undefined ? undefined : new Set(configuration.enabledModels)

      for (const result of results) {
        catalog.provider.update(result.server.providerID, (provider) => {
          provider.integrationID = INTEGRATION_ID as unknown as typeof provider.integrationID
          provider.name = result.server.name ?? result.server.providerID
          provider.activation = "enabled"
          provider.package = PACKAGE
          provider.settings = {
            baseURL: result.server.baseURL,
            apiKey: "local",
          }
        })

        for (const model of result.models) {
          const reference = `${model.providerID}/${model.id}`
          if (enabled && !enabled.has(reference)) continue
          catalog.model.update(model.providerID, model.id, (draft) => {
            Object.assign(draft, modelInfo(model))
          })
        }
      }
    })

    const refresh = async () => {
      if (refreshing) return
      refreshing = true
      try {
        const connection = await ctx.integration.connection.active(INTEGRATION_ID)
        const credential = connection
          ? await ctx.integration.connection.resolve(connection)
          : undefined
        const nextConfiguration = runtimeConfiguration(credential)
        const nextServers = resolveServers(options.servers, nextConfiguration.servers)

        const settled = await Promise.allSettled(
          nextServers.map((server) => discoverServer(server, options.filter, timeout)),
        )
        const currentByID = new Map(results.map((result) => [result.server.providerID, result]))
        const nextResults: DiscoveryResult[] = []
        for (let index = 0; index < settled.length; index++) {
          const result = settled[index]
          const server = nextServers[index]
          if (!server || !result) continue
          if (result.status === "fulfilled") nextResults.push(result.value)
          else {
            const previousResult = currentByID.get(server.providerID)
            if (previousResult) nextResults.push(previousResult)
            console.warn(`[opencode-llama-cpp] Discovery failed for ${server.baseURL}:`, result.reason)
          }
        }

        const nextFingerprint = fingerprint({
          configuration: nextConfiguration,
          servers: nextServers,
          results: nextResults,
        })
        if (nextFingerprint === previous) return

        configuration = nextConfiguration
        servers = nextServers
        results = nextResults
        previous = nextFingerprint
        await ctx.integration.reload()
        await ctx.catalog.reload()
      } finally {
        refreshing = false
      }
    }

    await refresh()
    const timer = setInterval(() => void refresh().catch(console.error), interval)
    return () => clearInterval(timer)
  },
})

function modelInfo(model: DiscoveredModel) {
  return {
    id: model.id,
    modelID: model.id,
    providerID: model.providerID,
    name: model.name,
    compatibility: model.reasoning ? { reasoningField: "reasoning_content" as const } : undefined,
    capabilities: {
      tools: true,
      input: model.input,
      output: model.output,
    },
    variants: [],
    time: { released: 0 },
    cost: [],
    status: "active" as const,
    enabled: true,
    limit: {
      context: model.context,
      output: Math.min(32_768, model.context),
    },
    package: PACKAGE,
  }
}
