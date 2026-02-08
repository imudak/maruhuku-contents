---
title: "エラーハンドリングとリトライ戦略"
---

## この章で学ぶこと

- Claude APIで発生するエラーの種類と対処法
- 指数バックオフによるリトライ実装
- レートリミットへの対応
- 本番環境での堅牢なエラーハンドリング

## エラーの種類

| HTTPステータス | エラー種別 | 原因 | 対処 |
|-------------|-----------|------|------|
| 400 | `invalid_request_error` | パラメータ不正 | リクエストを修正 |
| 401 | `authentication_error` | APIキー不正 | キーを確認 |
| 403 | `permission_error` | 権限不足 | プランを確認 |
| 429 | `rate_limit_error` | レートリミット超過 | バックオフしてリトライ |
| 500 | `api_error` | サーバーエラー | リトライ |
| 529 | `overloaded_error` | 過負荷 | バックオフしてリトライ |

**リトライすべきエラー**: 429, 500, 529
**リトライしてはいけないエラー**: 400, 401, 403

## 基本的なリトライ実装

### TypeScript

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// SDKには自動リトライが組み込まれている
const clientWithRetry = new Anthropic({
  maxRetries: 3, // デフォルトは2
});
```

SDKの自動リトライで多くのケースは対応できますが、カスタムロジックが必要な場合は手動で実装します。

```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

async function callWithRetry(
  fn: () => Promise<Anthropic.Message>,
  options: RetryOptions = { maxRetries: 5, baseDelayMs: 1000, maxDelayMs: 60000 }
): Promise<Anthropic.Message> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // リトライ不可のエラーは即座にスロー
      if (error instanceof Anthropic.BadRequestError) throw error;
      if (error instanceof Anthropic.AuthenticationError) throw error;
      if (error instanceof Anthropic.PermissionDeniedError) throw error;

      if (attempt === options.maxRetries) break;

      // 指数バックオフ + ジッター
      const delay = Math.min(
        options.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        options.maxDelayMs
      );

      console.warn(
        `Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// 使用例
const response = await callWithRetry(() =>
  client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Hello" }],
  })
);
```

### Python

```python
import anthropic
import time
import random


def call_with_retry(
    fn,
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
):
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            return fn()
        except anthropic.BadRequestError:
            raise  # リトライ不可
        except anthropic.AuthenticationError:
            raise  # リトライ不可
        except (
            anthropic.RateLimitError,
            anthropic.InternalServerError,
            anthropic.APIStatusError,
        ) as e:
            last_error = e
            if attempt == max_retries:
                break

            delay = min(
                base_delay * (2**attempt) + random.uniform(0, 1),
                max_delay,
            )
            print(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay:.1f}s")
            time.sleep(delay)

    raise last_error
```

## レートリミット対応

### レートリミットヘッダーの活用

```typescript
async function callWithRateLimit(
  fn: () => Promise<Anthropic.Message>
): Promise<Anthropic.Message> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      // retry-after ヘッダーを読む
      const retryAfter = error.headers?.["retry-after"];
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

      console.warn(`Rate limited. Waiting ${waitMs}ms...`);
      await new Promise((r) => setTimeout(r, waitMs));
      return fn(); // リトライ
    }
    throw error;
  }
}
```

### トークンバケットによるレート制御

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(count: number = 1): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens >= count) {
        this.tokens -= count;
        return;
      }
      // 必要なトークンが貯まるまで待つ
      const waitMs = ((count - this.tokens) / this.refillRate) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// 1秒あたり10リクエスト制限
const bucket = new TokenBucket(10, 10);

async function rateLimitedCall(prompt: string) {
  await bucket.acquire();
  return client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
}
```

## 本番環境のパターン

### フォールバックモデル

```typescript
async function callWithFallback(
  messages: Anthropic.MessageParam[]
): Promise<Anthropic.Message> {
  const models = [
    "claude-sonnet-4-20250514",
    "claude-haiku-3-5-20241022",
  ] as const;

  for (const model of models) {
    try {
      return await client.messages.create({
        model,
        max_tokens: 1024,
        messages,
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        console.warn(`${model} rate limited, trying fallback...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error("All models failed");
}
```

### タイムアウトの設定

```typescript
const client = new Anthropic({
  timeout: 120_000, // 120秒タイムアウト
});
```

## まとめ

- SDKの自動リトライ（`maxRetries`）で基本は十分
- カスタムリトライには指数バックオフ+ジッターを使う
- 429/500/529はリトライ可、400/401/403はリトライ不可
- 本番ではフォールバックモデルとタイムアウトを設定する
- レートリミットにはトークンバケットで予防的に対応
