# Zenn記事 → WordPress自動投稿システム設計プラン

## 概要

mainブランチへのpush時に、`published: true`のZenn記事をWordPress（maruhuku.jp）へ自動投稿する仕組みを構築する。

## 推奨構成

### 実装場所: GitHub Actions

**理由:**
- 環境に依存しない（どのPCからpushしても動作）
- Claude Codeを使わなくても動作する
- シークレット管理が安全（GitHub Secrets）
- 実行ログが残り、デバッグしやすい
- 既存のZenn連携ワークフローと統一感がある

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
            ├── 2. frontmatterをパース（published: trueのみ対象）
            ├── 3. Markdown → HTML変換
            ├── 4. Zenn独自記法を処理
            └── 5. WordPress REST APIで投稿/更新
                    │
                    ▼
    [WordPress (maruhuku.jp)]
            └── 記事が公開される
```

## 実装内容

### 1. GitHub Actions ワークフロー

**ファイル:** `.github/workflows/wordpress-sync.yml`

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

### 2. 同期スクリプト

**ファイル:** `scripts/sync-to-wordpress.js`

主な機能:
- 変更されたMarkdownファイルを検出
- frontmatterをパース（gray-matterライブラリ）
- `published: true`の記事のみ処理
- Markdown → HTML変換（marked + カスタム処理）
- Zenn独自記法の変換（:::message, :::details等）
- WordPress REST APIで投稿（新規作成 or 更新）
- スラッグベースで既存記事を識別

### 3. 必要なnpm依存パッケージ

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

### 4. WordPress側の設定

1. **Application Passwords**を有効化（WordPress 5.6+で標準機能）
2. 管理者ユーザーでApplication Passwordを発行
3. GitHub Secretsに登録:
   - `WP_URL`: `https://maruhuku.jp`
   - `WP_USER`: WordPressユーザー名
   - `WP_APP_PASSWORD`: 発行したアプリケーションパスワード

## 変更対象ファイル

| ファイル | 操作 | 説明 |
|---------|------|------|
| `.github/workflows/wordpress-sync.yml` | 新規作成 | GitHub Actionsワークフロー |
| `scripts/sync-to-wordpress.js` | 新規作成 | 同期処理スクリプト |
| `scripts/markdown-converter.js` | 新規作成 | Markdown→HTML変換ロジック |
| `package.json` | 編集 | 依存パッケージ追加 |

## Zenn独自記法の対応

| Zenn記法 | 変換後HTML |
|----------|-----------|
| `:::message` | `<div class="message">` |
| `:::message alert` | `<div class="message alert">` |
| `:::details タイトル` | `<details><summary>タイトル</summary>` |
| `@[youtube](VIDEO_ID)` | `<iframe src="youtube.com/embed/...">` |
| コードブロック | highlight.jsでシンタックスハイライト |

## 動作フロー

1. `articles/`配下のMarkdownファイルを編集
2. `published: true`に設定
3. mainブランチにpush
4. GitHub Actionsが自動起動
5. 変更されたファイルを検出
6. Markdown→HTML変換
7. WordPress REST APIで投稿
8. 投稿成功/失敗をログ出力

## 重複投稿の防止

- ファイル名（スラッグ）をWordPressの投稿スラッグとして使用
- 既存スラッグがあれば更新、なければ新規作成
- frontmatterにWordPress post IDを追記する方式も検討可能

## 検証方法

1. テスト用の記事を作成（`published: false`）
2. ローカルでスクリプトを実行してWordPressへ投稿テスト
3. `published: true`に変更してpush
4. GitHub Actionsのログを確認
5. WordPress管理画面で記事が正しく投稿されたか確認
6. フロントエンドで表示確認

## 注意事項

- 画像はZennのCDN URLをそのまま使用（WordPress側にはアップロードしない）
- カテゴリ・タグはZennのtopicsから自動マッピング可能
- 投稿ステータスは`publish`（公開）で投稿

## 今後の拡張案（スコープ外）

- 記事削除の同期
- 画像のWordPressアップロード
- カテゴリ自動作成
- SEO metaデータの設定
