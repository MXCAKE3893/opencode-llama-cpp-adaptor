# opencode-llama-cpp-adaptor

OpenCode V2 plugin that discovers models from one or more llama.cpp router servers and publishes them to the standard `/model` catalog.

## Features

- Discovers llama.cpp presets through `/v1/models`.
- Excludes cache, embedding, and reranking models by default.
- Adds a `llama.cpp` entry to `/model` -> `Ctrl+A`.
- Stores server and model visibility choices in OpenCode's integration credential.
- Refreshes the model catalog when llama.cpp inventory changes.

## Install locally

```jsonc
{
  "plugins": [
    "/absolute/path/to/opencode-llama-cpp-adaptor/src/index.ts"
  ]
}
```

The default endpoints are `http://127.0.0.1:8000/v1` and `http://127.0.0.1:8001/v1`.

Open `/model`, press `Ctrl+A`, and choose **llama.cpp**. The standard key integration currently asks for a key after the configuration form; enter `local` for an unauthenticated local server. When adding a new server, save once, reopen the form after discovery, and select its models.

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
            "providerID": "llama-cpp-proxy",
            "name": "llama.cpp Main",
            "baseURL": "http://127.0.0.1:8000/v1"
          }
        ]
      }
    }
  ]
}
```

Server-level `filter` fields replace matching global filter fields. Supported filter fields are `sources`, `kinds`, `include`, `exclude`, `statuses`, and required input `modalities`.
