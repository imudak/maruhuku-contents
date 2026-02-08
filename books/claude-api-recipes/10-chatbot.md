---
title: "実践プロジェクト: チャットボット構築"
---

## この章で学ぶこと

- これまでの知識を統合したチャットボットの構築
- Express + Reactによるフルスタック実装
- ストリーミング、Tool Use、会話管理の統合

## アーキテクチャ

```
[React Frontend] ←SSE→ [Express API] ←SDK→ [Claude API]
                            ↓
                    [Tool Executor]
                    ├── 天気API
                    ├── DB検索
                    └── 計算
```

## バックエンド実装

### プロジェクトセットアップ

```bash
mkdir claude-chatbot && cd claude-chatbot
npm init -y
npm install express @anthropic-ai/sdk cors uuid
npm install -D typescript @types/express @types/cors @types/uuid tsx
```

### メインサーバー

```typescript
// src/server.ts
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic();

// --- セッション管理 ---
interface Session {
  messages: Anthropic.MessageParam[];
  createdAt: number;
}

const sessions = new Map<string, Session>();

// --- ツール定義 ---
const tools: Anthropic.Tool[] = [
  {
    name: "get_current_time",
    description: "現在の日時を取得します",
    input_schema: {
      type: "object" as const,
      properties: {
        timezone: {
          type: "string",
          description: "タイムゾーン（例: Asia/Tokyo）",
          default: "Asia/Tokyo",
        },
      },
      required: [],
    },
  },
  {
    name: "calculate",
    description: "数式を計算します。四則演算に対応",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: { type: "string", description: "計算式（例: 2 + 3 * 4）" },
      },
      required: ["expression"],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "get_current_time": {
      const tz = (input.timezone as string) || "Asia/Tokyo";
      return new Date().toLocaleString("ja-JP", { timeZone: tz });
    }
    case "calculate": {
      try {
        // 注意: 本番ではサンドボックスで評価すること
        const result = Function(`"use strict"; return (${input.expression})`)();
        return String(result);
      } catch {
        return "計算エラー";
      }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// --- APIエンドポイント ---

// セッション作成
app.post("/api/sessions", (req, res) => {
  const id = uuidv4();
  sessions.set(id, { messages: [], createdAt: Date.now() });
  res.json({ sessionId: id });
});

// メッセージ送信（ストリーミング）
app.post("/api/sessions/:id/messages", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { message } = req.body;
  session.messages.push({ role: "user", content: message });

  // SSE設定
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // ツール呼び出しループ
  let messages = [...session.messages];
  let continueLoop = true;

  while (continueLoop) {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `あなたは親切な日本語アシスタントです。
簡潔かつ正確に回答してください。
必要に応じてツールを使用してください。`,
      tools,
      messages,
    });

    let fullText = "";
    let toolUseBlocks: Anthropic.ContentBlock[] = [];

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullText += event.delta.text;
        res.write(`data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`);
      }
    }

    const finalMessage = await stream.finalMessage();
    toolUseBlocks = finalMessage.content.filter((b) => b.type === "tool_use");

    if (finalMessage.stop_reason === "tool_use" && toolUseBlocks.length > 0) {
      // ツール実行
      messages.push({ role: "assistant", content: finalMessage.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks
        .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map((b) => {
          const result = executeTool(b.name, b.input as Record<string, unknown>);
          res.write(
            `data: ${JSON.stringify({ type: "tool", name: b.name, result })}\n\n`
          );
          return {
            type: "tool_result" as const,
            tool_use_id: b.id,
            content: result,
          };
        });

      messages.push({ role: "user", content: toolResults });
    } else {
      continueLoop = false;
      session.messages.push({ role: "assistant", content: fullText });
    }
  }

  res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  res.end();
});

// セッション一覧のクリーンアップ（30分で期限切れ）
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 60000);

app.listen(3000, () => console.log("Server running on :3000"));
```

## フロントエンド実装

```typescript
// src/chat-client.ts
class ChatClient {
  private sessionId: string | null = null;
  private baseUrl: string;

  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  async createSession(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/sessions`, {
      method: "POST",
    });
    const data = await res.json();
    this.sessionId = data.sessionId;
    return this.sessionId!;
  }

  async sendMessage(
    message: string,
    onText: (text: string) => void,
    onTool?: (name: string, result: string) => void,
    onDone?: () => void
  ) {
    if (!this.sessionId) await this.createSession();

    const res = await fetch(
      `${this.baseUrl}/api/sessions/${this.sessionId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }
    );

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder
        .decode(value)
        .split("\n")
        .filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = JSON.parse(line.slice(6));
        switch (data.type) {
          case "text":
            onText(data.text);
            break;
          case "tool":
            onTool?.(data.name, data.result);
            break;
          case "done":
            onDone?.();
            break;
        }
      }
    }
  }
}

// --- 使用例 ---
const chat = new ChatClient();
await chat.createSession();

await chat.sendMessage(
  "今何時？あと 123 * 456 を計算して",
  (text) => process.stdout.write(text),
  (name, result) => console.log(`\n[Tool: ${name}] → ${result}`),
  () => console.log("\n--- Done ---")
);
```

## CLIチャットボット

ブラウザなしで動作するCLI版も用意しておくと便利です。

```typescript
// src/cli-chat.ts
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();
const messages: Anthropic.MessageParam[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chat(userInput: string) {
  messages.push({ role: "user", content: userInput });

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: "日本語で簡潔に回答してください。",
    messages,
  });

  let fullText = "";
  process.stdout.write("\nClaude: ");
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
      fullText += event.delta.text;
    }
  }
  console.log("\n");

  messages.push({ role: "assistant", content: fullText });
}

function prompt() {
  rl.question("You: ", async (input) => {
    if (input.toLowerCase() === "quit") {
      rl.close();
      return;
    }
    await chat(input);
    prompt();
  });
}

console.log('Claude Chatbot (type "quit" to exit)\n');
prompt();
```

## まとめ

- ストリーミング + Tool Use + セッション管理を統合
- SSEでリアルタイムなWeb UIを実現
- ツール実行ループで自律的なエージェント動作
- CLI版は開発・デバッグに便利
