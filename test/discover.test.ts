import { describe, expect, test } from "bun:test"
import { normalizeModel } from "../src/discover"

const server = {
  providerID: "llama-cpp-test",
  name: "Test",
  baseURL: "http://127.0.0.1:9000/v1",
}

describe("llama.cpp model normalization", () => {
  test("uses preset metadata", () => {
    const model = normalizeModel(server, {
      id: "reasoner",
      source: "preset",
      status: {
        value: "sleeping",
        args: ["llama-server", "--ctx-size", "131072", "--reasoning", "on"],
      },
      architecture: {
        input_modalities: ["text", "image"],
        output_modalities: ["text"],
      },
    })

    expect(model).toMatchObject({
      id: "reasoner",
      source: "preset",
      status: "sleeping",
      context: 131072,
      reasoning: true,
      input: ["text", "image"],
    })
  })

  test("falls back to normalized preset text", () => {
    const model = normalizeModel(server, {
      id: "compact",
      can_remove: false,
      status: {
        preset: "[compact]\nctx-size = 16384\nreasoning = off\n",
      },
    })
    expect(model.context).toBe(16384)
    expect(model.source).toBe("preset")
  })
})
