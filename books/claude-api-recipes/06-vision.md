---
title: "画像・PDF解析（Vision API）"
---

## この章で学ぶこと

- 画像をClaude APIに送信する方法（Base64 / URL）
- PDF解析の実装
- 画像解析の実践ユースケース

## 画像入力の基本

Claude APIは `messages` のcontentにテキストと画像を混在させることができます。

### Base64エンコード方式

```typescript
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();

async function analyzeImage(imagePath: string, prompt: string) {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString("base64");
  const mediaType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// 使用例
const result = await analyzeImage(
  "./screenshot.png",
  "このUIのアクセシビリティ上の問題点を指摘してください"
);
console.log(result);
```

### URL方式

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "url",
            url: "https://example.com/chart.png",
          },
        },
        {
          type: "text",
          text: "このグラフのトレンドを分析してください",
        },
      ],
    },
  ],
});
```

### Python

```python
import anthropic
import base64
from pathlib import Path

client = anthropic.Anthropic()


def analyze_image(image_path: str, prompt: str) -> str:
    image_data = base64.standard_b64encode(Path(image_path).read_bytes()).decode()
    media_type = "image/png" if image_path.endswith(".png") else "image/jpeg"

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )
    return message.content[0].text
```

## 複数画像の比較

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 2048,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: "image/png", data: beforeImage },
        },
        {
          type: "image",
          source: { type: "base64", media_type: "image/png", data: afterImage },
        },
        {
          type: "text",
          text: "2つのUIデザインの違いを詳細に比較してください。改善点と悪化した点を分けて列挙してください。",
        },
      ],
    },
  ],
});
```

## PDF解析

Claude APIはPDFを直接受け付けることができます。

```typescript
async function analyzePDF(pdfPath: string, prompt: string) {
  const pdfData = fs.readFileSync(pdfPath);
  const base64 = pdfData.toString("base64");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// 使用例: 契約書の分析
const analysis = await analyzePDF(
  "./contract.pdf",
  `この契約書を分析してください:
1. 契約期間
2. 解約条件
3. 注意すべきリスク条項
JSON形式で出力してください。`
);
```

### Python でのPDF解析

```python
def analyze_pdf(pdf_path: str, prompt: str) -> str:
    pdf_data = base64.standard_b64encode(Path(pdf_path).read_bytes()).decode()

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_data,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )
    return message.content[0].text
```

## 実践ユースケース

### 1. レシートOCR

```python
result = analyze_image(
    "receipt.jpg",
    """このレシートから以下の情報をJSON形式で抽出してください:
{
  "store_name": string,
  "date": "YYYY-MM-DD",
  "items": [{"name": string, "price": number, "quantity": number}],
  "total": number,
  "tax": number
}"""
)
```

### 2. コードレビュー（スクリーンショットから）

```python
result = analyze_image(
    "code_screenshot.png",
    "このコードのバグ、セキュリティ問題、改善点を指摘してください。"
)
```

### 3. 図表からのデータ抽出

```python
result = analyze_image(
    "chart.png",
    "このグラフからデータを読み取り、CSVフォーマットで出力してください。"
)
```

## 制限事項

| 項目 | 制限 |
|------|------|
| 対応フォーマット | JPEG, PNG, GIF, WebP, PDF |
| 最大画像サイズ | 長辺 8,000px 推奨 |
| 1リクエストの画像数 | 20枚まで（推奨） |
| PDFページ数 | 100ページまで |

:::message
画像のトークンコストは解像度に比例します。不要に高解像度の画像を送るとコストが増大するため、適切にリサイズしてから送信しましょう。
:::

## まとめ

- Base64またはURLで画像を送信できる
- PDFも `document` タイプで直接解析可能
- 複数画像の比較分析も可能
- リサイズでコストを最適化する
