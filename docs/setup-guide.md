# linear-mcp-proxy Setup Guide

## Overview

There are three ways to connect Linear to VS Code Copilot Chat via MCP:

| Method                                                                          | Privacy Filtering                 | Setup Effort       | Notes                            |
| ------------------------------------------------------------------------------- | --------------------------------- | ------------------ | -------------------------------- |
| [Official Linear MCP](#method-1-official-linear-mcp)                            | None                              | Minimal            | Maintained by Linear             |
| [linear-mcp-proxy — Remote](#method-2-linear-mcp-proxy-remote-via-npx)          | ✅ Sanitizes emails, IPs, secrets | Zero local setup   | Downloads on first use via `npx` |
| [linear-mcp-proxy — Local Build](#method-3-linear-mcp-proxy-local-clone--build) | ✅ Sanitizes emails, IPs, secrets | Clone + build once | Full control, fastest runtime    |

`linear-mcp-proxy` (Methods 2 & 3) adds a sanitization layer that masks sensitive patterns (emails, internal IPs, auth URLs, secret key–value pairs) before the content reaches Copilot. Use it when working on projects that may have sensitive information in Linear comments or descriptions.

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- VS Code with the GitHub Copilot extension installed
- A Linear account with a Personal API Token

---

## Step 0: Get a Linear API Key

Applies to all three methods.

1. Go to [Linear API Settings](https://linear.app/settings/api)
2. Click **Create key**
3. Give it any name (e.g. `mcp-proxy`) — only **read** access is needed
4. Copy the generated token (format: `lin_api_xxxxxxxx`)

Then add it to your shell profile (e.g. `~/.zshrc`) so VS Code can inherit it:

```bash
echo 'export LINEAR_API_KEY=lin_api_your_token' >> ~/.zshrc
source ~/.zshrc
```

> ⚠️ Never commit your token. Do not hard-code it in `mcp.json` if the file is tracked by git.

---

## Method 1: Official Linear MCP

Linear provides an officially maintained MCP server. It forwards issue data directly to Copilot with no transformation.

### Configure VS Code mcp.json

Create `.vscode/mcp.json` in the **target project** root:

```json
{
  "servers": {
    "linear": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "${env:LINEAR_API_KEY}"
      }
    }
  }
}
```

> Refer to the [Linear MCP official documentation](https://linear.app/docs/mcp) for the latest package name and supported environment variables.

---

## Method 2: linear-mcp-proxy — Remote via npx

No local clone or build required. `npx` downloads and caches the package from GitHub on first use, then runs it from cache on subsequent calls.

### Configure VS Code mcp.json

Create `.vscode/mcp.json` in the **target project** root:

```json
{
  "servers": {
    "linear": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:robbywu-mapxus/linear-mcp-proxy"],
      "env": {
        "LINEAR_API_KEY": "${env:LINEAR_API_KEY}"
      }
    }
  }
}
```

**First launch** — `npx` will fetch the repo, install dependencies, and compile TypeScript. This takes ~30 seconds on first use.  
**Subsequent launches** — served from the `npx` cache, starts in under a second.

> To force a fresh download (e.g. after a new release), run `npx clear-npx-cache` or delete `~/.npm/_npx/`.

---

## Method 3: linear-mcp-proxy — Local Clone + Build

Clone once and point VS Code at the compiled output. Fastest startup, and you can inspect or modify the source.

### Step 1: Clone and Install

```bash
git clone https://github.com/robbywu-mapxus/linear-mcp-proxy.git
cd linear-mcp-proxy
npm install
```

### Step 2: Build

```bash
npm run build
```

Output is placed in the `dist/` directory.

### Step 3: Configure VS Code mcp.json

Create `.vscode/mcp.json` in the **target project** root:

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

Replace `/absolute/path/to/` with the actual path, e.g. `/Users/yourname/projects/linear-mcp-proxy`.

To get the absolute path:

```bash
cd linear-mcp-proxy && pwd
```

### Keeping up to date

```bash
cd linear-mcp-proxy
git pull
npm install
npm run build
```

Then reload VS Code for the changes to take effect.

---

## Verify (all methods)

1. Reload VS Code (`Cmd+Shift+P` → **Developer: Reload Window**)
2. Open Copilot Chat
3. Type a message like:

```
Fetch Linear issue MA-3060
```

Copilot will call the `linear_get_issue` MCP tool and return a Markdown response.

---

## Example

### Reading an issue in Copilot Chat

```
Show me the description and comments for Linear issue ENG-1234
```

> **Note**: Type directly in Copilot Chat — no `@workspace` prefix needed. `@workspace` is a built-in participant for querying local code and is unrelated to MCP tools.

Example response (from linear-mcp-proxy):

```markdown
# ENG-1234: Fix SSO login redirect

**Status**: In Progress | **Priority**: High | **Labels**: auth, sso

## Description

SSO redirect loop on Safari 17 when...

## Comments (2)

### Comment 1 — Alice (2026-03-15)

Reproduced on Safari 17.4...

### Comment 2 — Bob (2026-03-16)

Fix deployed to staging.
```

---

## Troubleshooting

### LINEAR_API_KEY not set

**Symptom**: MCP Server exits immediately on startup.

**Fix**:

1. Run `echo $LINEAR_API_KEY` and confirm it prints a value
2. If using `${env:LINEAR_API_KEY}` in `mcp.json`, make sure VS Code was launched from a shell where the variable is set
3. Alternatively, paste the value directly in `mcp.json` (do not commit)

### Issue not found

**Symptom**: Returns `Issue not found: XXX-000`.

**Fix**:

1. Confirm the identifier is correct (e.g. `MA-3060` — uppercase letters, hyphen, number)
2. Confirm the API Key belongs to an account with read access to that team

### mcp.json path problem (Method 3)

**Symptom**: Copilot Chat cannot find the linear MCP server.

**Fix**:

1. Confirm `.vscode/mcp.json` is in the target project root
2. Confirm the `args` path is an **absolute path**
3. Confirm `npm run build` has been run and `dist/index.js` exists

### npx takes too long (Method 2)

**Symptom**: MCP server takes 30+ seconds to start on every launch.

**Fix**: The cache may be corrupted or disabled. Run:

```bash
npx clear-npx-cache
```

Then restart VS Code. After the next first-time download it will be cached.

---

## Changelog

- April 1, 2026: Initial release
- April 2, 2026: Migrated to `@linear/sdk`; comments fetch fixed
- April 2, 2026: Added remote install support via `npx github:`; documented official Linear MCP method
