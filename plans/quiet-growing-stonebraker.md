# Zenn記事 → WordPress自動投稿システム実装プラン

## 概要

mainブランチへのpush時に、`published: true`のZenn記事をWordPress（maruhuku.jp）へ自動投稿する。

## 事前確認結果

### WordPress REST API確認（2024-01-23実施）

| 項目 | 状態 | 詳細 |
|------|------|------|
| REST API | ✅ 有効 | `https://maruhuku.jp/wp-json/wp/v2/` 正常応答 |
| Application Passwords | ✅ 対応 | 認証方式として明示 |
| 投稿エンドポイント | ✅ 存在 | `/wp/v2/posts` 利用可能 |
| サイト情報 | まるふく工房 | タイムゾーン: Asia/Tokyo |

**結論**: 外部からのREST API経由の投稿は技術的に可能。

### 実装前の準備作業（ユーザー作業）

1. **Application Passwordの発行**
   - WordPress管理画面（https://maruhuku.jp/wp-admin/）にログイン
   - ユーザー → プロフィール → 下部「アプリケーションパスワード」セクション
   - 名前に「GitHub Actions」等を入力し「新しいアプリケーションパスワードを追加」
   - 表示されたパスワードをコピー（一度しか表示されない）

2. **GitHub Secretsの登録**
   - リポジトリの Settings → Secrets and variables → Actions
   - 以下を登録:
     - `WP_URL`: `https://maruhuku.jp`
     - `WP_USER`: WordPressログインユーザー名
     - `WP_APP_PASSWORD`: 発行したパスワード（スペース含む形式のまま）

3. **投稿テスト（API疎通確認）**
   - Application Password発行後、GitHub Actions実装前に実施
   - curlコマンドでテスト投稿を作成:
   ```bash
   curl -X POST "https://maruhuku.jp/wp-json/wp/v2/posts" \
     -u "ユーザー名:アプリケーションパスワード" \
     -H "Content-Type: application/json" \
     -d '{"title":"APIテスト投稿","content":"テスト本文","status":"draft"}'
   ```
   - 成功すれば投稿IDを含むJSONが返る
   - WordPress管理画面で下書き投稿を確認
   - 確認後、テスト投稿は削除

## 推奨構成

### 実装場所: GitHub Actions

**理由:**
- 環境に依存しない（どのPCからpushしても動作）
- Claude Codeを使わなくても動作する
- シークレット管理が安全（GitHub Secrets）
- 実行ログが残り、デバッグしやすい

### Markdown変換: GitHub Actions側で変換

**理由:**
- WordPressにMarkdownプラグインが不要（プラグイン依存を避ける）
- プラグインのアップデート・非互換リスクがない
- 変換ロジックを自分でコントロールできる
- Zenn独自記法（:::message等）も変換対応可能

## 技術構成

```
[GitHub Repository]
    │
    ├── articles/*.md (Zenn記事)
    │
    └── .github/workflows/wordpress-sync.yml
            │
            ▼ (push to main)
    [GitHub Actions]
            │
            ├── 1. 変更されたMarkdownファイルを検出
            ├── 2. frontmatterをパース（published: trueのみ）
            ├── 3. Markdown → HTML変換
            ├── 4. Zenn独自記法を処理
            └── 5. WordPress REST APIで投稿/更新
                    │
                    ▼
    [WordPress (maruhuku.jp)]
            └── 記事が公開される
```

## 変更対象ファイル

| ファイル | 操作 | 説明 |
|---------|------|------|
| `.github/workflows/wordpress-sync.yml` | 新規作成 | GitHub Actionsワークフロー |
| `scripts/sync-to-wordpress.js` | 新規作成 | 同期処理メインスクリプト |
| `scripts/markdown-converter.js` | 新規作成 | Markdown→HTML変換 |
| `package.json` | 編集 | devDependencies追加 |

## 実装内容

### 1. package.json への依存追加

```json
{
  "devDependencies": {
    "gray-matter": "^4.0.3",
    "marked": "^15.0.0",
    "marked-highlight": "^2.2.0",
    "highlight.js": "^11.10.0"
  }
}
```

### 2. GitHub Actions ワークフロー

**ファイル**: `.github/workflows/wordpress-sync.yml`

```yaml
name: Sync to WordPress

on:
  push:
    branches: [main]
    paths:
      - 'articles/**/*.md'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # 差分検出用

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Sync to WordPress
        run: node scripts/sync-to-wordpress.js
        env:
          WP_URL: ${{ secrets.WP_URL }}
          WP_USER: ${{ secrets.WP_USER }}
          WP_APP_PASSWORD: ${{ secrets.WP_APP_PASSWORD }}
```

### 3. 同期スクリプト

**ファイル**: `scripts/sync-to-wordpress.js`

- git diffで変更ファイルを検出
- gray-matterでfrontmatterパース
- `published: true`の記事のみ処理
- スラッグで既存記事を検索、あれば更新/なければ新規作成

### 4. Markdown変換

**ファイル**: `scripts/markdown-converter.js`

- markedでMarkdown→HTML変換
- highlight.jsでコードハイライト
- Zenn独自記法の変換（下表参照）

## Zenn独自記法の対応

| Zenn記法 | 変換後HTML |
|----------|-----------|
| `:::message` | `<div class="message">` |
| `:::message alert` | `<div class="message alert">` |
| `:::details タイトル` | `<details><summary>タイトル</summary>` |
| `@[youtube](VIDEO_ID)` | `<iframe src="youtube.com/embed/...">` |
| コードブロック | highlight.jsでシンタックスハイライト |

## Zenn記事形式（現状確認済み）

```yaml
---
title: 記事タイトル
emoji: 📚
type: tech
topics:
  - ClaudeCode
  - NotebookLM
published: true
---
```

→ WordPressへのマッピング:
- `title` → 投稿タイトル
- `topics` → カテゴリ/タグ（オプション）
- `published: true` → 同期対象

## GitHub Secrets設定（ユーザー作業）

| Secret名 | 値 |
|----------|-----|
| `WP_URL` | `https://maruhuku.jp` |
| `WP_USER` | WordPressユーザー名 |
| `WP_APP_PASSWORD` | 発行したアプリケーションパスワード |

## 検証方法

1. **ローカルテスト**: スクリプト単体実行でAPI疎通確認
2. **テスト記事**: `published: false`の記事で動作確認
3. **本番テスト**: `published: true`に変更してpush
4. **確認項目**:
   - GitHub Actionsログで成功確認
   - WordPress管理画面で記事確認
   - フロントエンド表示確認

## 重複投稿防止

- Zennのファイル名（例: `claude-code-notebooklm-skill`）をWordPressスラッグとして使用
- REST APIでスラッグ検索し、既存なら更新（PUT）、なければ新規（POST）

## 動作フロー

1. `articles/`配下のMarkdownファイルを編集
2. `published: true`に設定
3. mainブランチにpush
4. GitHub Actionsが自動起動
5. 変更されたファイルを検出
6. Markdown→HTML変換
7. WordPress REST APIで投稿
8. 投稿成功/失敗をログ出力

## 注意事項

- 画像はZennのCDN URLをそのまま使用（WordPress側にはアップロードしない）
- カテゴリ・タグはZennのtopicsから自動マッピング可能
- 投稿ステータスは`publish`（公開）で投稿

## 今後の拡張案（スコープ外）

- 記事削除の同期
- 画像のWordPressアップロード
- カテゴリ自動作成
- SEO metaデータの設定
