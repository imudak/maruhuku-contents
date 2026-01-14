# 技術ブログをGitHubリポジトリからpushで自動投稿する方法

## はじめに

技術記事を書くとき、「ローカルで書いてGitHubにpushしたら、自動で各プラットフォームに投稿されたら便利なのに」と思ったことはありませんか？

この記事では、Zenn・Qiita・noteの3つのプラットフォームについて、GitHubリポジトリとの連携による自動投稿が可能かどうかをまとめます。

## 結論

| プラットフォーム | GitHub連携 | 自動投稿 | 備考 |
|------------------|------------|----------|------|
| **Zenn** | ✅ 公式対応 | ✅ 可能 | publicリポジトリのみ |
| **Qiita** | ✅ 公式対応 | ✅ 可能 | GitHub Actions経由 |
| **note** | ❌ 非対応 | ❌ 不可 | 公式APIなし |

## Zenn: 公式GitHub連携

Zennは公式にGitHubリポジトリとの連携機能を提供しています。

### 仕組み

1. GitHubリポジトリとZennアカウントを連携
2. 指定したリポジトリの `articles/` ディレクトリを監視
3. リポジトリにpushすると、自動で記事が投稿・更新される

### セットアップ手順

```bash
# 1. プロジェクトの初期化
npm init -y
npm install zenn-cli

# 2. Zenn用のディレクトリ構造を作成
npx zenn init
```

これで以下の構造が作成されます：

```
your-repo/
├── articles/
│   └── example-article.md
├── books/
└── .gitignore
```

### 記事のフォーマット

```markdown
---
title: "記事のタイトル"
emoji: "📝"
type: "tech"  # tech or idea
topics: ["topic1", "topic2"]
published: true
---

本文をここに書く
```

### GitHub連携の設定

1. [Zennのデプロイ設定](https://zenn.dev/dashboard/deploys)にアクセス
2. 「リポジトリを連携する」をクリック
3. 対象のリポジトリを選択

### 注意点

- **publicリポジトリのみ対応**（privateリポジトリでは使えない）
- privateリポジトリの場合は、手動でZennエディタにコピー＆ペーストが必要

### 参考リンク

- [GitHubリポジトリでZennのコンテンツを管理する](https://zenn.dev/zenn/articles/connect-to-github)
- [Zenn CLIをインストールする](https://zenn.dev/zenn/articles/install-zenn-cli)

## Qiita: GitHub Actions経由で自動投稿

QiitaもGitHubリポジトリとの連携をサポートしています。Zennとは異なり、GitHub Actionsを使った仕組みです。

### 仕組み

1. Qiita CLIでローカルに記事を作成
2. GitHubリポジトリにpush
3. GitHub Actionsが自動実行され、Qiita APIを通じて投稿・更新

### セットアップ手順

```bash
# 1. Qiita CLIのインストール
npm install @qiita/qiita-cli --save-dev

# 2. 初期化
npx qiita init

# 3. ログイン（トークンを設定）
npx qiita login
```

### 記事のフォーマット

```markdown
---
title: 記事のタイトル
tags:
  - Tag1
  - Tag2
private: false
updated_at: ''
id: null
organization_url_name: null
slide: false
ignorePublish: false
---

本文をここに書く
```

### GitHub Actionsの設定

`npx qiita init` を実行すると、`.github/workflows/publish.yml` が自動生成されます。

```yaml
# .github/workflows/publish.yml
name: Publish articles

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: increments/qiita-cli/actions/publish@v1
        with:
          qiita-token: ${{ secrets.QIITA_TOKEN }}
```

### GitHubリポジトリの設定

1. [Qiitaのアクセストークン](https://qiita.com/settings/tokens/new)を発行
   - スコープ: `read_qiita`, `write_qiita`
2. GitHubリポジトリの Settings → Secrets and variables → Actions
3. 「New repository secret」で `QIITA_TOKEN` を追加

### 参考リンク

- [Qiitaの記事をGitHubリポジトリで管理する方法](https://qiita.com/Qiita/items/32c79014509987541130)
- [Qiita CLI - GitHub](https://github.com/increments/qiita-cli)

## note: 公式連携は不可能

noteは**公式APIを公開しておらず、将来の公開予定も「未定」**です。

### 現状

- 公式な投稿APIは存在しない
- GitHubリポジトリとの公式連携機能もない
- 自動投稿を行う公式な手段は提供されていない

### 非公式な方法（非推奨）

以下のような非公式な方法は存在しますが、**推奨しません**：

1. **非公式APIの利用**
   - noteの内部APIをリバースエンジニアリングして利用
   - 予告なく仕様変更される可能性がある

2. **ブラウザ自動操作**
   - Selenium/Playwrightでブラウザを自動操作
   - ログイン情報の管理が必要

### 非推奨の理由

- 非公式APIは予告なく仕様変更・廃止される可能性がある
- 利用規約違反のリスクがある
- ビジネス運用やブランドアカウントでは特に避けるべき
- メンテナンスコストが高い

### 現実的な運用方法

noteについては、以下のワークフローが現実的です：

1. GitHubリポジトリでMarkdownとして記事を管理
2. 投稿時にnoteのエディタに手動でペースト
3. note固有の装飾（見出し画像など）を追加して公開

これなら記事のバックアップと版管理はできつつ、規約リスクを避けられます。

## 複数プラットフォームを一元管理する方法

ZennとQiitaの両方に投稿したい場合、リポジトリ構成を工夫すると便利です。

### ディレクトリ構成例

```
your-repo/
├── articles/           # Zenn用（自動生成）
│   └── article-1.md
├── qiita/              # Qiita用（自動生成）
│   └── article-1.md
├── src/                # 記事のソース（共通）
│   └── article-1.md
├── metadata/           # メタデータ（YAML）
│   └── article-1.yaml
└── scripts/
    └── build.js        # 変換スクリプト
```

### メタデータの設計

```yaml
# metadata/article-1.yaml
title: "記事のタイトル"
description: "記事の説明"

# 共通設定
published: true

# プラットフォーム別設定
platforms:
  zenn:
    enabled: true
    emoji: "📝"
    type: "tech"
    topics: ["topic1", "topic2"]
  qiita:
    enabled: true
    tags: ["Tag1", "Tag2"]
  note:
    enabled: false  # 手動投稿
```

### 変換スクリプトの例

```javascript
// scripts/build.js
const fs = require('fs');
const yaml = require('yaml');

function buildArticles() {
  const metadataFiles = fs.readdirSync('./metadata');

  for (const file of metadataFiles) {
    const metadata = yaml.parse(
      fs.readFileSync(`./metadata/${file}`, 'utf8')
    );
    const slug = file.replace('.yaml', '');
    const content = fs.readFileSync(`./src/${slug}.md`, 'utf8');

    // Zenn用に変換
    if (metadata.platforms.zenn.enabled) {
      const zennFrontmatter = `---
title: "${metadata.title}"
emoji: "${metadata.platforms.zenn.emoji}"
type: "${metadata.platforms.zenn.type}"
topics: ${JSON.stringify(metadata.platforms.zenn.topics)}
published: ${metadata.published}
---`;
      fs.writeFileSync(
        `./articles/${slug}.md`,
        `${zennFrontmatter}\n\n${content}`
      );
    }

    // Qiita用に変換
    if (metadata.platforms.qiita.enabled) {
      const qiitaFrontmatter = `---
title: ${metadata.title}
tags:
${metadata.platforms.qiita.tags.map(t => `  - ${t}`).join('\n')}
private: false
---`;
      fs.writeFileSync(
        `./qiita/${slug}.md`,
        `${qiitaFrontmatter}\n\n${content}`
      );
    }
  }
}

buildArticles();
```

### ワークフロー

```bash
# 1. 記事を書く
vim src/new-article.md

# 2. メタデータを作成
vim metadata/new-article.yaml

# 3. ビルド（各プラットフォーム用に変換）
npm run build

# 4. pushで自動投稿
git add .
git commit -m "Add: 新しい記事"
git push
```

## まとめ

### 各プラットフォームの特徴

| | Zenn | Qiita | note |
|---|---|---|---|
| **連携方式** | リポジトリ監視 | GitHub Actions | なし |
| **セットアップ** | 簡単 | やや複雑 | - |
| **privateリポジトリ** | ❌ | ✅ | - |
| **メンテナンス** | 不要 | 不要 | - |

### 推奨ワークフロー

1. **Zenn**: 公式連携を使う（publicリポジトリの場合）
2. **Qiita**: GitHub Actions + Qiita CLIを使う
3. **note**: Markdownで管理し、手動でペースト

### 技術記事管理のメリット

- **バックアップ**: GitHubにソースがあるので安心
- **版管理**: 変更履歴が残る
- **効率化**: 複数プラットフォームへの投稿が楽になる
- **可搬性**: プラットフォームを変えても記事は手元に残る

GitHubリポジトリでの記事管理は、技術記事を長期的に運用していく上で非常に有効な方法です。特にZennとQiitaは公式サポートがあるので、積極的に活用することをおすすめします。
