---
title: "コスト最適化のテクニック"
---

## この章で学ぶこと

- Claude APIの料金体系の理解
- Prompt Cachingによるコスト削減
- トークン消費を抑えるテクニック
- コスト監視の実装

## 料金体系

Claude APIの料金はトークン単位です（2025年5月時点）。

| モデル | 入力 (1Mトークン) | 出力 (1Mトークン) |
|--------|------------------|------------------|
| Claude Opus 4 | $15.00 | $75.00 |
| Claude Sonnet 4 | $3.00 | $15.00 |
| Claude Haiku 3.5 | $0.80 | $4.00 |

:::message
最新の料金は [anthropic.com/pricing](https://www.anthropic.com/pricing) をご確認ください。
:::

## コスト削減の基本戦略

### 1. 適切なモデル選択

タスクの複雑さに応じてモデルを使い分けます。

```typescript
type TaskComplexity = "simple" | "medium" | "complex";

function selectModel(complexity: TaskComplexity): string {
  switch (complexity) {
    case "simple":
      return "claude-haiku-3-5-20241022";    // 分類、抽出
    case "medium":
      return "claude-sonnet-4-20250514";     // 要約、コード生成
    case "complex":
      return "claude-opus-4-20250514";       // 複雑な推論
  }
}
```

### 2. max_tokensを適切に設定する

必要以上に大きな`max_tokens`は無駄なコストを生みません（出力した分だけ課金）が、短い回答を期待するなら小さく設定することでClaudeが簡潔に回答する傾向があります。

```typescript
// 分類タスク → 短い回答で十分
const classification = await client.messages.create({
  model: "claude-haiku-3-5-20241022",
  max_tokens: 50, // "positive" / "negative" 程度
  messages: [{ role: "user", content: `分類: ${review}` }],
});
```

## Prompt Caching

同じsystemプロンプトや長い文書を繰り返し送信する場合、Prompt Cachingでコストを大幅に削減できます。キャッシュ読み取り時の入力トークンは **90%オフ** になります。ただし、初回のキャッシュ書き込み時は通常料金の **1.25倍** かかる点に注意してください。同じプロンプトを繰り返し使うほどコスト削減効果が大きくなります。

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: longSystemPrompt, // 長いシステムプロンプト
      cache_control: { type: "ephemeral" }, // キャッシュを有効化
    },
  ],
  messages: [{ role: "user", content: userQuery }],
});

// usageでキャッシュの効果を確認
console.log(response.usage);
// {
//   input_tokens: 50,
//   output_tokens: 200,
//   cache_creation_input_tokens: 5000,  // 初回: キャッシュ作成
//   cache_read_input_tokens: 0
// }
```

2回目以降のリクエスト:

```
// {
//   input_tokens: 50,
//   output_tokens: 200,
//   cache_creation_input_tokens: 0,
//   cache_read_input_tokens: 5000  // キャッシュヒット！90%オフ
// }
```

### Python

```python
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": long_system_prompt,
            "cache_control": {"type": "ephemeral"},
        }
    ],
    messages=[{"role": "user", "content": user_query}],
)
```

### キャッシュが有効な場面

- **固定のシステムプロンプト**: 全リクエストで同じ
- **長いドキュメント分析**: 同一ドキュメントに複数の質問
- **Few-shotの例**: 共通のサンプルデータ

```typescript
// ドキュメントQ&A: ドキュメントをキャッシュして複数質問
const messages: Anthropic.MessageParam[] = [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: longDocument,
        cache_control: { type: "ephemeral" }, // ドキュメントをキャッシュ
      },
      {
        type: "text",
        text: "このドキュメントの要約をしてください",
      },
    ],
  },
];
```

## トークン節約テクニック

### 1. プロンプトの簡潔化

```typescript
// ❌ 冗長
const verbose = `
以下に示すテキストについて、あなたの分析と考察を交えながら、
感情がポジティブなのかネガティブなのかを判断してください。
その際、理由も含めて丁寧に説明してください。
`;

// ✅ 簡潔
const concise = "感情分析。positive/negative/neutralのみ出力:";
```

### 2. レスポンス形式の制限

```typescript
system: "回答は箇条書き3項目以内、各50字以内で"
```

### 3. 不要な会話履歴の削除

前章のスライディングウィンドウや要約方式を活用しましょう。

## コスト監視

```typescript
class CostTracker {
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private totalCacheWriteTokens = 0;
  private totalCacheReadTokens = 0;
  private requestCount = 0;

  // モデル別の料金（$/1Mトークン）
  private pricing: Record<string, { input: number; output: number }> = {
    "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
    "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
    "claude-haiku-3-5-20241022": { input: 0.8, output: 4.0 },
  };

  track(model: string, usage: Anthropic.Usage) {
    this.totalInputTokens += usage.input_tokens;
    this.totalOutputTokens += usage.output_tokens;
    this.totalCacheWriteTokens += (usage as any).cache_creation_input_tokens ?? 0;
    this.totalCacheReadTokens += (usage as any).cache_read_input_tokens ?? 0;
    this.requestCount++;
  }

  getReport(model: string) {
    const price = this.pricing[model];
    if (!price) return "Unknown model";

    const inputCost = (this.totalInputTokens / 1_000_000) * price.input;
    const outputCost = (this.totalOutputTokens / 1_000_000) * price.output;
    const cacheWriteCost =
      (this.totalCacheWriteTokens / 1_000_000) * price.input * 1.25;
    const cacheReadCost =
      (this.totalCacheReadTokens / 1_000_000) * price.input * 0.1;

    return {
      requests: this.requestCount,
      tokens: {
        input: this.totalInputTokens,
        output: this.totalOutputTokens,
        cacheWrite: this.totalCacheWriteTokens,
        cacheRead: this.totalCacheReadTokens,
      },
      cost: {
        input: `$${inputCost.toFixed(4)}`,
        output: `$${outputCost.toFixed(4)}`,
        cacheWrite: `$${cacheWriteCost.toFixed(4)}`,
        cacheRead: `$${cacheReadCost.toFixed(4)}`,
        total: `$${(inputCost + outputCost + cacheWriteCost + cacheReadCost).toFixed(4)}`,
      },
    };
  }
}

// 使用例
const tracker = new CostTracker();

const response = await client.messages.create({ /* ... */ });
tracker.track("claude-sonnet-4-20250514", response.usage);

console.log(tracker.getReport("claude-sonnet-4-20250514"));
```

## まとめ

- モデル選択がコスト最適化の第一歩
- Prompt Cachingで繰り返し送信を90%オフに
- プロンプトの簡潔化でトークン消費を削減
- CostTrackerでリアルタイムにコストを監視
- Batches APIの50%オフも積極的に活用する（前章参照）
