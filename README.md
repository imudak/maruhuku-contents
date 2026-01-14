# maruhuku-contents

技術記事のコンテンツ管理リポジトリ

## ディレクトリ構造

```
maruhuku-contents/
├── *.md                    # 記事本文（メタデータなし）
├── metadata/               # 記事ごとのメタデータ
│   ├── jj-rebase-vs-merge.yaml
│   ├── jj-parallel-work.yaml
│   └── ...
├── scripts/                # ビルドスクリプト
│   └── merge-metadata.js   # メタデータと本文を統合
└── zenn-articles/          # 生成されたZenn形式の記事（gitignore推奨）
    ├── jj-rebase-vs-merge.md
    └── ...
```

## 使い方

### 1. 記事を書く

記事本文は直接 `*.md` ファイルとして作成します。メタデータは含めません。

```markdown
# jjでの「分岐の付け替え」: rebase vs merge

## 背景

...
```

### 2. メタデータを作成

`metadata/` ディレクトリに同名の `.yaml` ファイルを作成します。

```yaml
# metadata/jj-rebase-vs-merge.yaml
title: "jjでの「分岐の付け替え」: rebase vs merge"
emoji: "🌿"
type: "tech"
topics:
  - jj
  - git
  - versioncontrol
  - rebase
  - merge
published: false
```

### 3. Zenn形式の記事を生成

スクリプトを実行して、メタデータと本文を統合します。

```bash
# 特定の記事を生成
node scripts/merge-metadata.js jj-rebase-vs-merge

# すべての記事を生成
node scripts/merge-metadata.js --all
```

生成された記事は `zenn-articles/` に出力されます。

### 4. Zennに公開

生成された記事をZenn CLIで公開します。

```bash
# Zenn CLIを使う場合
cp zenn-articles/* ~/your-zenn-repo/articles/
cd ~/your-zenn-repo
npx zenn preview
```

## メタデータの形式

### 必須フィールド（Zenn）

```yaml
title: "記事タイトル"
emoji: "🌿"  # 記事のアイコン
type: "tech"  # tech または idea
topics:  # 最大5つ
  - topic1
  - topic2
published: false  # true で公開
```

### プラットフォーム別設定

```yaml
platforms:
  zenn:
    enabled: true
    slug: "article-slug"
  qiita:
    enabled: true
    tags: ["Tag1", "Tag2"]
  note:
    enabled: false
    hashtags: ["tag1", "tag2"]
```

### SEO用フィールド

```yaml
description: "記事の説明文"
keywords:
  - keyword1
  - keyword2
```

## セットアップ

### 必要なパッケージ

```bash
npm install yaml
```

## 記事一覧

- `jj-rebase-vs-merge.md` - jjでのrebase vs merge
- `jj-parallel-work.md` - jjで複数のissueを並行作業する方法
- `jj-vs-git-comparison.md` - jjとGitの比較
- `tech-blog-platform-comparison.md` - 技術記事の投稿先選び

## 注意事項

- 記事本文（`*.md`）にはメタデータを含めないでください
- メタデータは `metadata/` ディレクトリで一元管理します
- `zenn-articles/` は生成ファイルなので `.gitignore` に追加することを推奨します
