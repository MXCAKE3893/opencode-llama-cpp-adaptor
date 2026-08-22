import type { ServerOptions } from "./types"

export const DEFAULT_SERVERS: ServerOptions[] = [
  {
    providerID: "llama-cpp-proxy",
    name: "llama.cpp Main",
    baseURL: "http://127.0.0.1:8000/v1",
  },
  {
    providerID: "llama-cpp-small",
    name: "llama.cpp Small",
    baseURL: "http://127.0.0.1:8001/v1",
  },
]

const providerPattern = /^[A-Za-z0-9._-]+$/

export function normalizeBaseURL(value: string): string {
  const url = new URL(value)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${url.protocol}`)
  }

  url.hash = ""
  url.search = ""
  url.pathname = url.pathname.replace(/\/+$/, "")
  if (!url.pathname || url.pathname === "/") url.pathname = "/v1"
  else if (!url.pathname.endsWith("/v1")) url.pathname += "/v1"
  return url.toString().replace(/\/$/, "")
}

function generatedProviderID(baseURL: string): string {
  const url = new URL(baseURL)
  const host = url.hostname.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `llama-cpp-${host}${url.port ? `-${url.port}` : ""}`
}

export function encodeServer(server: ServerOptions): string {
  return `${server.providerID}=${normalizeBaseURL(server.baseURL)}`
}

export function parseServer(value: string): ServerOptions {
  const separator = value.indexOf("=")
  const explicitID = separator > 0 ? value.slice(0, separator).trim() : undefined
  const rawURL = separator > 0 ? value.slice(separator + 1).trim() : value.trim()
  const baseURL = normalizeBaseURL(rawURL)
  const providerID = explicitID || generatedProviderID(baseURL)

  if (!providerPattern.test(providerID) || providerID.includes("#")) {
    throw new Error(`Invalid provider ID: ${providerID}`)
  }

  return {
    providerID,
    name: `llama.cpp (${new URL(baseURL).host})`,
    baseURL,
  }
}

export function resolveServers(
  configured: ServerOptions[] | undefined,
  stored: string[] | undefined,
): ServerOptions[] {
  const initial = configured?.length ? configured : DEFAULT_SERVERS
  if (stored === undefined) {
    return uniqueServers(
      initial.map((server) => ({ ...server, baseURL: normalizeBaseURL(server.baseURL) })),
    )
  }

  const known = new Map(initial.map((server) => [server.providerID, server]))
  const parsed: ServerOptions[] = []
  for (const value of stored) {
    try {
      const server = parseServer(value)
      const existing = known.get(server.providerID)
      parsed.push(existing ? { ...existing, baseURL: server.baseURL } : server)
    } catch (error) {
      console.warn(`[opencode-llama-cpp] Ignoring server '${value}':`, error)
    }
  }
  return uniqueServers(parsed)
}

function uniqueServers(servers: ServerOptions[]): ServerOptions[] {
  const ids = new Set<string>()
  const urls = new Set<string>()
  return servers.filter((server) => {
    const baseURL = normalizeBaseURL(server.baseURL)
    if (ids.has(server.providerID) || urls.has(baseURL)) return false
    ids.add(server.providerID)
    urls.add(baseURL)
    server.baseURL = baseURL
    return true
  })
}
