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
└── articles/               # 生成されたZenn形式の記事（Zenn CLI用）
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

生成された記事は `articles/` に出力されます。

### 4. Zennに公開

生成された記事をZennに公開する方法は2つあります。

#### 方法A: Zennのウェブエディタで公開（簡単・推奨）

1. 記事を生成
   ```bash
   npm run build
   ```

2. `articles/jj-parallel-work.md` をエディタで開く

3. YAMLフロントマター（`---`で囲まれた部分）を含む全文をコピー

4. [Zennのダッシュボード](https://zenn.dev/dashboard) で「記事を書く」をクリック

5. Markdownモードで貼り付けて公開

#### 方法B: GitHub連携で自動公開（上級者向け）

このリポジトリをZenn CLIと連携させます。

**前提**: このリポジトリはjjとGitをcolocate（共存）させて管理しています。

1. Zenn CLIをインストール
   ```bash
   npm install zenn-cli
   ```

2. Zennの設定を初期化
   ```bash
   npx zenn init
   ```

3. 記事を生成（`articles/` に直接出力されます）
   ```bash
   npm run build
   ```

4. jjで変更を記録してGitHubにpush
   ```bash
   # 変更を確認
   jj status

   # 変更に説明を追加
   jj describe -m "記事を追加: jjで複数のissueを並行作業する方法"

   # mainブックマークを設定（Gitのmainブランチをこのchangeにする）
   jj bookmark set main

   # 新しいchangeに進む
   jj new

   # GitHubにpush
   jj git push
   ```

5. Zennのダッシュボードで[GitHub連携設定](https://zenn.dev/dashboard/deploys)を行う

6. 記事の `published: false` を `published: true` に変更して再度push

## メタデータのフォーマット

### 基本フィールド

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

## jjでのワークフロー例

### 記事を追加する場合

```bash
# 1. 記事本文を書く
# jj-new-article.md を作成

# 2. メタデータを作成
# metadata/jj-new-article.yaml を作成

# 3. 記事を生成
npm run build

# 4. 変更を確認
jj status

# 5. 説明を追加
jj describe -m "記事を追加: 新しい記事のタイトル"

# 6. mainブックマークを設定（Gitのmainブランチをこのchangeにする）
jj bookmark set main

# 7. 新しいchangeに進む
jj new

# 8. GitHubにpush
jj git push
```

### メタデータを修正する場合

```bash
# 1. メタデータを編集
# metadata/jj-parallel-work.yaml の published を true に変更

# 2. 記事を再生成
npm run build

# 3. 変更を確認
jj status

# 4. 説明を追加
jj describe -m "記事を公開: jjで複数のissueを並行作業する方法"

# 5. mainブックマークを設定（Gitのmainブランチをこのchangeにする）
jj bookmark set main

# 6. 新しいchangeに進む
jj new

# 7. GitHubにpush
jj git push
```

## 注意事項

- 記事本文（`*.md`）にはメタデータを含めないでください
- メタデータは `metadata/` ディレクトリで一元管理します
- `articles/` はZenn CLI用に生成される記事です（Gitで管理してOK）
