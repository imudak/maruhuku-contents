---
title: "Claude × Notion API 自動化レシピ集【実践10パターン】"
emoji: "🤖"
type: "tech"
topics: ["claude", "notion", "api", "自動化", "ai"]
published: true
price: 500
---

# はじめに

NotionをタスクDB・ナレッジベースとして使い、Claude（APIまたはOpenClaw等のエージェント）からNotion APIを叩いて自動化する。この組み合わせは、個人開発者や小規模チームの生産性を劇的に変える。

この記事では、実際に運用して効果のあった **10のレシピ** を紹介する。コピペで動くコード付き。

:::message
Notion APIの基本（トークン取得、インテグレーション作成）は理解している前提で進める。まだの方は [Notion API 公式ドキュメント](https://developers.notion.com/) を参照。
:::

# 準備: 共通設定

すべてのレシピで使う共通のHTTPリクエスト設定：

```bash
# 環境変数
NOTION_TOKEN="ntn_xxxxx"  # Internal Integration Token
NOTION_VERSION="2025-09-03"

# 共通ヘッダー
HEADERS=(
  -H "Authorization: Bearer $NOTION_TOKEN"
  -H "Content-Type: application/json"
  -H "Notion-Version: $NOTION_VERSION"
)
```

TypeScript/Pythonで使う場合：

```typescript
// TypeScript（fetch）
const headers = {
  'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2025-09-03',
};
```

```python
# Python（requests）
import requests

headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2025-09-03",
}
```

---

# レシピ 1: TODOの自動追加

最も基本的なパターン。AIがタスクを認識したら、Notion DBに自動登録する。

### ユースケース
- 会話中に「〇〇やらないと」と言ったらTODOに追加
- 定期チェックで発見した作業をTODOに登録
- 外部サービスのイベントをタスク化

### 実装

```bash
curl -X POST https://api.notion.com/v1/pages \
  "${HEADERS[@]}" \
  -d '{
    "parent": { "database_id": "YOUR_DB_ID" },
    "properties": {
      "Name": {
        "title": [{ "text": { "content": "スクショ撮影してストアに提出" } }]
      },
      "Status": {
        "status": { "name": "Not started" }
      },
      "Priority": {
        "select": { "name": "High" }
      }
    }
  }'
```

### ポイント
- `database_id` はNotionのURLから取得（`notion.so/` の直後の32文字）
- プロパティ名はDBの列名と**完全一致**させること
- ステータスやセレクトの値も、DBに定義済みのものを使うこと

---

# レシピ 2: 子ページに手順を記載

TODO本体だけでなく、手順書を子ページとして追加するパターン。

### 実装

```bash
# 1. まず親ページ（TODO）を作成 → page_id を取得
PAGE_ID="作成したページのID"

# 2. 子ブロック（手順）を追加
curl -X PATCH "https://api.notion.com/v1/blocks/${PAGE_ID}/children" \
  "${HEADERS[@]}" \
  -d '{
    "children": [
      {
        "object": "block",
        "type": "heading_2",
        "heading_2": {
          "rich_text": [{ "text": { "content": "手順" } }]
        }
      },
      {
        "object": "block",
        "type": "numbered_list_item",
        "numbered_list_item": {
          "rich_text": [{ "text": { "content": "Windowsでエミュレータを起動" } }]
        }
      },
      {
        "object": "block",
        "type": "numbered_list_item",
        "numbered_list_item": {
          "rich_text": [{ "text": { "content": "アプリをインストールして実行" } }]
        }
      },
      {
        "object": "block",
        "type": "numbered_list_item",
        "numbered_list_item": {
          "rich_text": [{ "text": { "content": "各画面のスクリーンショットを撮影" } }]
        }
      }
    ]
  }'
```

### ポイント
- ブロック追加は `PATCH /v1/blocks/{block_id}/children`
- 1回のリクエストで最大100ブロックまで追加可能
- ネストしたブロック（トグル内のリスト等）も可能

---

# レシピ 3: DBの一括クエリと状態チェック

定期的にDBを読み取り、期限切れや滞留タスクを検出する。

### 実装

```bash
# 「進行中」で期限が過去のタスクを取得
curl -X POST "https://api.notion.com/v1/databases/${DB_ID}/query" \
  "${HEADERS[@]}" \
  -d '{
    "filter": {
      "and": [
        {
          "property": "Status",
          "status": { "equals": "In progress" }
        },
        {
          "property": "Due",
          "date": { "before": "2026-02-09" }
        }
      ]
    },
    "sorts": [
      { "property": "Due", "direction": "ascending" }
    ]
  }'
```

### 活用パターン
- 毎朝の定期チェックで期限切れタスクを通知
- 週次レビューで「完了」以外のタスクをリストアップ
- 優先度別のダッシュボード生成

---

# レシピ 4: ページの自動分類・整理

AIが内容を読み取り、カテゴリを自動設定するパターン。

### フロー

```
1. 新規ページが追加される（手動 or Webクリッパー）
2. AIがページ内容を読み取り
3. カテゴリ・タグを判定
4. プロパティを自動更新
```

### 実装（プロパティ更新）

```bash
curl -X PATCH "https://api.notion.com/v1/pages/${PAGE_ID}" \
  "${HEADERS[@]}" \
  -d '{
    "properties": {
      "Category": {
        "select": { "name": "技術記事" }
      },
      "Tags": {
        "multi_select": [
          { "name": "AI" },
          { "name": "自動化" }
        ]
      }
    }
  }'
```

### Claudeとの組み合わせ

```python
# ページ内容をClaudeに渡して分類
import anthropic

client = anthropic.Anthropic()

# Notionからページ内容を取得
page_content = get_page_content(page_id)  # 自作関数

# Claudeで分類
response = client.messages.create(
    model="claude-sonnet-4-5-20250514",
    max_tokens=200,
    messages=[{
        "role": "user",
        "content": f"以下の記事を分類してください。カテゴリ: [技術記事, ビジネス, 日記, アイデア] から1つ。\n\n{page_content}"
    }]
)

category = response.content[0].text.strip()
update_page_category(page_id, category)  # Notion API で更新
```

---

# レシピ 5: 議事録の自動生成

会議やブレストの内容からNotionページを自動生成。

### テンプレート

```python
def create_meeting_note(title, participants, summary, action_items):
    blocks = [
        heading_block("参加者"),
        paragraph_block(", ".join(participants)),
        heading_block("サマリー"),
        paragraph_block(summary),
        heading_block("アクションアイテム"),
    ]
    for item in action_items:
        blocks.append(todo_block(item["task"], item.get("assignee", "")))
    
    # ページ作成 + ブロック追加
    page = create_page(parent_db_id, title, {"Date": today()})
    add_blocks(page["id"], blocks)
```

---

# レシピ 6: Webクリップの自動要約

Notionに保存したWebクリップをAIで要約し、要約プロパティを自動設定。

### フロー

```
1. Notion Web Clipperでページ保存
2. 定期チェックで「要約」プロパティが空のページを検出
3. ページ内容を取得 → Claudeで要約
4. 要約をプロパティに書き込み
```

### 実装のコツ
- Notionのブロック取得は再帰的に行う必要がある（子ブロック）
- `rich_text` から plain text を抽出するヘルパー関数を用意すると楽
- 要約は200字程度に収めるとDBビューで見やすい

---

# レシピ 7: 定期レポートの自動生成

週次・月次でDBの統計を集計し、レポートページを自動生成。

### 実装例（週次レポート）

```python
# 今週完了したタスクを集計
completed = query_db(db_id, filter={
    "and": [
        {"property": "Status", "status": {"equals": "Done"}},
        {"property": "Completed", "date": {"after": week_start}}
    ]
})

# レポート生成
report_blocks = [
    heading_block(f"週次レポート {week_start} 〜 {week_end}"),
    paragraph_block(f"完了タスク: {len(completed)}件"),
    divider_block(),
    heading_block("完了タスク一覧"),
]
for task in completed:
    title = get_title(task)
    report_blocks.append(bullet_block(title))

create_page(report_db_id, f"週次レポート {week_start}", {})
```

---

# レシピ 8: ページの移動

ページを別の親ページの下に移動する。2024年以降の新APIエンドポイントを使用。

### 実装

```bash
# ページを新しい親の下に移動
curl -X POST "https://api.notion.com/v1/pages/${PAGE_ID}/move" \
  "${HEADERS[@]}" \
  -d '{
    "new_parent": {
      "type": "page_id",
      "page_id": "NEW_PARENT_PAGE_ID"
    }
  }'
```

:::message alert
**注意:** ページの移動は `PATCH /v1/pages` ではなく `POST /v1/pages/{id}/move` を使う。PATCHでparentを変更しようとしてもエラーになる。
:::

---

# レシピ 9: データベース作成の自動化

プロジェクトのセットアップ時に、テンプレートDBを自動生成。

### 実装

```bash
curl -X POST "https://api.notion.com/v1/databases" \
  "${HEADERS[@]}" \
  -d '{
    "parent": { "page_id": "PARENT_PAGE_ID" },
    "title": [{ "text": { "content": "実験トラッカー" } }],
    "properties": {
      "Name": { "title": {} },
      "Status": {
        "status": {
          "options": [
            { "name": "未着手", "color": "default" },
            { "name": "進行中", "color": "blue" },
            { "name": "完了", "color": "green" },
            { "name": "中止", "color": "red" }
          ]
        }
      },
      "Category": {
        "select": {
          "options": [
            { "name": "コンテンツ", "color": "orange" },
            { "name": "ツール", "color": "purple" },
            { "name": "サービス", "color": "pink" }
          ]
        }
      },
      "Revenue": { "number": { "format": "yen" } },
      "Started": { "date": {} },
      "URL": { "url": {} }
    }
  }'
```

---

# レシピ 10: ブロック内容の一括更新

既存ページの内容をプログラムから更新する。ログ追記や進捗記録に便利。

### 実装（既存ページにブロック追記）

```bash
curl -X PATCH "https://api.notion.com/v1/blocks/${PAGE_ID}/children" \
  "${HEADERS[@]}" \
  -d '{
    "children": [
      {
        "object": "block",
        "type": "heading_3",
        "heading_3": {
          "rich_text": [{ "text": { "content": "2026-02-09 18:00 — 進捗報告" } }]
        }
      },
      {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
          "rich_text": [{ "text": { "content": "P-02記事を公開。P-07の執筆を開始。" } }]
        }
      }
    ]
  }'
```

### 既存ブロックの更新

```bash
# 特定のブロックの内容を書き換え
curl -X PATCH "https://api.notion.com/v1/blocks/${BLOCK_ID}" \
  "${HEADERS[@]}" \
  -d '{
    "paragraph": {
      "rich_text": [{ "text": { "content": "更新後のテキスト" } }]
    }
  }'
```

---

# まとめ

| レシピ | 難易度 | 効果 |
|--------|--------|------|
| 1. TODO自動追加 | ⭐ | タスク漏れ防止 |
| 2. 手順付き子ページ | ⭐ | 作業品質向上 |
| 3. DBクエリ＆状態チェック | ⭐⭐ | 滞留タスク検出 |
| 4. 自動分類 | ⭐⭐ | 整理の手間削減 |
| 5. 議事録生成 | ⭐⭐ | 記録の自動化 |
| 6. Web要約 | ⭐⭐⭐ | 情報消化の効率化 |
| 7. 定期レポート | ⭐⭐⭐ | 振り返りの自動化 |
| 8. ページ移動 | ⭐ | 整理の自動化 |
| 9. DB作成 | ⭐⭐ | セットアップ高速化 |
| 10. ブロック更新 | ⭐⭐ | ログ・進捗の自動記録 |

Notion APIは「CRUD + ブロック操作」という比較的シンプルな構造だが、Claudeと組み合わせることで、単なるCRUDを超えた **知的な自動化** が実現できる。

重要なのは、一気に全部作ろうとしないこと。まずレシピ1（TODO自動追加）から始めて、運用しながら必要なものを足していく。

---

:::message
質問やリクエストがあればコメント欄へ。「こんなレシピが欲しい」というリクエストも歓迎。
:::
