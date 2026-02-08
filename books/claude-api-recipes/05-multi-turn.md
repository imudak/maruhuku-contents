---
title: "マルチターン会話の管理"
---

## この章で学ぶこと

- 会話履歴の管理パターン
- コンテキストウィンドウの制約と対策
- 会話の要約による圧縮
- セッション管理の実装

## マルチターンの基本

Claude APIはステートレスです。毎回のリクエストに会話の全履歴を含める必要があります。

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// 会話履歴を保持する配列
const conversationHistory: Anthropic.MessageParam[] = [];

async function chat(userMessage: string): Promise<string> {
  // ユーザーメッセージを追加
  conversationHistory.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: "あなたは親切なアシスタントです。",
    messages: conversationHistory,
  });

  const assistantText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  // アシスタントの応答を履歴に追加
  conversationHistory.push({ role: "assistant", content: assistantText });

  return assistantText;
}

// 使用例
async function main() {
  console.log(await chat("私の名前は太郎です"));
  console.log(await chat("私の名前を覚えていますか？"));
  // → "はい、太郎さんですね"
}
```

## コンテキストウィンドウの管理

Claude Sonnetのコンテキストウィンドウは200Kトークンです。長い会話では溢れる可能性があります。

### スライディングウィンドウ方式

古いメッセージを捨てて直近N件だけ保持します。

```typescript
const MAX_MESSAGES = 20;

async function chatWithWindow(userMessage: string): Promise<string> {
  conversationHistory.push({ role: "user", content: userMessage });

  // 直近のメッセージだけ使う
  const recentMessages = conversationHistory.slice(-MAX_MESSAGES);

  // user/assistantの交互を保証（先頭がuserであること）
  const startIdx = recentMessages.findIndex((m) => m.role === "user");
  const messages = recentMessages.slice(startIdx);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  conversationHistory.push({ role: "assistant", content: text });
  return text;
}
```

### 要約方式

古い会話を要約してsystemプロンプトに含めます。

```typescript
async function summarizeHistory(
  messages: Anthropic.MessageParam[]
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-haiku-3-5-20241022", // 要約は安いモデルで
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `以下の会話を簡潔に要約してください（重要な事実・決定事項を保持）:

${messages.map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : "[complex content]"}`).join("\n")}`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

let conversationSummary = "";
const SUMMARIZE_THRESHOLD = 30;

async function chatWithSummary(userMessage: string): Promise<string> {
  conversationHistory.push({ role: "user", content: userMessage });

  // 一定量を超えたら要約
  if (conversationHistory.length > SUMMARIZE_THRESHOLD) {
    const oldMessages = conversationHistory.splice(
      0,
      conversationHistory.length - 10
    );
    const newSummary = await summarizeHistory(oldMessages);
    conversationSummary += "\n" + newSummary;
  }

  const systemPrompt = conversationSummary
    ? `あなたは親切なアシスタントです。\n\n## これまでの会話の要約:\n${conversationSummary}`
    : "あなたは親切なアシスタントです。";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  conversationHistory.push({ role: "assistant", content: text });
  return text;
}
```

## トークン数の推定

事前にトークン数を推定して制限に引っかからないようにします。

```python
import anthropic

client = anthropic.Anthropic()


def estimate_tokens(messages: list[dict]) -> int:
    """トークン数の概算（Messages APIのcount_tokens使用）"""
    result = client.messages.count_tokens(
        model="claude-sonnet-4-20250514",
        messages=messages,
    )
    return result.input_tokens


def trim_to_fit(messages: list[dict], max_tokens: int = 180000) -> list[dict]:
    """トークン制限に収まるようにメッセージをトリム"""
    while len(messages) > 2:  # 最低1往復は残す
        tokens = estimate_tokens(messages)
        if tokens <= max_tokens:
            break
        # 古いメッセージから2つずつ削除（user+assistant）
        messages = messages[2:]
    return messages
```

## セッション管理の実装

複数ユーザーの会話を管理するクラスの例です。

```typescript
interface Session {
  id: string;
  messages: Anthropic.MessageParam[];
  summary: string;
  createdAt: Date;
  lastActiveAt: Date;
}

class ConversationManager {
  private sessions = new Map<string, Session>();
  private client = new Anthropic();

  createSession(userId: string): string {
    const sessionId = `${userId}-${Date.now()}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      messages: [],
      summary: "",
      createdAt: new Date(),
      lastActiveAt: new Date(),
    });
    return sessionId;
  }

  async sendMessage(sessionId: string, content: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");

    session.messages.push({ role: "user", content });
    session.lastActiveAt = new Date();

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: session.summary
        ? `前回の要約: ${session.summary}`
        : undefined,
      messages: session.messages.slice(-20),
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    session.messages.push({ role: "assistant", content: text });
    return text;
  }

  // 非アクティブセッションのクリーンアップ
  cleanup(maxAgeMs: number = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActiveAt.getTime() > maxAgeMs) {
        this.sessions.delete(id);
      }
    }
  }
}
```

## まとめ

- Claude APIはステートレス。会話履歴は自分で管理する
- スライディングウィンドウで簡易的にコンテキストを管理
- 要約方式で長期記憶を実現できる
- `count_tokens`でトークン数を事前に確認する
- 本番ではセッション管理クラスで複数ユーザーに対応
