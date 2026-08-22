import { describe, expect, test } from "bun:test"
import { normalizeBaseURL, parseServer, resolveServers } from "../src/servers"

describe("server configuration", () => {
  test("normalizes OpenAI-compatible base URLs", () => {
    expect(normalizeBaseURL("http://127.0.0.1:9000/"))
      .toBe("http://127.0.0.1:9000/v1")
    expect(normalizeBaseURL("http://127.0.0.1:9000/v1/"))
      .toBe("http://127.0.0.1:9000/v1")
  })

  test("parses explicit and generated provider IDs", () => {
    expect(parseServer("work=http://localhost:9000")).toMatchObject({
      providerID: "work",
      baseURL: "http://localhost:9000/v1",
    })
    expect(parseServer("http://localhost:9001/v1").providerID).toBe("llama-cpp-localhost-9001")
  })

  test("stored servers replace defaults", () => {
    const servers = resolveServers(undefined, ["custom=http://localhost:9002"])
    expect(servers).toHaveLength(1)
    expect(servers[0]?.providerID).toBe("custom")
  })

  test("does not assume any default servers", () => {
    expect(resolveServers(undefined, undefined)).toEqual([])
  })

  test("adds a server from explicit form fields", () => {
    expect(resolveServers(undefined, undefined, "http://localhost:8080", "local")).toEqual([
      {
        providerID: "local",
        name: "llama.cpp (localhost:8080)",
        baseURL: "http://localhost:8080/v1",
      },
    ])
  })
})
