# linear-mcp-proxy Setup Guide

## Scope

This guide walks you through installing `linear-mcp-proxy` locally and integrating it with VS Code GitHub Copilot Chat. Once set up, you can read Linear issues directly from any project's Copilot Chat.

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- VS Code with the GitHub Copilot extension installed
- A Linear account with a Personal API Token

---

## Steps

### Step 1: Get a Linear API Key

1. Go to [Linear API Settings](https://linear.app/settings/api)
2. Click **Create key**
3. Give it any name (e.g. `mcp-proxy`) — only **read** access is needed
4. Copy the generated token (format: `lk_xxxxxxxx`)

### Step 2: Clone and Install

```bash
git clone https://github.com/<your-username>/linear-mcp-proxy.git
cd linear-mcp-proxy
npm install
```

### Step 3: Set the Environment Variable

Add the token to your shell profile (e.g. `~/.zshrc`):

```bash
echo 'export LINEAR_API_KEY=lk_your_token' >> ~/.zshrc
source ~/.zshrc
```

> ⚠️ Never commit your token. The `.gitignore` already excludes `.env` files.

### Step 4: Build

```bash
npm run build
```

Output is placed in the `dist/` directory.

### Step 5: Configure VS Code mcp.json

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

Replace `/absolute/path/to/` with the actual path to your `linear-mcp-proxy` directory.

### Step 6: Verify

1. Reload VS Code (`Cmd+Shift+P` → **Developer: Reload Window**)
2. Open Copilot Chat
3. Type a message like (no `@` prefix required):

```
Fetch Linear issue MA-3060
```

Copilot will call `linear_get_issue` via MCP and return a sanitized Markdown response.

---

## Example

### Reading an issue in Copilot Chat

```
Show me the description and comments for Linear issue ENG-1234
```

> **Note**: Type directly in Copilot Chat — no `@workspace` prefix needed. `@workspace` is a built-in participant for querying local code and is unrelated to MCP tools.

Example response:

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

### mcp.json path problem

**Symptom**: Copilot Chat cannot find the linear MCP server.

**Fix**:

1. Confirm `.vscode/mcp.json` is in the target project root
2. Confirm the `args` path is an **absolute path**
3. Confirm `npm run build` has been run and `dist/index.js` exists

---

## Changelog

- April 1, 2026: Initial release
- April 2, 2026: Migrated to `@linear/sdk`; comments fetch fixed
