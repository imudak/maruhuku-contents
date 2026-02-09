---
title: "Claude APIの基本 ― セットアップから最初のリクエストまで"
free: true
---

## この章で学ぶこと

- Anthropic APIキーの取得と管理
- TypeScript / Python SDKのセットアップ
- 最初のメッセージ送信と基本パラメータの理解

## APIキーの取得

Anthropic Consoleにアクセスし、APIキーを発行します。

1. [console.anthropic.com](https://console.anthropic.com) にサインアップ
2. **Settings → API Keys → Create Key** をクリック
3. 発行されたキーを安全に保管

:::message alert
APIキーは一度しか表示されません。環境変数やシークレット管理ツールで保管してください。
:::

```bash
# .env ファイル
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx
```

## SDKのインストール

### TypeScript (Node.js)

```bash
npm install @anthropic-ai/sdk
```

### Python

```bash
pip install anthropic
```

## 最初のリクエスト

### TypeScript

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
// ANTHROPIC_API_KEY 環境変数を自動で読み取る

async function main() {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      { role: "user", content: "TypeScriptの型システムの利点を3つ教えて" },
    ],
  });

  // レスポンスのテキストを取得
  for (const block of message.content) {
    if (block.type === "text") {
      console.log(block.text);
    }
  }
}

main();
```

### Python

```python
import anthropic

client = anthropic.Anthropic()  # 環境変数から自動読み取り

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Pythonのリスト内包表記の使い方を教えて"}
    ],
)

print(message.content[0].text)
```

## レスポンスの構造

APIから返却されるレスポンスの主要フィールドを確認しましょう。

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "TypeScriptの型システムの利点は..."
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 25,
    "output_tokens": 150
  }
}
```

| フィールド | 説明 |
|-----------|------|
| `content` | レスポンス本文。テキストブロックの配列 |
| `stop_reason` | 停止理由。`end_turn` / `max_tokens` / `tool_use` など |
| `usage` | トークン使用量。コスト計算に必須 |

## 主要パラメータ

```typescript
const message = await client.messages.create({
  model: "claude-sonnet-4-20250514", // モデル指定
  max_tokens: 1024,                  // 最大出力トークン数
  temperature: 0.7,                  // 0-1、低いほど決定的
  system: "あなたは優秀なプログラマーです", // システムプロンプト
  messages: [
    { role: "user", content: "Hello!" },
  ],
});
```

### モデルの選び方

| モデル | 用途 | コスト感 |
|--------|------|---------|
| `claude-opus-4-20250514` | 最高品質、複雑な推論 | 高い |
| `claude-sonnet-4-20250514` | バランス型、汎用 | 中程度 |
| `claude-haiku-3-5-20241022` | 高速・低コスト | 安い |

多くのユースケースでは **Sonnet** から始め、品質が不足する場合にOpusへ、コスト削減が必要な場合にHaikuへ移行するのがおすすめです。

## まとめ

- APIキーは環境変数で管理する
- SDKを使えば数行でClaude APIを呼び出せる
- `usage` フィールドでトークン消費を常に監視する
- モデル選択はコストと品質のトレードオフ
