# jj (Jujutsu) と Git の比較・連携ガイド

## はじめに

最近、jj (Jujutsu) というバージョン管理システムを知り、実際に使ってみたのでその感想と使い方をまとめました。

jjは、Googleで開発されている次世代のバージョン管理システムで、Gitと互換性を保ちながら、より直感的な操作を実現しています。**最大の特徴は、ファイルの変更が自動で記録され、コミットメッセージを後から何度でも書き直せる点**です。

### jjとGitの主な違い

**1. 変更の記録方法**
- Git: `git add` と `git commit` を明示的に実行
- jj: ファイルを編集すると自動的に変更が記録される

**2. コミットメッセージの扱い**
- Git: コミット時に必須、変更は `commit --amend` や `rebase -i` が必要
- jj: 後からいつでも `jj describe` で追加・変更可能

**3. ブランチの扱い**
- Git: 明示的にブランチを作成・切り替え
- jj: ブランチ（ブックマーク）は任意、変更（change）単位で管理

**4. Git連携**
- jjは既存のGitリポジトリと共存可能
- `jj` と `git` コマンドを同じリポジトリで併用できる

この記事では、jjの基本概念、Gitとの違い、そしてGitリポジトリとの連携方法について解説します。

1. [jjの基本概念](#jjの基本概念)
2. [Gitとjjのコマンド比較](#gitとjjのコマンド比較)
3. [jjの「コミット」ワークフロー](#jjのコミットワークフロー)
4. [説明の書き直し](#説明の書き直し)
5. [Git連携のタイミング](#git連携のタイミング)
6. [Push後の履歴書き換え](#push後の履歴書き換え)
7. [実践的なワークフロー](#実践的なワークフロー)

## jjの基本概念

### 最大の違い：自動コミット

jjでは、ファイルの変更が**自動的に記録**されます。Gitのように `git add` と `git commit` を毎回実行する必要はありません。

**主な違い：**

- **変更の記録**
  - Git: `git add` + `git commit` で手動記録
  - jj: 自動（ファイル保存時）

- **説明の追加**
  - Git: `git commit -m "message"` でコミット時に必須
  - jj: `jj describe` で後から追加可能

- **変更の確認**
  - Git: `git status`
  - jj: `jj status`

### 変更（Change）とコミット（Commit）

jjは「変更（change）」と「コミット（commit）」を明確に区別します：

- **変更ID**: jjが管理する不変のID（例: `abc123...`）
- **コミットSHA**: Gitのコミットハッシュ（例: `def456...`）

```text
jj change (変更ID: abc123)
  ↓ jj new / jj git push
Git commit (SHA: def456)
```

### ブックマーク（Bookmark）とブランチ（Branch）

jjでは「ブックマーク（bookmark）」、Gitでは「ブランチ（branch）」と呼ばれますが、基本的には同じ概念です。

**主な違い：**

- **作成**
  - Git: 明示的に作成が必要
  - jj: 任意（なくても作業可能）

- **切り替え**
  - Git: `git checkout/switch` で切り替え
  - jj: 変更（change）単位で作業

- **自動更新**
  - Git: 現在のブランチに新しいコミットが追加される
  - jj: 手動で更新（`jj bookmark set`）

- **命名**
  - Git: 作業開始時に名前が必要
  - jj: 後から名前を付けられる

- **Push時**
  - Git: ブランチ名が必須
  - jj: ブックマークがないとpushできない

**jjでのブックマーク操作：**

```powershell
# ブックマークを作成・設定
jj bookmark create feature-name
jj bookmark set main  # デフォルトで現在のリビジョン(@)が対象

# ブックマーク一覧を表示
jj bookmark list

# リモートのブックマークをトラッキング
jj bookmark track main --remote=origin

# ブックマークを削除
jj bookmark delete feature-name
```

**Gitとの対応関係：**

- jjの「ブックマーク」= Gitの「ブランチ」
- jjでpushするには、変更にブックマークを設定する必要がある
- Gitリポジトリと連携する場合、jjのブックマークがGitのブランチとして扱われる

## Gitとjjのコマンド比較

**基本操作：**

- `git add` + `git commit -m "msg"` → `jj describe -m "msg"`（変更に説明を追加）
- `git commit --amend` → `jj describe`（説明を修正、何度でも可能）
- `git status` → `jj status`（状態確認）
- `git log` → `jj log`（履歴表示）
- `git diff` → `jj diff`（差分表示）

**ブランチ/ブックマーク操作：**

- `git branch <name>` → `jj bookmark create <name>`（作成）
- `git branch -d <name>` → `jj bookmark delete <name>`（削除）
- `git branch` → `jj bookmark list`（一覧）
- `git checkout <branch>` → （jjは変更単位で作業）

**履歴操作：**

- `git rebase -i` → `jj squash` / `jj split`（変更の統合・分割）

**リモート操作：**

- `git push` → `jj git push`（リモートへプッシュ）
- `git pull` → `jj git fetch` + `jj rebase`（リモートから取得）

## jjの「コミット」ワークフロー

### 基本的な作業手順

```powershell
# 1. ファイルを編集（自動的に記録される）
# lib/services/some_service.dart を編集

# 2. 状態確認
jj status
# Working copy changes:
# M lib/services/some_service.dart

# 3. 説明を追加
jj describe -m "feat: AudioInputServiceにデバイス列挙機能を追加"

# 4. 新しい変更を開始（前の変更を完了）
jj new

# 5. 履歴確認
jj log
```

### よく使うコマンド一覧

```powershell
# 説明を追加
jj describe -m "feat: 新機能を追加"

# 新しい変更を作成（前の変更を完了）
jj new

# 状態確認
jj status

# 履歴表示
jj log

# 差分表示
jj diff

# 変更を統合
jj squash

# 変更を分割
jj split

# ブックマーク作成
jj bookmark create feature-branch

# ブックマークを設定してプッシュ
jj bookmark set main  # 現在のコミットにmainブックマークを設定
jj git push           # リモートにプッシュ

# ブックマーク一覧
jj bookmark list

# リモートにプッシュ（ブックマーク設定済みの場合）
jj git push
```

## 説明の書き直し

### 何度でも書き直し可能

jjの最大の特徴は、説明を何度でも書き直せることです。Gitの `commit --amend` よりもはるかにシンプルで直感的です。

```powershell
# 最初の説明
jj describe -m "feat: 機能追加"

# 後で書き直し
jj describe -m "feat: AudioInputServiceにデバイス列挙機能を追加

- Windows/Android両対応
- デバイスID/名前を取得"

# さらに修正
jj describe -m "feat: AudioInputServiceにデバイス列挙機能を追加

詳細な実装内容:
- Factoryパターンでプラットフォーム抽象化
- 非同期API対応
- エラーハンドリング強化"
```

**重要な仕様：**

`jj describe` は現在の変更の説明を**上書き**します。履歴に残るのは最後の説明のみです。複数の説明が履歴に残るわけではありません。

### jj new後の説明変更

`jj new` で変更を完了した後も、説明を変更できます：

```powershell
# 1. 履歴を確認
jj log
# @  xyz123 (empty) (no description set)
# ○  abc456 feat: 新機能追加
# ○  def789 fix: バグ修正

# 2. 過去の変更を編集（abc456）
jj describe abc456 -m "feat: AudioInputServiceにデバイス列挙機能を追加

- Windows/Android両対応
- 詳細な説明..."
```

**Git側の動作**:
- jjは変更の説明を更新
- Gitコミットが**新しいSHA**で再作成される
- これは `git commit --amend` や `git rebase -i` と同等

## Git連携のタイミング

jjがGitリポジトリと連携している場合、以下のタイミングで**Gitコミットが作成/更新**されます。

### 1. `jj new` 実行時

```powershell
# 説明を追加
jj describe -m "feat: 新機能追加"

# jj new を実行 → Gitコミットが作成される
jj new
```

この時点で、jjの変更（change）がGitのコミット（commit）に変換されます。

### 2. `jj git push` 実行時

```powershell
# リモートにプッシュ
 jj git push
```

プッシュ時に、jjの変更がGitコミットとしてリモートに送信されます。

#### push時の注意点：ブックマークの設定

jjで初めてpushする際、ブックマーク（ブランチ）が設定されていないとpushできません。以下の手順が必要です：

```powershell
# 標準的な手順
jj describe -m "変更内容"
jj bookmark set main  # デフォルトで現在のリビジョン(@)が対象
jj git push
```

初回のpush時のみ、リモートブックマークのトラッキング設定が必要です：

```powershell
# 初回のみ：トラッキング設定
jj bookmark track main --remote=origin
```

**push時のポイント：**

- `jj bookmark set main` は `-r @` を省略可能（デフォルトで現在のリビジョン）
- 初回のみ `jj bookmark track` でリモートブックマークとの連携を設定する
- 2回目以降は `jj bookmark set main; jj git push` だけでOK
- `jj git push -b main` は特定のブックマークを指定してpushする際に使用

### 3. 確認方法

```powershell
# jjの履歴
jj log

# Gitのコミットを確認
jj git log
# または
git log
```

## Push後の履歴書き換え

**注意：** Push後の履歴書き換えは、個人開発では問題ありませんが、チーム開発では慎重に行う必要があります。

### ケース1: まだ誰もPullしていない場合

```powershell
# 1. Push済み
jj git push

# 2. 説明を変更
jj describe abc456 -m "より詳細な説明..."

# 3. 再度Push（force pushが必要）
jj git push --force
# または（より安全）
jj git push --force-with-lease
```

**注意**: これは `git push --force` と同じで、**共同作業者に影響を与えます**。

### ケース2: 他の人がPullした後

```powershell
# 説明変更すると...
jj describe abc456 -m "新しい説明"

# Push時に警告
jj git push --force-with-lease
# Error: The push would overwrite commits on the remote
```

**チーム開発でのリスク：**

- 他の開発者のローカル履歴と矛盾する
- `git pull --rebase` や手動での対応が必要になる
- チーム開発では**避けるべき**操作です

### jjとGitの履歴書き換え対応

**force pushが必要な操作：**

- `jj describe <change>` = `git commit --amend`
- `jj squash` = `git rebase -i` (squash)
- `jj split` = `git reset + 複数commit`
- `jj rebase` = `git rebase`

**通常のpushでOK：**

- `jj new` + 新規変更 = 通常のcommit

## 実践的なワークフロー

**開発スタイル別の使い分け**

### 個人開発の場合

```powershell
# Push前は自由に編集
jj describe -m "説明1"
jj describe -m "説明2"  # 何度でもOK
jj describe -m "説明3"  # 完璧になるまで編集
jj new
jj git push

# Push後も編集可能（個人開発なので問題なし）
jj describe <change> -m "より良い説明"
jj git push --force
```

### チーム開発の場合

```powershell
# Push前のみ編集（推奨）
jj describe -m "詳細な説明を最初から書く"
jj new
jj git push

# Push後は新しいコミットで対応
jj new
# 修正作業...
jj describe -m "前回のコミットの修正"
jj git push
```

### 安全な運用方法（推奨）

#### 推奨：Push前に説明を完成させる

```powershell
# 1. 作業
# ファイル編集...

# 2. 説明を何度も書き直す（OK）
jj describe -m "feat: 機能追加"
jj describe -m "feat: より詳細な説明..."
jj describe -m "feat: 完璧な説明"

# 3. 新しい変更へ移行
jj new

# 4. Push（この時点で説明は確定）
jj git push
```

#### Push後に修正が必要な場合

```powershell
# オプション1: 新しいコミットで修正（推奨）
jj new
# 修正作業...
jj describe -m "fix: 前回のコミットの修正"
jj git push

# オプション2: force push（慎重に）
jj describe <change-id> -m "修正した説明"
jj git push --force-with-lease  # 他の人の変更を上書きしないか確認
```

## 重要なポイント

**覚えておきたい8つのポイント：**

1. **自動コミット**: ファイルを編集すると自動的に変更が記録されます
2. **説明は後付け可能**: `jj describe` でいつでも説明を追加・変更できます
3. **`jj new` で区切り**: 論理的な区切りで `jj new` を実行して変更を完了させます
4. **`jj new` 後も説明変更可能**: Git側ではコミットが書き換えられます（新しいSHA）
5. **Push前は自由**: 何度でも `jj describe` で書き直せます
6. **Push後は慎重に**: `--force` が必要で、他の開発者に影響します
7. **個人開発では柔軟**: 比較的自由に履歴を書き換えられます
8. **`--force-with-lease` を推奨**: 他の人の変更を誤って上書きしません

## jjの哲学

jjの設計哲学は「**完璧な履歴を作る**」ことです。

**Gitとの違い:**
- **Git**: コミット後の変更は複雑（`git rebase -i`、`git commit --amend` など）
- **jj**: 履歴の編集を前提に設計され、シンプルで直感的

Git連携していても、この柔軟性は維持されますが、**Push後は慎重に**行う必要があります。

## まとめ

**Gitとjjの主な違い：**

- **変更の記録**
  - Git: 手動（`git add` + `git commit`）
  - jj: 自動

- **説明の追加**
  - Git: コミット時に必須
  - jj: 後から追加可能

- **説明の変更**
  - Git: 複雑（`--amend`、`rebase -i`）
  - jj: シンプル（`jj describe`）

- **履歴の編集**
  - Git: 難しい
  - jj: 簡単（設計思想）

- **Push後の変更**
  - Git: 避けるべき
  - jj: 可能だが慎重に

jjは「**完璧な履歴を作る**」ことを目指して設計されたツールです。

個人開発で使ってみたところ、jjの柔軟性は非常に便利でした。コミットメッセージを何度も書き直したり、履歴を自由に整理したりできる点は、特に試行錯誤の多い開発フェーズで重宝します。

一方、チーム開発で使う場合は、Push前に説明を確定させる運用にする必要があります。Push後の履歴書き換えは、Gitと同様にチームメンバーへ影響するためです。

今回は個人プロジェクトで試してみましたが、`git add` と `git commit` の手間が省けるのは想像以上に快適でした。既存のGitリポジトリでも `jj git init --colocate` すればすぐに試せるので、興味があれば公式チュートリアルを参考に使ってみるとよいでしょう。

## 参考リンク

- [jj公式ドキュメント](https://github.com/jj-vcs/jj)
- [jj公式サイト](https://jj-vcs.dev/)
- [jj Tutorial](https://docs.jj-vcs.dev/latest/tutorial/)
- [jj vs Git Comparison](https://docs.jj-vcs.dev/latest/git-comparison/)
- [Git Command Table](https://docs.jj-vcs.dev/latest/git-command-table/)
