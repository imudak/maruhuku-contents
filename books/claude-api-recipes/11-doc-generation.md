---
title: "実践プロジェクト: ドキュメント自動生成"
---

## この章で学ぶこと

- コードからAPIドキュメントを自動生成する
- マークダウンレポートの自動作成
- テンプレートベースの文書生成パイプライン

## ユースケース

ドキュメント生成はClaude APIの最も実用的な活用の一つです。

- **APIリファレンス**: TypeScriptの型定義からドキュメントを生成
- **レポート**: データ分析結果を自然言語のレポートに変換
- **翻訳**: 技術文書の多言語化
- **議事録**: 会議メモから構造化された議事録を作成

## APIドキュメント自動生成

TypeScriptの型定義とコメントからAPIドキュメントを生成します。

```typescript
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { glob } from "glob";

const client = new Anthropic();

async function generateApiDoc(sourceCode: string, fileName: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `あなたはテクニカルライターです。
TypeScriptのソースコードからAPIドキュメントをMarkdown形式で生成してください。

## ルール
- 各エクスポートされた関数・クラス・型を文書化
- パラメータ、戻り値、使用例を含める
- JSDocコメントがあればそれを活用
- 使用例は実際に動作するコードで書く
- 日本語で記述`,
    messages: [
      {
        role: "user",
        content: `ファイル: ${fileName}\n\n\`\`\`typescript\n${sourceCode}\n\`\`\``,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function generateDocs(srcDir: string, outDir: string) {
  const files = await glob(`${srcDir}/**/*.ts`);

  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");
    const relativePath = path.relative(srcDir, file);

    console.log(`Generating docs for: ${relativePath}`);
    const doc = await generateApiDoc(source, relativePath);

    const outPath = path.join(outDir, relativePath.replace(".ts", ".md"));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, doc);
  }

  console.log("Documentation generated!");
}

// 使用例
generateDocs("./src", "./docs/api");
```

## データレポート自動生成

### CSV/JSONデータからレポートを生成

```python
import anthropic
import json
import csv
from pathlib import Path

client = anthropic.Anthropic()


def generate_report(data: list[dict], title: str, focus_areas: list[str]) -> str:
    """データからMarkdownレポートを生成"""

    # データの統計情報を事前計算
    summary = {
        "total_records": len(data),
        "columns": list(data[0].keys()) if data else [],
        "sample": data[:5],  # 先頭5件をサンプルとして送信
    }

    focus_text = "\n".join(f"- {area}" for area in focus_areas)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system="""あなたはデータアナリストです。
提供されたデータを分析し、ビジネスレポートをMarkdown形式で作成してください。

## レポート構成
1. エグゼクティブサマリー（3行以内）
2. 主要指標のハイライト
3. 詳細分析（注力分野に基づく）
4. 推奨アクション
5. 注意事項・データの限界

数値は具体的に、グラフの代わりにテーブルを使用してください。""",
        messages=[
            {
                "role": "user",
                "content": f"""# {title}

## データ概要
{json.dumps(summary, ensure_ascii=False, indent=2)}

## 全データ
{json.dumps(data, ensure_ascii=False)}

## 注力分析ポイント
{focus_text}""",
            }
        ],
    )
    return message.content[0].text


# 使用例
with open("sales_data.csv") as f:
    data = list(csv.DictReader(f))

report = generate_report(
    data=data,
    title="2024年Q4 売上レポート",
    focus_areas=["前年同期比の変化", "商品カテゴリ別の分析", "地域別トレンド"],
)

Path("report.md").write_text(report)
```

## テンプレートベース文書生成

テンプレートとデータを組み合わせて定型文書を生成するパイプラインです。

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface DocTemplate {
  name: string;
  systemPrompt: string;
  sections: string[];
}

const templates: Record<string, DocTemplate> = {
  release_notes: {
    name: "リリースノート",
    systemPrompt: `あなたはテクニカルライターです。
Gitのコミットログからリリースノートを生成してください。
ユーザー向けにわかりやすく、技術的な詳細は適度に含めてください。`,
    sections: ["新機能", "改善", "バグ修正", "破壊的変更", "既知の問題"],
  },
  meeting_minutes: {
    name: "議事録",
    systemPrompt: `会議メモから構造化された議事録を作成してください。
決定事項とアクションアイテムを明確に記載してください。`,
    sections: ["出席者", "議題", "議論内容", "決定事項", "アクションアイテム", "次回予定"],
  },
};

async function generateFromTemplate(
  templateKey: string,
  inputData: string
): Promise<string> {
  const template = templates[templateKey];
  if (!template) throw new Error(`Unknown template: ${templateKey}`);

  const sectionList = template.sections.map((s) => `- ${s}`).join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `${template.systemPrompt}\n\n## 必須セクション\n${sectionList}`,
    messages: [{ role: "user", content: inputData }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// 使用例: コミットログからリリースノート
const commitLog = `
feat: ユーザープロフィール編集機能を追加
fix: ログイン時のリダイレクトバグを修正
feat: ダークモードに対応
refactor: APIクライアントのエラーハンドリングを改善
fix: メモリリークの修正（Dashboard画面）
BREAKING: 認証APIのレスポンス形式を変更
`;

const releaseNotes = await generateFromTemplate("release_notes", commitLog);
console.log(releaseNotes);
```

## 大量ファイルの一括処理

```typescript
import pLimit from "p-limit";

const limit = pLimit(3);

async function batchGenerateDocs(
  files: { path: string; content: string }[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  await Promise.all(
    files.map((file) =>
      limit(async () => {
        console.log(`Processing: ${file.path}`);
        const doc = await generateApiDoc(file.content, file.path);
        results.set(file.path, doc);
      })
    )
  );

  return results;
}
```

## 品質チェックパイプライン

生成したドキュメントの品質を自動チェックします。

```python
def check_doc_quality(document: str) -> dict:
    """生成されたドキュメントの品質をチェック"""
    message = client.messages.create(
        model="claude-haiku-3-5-20241022",  # チェックは安いモデルで
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": f"""以下のドキュメントを品質チェックしてください。
JSON形式で結果を返してください。

チェック項目:
- completeness: 必要な情報が揃っているか (1-5)
- accuracy: 技術的に正確か (1-5)
- clarity: わかりやすいか (1-5)
- issues: 問題点のリスト

{document}""",
            },
            {"role": "assistant", "content": "{"},
        ],
    )
    return json.loads("{" + message.content[0].text)
```

## まとめ

- Claude APIで定型的なドキュメント作成を自動化できる
- テンプレートパターンで品質を安定させる
- 並列処理で大量ファイルも効率的に処理
- 品質チェックを自動化してレビュー負荷を軽減
