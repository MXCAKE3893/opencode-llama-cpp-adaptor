# opencode-llama-cpp-adaptor

OpenCode V2 plugin that discovers models from one or more llama.cpp router servers and publishes them to the standard `/model` catalog.

## Features

- Discovers llama.cpp presets through `/v1/models`.
- Excludes cache, embedding, and reranking models by default.
- Adds a `llama.cpp` entry to `/model` -> `Ctrl+A`.
- Stores server and model visibility choices in OpenCode's integration credential.
- Refreshes the model catalog when llama.cpp inventory changes.

## Install locally

Clone the repository and install its production dependencies. OpenCode imports local plugin files directly and does not install their dependencies.

```sh
git clone https://github.com/MXCAKE3893/opencode-llama-cpp-adaptor.git
cd opencode-llama-cpp-adaptor
bun install --production
```

Then add the absolute entrypoint path to `opencode.json(c)`:

```jsonc
{
  "plugins": [
    "/absolute/path/to/opencode-llama-cpp-adaptor/src/index.ts"
  ]
}
```

Restart the shared service after the initial install:

```sh
opencode2 service restart
```

If Bun is unavailable, `npm install --omit=dev` can install the same runtime dependency.

Open `/model`, press `Ctrl+A`, and choose **llama.cpp**. The standard key integration currently asks for a key after the configuration form; enter `local` for an unauthenticated local server. When adding a new server, save once, reopen the form after discovery, and select its models.

No server endpoints are configured by default. Add them from the **llama.cpp** integration screen or through plugin options.

## Options

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-llama-cpp-adaptor/src/index.ts",
      "options": {
        "refreshInterval": 30000,
        "requestTimeout": 5000,
        "filter": {
          "sources": ["preset"],
          "kinds": ["chat"],
          "include": ["*"],
          "exclude": []
        },
        "servers": [
          {
            "providerID": "llama-cpp-local",
            "name": "Local llama.cpp",
            "baseURL": "http://127.0.0.1:8080/v1"
          }
        ]
      }
    }
  ]
}
```

Server-level `filter` fields replace matching global filter fields. Supported filter fields are `sources`, `kinds`, `include`, `exclude`, `statuses`, and required input `modalities`.
