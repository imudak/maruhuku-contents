---
title: "Tool Use（Function Calling）の活用"
---

## この章で学ぶこと

- Tool Use（関数呼び出し）の仕組み
- ツール定義とJSON Schemaの書き方
- ツール実行結果のフィードバック
- 複数ツールの組み合わせ

## Tool Useとは

Tool Useは、Claudeが外部の関数やAPIを「呼び出す」ことを可能にする機能です。Claudeが直接関数を実行するのではなく、「この関数をこの引数で呼んでほしい」とリクエストし、あなたのコードが実行して結果を返すという流れです。

```
ユーザー → Claude: 「東京の天気は？」
Claude → あなた: tool_use(get_weather, {city: "Tokyo"})
あなた → 天気API → Claude: tool_result({temp: 15, condition: "晴れ"})
Claude → ユーザー: 「東京は15℃で晴れです」
```

## 基本実装

### TypeScript

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ツールの定義
const tools: Anthropic.Tool[] = [
  {
    name: "get_weather",
    description:
      "指定された都市の現在の天気情報を取得します。都市名は日本語でも英語でもOKです。",
    input_schema: {
      type: "object" as const,
      properties: {
        city: {
          type: "string",
          description: "都市名（例: 東京、大阪、New York）",
        },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "温度の単位。デフォルトはcelsius",
        },
      },
      required: ["city"],
    },
  },
];

// 実際のツール実行関数
function executeGetWeather(input: { city: string; unit?: string }) {
  // 実際にはAPIを呼ぶ。ここではモック
  return {
    city: input.city,
    temperature: 15,
    condition: "晴れ",
    humidity: 45,
  };
}

async function main() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    tools,
    messages: [{ role: "user", content: "東京と大阪の天気を教えて" }],
  });

  // ツール呼び出しをチェック
  if (response.stop_reason === "tool_use") {
    const toolResults: Anthropic.MessageParam[] = [
      { role: "assistant", content: response.content },
    ];

    // すべてのツール呼び出しを処理
    const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        console.log(`Tool called: ${block.name}(${JSON.stringify(block.input)})`);
        const result = executeGetWeather(block.input as any);
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    toolResults.push({ role: "user", content: toolResultBlocks });

    // ツール結果を渡して最終回答を取得
    const finalResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools,
      messages: [
        { role: "user", content: "東京と大阪の天気を教えて" },
        ...toolResults,
      ],
    });

    for (const block of finalResponse.content) {
      if (block.type === "text") console.log(block.text);
    }
  }
}

main();
```

### Python

```python
import anthropic
import json

client = anthropic.Anthropic()

tools = [
    {
        "name": "search_database",
        "description": "社内データベースを検索します",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "検索クエリ"},
                "limit": {"type": "integer", "description": "取得件数", "default": 10},
            },
            "required": ["query"],
        },
    }
]


def execute_tool(name: str, input_data: dict):
    """ツールの実際の実行"""
    if name == "search_database":
        # 実際にはDBクエリを実行
        return [
            {"id": 1, "title": "Claude API入門", "relevance": 0.95},
            {"id": 2, "title": "LLM活用ガイド", "relevance": 0.82},
        ]
    return {"error": f"Unknown tool: {name}"}


def chat_with_tools(user_message: str):
    messages = [{"role": "user", "content": user_message}]

    # ツール呼び出しが終わるまでループ
    while True:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            tools=tools,
            messages=messages,
        )

        # 最終回答ならループ終了
        if response.stop_reason == "end_turn":
            return response.content[0].text

        # ツール呼び出しを処理
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_tool(block.name, block.input)
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False),
                    }
                )

        messages.append({"role": "user", "content": tool_results})


print(chat_with_tools("AIに関する社内ドキュメントを検索して"))
```

## ツール定義のベストプラクティス

### 1. descriptionを丁寧に書く

Claudeはdescriptionを読んでツールの使い方を判断します。

```typescript
// ❌ 不十分
{ name: "calc", description: "計算する" }

// ✅ 十分
{
  name: "calculate",
  description: "数式を評価して計算結果を返します。四則演算、べき乗、三角関数に対応。例: '2 + 3 * 4', 'sin(pi/2)'"
}
```

### 2. enumで選択肢を制限する

```json
{
  "type": "string",
  "enum": ["asc", "desc"],
  "description": "ソート順"
}
```

### 3. tool_choiceで呼び出しを制御する

```typescript
// 任意のツールを使ってよい（デフォルト）
tool_choice: { type: "auto" }

// 特定のツールを強制
tool_choice: { type: "tool", name: "get_weather" }

// ツールを使わない
tool_choice: { type: "none" }
```

## 複数ツールの連携例

```typescript
const tools: Anthropic.Tool[] = [
  {
    name: "search_products",
    description: "商品を検索します",
    input_schema: {
      type: "object" as const,
      properties: {
        keyword: { type: "string" },
        category: { type: "string", enum: ["electronics", "books", "clothing"] },
      },
      required: ["keyword"],
    },
  },
  {
    name: "get_product_detail",
    description: "商品IDから詳細情報を取得します",
    input_schema: {
      type: "object" as const,
      properties: {
        product_id: { type: "string" },
      },
      required: ["product_id"],
    },
  },
  {
    name: "add_to_cart",
    description: "商品をカートに追加します",
    input_schema: {
      type: "object" as const,
      properties: {
        product_id: { type: "string" },
        quantity: { type: "integer", minimum: 1 },
      },
      required: ["product_id", "quantity"],
    },
  },
];
```

Claudeは「ノートPCを探してカートに入れて」のような自然言語に対し、`search_products` → `get_product_detail` → `add_to_cart` と順序立てて呼び出します。

## まとめ

- Tool Useで外部APIやデータベースとClaudeを接続できる
- ツール実行ループを実装して複数回のやり取りを処理する
- descriptionの品質がツール選択の精度を左右する
- `tool_choice`で呼び出しの制御が可能
