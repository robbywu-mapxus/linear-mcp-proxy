# linear-mcp-proxy

A read-only Linear MCP Server for VS Code GitHub Copilot Chat. Fetches Linear issues over the MCP protocol with zero write access.

## Security

- **Zero writes**: Only GraphQL queries are implemented — no mutations exist in the codebase.
- **Data sanitization**: Emails, internal IPs, and API tokens are masked before returning content.
- **Minimal payload**: Responses are formatted as Markdown to reduce LLM context consumption.

## Quick Start

```bash
npm install
npm run build
node dist/index.js
```

See [docs/setup-guide.md](docs/setup-guide.md) for the full installation and configuration guide.

## Tools

| Tool               | Description                                                 | Access        |
| ------------------ | ----------------------------------------------------------- | ------------- |
| `linear_get_issue` | Fetch a single issue by identifier (e.g. `MA-3060`) or UUID | **Read-only** |

This is the only registered tool — no write operations are available.

## VS Code Configuration

Create `.vscode/mcp.json` in your target project:

```json
{
  "servers": {
    "linear": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/linear-mcp-proxy/dist/index.js"],
      "env": {
        "LINEAR_API_KEY": "${env:LINEAR_API_KEY}"
      }
    }
  }
}
```

Add your API key to `~/.zshrc`:

```sh
export LINEAR_API_KEY=lk_xxx
```

## License

MIT
