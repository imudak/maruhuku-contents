---
title: "バッチ処理と大量データ処理"
---

## この章で学ぶこと

- Message Batches APIの使い方
- 並列リクエストの実装と制御
- 大量データの効率的な処理パターン

## Message Batches API

Anthropicは大量のリクエストを効率的に処理するためのBatches APIを提供しています。通常のAPIより**50%安い**料金で利用できます。

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// バッチリクエストの作成
async function createBatch(items: { id: string; prompt: string }[]) {
  const requests = items.map((item) => ({
    custom_id: item.id,
    params: {
      model: "claude-sonnet-4-20250514" as const,
      max_tokens: 1024,
      messages: [
        { role: "user" as const, content: item.prompt },
      ],
    },
  }));

  const batch = await client.messages.batches.create({
    requests,
  });

  console.log(`Batch created: ${batch.id}`);
  console.log(`Status: ${batch.processing_status}`);
  return batch;
}

// 使用例
const batch = await createBatch([
  { id: "review-1", prompt: "この商品レビューの感情分析をしてください: 最高の買い物でした！" },
  { id: "review-2", prompt: "この商品レビューの感情分析をしてください: まあまあです" },
  { id: "review-3", prompt: "この商品レビューの感情分析をしてください: 二度と買いません" },
]);
```

### バッチ結果の取得

```typescript
async function waitForBatch(batchId: string) {
  while (true) {
    const batch = await client.messages.batches.retrieve(batchId);
    console.log(`Status: ${batch.processing_status}`);

    if (batch.processing_status === "ended") {
      // 結果をストリームで取得
      const results: Record<string, string> = {};
      for await (const result of client.messages.batches.results(batchId)) {
        if (result.result.type === "succeeded") {
          const text = result.result.message.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("");
          results[result.custom_id] = text;
        } else {
          console.error(`Failed: ${result.custom_id}`, result.result);
        }
      }
      return results;
    }

    // 30秒待ってリトライ
    await new Promise((r) => setTimeout(r, 30000));
  }
}
```

### Python

```python
import anthropic
import time

client = anthropic.Anthropic()


def create_batch(items: list[dict]) -> str:
    requests = [
        {
            "custom_id": item["id"],
            "params": {
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": item["prompt"]}],
            },
        }
        for item in items
    ]

    batch = client.messages.batches.create(requests=requests)
    print(f"Batch created: {batch.id}")
    return batch.id


def wait_and_get_results(batch_id: str) -> dict:
    while True:
        batch = client.messages.batches.retrieve(batch_id)
        if batch.processing_status == "ended":
            break
        print(f"Status: {batch.processing_status}, waiting...")
        time.sleep(30)

    results = {}
    for result in client.messages.batches.results(batch_id):
        if result.result.type == "succeeded":
            results[result.custom_id] = result.result.message.content[0].text
        else:
            results[result.custom_id] = f"ERROR: {result.result}"

    return results
```

## 並列リクエストによるリアルタイムバッチ処理

Batches APIは非同期（結果取得まで時間がかかる）ですが、リアルタイムに結果が必要な場合は並列リクエストを使います。

### TypeScript — p-limit による並列制御

```typescript
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";

const client = new Anthropic();
const limit = pLimit(5); // 最大5並列

interface Task {
  id: string;
  prompt: string;
}

async function processInParallel(tasks: Task[]) {
  const results = await Promise.all(
    tasks.map((task) =>
      limit(async () => {
        try {
          const response = await client.messages.create({
            model: "claude-haiku-3-5-20241022",
            max_tokens: 512,
            messages: [{ role: "user", content: task.prompt }],
          });
          return {
            id: task.id,
            result: response.content[0].type === "text"
              ? response.content[0].text
              : "",
            error: null,
          };
        } catch (error) {
          return { id: task.id, result: null, error: String(error) };
        }
      })
    )
  );

  return results;
}

// 使用例: CSVデータの各行を処理
const tasks = csvRows.map((row, i) => ({
  id: `row-${i}`,
  prompt: `以下のデータを分類してください: ${row}`,
}));

const results = await processInParallel(tasks);
```

### Python — asyncio による並列制御

```python
import asyncio
import anthropic

async_client = anthropic.AsyncAnthropic()
CONCURRENCY = 5


async def process_item(semaphore: asyncio.Semaphore, item: dict) -> dict:
    async with semaphore:
        try:
            response = await async_client.messages.create(
                model="claude-haiku-3-5-20241022",
                max_tokens=512,
                messages=[{"role": "user", "content": item["prompt"]}],
            )
            return {"id": item["id"], "result": response.content[0].text}
        except Exception as e:
            return {"id": item["id"], "error": str(e)}


async def process_all(items: list[dict]) -> list[dict]:
    semaphore = asyncio.Semaphore(CONCURRENCY)
    tasks = [process_item(semaphore, item) for item in items]
    return await asyncio.gather(*tasks)


# 使用例
items = [
    {"id": f"item-{i}", "prompt": f"この文を要約: {text}"}
    for i, text in enumerate(texts)
]
results = asyncio.run(process_all(items))
```

## 大量データ処理のパターン

### ストリーム処理（メモリ節約）

```python
import csv
import json


async def process_csv_stream(input_path: str, output_path: str):
    """CSVを1行ずつ処理してメモリを節約"""
    semaphore = asyncio.Semaphore(CONCURRENCY)

    with open(input_path) as infile, open(output_path, "w") as outfile:
        reader = csv.DictReader(infile)
        writer = None

        async def process_row(row: dict) -> dict:
            async with semaphore:
                response = await async_client.messages.create(
                    model="claude-haiku-3-5-20241022",
                    max_tokens=256,
                    messages=[
                        {
                            "role": "user",
                            "content": f"分類してください: {row['text']}",
                        }
                    ],
                )
                row["classification"] = response.content[0].text
                return row

        # チャンク単位で処理
        chunk = []
        for row in reader:
            chunk.append(row)
            if len(chunk) >= 50:
                results = await asyncio.gather(
                    *[process_row(r) for r in chunk]
                )
                for r in results:
                    outfile.write(json.dumps(r, ensure_ascii=False) + "\n")
                chunk = []

        # 残りを処理
        if chunk:
            results = await asyncio.gather(*[process_row(r) for r in chunk])
            for r in results:
                outfile.write(json.dumps(r, ensure_ascii=False) + "\n")
```

## バッチ vs 並列リクエスト 使い分け

| | Batches API | 並列リクエスト |
|---|---|---|
| コスト | 50%オフ | 通常料金 |
| レイテンシ | 数分〜24時間 | リアルタイム |
| 最大件数 | 100,000件/バッチ | レートリミット依存 |
| ユースケース | 夜間バッチ、大量分析 | 即時応答が必要 |

## まとめ

- Batches APIで大量データを50%安く処理できる
- リアルタイム処理には並列リクエスト+セマフォ
- メモリ効率のためストリーム処理パターンを活用
- ユースケースに応じてバッチと並列を使い分ける
