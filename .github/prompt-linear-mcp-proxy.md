# Prompt: 建構 linear-mcp-proxy — 唯讀 Linear MCP Server

> **用途**：將此文件內容作為 Prompt，在新的開發 Session 中引導 AI 完整實作此專案。
> **建立日期**：2026-04-01

---

## 任務說明

請建立一個名為 `linear-mcp-proxy` 的獨立 Node.js + TypeScript 專案，實作一個**架構層面零寫入的 Linear MCP Server**，提供給 VS Code GitHub Copilot 透過 MCP 協議讀取 Linear 任務卡。

---

## 背景與選型理由

Linear 官方有提供 Remote MCP Server（`https://mcp.linear.app/mcp`），但它包含建立、更新 Issue 的 tools，無法在架構層面保證唯讀。本專案選擇自架 Proxy，從根本上隔離寫入風險：

- **唯讀保證**：只實作 GraphQL query，不實作任何 mutation
- **資料脫敏**：回傳前剔除 email、avatar URL、內網 IP 等敏感資訊
- **Token 精簡**：JSON → Markdown 轉換，減少 LLM Context Window 消耗
- **跨專案通用**：獨立 repo，任何有 `.vscode/mcp.json` 的專案都能引用

---

## 專案存放位置

建立於 `/Users/robbywu/Desktop/repo/github/linear-mcp-proxy/`（或由開發者決定路徑），初始化為獨立 git repo。之後可推送至個人 GitHub public repo。

---

## 完整目錄結構

```
linear-mcp-proxy/
├── package.json
├── tsconfig.json
├── .env.example          # LINEAR_API_KEY=lk_xxxxxxxx
├── .gitignore            # node_modules/, dist/, .env, .env.*
├── LICENSE               # MIT
├── README.md             # 專案概覽，連結至 docs/setup-guide.md
├── docs/
│   └── setup-guide.md    # 完整安裝 + 配置教學（見下方模板要求）
└── src/
    ├── index.ts          # MCP Server 入口
    ├── linear-client.ts  # Linear GraphQL 唯讀客戶端
    ├── sanitizer.ts      # 資料脫敏模組
    ├── formatter.ts      # JSON → Markdown 轉換
    └── __tests__/
        ├── sanitizer.test.ts
        └── formatter.test.ts
```

---

## 技術規格

### `package.json`

```json
{
  "name": "linear-mcp-proxy",
  "version": "1.0.0",
  "type": "module",
  "bin": { "linear-mcp-proxy": "./dist/index.js" },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@types/node": "^22.14.1",
    "tsx": "^4.x",
    "typescript": "^5.x",
    "vitest": "^3.x"
  }
}
```

### `tsconfig.json`

- `target`: `ES2022`
- `module`: `Node16`
- `moduleResolution`: `Node16`
- `outDir`: `./dist`，`rootDir`: `./src`
- `strict`: true

---

## 各模組實作要求

### `src/index.ts` — MCP Server 入口

- 使用 `@modelcontextprotocol/sdk` 的 `McpServer` + `StdioServerTransport`
- **只註冊一個 Tool：`linear_get_issue`**
  - 參數：`issueId`（string，如 `"MA-3060"`）
  - 回傳：Markdown 純文本（脫敏後）
  - isError: true 時回傳友好錯誤訊息
- **不得註冊任何其他 tool**（確保零寫入）
- main() 捕捉 fatal error，`process.exit(1)`

### `src/linear-client.ts` — Linear GraphQL 唯讀客戶端

- 端點：`https://api.linear.app/graphql`
- Token：`process.env.LINEAR_API_KEY`，未設定時拋出明確錯誤
- **只實作 query，不實作任何 mutation**
- issueId 解析策略：
  - 若符合 `/^[A-Z]+-\d+$/`（如 `MA-3060`）→ 用 `IssueFilter` query via team key + number
  - 否則視為 UUID → 用 `issue(id: $id)` query
- 取得欄位：`identifier`、`title`、`description`、`state.name`、`priority`、`labels.nodes[name]`、`comments.nodes[body, createdAt, user.displayName, user.email, user.avatarUrl]`
- 優先級映射：`0=No priority`、`1=Urgent`、`2=High`、`3=Medium`、`4=Low`
- 錯誤處理：
  - HTTP 401 → `"Authentication failed. Please check your LINEAR_API_KEY."`
  - GraphQL error → 取第一個 error.message
  - issue 找不到 → `"Issue not found: {issueId}"`
  - **不洩漏堆疊**

### `src/sanitizer.ts` — 資料脫敏

`SanitizedIssue` 結構：

```ts
{
  identifier: string
  title: string
  description: string | null
  stateName: string | null
  priority: number
  labels: string[]
  comments: Array<{
    body: string
    createdAt: string
    authorName: string
    // email 和 avatarUrl 完全不出現
  }>
}
```

`sanitizeText(text: string): string` 需遮罩：

- Email 模式 → `[email]`
- 內網 IP（10.x、172.16-31.x、192.168.x）→ `[internal-ip]`
- 含 auth 參數的 URL（`?token=`、`?key=`、`?secret=` 等）→ `[url-with-auth]`
- `api_key:`/`token=`/`secret:`/`password:` 等 key-value 模式 → `[redacted-secret]`

`sanitize(raw: LinearIssueRaw): SanitizedIssue`：

- 對 `description` 與每個 comment `body` 執行 `sanitizeText`
- `user.displayName` 保留，`user.email`、`user.avatarUrl` 完全剔除
- `user` 為 null 時 `authorName` 填 `"Unknown"`

### `src/formatter.ts` — Markdown 轉換

`formatIssueToMarkdown(issue: SanitizedIssue): string`

輸出格式（以 `\n` 換行）：

```
# {identifier}: {title}
**Status**: {stateName} | **Priority**: {priorityLabel} | **Labels**: {labels}

## Description
{description 或 "*No description provided.*"}

## Comments ({n})

### Comment 1 — {authorName} ({YYYY-MM-DD})
{body}
```

- `stateName` 為 null 時不顯示 Status 項目
- `labels` 為空時不顯示 Labels 項目
- 日期只取 ISO 字串的前 10 碼（`YYYY-MM-DD`）

---

## 單元測試要求

### `src/__tests__/sanitizer.test.ts`

必須覆蓋以下 case：

1. email 遮罩（單個、多個）
2. 內網 IP 遮罩（10.x、172.16.x、192.168.x）
3. **公開 IP 不遮罩**（如 `8.8.8.8`）
4. 含 auth 參數 URL 遮罩
5. **普通 URL 不遮罩**
6. API key/token 模式遮罩
7. 普通文本保留
8. `sanitize()` 完整 issue 脫敏
9. `user` 為 null 時 authorName 為 `"Unknown"`
10. description 為 null 時回傳 null

### `src/__tests__/formatter.test.ts`

必須覆蓋以下 case：

1. 完整輸出結構（含 comments）
2. 無 comments 時不顯示 Comments section
3. `description` 為 null 時顯示 `*No description provided.*`
4. `stateName` 為 null 時不顯示 Status
5. `labels` 為空時不顯示 Labels
6. 日期格式為 `YYYY-MM-DD`

---

## `.env.example` 內容

```
# Linear Personal API Token
# 在 Linear 設定頁面生成：https://linear.app/settings/api
# 僅需 read 權限
LINEAR_API_KEY=lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## `docs/setup-guide.md` 教學文件要求

請依照以下結構撰寫（繁體中文）：

### 模板結構

```md
# 適用範圍

# 前置條件（Prerequisites）

# 操作步驟（Steps）

## Step 1: 取得 Linear API Key

## Step 2: clone 並安裝

## Step 3: 設定環境變數

## Step 4: 編譯

## Step 5: 配置 VS Code mcp.json

## Step 6: 啟動並驗證

# 示例（Examples）

## 在 Copilot Chat 中讀取任務

# 常見坑 & 排查（Troubleshooting）

## LINEAR_API_KEY 未設定

## Issue 找不到

## mcp.json 路徑問題

# 更新記錄

- April 1, 2026：初始化
```

---

## `README.md` 要求

- 一行說明專案用途
- 安全說明：零寫入保證、資料脫敏
- 快速開始（3 行 shell 命令）
- 連結至 `docs/setup-guide.md` 的完整教學
- Tool 列表：只有 `linear_get_issue`，明確標示 read-only

---

## VS Code 配置範例（供 README 參考）

`.vscode/mcp.json`（**不提交至此 repo**）：

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

`LINEAR_API_KEY` 建議設在 `~/.zshrc`：

```sh
export LINEAR_API_KEY=lk_xxx
```

---

## 驗證清單

實作完成後請確認：

- [ ] `npm run build` 無錯誤
- [ ] `npm test` 全部 pass
- [ ] `node dist/index.js` 啟動不報錯
- [ ] 配置 mcp.json 後，VS Code Copilot Chat 能成功呼叫 `linear_get_issue`
- [ ] 回傳 Markdown 中不含 email、內網 IP、API token
- [ ] 錯誤 Token → 友好訊息；不存在 issue → 明確提示
- [ ] 嘗試讓 AI 呼叫寫入操作，確認 MCP Server 無對應 tool 可呼叫

---

## 排除範圍

- ❌ 不實作任何 GraphQL mutation
- ❌ 不做搜尋/批次查詢（後續再擴充）
- ❌ 不提交 `.env` 或任何含 Token 的檔案
- ❌ 不做 npm publish（本地 node 執行即可）
