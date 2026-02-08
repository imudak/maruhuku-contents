---
title: "プロンプトエンジニアリングの実践テクニック"
---

## この章で学ぶこと

- Claude向けプロンプトの基本原則
- systemプロンプトの設計パターン
- 出力形式の制御（JSON、マークダウンなど）
- Few-shotとChain-of-Thoughtの実装

## 基本原則：明確・具体・構造的に

Claudeは指示が明確なほど良い結果を返します。曖昧な依頼を避け、期待する出力を具体的に伝えましょう。

```typescript
// ❌ 曖昧なプロンプト
const bad = "このコードをレビューして";

// ✅ 具体的なプロンプト
const good = `以下のTypeScriptコードをレビューしてください。
観点:
1. 型安全性
2. エラーハンドリング
3. パフォーマンス

各観点について「問題なし」「改善推奨」「要修正」で評価し、
改善推奨・要修正の場合は修正コード例を示してください。

\`\`\`typescript
${code}
\`\`\``;
```

## systemプロンプトの設計

systemプロンプトはClaudeの「役割」と「制約」を定義する場所です。

```typescript
const message = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 2048,
  system: `あなたはシニアTypeScriptエンジニアです。

## 回答ルール
- 常にTypeScript 5.x準拠のコードを書く
- strictモードを前提とする
- any型は絶対に使わない
- 必ずエラーハンドリングを含める
- コード例には必ずJSDocコメントを付ける

## 出力形式
1. 概要（1-2文）
2. コード例
3. 注意点`,
  messages: [{ role: "user", content: userQuery }],
});
```

### パターン別systemプロンプト

**翻訳タスク：**

```
あなたはプロの日英翻訳者です。
- 技術用語は英語のまま残す
- 文体は「です・ます」調
- 原文の意味を正確に保つ
- 不自然な直訳を避け、自然な日本語にする
```

**データ抽出タスク：**

```
あなたはデータ抽出エンジンです。
入力テキストから指定されたフィールドを抽出し、
必ずJSON形式で出力してください。
該当データがない場合はnullを設定してください。
JSONのみを出力し、説明文は不要です。
```

## JSON出力の制御

Claude APIにはJSON Modeがないため、プロンプトで制御します。

```python
import anthropic
import json

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": """以下の文章から人物情報を抽出してJSON形式で返してください。
JSONのみを出力してください（```json タグ不要）。

スキーマ:
{"name": string, "age": number | null, "occupation": string | null}

文章: 田中太郎さん（32歳）はGoogleでソフトウェアエンジニアとして働いています。""",
        }
    ],
)

result = json.loads(message.content[0].text)
print(result)
# {"name": "田中太郎", "age": 32, "occupation": "ソフトウェアエンジニア"}
```

:::message
`prefill` テクニック: assistantメッセージの冒頭を指定することで、出力形式をより確実に制御できます。
:::

```python
message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "田中太郎（32歳）の情報をJSONで"},
        {"role": "assistant", "content": "{"},  # prefill
    ],
)
# Claudeは "{" に続けてJSONを生成する
full_json = "{" + message.content[0].text
```

## Few-shot Prompting

例を示して出力パターンを学習させます。

```typescript
const message = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: "レビュー: この商品は最高です！毎日使っています。",
    },
    {
      role: "assistant",
      content: JSON.stringify({ sentiment: "positive", confidence: 0.95 }),
    },
    {
      role: "user",
      content: "レビュー: まあまあかな。値段の割には良いけど。",
    },
    {
      role: "assistant",
      content: JSON.stringify({ sentiment: "neutral", confidence: 0.7 }),
    },
    {
      role: "user",
      content: "レビュー: 壊れました。二度と買いません。",
    },
  ],
});
```

## Chain-of-Thought（思考の連鎖）

複雑な推論タスクではステップバイステップの思考を促します。

```python
message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=2048,
    messages=[
        {
            "role": "user",
            "content": """以下のSQLクエリにパフォーマンス問題がないか分析してください。

<thinking>タグ内でステップバイステップで分析し、
最終的な改善提案を<answer>タグ内に出力してください。

```sql
SELECT u.name, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2024-01-01'
GROUP BY u.name
HAVING COUNT(o.id) > 5
ORDER BY COUNT(o.id) DESC;
```""",
        }
    ],
)
```

## XMLタグによる構造化

ClaudeはXMLタグを使った構造化入力を得意とします。

```typescript
const prompt = `
<document>
${longDocument}
</document>

<instructions>
上記のドキュメントを以下の形式で要約してください：
1. 一行サマリー（50字以内）
2. 主要ポイント（3-5個の箇条書き）
3. 対象読者への推奨アクション
</instructions>

<output_format>
## サマリー
...
## 主要ポイント
...
## 推奨アクション
...
</output_format>
`;
```

## まとめ

- 明確・具体的な指示で品質が大幅に向上する
- systemプロンプトで役割と制約を定義する
- JSON出力にはprefillテクニックが有効
- Few-shotで出力パターンを制御する
- XMLタグで入力を構造化するとClaudeの理解度が上がる
