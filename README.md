# maruhuku-contents

技術記事のコンテンツ管理リポジトリ

## ディレクトリ構造

```text
maruhuku-contents/
├── articles/               # Zenn記事（マスター）
│   ├── jj-rebase-vs-merge.md
│   ├── jj-parallel-work.md
│   └── ...
└── books/                  # Zennブック
```

## 使い方

### 1. 新しい記事を作成

```bash
npx zenn new:article --slug 記事のスラッグ名
```

### 2. プレビュー

```bash
npm run preview
# または
npx zenn preview
```

ブラウザで <http://localhost:8000> を開いてプレビューを確認できます。

### 3. 記事を編集

`articles/` 内のMarkdownファイルを直接編集します。

```markdown
---
title: "記事タイトル"
emoji: "🌿"
type: "tech"
topics: ["jj", "git", "versioncontrol"]
published: false
---

# 記事タイトル

本文...
```

### 4. 公開

`published: true` に変更してGitHubにpushすると、Zennに自動公開されます。

```bash
jj describe -m "記事を公開: 記事タイトル"
jj bookmark set main
jj new
jj git push
```

## jjでのワークフロー

### 記事を追加・編集する場合

```bash
# 1. 記事を作成または編集
npx zenn new:article --slug new-article
# articles/new-article.md を編集

# 2. プレビューで確認
npm run preview

# 3. 変更を記録
jj describe -m "記事を追加: 新しい記事のタイトル"

# 4. mainブックマークを設定
jj bookmark set main

# 5. 新しいchangeに進む
jj new

# 6. GitHubにpush
jj git push
```

## 記事のフロントマター

```yaml
---
title: "記事タイトル"
emoji: "🌿"           # 記事のアイコン
type: "tech"          # tech または idea
topics:               # 最大5つ
  - topic1
  - topic2
published: false      # true で公開
---
```
