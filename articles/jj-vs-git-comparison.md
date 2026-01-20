---
title: jj (Jujutsu) と Git の比較・連携ガイド
emoji: ⚖️
type: tech
topics:
  - jj
  - git
  - versioncontrol
  - 初心者向け
  - 比較
published: true
---

# jj (Jujutsu) と Git の比較・連携ガイド

## はじめに

最近、jj (Jujutsu) というバージョン管理システムを知り、実際に使ってみたのでその感想と使い方をまとめました。

jjは、Googleで開発されている新しいバージョン管理システムで、Gitと互換性を保ちながら、より直感的な操作を実現しています。**最大の特徴は、ファイルの変更が自動で記録され、コミットメッセージを後から何度でも書き直せる点**です。

### この記事の構成

jjの基本概念、Gitとの違い、そしてGitリポジトリとの連携方法について解説します。

1. [jjの基本概念](#jjの基本概念)
2. [jjの始め方](#jjの始め方)
3. [Gitとjjのコマンド比較](#gitとjjのコマンド比較)
4. [jjの「コミット」ワークフロー](#jjのコミットワークフロー)
5. [説明の書き直し](#説明の書き直し)
6. [Git連携のタイミング](#git連携のタイミング)
7. [実際に使ってみて](#実際に使ってみて)

## jjの基本概念

### 最大の違い：自動コミット

jjでは、ファイルの変更が**自動的に記録**されます。Gitのように `git add` と `git commit` を毎回実行する必要はありません。

Gitとの主な違いを表にまとめました。

| 項目 | Git | jj |
| ---- | --- | -- |
| 変更の記録 | `git add` + `git commit` で手動 | 自動（ファイル保存時） |
| 説明の追加 | コミット時に必須 | `jj describe` で後から追加可能 |
| ブランチの扱い | 明示的に作成・切り替え | ブックマークとして任意に管理 |

### 変更（Change）とコミット（Commit）

jjは「変更（change）」と「コミット（commit）」を明確に区別します。

- 変更ID - jjが管理する不変のID（例: `abc123...`）
  - 説明を書き直しても変更IDは変わらない
  - 同じ変更を一貫して追跡できる
- コミットSHA - Gitのコミットハッシュ（例: `def456...`）
  - 説明を変更するたびに新しいSHAが生成される

```text
jj change (変更ID: abc123)
  ↓ jj new / jj git push
Git commit (SHA: def456)
```

変更IDの重要性は、説明を何度書き直しても、jjが同じ変更として認識し続ける点です。Gitでは `commit --amend` や `rebase` を使うたびにコミットSHAが変わりますが、jjの変更IDは不変です。

### ブックマーク（Bookmark）とブランチ（Branch）

jjでは「ブックマーク（bookmark）」、Gitでは「ブランチ（branch）」と呼ばれますが、基本的には同じ概念です。

主な違いを表にまとめました。

| 項目 | Git | jj |
| ---- | --- | -- |
| 作成 | 明示的に作成が必要 | 任意（なくても作業可能） |
| 切り替え | `git checkout/switch` で切り替え | 変更（change）単位で作業 |
| 自動更新 | 現在のブランチに新しいコミットが追加される | 手動で更新（`jj bookmark set`） |
| 命名 | 作業開始時に名前が必要 | 後から名前を付けられる |
| Push時 | ブランチ名が必須 | ブックマークがないとpushできない |

jjでのブックマーク操作は以下の通りです。

```bash
# ブックマークを作成・設定
jj bookmark create feature-name
jj bookmark set main

# 以降は省略形（b）を使用
jj b list              # 一覧を表示
jj b track main -r origin  # リモートをトラッキング
jj b delete feature-name   # 削除
```

主な省略形は以下の通りです。

- `bookmark` → `b`
- `describe` → `desc`
- `status` → `st`

Gitとの対応関係は以下の通りです。

- jjの「ブックマーク」= Gitの「ブランチ」
- jjでpushするには、変更にブックマークを設定する必要がある
- Gitリポジトリと連携する場合、jjのブックマークがGitのブランチとして扱われる

## jjの始め方

### 既存のGitリポジトリで使う

既存のGitリポジトリでjjを使う場合、以下のコマンドで初期化します。

```bash
# Gitリポジトリのルートディレクトリで実行
jj git init --colocate
```

`--colocate` オプションを付けることで、jjとGitが同じリポジトリを共有します。

- `.git` ディレクトリをそのまま使用
- `jj` と `git` コマンドを同じリポジトリで併用可能
- 既存のGitワークフローに影響なし

### 新規リポジトリを作成する

新しくリポジトリを作る場合は以下のようにします。

```bash
# 新しいディレクトリを作成
mkdir my-project
cd my-project

# jjで初期化（Gitバックエンドを使用）
jj git init --colocate
```

## Gitとjjのコマンド比較

よく使うコマンドの対応表です。

| 操作 | Git | jj (省略形) |
| ---- | --- | ------------ |
| 変更の記録 | `git add` + `git commit -m "msg"` | `jj desc -m "msg"` |
| 説明の修正 | `git commit --amend` | `jj desc` |
| 状態確認 | `git status` | `jj st` |
| 履歴表示 | `git log` | `jj log` |
| 差分表示 | `git diff` | `jj diff` |
| ブランチ作成 | `git branch <name>` | `jj b create <name>` |
| ブランチ削除 | `git branch -d <name>` | `jj b delete <name>` |
| ブランチ一覧 | `git branch` | `jj b list` |
| ブランチ切り替え | `git checkout <branch>` | 変更単位で作業 |
| 変更の統合 | `git rebase -i` | `jj squash` |
| 変更の分割 | `git reset` + 複数commit | `jj split` |
| リモートへプッシュ | `git push` | `jj git push` |
| リモートから取得 | `git pull` | `jj git fetch` + `jj rebase` |

## jjの「コミット」ワークフロー

### 基本的な作業手順

```bash
# 1. ファイルを編集（自動的に記録される）
# lib/services/some_service.dart を編集

# 2. 状態確認
jj st
# Working copy changes:
# M lib/services/some_service.dart

# 3. 説明を追加
jj desc -m "feat: AudioInputServiceにデバイス列挙機能を追加"

# 4. 新しい変更を開始（前の変更を完了）
jj new

# 5. 履歴確認
jj log
```

### よく使うコマンド一覧

```bash
# 説明を追加
jj desc -m "feat: 新機能を追加"

# 新しい変更を作成（前の変更を完了）
jj new

# 状態確認
jj st

# 履歴表示
jj log

# 差分表示
jj diff

# 変更を統合
jj squash

# 変更を分割
jj split

# ブックマーク作成
jj b create feature-branch

# ブックマークを設定してプッシュ
jj b set main  # 現在のコミットにmainブックマークを設定
jj git push    # リモートにプッシュ

# ブックマーク一覧
jj b list

# リモートにプッシュ（ブックマーク設定済みの場合）
jj git push
```

## Git連携のタイミング

jjがGitリポジトリと連携している場合、以下のタイミングでGitコミットが作成/更新されます。

### 1. `jj new` 実行時

```bash
# 説明を追加
jj desc -m "feat: 新機能追加"

# jj new を実行 → Gitコミットが作成される
jj new
```

この時点で、jjの変更（change）がGitのコミット（commit）に変換されます。

### 2. `jj git push` 実行時

```bash
# リモートにプッシュ
jj git push
```

プッシュ時に、jjの変更がGitコミットとしてリモートに送信されます。

#### push時の注意点：ブックマークの設定

jjで初めてpushする際、ブックマーク（ブランチ）が設定されていないとpushできません。

```bash
# 標準的な手順
jj desc -m "変更内容"
jj b set main
jj git push

# 初回のみ：リモートとの連携を設定
jj b track main -r origin
```

### 3. 確認方法

```bash
# jjの履歴（変更IDが表示される）
jj log

# Gitのコミット履歴を確認したい場合
git log
```

## 説明の書き直し

### 何度でも書き直し可能

jjの最大の特徴は、説明を何度でも書き直せることです。Gitの `commit --amend` よりもはるかにシンプルで直感的です。

```bash
# 最初の説明
jj desc -m "feat: 機能追加"

# 後で書き直し
jj desc -m "feat: AudioInputServiceにデバイス列挙機能を追加

- Windows/Android両対応
- デバイスID/名前を取得"

# さらに修正
jj desc -m "feat: AudioInputServiceにデバイス列挙機能を追加

詳細な実装内容:
- Factoryパターンでプラットフォーム抽象化
- 非同期API対応
- エラーハンドリング強化"
```

`jj desc` は現在の変更の説明を置き換えます。履歴に残るのは最後の説明のみです。

### jj new後の説明変更

`jj new` で変更を完了した後も、説明を変更できます。

```bash
# 1. 履歴を確認
jj log
# @  xyz123 (empty) (no description set)
# ○  abc456 feat: 新機能追加
# ○  def789 fix: バグ修正

# 2. 過去の変更を編集（abc456）
jj desc abc456 -m "feat: AudioInputServiceにデバイス列挙機能を追加

- Windows/Android両対応
- 詳細な説明..."
```

Git側では以下のように動作します。

- jjは変更の説明を更新
- Gitコミットが新しいSHAで再作成される
- これは `git commit --amend` や `git rebase -i` と同等

## 実際に使ってみて

個人プロジェクトでjjを1週間ほど使ってみました。

### 便利だと感じた点

1. コミットを忘れない - ファイルを保存すれば自動で記録されるので、作業に集中できます。Gitで「あ、コミット忘れた」となることがなくなりました。

2. 説明は後で考えればいい - コーディング中は `jj new` だけ実行して、後でまとめて `jj desc` で説明を書けます。思考の流れが途切れません。

3. typoの修正が楽 - コミットメッセージに誤字を見つけても、`jj desc` で即座に直せます。Gitの `commit --amend` より圧倒的に簡単です。

### 気になった点

1. 学習コスト - 「変更（change）」と「コミット（commit）」の概念の違いを理解するのに少し時間がかかりました。

2. エディタとの統合 - VSCodeなどの統合はGitほど成熟していません。コマンドラインでの操作が基本です。

3. チーム開発での運用 - 個人では便利ですが、チームで使うには運用ルールをしっかり決める必要があります。

## まとめ

jjは「**きれいな履歴を作る**」ことを目指して設計されたバージョン管理システムです。

個人開発では、コミットメッセージを何度も書き直したり、履歴を自由に整理できる柔軟性が非常に便利です。特に試行錯誤の多い開発フェーズで、`git add` と `git commit` の手間が省ける点は想像以上に快適でした。

既存のGitリポジトリでも `jj git init --colocate` すればすぐに試せるので、興味があれば公式チュートリアルを参考に使ってみるとよいでしょう。

jjの設計思想やワークフローの詳細については、以下の記事で解説しています。

@[card](https://zenn.dev/imudak/articles/jj-gerrit-philosophy)

## 参考リンク

- [jj公式ドキュメント](https://github.com/jj-vcs/jj)
- [jj公式サイト](https://jj-vcs.dev/)
- [jj Tutorial](https://docs.jj-vcs.dev/latest/tutorial/)
- [jj vs Git Comparison](https://docs.jj-vcs.dev/latest/git-comparison/)
- [Git Command Table](https://docs.jj-vcs.dev/latest/git-command-table/)
