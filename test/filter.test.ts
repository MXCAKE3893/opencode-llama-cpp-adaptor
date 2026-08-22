import { describe, expect, test } from "bun:test"
import { inferKind, matchesFilter, mergeFilter } from "../src/filter"
import type { DiscoveredModel } from "../src/types"

const model: DiscoveredModel = {
  id: "qwen-thinking-vl",
  providerID: "local",
  providerName: "Local",
  name: "Qwen",
  source: "preset",
  status: "unloaded",
  kind: "chat",
  input: ["text", "image"],
  output: ["text"],
  context: 131072,
  reasoning: true,
}

describe("model filters", () => {
  test("defaults to preset chat models", () => {
    expect(matchesFilter(model, mergeFilter())).toBe(true)
    expect(matchesFilter({ ...model, source: "cache" }, mergeFilter())).toBe(false)
  })

  test("supports include, exclude, status and modality filters", () => {
    expect(matchesFilter(model, mergeFilter(undefined, {
      include: ["qwen-*"],
      exclude: ["*-embedding"],
      statuses: ["unloaded"],
      modalities: ["image"],
    }))).toBe(true)
    expect(matchesFilter(model, mergeFilter(undefined, { exclude: ["*-vl"] }))).toBe(false)
  })

  test("server filters replace global arrays", () => {
    expect(mergeFilter({ include: ["qwen*"] }, { include: ["gemma*"] }).include)
      .toEqual(["gemma*"])
  })

  test("infers non-chat model kinds", () => {
    expect(inferKind(["--embeddings"])).toBe("embedding")
    expect(inferKind(["--reranking"])).toBe("reranking")
    expect(inferKind(["--jinja"])).toBe("chat")
  })
})
