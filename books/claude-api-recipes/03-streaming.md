---
title: "ストリーミングレスポンスの実装"
---

## この章で学ぶこと

- ストリーミングAPIの仕組みとメリット
- TypeScript / Pythonでのストリーミング実装
- Server-Sent Events（SSE）でブラウザに配信する方法

## なぜストリーミングが必要か

Claude APIの通常のリクエストは、全文生成が完了してからレスポンスが返ります。長い回答では数十秒待つことになり、UX上大きな問題です。ストリーミングを使えば、生成されたテキストをリアルタイムに受信できます。

## 基本実装

### TypeScript

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function streamResponse() {
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      { role: "user", content: "Rustの所有権システムを解説して" },
    ],
  });

  // テキストチャンクをリアルタイムに受信
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
    }
  }

  // 最終メッセージを取得（usage情報など）
  const finalMessage = await stream.finalMessage();
  console.log("\n\nTokens used:", finalMessage.usage);
}

streamResponse();
```

### Python

```python
import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Rustの所有権システムを解説して"}
    ],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

print()  # 改行
print("Tokens:", stream.get_final_message().usage)
```

## イベントの種類

ストリーミングでは以下のイベントが順に発火します。

| イベント | 説明 |
|---------|------|
| `message_start` | メッセージ開始。モデル情報を含む |
| `content_block_start` | コンテンツブロック開始 |
| `content_block_delta` | テキストの差分。ここが本文 |
| `content_block_stop` | コンテンツブロック終了 |
| `message_delta` | 停止理由、出力トークン数 |
| `message_stop` | メッセージ完了 |

## SDKのヘルパーメソッド

SDKにはストリーミングを簡潔に扱うヘルパーがあります。

### TypeScript — イベントハンドラ方式

```typescript
const stream = await client.messages.stream({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }],
});

stream.on("text", (text) => {
  process.stdout.write(text);
});

stream.on("message", (message) => {
  console.log("\nDone!", message.usage);
});

await stream.finalMessage();
```

### Python — テキストだけ取得

```python
with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
) as stream:
    full_text = ""
    for text in stream.text_stream:
        full_text += text
        print(text, end="", flush=True)
```

## Express + SSEでブラウザに配信

Webアプリケーションでストリーミングを実現する実装例です。

```typescript
// server.ts
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const client = new Anthropic();

app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  // SSEヘッダーの設定
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: message }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
  }

  const final = await stream.finalMessage();
  res.write(
    `data: ${JSON.stringify({ done: true, usage: final.usage })}\n\n`
  );
  res.end();
});

app.listen(3000);
```

### フロントエンド側

```typescript
async function chat(message: string) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      const data = JSON.parse(line.slice(6));
      if (data.text) {
        appendToUI(data.text); // UIにテキストを追加
      }
      if (data.done) {
        console.log("Usage:", data.usage);
      }
    }
  }
}
```

## ストリーミング中のキャンセル

ユーザーがリクエストをキャンセルした場合、ストリームを中断できます。

```typescript
const controller = new AbortController();

// キャンセルボタン
cancelButton.onclick = () => controller.abort();

const stream = await client.messages.stream(
  {
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  },
  { signal: controller.signal }
);
```

## まとめ

- ストリーミングでUXが大幅に改善する
- SDKのヘルパーを使えば数行で実装可能
- SSEでWebアプリへのリアルタイム配信も容易
- キャンセル処理を忘れずに実装する
