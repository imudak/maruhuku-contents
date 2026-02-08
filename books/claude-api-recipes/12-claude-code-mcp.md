---
title: "Claude Code / MCP連携のTips"
---

## この章で学ぶこと

- Claude Codeの概要と活用方法
- MCP（Model Context Protocol）の基本
- MCPサーバーの実装
- Claude APIとMCPの連携パターン

## Claude Codeとは

Claude Codeは、Anthropicが提供するCLIベースのAIコーディングアシスタントです。ターミナルから直接Claudeにコーディング作業を依頼できます。

```bash
# インストール
npm install -g @anthropic-ai/claude-code

# 起動
claude

# 非対話モードで使用
claude -p "このディレクトリのREADME.mdを作成して"
```

### Claude Codeの便利な使い方

```bash
# ファイルを指定して質問
claude -p "src/index.tsのバグを修正して"

# パイプで入力
git diff | claude -p "このdiffをレビューして"

# 出力をファイルに
claude -p "Dockerfileを作成して" --output-file Dockerfile
```

### CLAUDE.md によるプロジェクト設定

プロジェクトのルートに `CLAUDE.md` を配置すると、Claude Codeが自動で読み込みます。

```markdown
# CLAUDE.md

## プロジェクト概要
Node.js + TypeScriptのWebアプリケーション

## 技術スタック
- Runtime: Node.js 22
- Framework: Express
- Database: PostgreSQL + Prisma
- Test: Vitest

## コーディング規約
- strictモードのTypeScript
- 関数にはJSDocコメント必須
- テストファイルは `*.test.ts`
- エラーは必ずカスタムエラークラスを使う

## コマンド
- `npm run dev` — 開発サーバー起動
- `npm test` — テスト実行
- `npm run lint` — リント
```

## MCP（Model Context Protocol）とは

MCPは、LLMアプリケーションが外部ツールやデータソースに接続するための標準プロトコルです。JSON-RPCベースで、クライアント（LLMアプリ）とサーバー（ツール提供側）の間の通信を標準化します。

```
[Claude Code / LLMアプリ] ←JSON-RPC→ [MCPサーバー]
                                         ├── ファイルシステム
                                         ├── データベース
                                         ├── Slack
                                         └── GitHub
```

## MCPサーバーの実装

### TypeScript（公式SDK）

```bash
npm install @modelcontextprotocol/sdk
```

```typescript
// src/mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "my-tools",
  version: "1.0.0",
});

// ツールの定義
server.tool(
  "search_docs",
  "社内ドキュメントを検索します",
  {
    query: z.string().describe("検索クエリ"),
    limit: z.number().optional().default(5).describe("取得件数"),
  },
  async ({ query, limit }) => {
    // 実際の検索ロジック
    const results = await searchDocuments(query, limit);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }
);

// リソースの定義（読み取り専用データ）
server.resource(
  "config",
  "config://app",
  async (uri) => {
    const config = await loadConfig();
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(config, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  }
);

// サーバー起動
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Python

```bash
pip install mcp
```

```python
# mcp_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my-tools")


@mcp.tool()
async def search_docs(query: str, limit: int = 5) -> str:
    """社内ドキュメントを検索します

    Args:
        query: 検索クエリ
        limit: 取得件数
    """
    results = await search_documents(query, limit)
    return json.dumps(results, ensure_ascii=False)


@mcp.tool()
async def execute_sql(query: str) -> str:
    """読み取り専用のSQLクエリを実行します

    Args:
        query: SELECT文のみ許可
    """
    if not query.strip().upper().startswith("SELECT"):
        return "ERROR: SELECT文のみ許可されています"

    results = await run_query(query)
    return json.dumps(results, ensure_ascii=False)


@mcp.resource("config://app")
async def get_config() -> str:
    """アプリケーション設定を返します"""
    config = load_config()
    return json.dumps(config)


if __name__ == "__main__":
    mcp.run()
```

## Claude Codeとの連携

### MCPサーバーの登録

```bash
# Claude Codeにサーバーを登録
claude mcp add my-tools -- node ./dist/mcp-server.js
claude mcp add my-python-tools -- python mcp_server.py

# 登録済みサーバーの確認
claude mcp list
```

`.mcp.json` で設定することも可能です。

```json
{
  "mcpServers": {
    "my-tools": {
      "command": "node",
      "args": ["./dist/mcp-server.js"]
    },
    "database": {
      "command": "python",
      "args": ["mcp_db_server.py"],
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/mydb"
      }
    }
  }
}
```

## 実践例: プロジェクト専用MCPサーバー

プロジェクト固有の情報にClaudeがアクセスできるサーバーを作ります。

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const server = new McpServer({
  name: "project-tools",
  version: "1.0.0",
});

const prisma = new PrismaClient();

// ユーザー検索
server.tool(
  "find_users",
  "ユーザーを検索します",
  {
    query: z.string().describe("名前またはメールアドレスの部分一致"),
  },
  async ({ query }) => {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
        ],
      },
      take: 10,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(users, null, 2) }],
    };
  }
);

// デプロイステータス確認
server.tool(
  "deploy_status",
  "最新のデプロイ状況を確認します",
  {},
  async () => {
    const deploys = await prisma.deployment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(deploys, null, 2) }],
    };
  }
);

// エラーログ取得
server.tool(
  "recent_errors",
  "直近のエラーログを取得します",
  {
    hours: z.number().optional().default(24).describe("過去何時間分"),
  },
  async ({ hours }) => {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const errors = await prisma.errorLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(errors, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

これをClaude Codeに登録すると、以下のような対話が可能になります：

```
You: 直近24時間のエラーを確認して、原因を分析して
Claude: [recent_errors ツールを使用]
       直近24時間で15件のエラーが発生しています。
       分析結果：
       1. NullPointerException (8件) - UserService.getProfile()
          → user_idのバリデーション不足が原因
       2. TimeoutException (5件) - 外部API呼び出し
          → レスポンスタイムの増加傾向...
```

## MCPの設計Tips

### 1. ツールの粒度

```
❌ 粗すぎ: do_everything(action, params)
❌ 細かすぎ: get_user_name(id), get_user_email(id), get_user_age(id)
✅ 適切: get_user(id), search_users(query), update_user(id, data)
```

### 2. セキュリティ

- 読み取り専用から始め、書き込みは慎重に追加
- SQLインジェクション対策（ORM使用推奨）
- 環境変数で認証情報を管理
- ツールの実行結果をログに記録

### 3. エラーハンドリング

```typescript
server.tool("risky_operation", "...", schema, async (params) => {
  try {
    const result = await performOperation(params);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});
```

## まとめ

- Claude CodeはCLIからAIコーディングを行える強力なツール
- CLAUDE.mdでプロジェクト固有の知識を共有
- MCPで外部ツール・データソースとの標準接続を実現
- MCPサーバーはTypeScript/Python SDKで簡単に実装可能
- セキュリティとエラーハンドリングを忘れずに
