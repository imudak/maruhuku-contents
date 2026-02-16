# maruhuku-contents - Zenn記事コンテンツ管理

## 概要

Zenn記事のコンテンツを管理するリポジトリ。技術記事の執筆、校正、公開を行う。

## ディレクトリ構造

```text
maruhuku-contents/
├── articles/           # Zenn記事（Markdown）
├── books/              # Zennブック
├── video-projects/     # 動画プロジェクト関連
├── plans/              # 計画書
└── .claude/
    └── skills/
        └── japanese-article-proofreading/  # 記事校正スキル
```

## 利用可能なスキル

### /japanese-article-proofreading

日本語技術記事の校正を行う。以下をチェックして改善提案を提示：

- トーンと文体（ですます調、AIっぽい表現の排除）
- 冗長性（不要な前置き、説明文の削除）
- 太字の適切な使用
- 記事構成（個人の学習体験として自然な流れ）
- Linter指摘への対応（textlint, markdownlint）

**使い方:**
```
/japanese-article-proofreading articles/記事名.md
```

## jj基本操作

```bash
jj status                    # 状態確認
jj describe -m "メッセージ"   # コミットメッセージ設定
jj bookmark set main         # mainブックマーク設定
jj new                       # 新しいchangeに進む
jj git push                  # push
```

## 著者ペルソナ（必須）

記事は以下の人物として書くこと。すべての記事でこのトーンを維持する。

- **55歳の個人事業主プログラマ。** 組み込みメイン、Windows/Linux/スマホアプリも経験あり
- **新しい技術には興味を持ってすぐ手を出す。** AIもその一つとして淡々とスキルを蓄積
- **AI驚き屋ではない。** 煽らない、誇張しない、淡々と事実と所感を述べる
- **せっかくなので共有する、というスタンス。** 教えてやる感や布教感を出さない
- **Web系は広く浅い。** HTML/CSSべた書き時代からの古参だが最新フレームワークに精通はしていない
- **Linuxも出始めから。** Docker等は使うが深くはない
- **ベテランの落ち着き。** 興奮や誇張はなく、淡々とした語り口

## 記事執筆ルール（必須）

**記事は最初から以下のルールに従って書くこと。** 校正スキルは最終検証であり、書き直しの手段ではない。

- **ですます調**で統一（「だ・である調」は使わない）
- **AIっぽい表現を避ける**（「あなたの」「〜いるんです」「〜だったんですね」）
- **先回りした表現を避ける**（「〜という疑問を持つ方もいるかもしれません」→「〜が気になりました」）
- **個人の学習体験として書く**（「推奨」「〜する価値があります」→「〜することにしました」「〜と思いました」）
- **冗長な前置きを書かない**（「調べてみると〜ことがわかりました」→「〜です」）
- **太字は重要な技術用語の初出や本質的な違いのみ**
- **「述語＋コロン（：）」パターンを避ける**（「以下のようにする：」→「以下のようにします。」）

詳細は `.claude/skills/japanese-article-proofreading/SKILL.md` を参照。

## 記事執筆ワークフロー

### 0. ルール確認（必須・省略厳禁）

**記事を1行でも書く前に、必ず以下を読み返すこと:**
1. 上記「著者ペルソナ」セクション
2. 上記「記事執筆ルール」セクション
3. `.claude/skills/japanese-article-proofreading/SKILL.md` の校正重点項目

**これを飛ばして書くと、校正で大幅修正が入る。事前に読めば1回で済む。**

### 1. 新規記事作成

```bash
npx zenn new:article --slug 記事スラッグ
```

### 2. 執筆

上記「記事執筆ルール」に従って書く。**書きながら迷ったらペルソナに立ち返る。**

### 3. 公開前検証（必須）

校正スキルで最終チェックを行い、textlintエラー0を確認する。

```bash
npx textlint articles/記事名.md          # エラー確認
# /japanese-article-proofreading で校正スキル適用
npx textlint articles/記事名.md          # エラー0を確認
```

### 4. 公開

フロントマターを `published: true` に変更してpush。

```bash
jj describe -m "docs: 記事タイトルを公開"
jj bookmark set main && jj new && jj git push
```

## 記事フロントマター

```yaml
---
title: "記事タイトル"
emoji: "🔗"
type: "tech"          # tech または idea
topics:               # 最大5つ
  - topic1
  - topic2
published: false      # true で公開
---
```

## 校正時の注意点

上記「記事執筆ルール」を参照。校正の最初と最後に必ず `npx textlint "記事パス"` を実行すること。

## 参照

- [Zenn CLIガイド](https://zenn.dev/zenn/articles/zenn-cli-guide)
- [Zenn Markdown記法](https://zenn.dev/zenn/articles/markdown-guide)
