# Content Management Design

**Feature**: content-management
**Version**: 1.0.0
**Status**: Implemented
**Date**: 2026-02-24

---

## 概要

まるふく工房のZenn記事・ブックを管理するコンテンツリポジトリの設計。
jj/Git バージョン管理 + Zenn CLI + textlint による記事執筆・公開フローを実現する。

---

## アーキテクチャ概要

```
maruhuku-contents/
├── articles/           # Zenn記事（Markdown）[REQ-CM-001]
├── books/              # Zennブック [REQ-CM-008]
├── video-projects/     # 動画プロジェクト関連
├── plans/              # 計画書
├── raws/               # 素材・下書き
├── storage/            # MUSUBI SDD文書
│   ├── specs/          # 要件定義
│   ├── design/         # 設計
│   ├── tasks/          # タスク一覧
│   └── ...
├── steering/           # プロジェクトメモリ
│   ├── product.md
│   ├── tech.md
│   ├── structure.md
│   └── rules/constitution.md
├── .claude/
│   └── skills/         # Claudeスキル定義
├── CLAUDE.md           # Claude操作指示
├── package.json        # Zenn CLI + textlint
└── .jj/               # jj VCS管理
```

---

## DIR-001: articles/ ディレクトリ設計

### ファイル命名規則
- `{slug}.md` 形式（kebab-case）
- slug はZenn記事URLの一部: `https://zenn.dev/imudak/articles/{slug}`

### フロントマター仕様
```yaml
---
title: "記事タイトル"
emoji: "🔗"          # 1文字の絵文字
type: "tech"          # tech または idea
topics:               # 最大5つのトピックタグ
  - topic1
  - topic2
published: false      # false=下書き / true=公開
---
```

---

## DIR-002: バージョン管理設計

### jj/Git ハイブリッド管理
- **プライマリ VCS**: jj（Jujutsu）
- **リモート**: GitHub (`https://github.com/imudak/maruhuku-contents`)
- **公開**: `jj git push` でGitHubにpush → ZennがGitHub連携で自動同期

### 基本操作フロー
```bash
# 変更の記録
jj describe -m "コミットメッセージ"

# mainブックマーク更新 + push
jj bookmark set main
jj new
jj git push
```

---

## DIR-003: books/ ディレクトリ設計

```
books/
└── {book-slug}/
    ├── config.yaml     # ブック設定
    └── {chapter}.md    # チャプター（連番ファイル名）
```

---

## FLOW-001: 記事公開フロー

```
執筆開始
  ↓
npx zenn new:article --slug {slug}
  ↓
Markdown執筆（published: false）
  ↓
FLOW-002: Lint検証
  ↓
STYLE-001: 校正スキル実行
  ↓
imudak承認（"公開してよい"）
  ↓
published: true に変更
  ↓
jj describe + jj bookmark set main + jj new + jj git push
  ↓
Zenn公開完了
```

---

## FLOW-002: Lint検証設計

### textlint設定
- 設定ファイル: `.textlintrc`（プロジェクトルート）
- 実行: `npx textlint articles/{slug}.md`
- 合格基準: exit code 0（エラー0件）

### markdownlint設定
- Zenn CLIが内部的にmarkdownlintを使用
- `npx zenn preview` でリアルタイム確認可能

---

## FLOW-003: 記事執筆フロー（article-writing.md 連携）

flow-manager の `article-writing.md` フローと連携した記事管理。

### ステータス遷移
```
未処理 → 候補（5軸評価採点 50点以上）
候補   → 執筆中（週1〜2本選定）
執筆中 → おねがい待ち（執筆・textlint完了後）
おねがい待ち → 公開済み（imudak承認 → jj push → Zenn公開確認）
```

### 評価軸（100点満点）
| 軸 | 点数 | 判定基準 |
|---|---|---|
| タイムリーさ | 20点 | 情報の鮮度 |
| 読者需要 | 20点 | Zennエンジニア層への訴求 |
| まるふく実績との紐付き | 20点 | 実体験・数値・失敗例の有無 |
| 差別化 | 20点 | 独自視点の有無 |
| 収益性 | 20点 | 有料化・コンサル誘導の可能性 |

---

## STYLE-001: 著者スタイル設計

### 著者ペルソナ
- 55歳の個人事業主プログラマ
- 組み込みメイン、Windows/Linux/スマホアプリ経験あり
- AI驚き屋ではなく淡々と事実を述べるトーン

### 執筆ルール（CLAUDE.md準拠）
- ですます調統一
- AIっぽい定型文禁止（「以下に示します」等）
- 冒頭に具体的エピソードのフック
- 実体験ベース（「〜した」、「〜だった」）

### 校正スキル
- `/japanese-article-proofreading articles/{slug}.md`
- 最終公開前の必須ステップ

---

## TECH-001: 技術スタック

### Node.js パッケージ
```json
{
  "dependencies": {
    "zenn-cli": "latest"
  },
  "devDependencies": {
    "textlint": "latest",
    "textlint-rule-*": "各種ルール"
  }
}
```

### 主要CLIコマンド
| コマンド | 用途 |
|----------|------|
| `npx zenn new:article --slug {slug}` | 新規記事作成 |
| `npx zenn preview` | ローカルプレビュー |
| `npx textlint articles/{slug}.md` | Lint検証 |
| `jj git push` | GitHub/Zennに公開 |

---

## KPI-001: KPI設計

### 目標値
| KPI | 目標 |
|-----|------|
| 月間記事公開数 | 4本以上 |
| Zennフォロワー増加数 | 月+50人 |
| 有料記事購読数（累計） | 100件 |
| コンサル問い合わせ貢献 | 月1件以上 |

### 収益化戦略
1. **Zenn有料記事**: 200〜500円/本
2. **記事→コンサル誘導**: 記事末尾からのコンタクト動線
3. **フォロワー獲得→認知拡大**: ブランド構築

---

## ADR-001: jj をプライマリVCSとして採用

**決定**: Git の代わりに jj（Jujutsu）を使用

**理由**:
- Change-based モデルによるクリーンな履歴管理
- Conflict-free リベース操作
- 個人開発環境での継続的な使用実績

**代替案**: Git のみ
→ jj のChange-based ワークフローの利便性を優先して不採用

---

## Requirements Coverage Matrix

| 要件ID | 設計セクション |
|--------|--------------|
| REQ-CM-001 | DIR-001 |
| REQ-CM-002 | DIR-002 |
| REQ-CM-003 | FLOW-001 |
| REQ-CM-004 | FLOW-001 |
| REQ-CM-005 | FLOW-002 |
| REQ-CM-006 | FLOW-003 |
| REQ-CM-007 | STYLE-001 |
| REQ-CM-008 | DIR-003 |
| REQ-CM-009 | KPI-001 |
| REQ-CM-010 | TECH-001 |
