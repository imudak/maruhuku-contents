---
title: "jjでの「分岐の付け替え」: rebase vs merge"
emoji: 🌿
type: tech
topics:
  - jj
  - git
  - versioncontrol
  - rebase
  - merge
published: false
---

# jjでの「分岐の付け替え」: rebase vs merge

## 背景

Gitから移行したユーザーがjjを使っていると、次のようなよくある状況に遭遇します。

```
現在の作業ディレクトリ(@)が古いコミットから分岐しているが、
リモートのmainブランチが進んでしまった。
作業内容をmainブランチの最新状態に合わせたい。
```

この記事では、jjでこの状況に対処する2つの方法を比較します。

## 状況の確認

```bash
$ jj log -r 'all()' --limit 5
@  rvnzzrrl b290f9b5 (empty) (no description set)
│
│ ◆  nytvkklz main 9b4e35c4 docs: 最新作業の記録
│ ◆  xuszksry d92517e1 fix: バグ修正
├─╯
◆  tqrqrqmr 1d67a78b docs: 古い作業
```

**問題点:**

- 現在のchange `rvnzzrrl` が `tqrqrqmr`（古いコミット）から分岐
- `main`ブランチは別の系統で進んでいる（`nytvkklz`を指している）
- 作業内容を最新のmainに合わせたい

## 方法1: rebase方式（Git rebase的）

### コマンド

```bash
jj rebase -r @ -d main
```

### 意味

- `-r @`: 現在のchange（@）をrebaseする
- `-d main`: destination（移動先）をmainブランチにする

### 結果

```bash
$ jj log -r 'all()' --limit 5
@  rvnzzrrl aa423048 (empty) (no description set)
◆  nytvkklz main 9b4e35c4 docs: 最新作業の記録
◆  xuszksry d92517e1 fix: バグ修正
◆  tqrqrqmr 1d67a78b docs: 古い作業
```

**特徴:**

- 履歴が一直線になる（クリーンな履歴）
- シンプルで理解しやすい
- 元の親との直接的な関係は切れる
- **個人開発・個人ブランチでの作業に最適**

### ユースケース

- 自分のfeatureブランチをmainの最新に追従させる
- 履歴をクリーンに保ちたい
- 「あるべき順序」で履歴を整理したい

## 方法2: merge方式（Git merge的）

### コマンド

```bash
jj new tqrqrqmr main -m "Merge main into current work"
```

### 意味

- `jj new`: 新しいchangeを作成
- `tqrqrqmr main`: 2つの親を指定（マージコミット）
- `-m "..."`: コミットメッセージ

### 結果

```bash
$ jj log -r 'all()' --limit 5
@    ormvzvxo 09996027 Merge main into current work
├─╮  (両方の親を持つマージchange)
│ ◆  nytvkklz main 9b4e35c4 docs: 最新作業の記録
│ ◆  xuszksry d92517e1 fix: バグ修正
├─╯
◆  tqrqrqmr 1d67a78b docs: 古い作業
```

**特徴:**

- 両方の履歴が明示的に保持される
- 「いつマージしたか」が記録される
- 履歴が複雑になる
- **複数人での開発・公開ブランチでの作業に最適**

### ユースケース

- mainブランチの変更を自分のブランチに取り込む
- 履歴の分岐・統合を明示的に記録したい
- チーム開発で「誰がいつ何をマージしたか」を追跡したい

## rebase vs merge: どちらを選ぶべきか

| 観点 | rebase方式 | merge方式 |
|------|-----------|----------|
| **履歴の見た目** | 一直線（クリーン） | 分岐・統合がある |
| **元の親との関係** | 切れる | 保持される |
| **使いやすさ** | シンプル | やや複雑 |
| **推奨場面** | 個人開発、ローカルブランチ | チーム開発、公開ブランチ |
| **Git相当** | `git rebase` | `git merge` |

## jjの強み: 簡単にやり直せる

jjの最大の利点は、**どちらの方法も`jj undo`で簡単に取り消せる**こと。

```bash
# rebaseを試す
$ jj rebase -r @ -d main

# 気に入らなければ取り消す
$ jj undo

# mergeを試す
$ jj new @ main -m "Merge main"

# これも気に入らなければ取り消せる
$ jj undo
```

**Gitとの違い:**

- Gitの`git reset --hard`は危険（データ消失のリスク）
- jjの`jj undo`は安全（操作履歴が残る）
- jjでは「試して、気に入らなければ戻す」が簡単

## 実践的なワークフロー例

### 個人開発での典型的な流れ（rebase推奨）

```bash
# 1. 作業中にmainが進んでしまった
$ jj log
@  my-work (現在の作業)
│
│ ◆  main (進んだmain)
├─╯
◆  old-main (古いmain)

# 2. rebaseで追従
$ jj rebase -r @ -d main

# 3. 作業続行（履歴はクリーン）
$ jj log
@  my-work (最新mainの上)
◆  main
```

### チーム開発での典型的な流れ（merge推奨）

```bash
# 1. mainの最新変更を取り込む
$ jj git fetch
$ jj new @ main -m "Merge main into feature-xyz"

# 2. コンフリクトがあれば解決
$ jj resolve

# 3. マージコミットを作成
$ jj commit -m "Merge main into feature-xyz"

# 4. 履歴に「いつマージしたか」が記録される
$ jj log
@    Merge main into feature-xyz
├─╮
│ ◆  main (最新)
◆  feature-xyz (自分の作業)
```

## よくある質問

### Q1: rebaseすると元のコミットは消える？

**A:** jjでは消えません。`jj log -r 'all()'`で古いchangeも見えます。`jj undo`で戻すこともできます。

### Q2: mergeコミットは空でもOK？

**A:** はい。jjでは「空のchange」も有効です。マージの記録として意味があります。

### Q3: 複数のchangeをまとめてrebaseできる？

**A:** はい。`jj rebase -s <source> -d <destination>`で、sourceから始まる全子孫をrebaseできます。

```bash
# feature-1からfeature-3までをmainの上に移動
$ jj rebase -s feature-1 -d main
```

### Q4: rebase中にコンフリクトが起きたら？

**A:** jjは自動的にコンフリクトマーカーを残してくれます。詳しくは次のセクションを参照してください。

## コンフリクト解決の違い

rebaseとmergeでは、コンフリクト解決の考え方が少し異なります。

### rebase時のコンフリクト

jjでは、rebase中のコンフリクトもコミットとして扱われます。

```bash
$ jj rebase -r @ -d main
# コンフリクトが発生

$ jj status
Working copy changes:
Conflicted:
  src/main.rs

$ cat src/main.rs
# ファイルにコンフリクトマーカーが表示される
<<<<<<< Conflict 1 of 1
+++++++ Contents of side #1
自分の変更
------- Contents of base
元のコード
+++++++ Contents of side #2
mainブランチの変更
>>>>>>> Conflict 1 of 1 ends

# エディタで手動解決
$ vim src/main.rs

# 解決内容を確認
$ jj diff

# 自動的に現在のchangeに反映される
# （git rebase --continueは不要！）
```

**jjの特徴:**

- コンフリクト状態もchangeとして扱える
- 解決途中で他の作業に切り替え可能（`jj new`）
- `jj undo`で解決をやり直せる
- `git rebase --continue`のような特別なコマンドは不要

### merge時のコンフリクト

mergeの場合も同様ですが、両方の親の変更が見えます。

```bash
$ jj new @ main -m "Merge main into feature"
# コンフリクトが発生

$ jj log
@    merge-commit (コンフリクト中)
├─╮
│ ◆  main
◆  feature

$ jj status
Working copy changes:
Conflicted:
  src/main.rs

# ファイルを編集してコンフリクトを解決

# 解決後、マージchangeに自動反映
# （git merge --continueも不要）
```

### Gitとの違い

| 操作 | Git | jj |
|------|-----|-----|
| **コンフリクト発生時** | 特殊な状態（detached HEAD等） | 通常のchange |
| **解決の継続** | `git rebase --continue` 必要 | 不要（自動反映） |
| **解決中の移動** | 困難（状態が壊れる） | 簡単（`jj new`で移動） |
| **やり直し** | `git rebase --abort` | `jj undo`（何度でも） |
| **複数コンフリクト** | 順番に解決 | 一度に全て見える |

### コンフリクト解決のベストプラクティス

#### 1. まずステータスを確認

```bash
$ jj status
# どのファイルがコンフリクトしているか確認
```

#### 2. コンフリクトマーカーを探す

```bash
$ jj diff
# コンフリクト箇所を確認
```

#### 3. 解決してテスト

```bash
# ファイルを編集
$ vim src/main.rs

# テストを実行
$ cargo test
```

#### 4. 確認してコミット（自動）

jjでは、ファイルを保存するだけで自動的にchangeに反映されます。

#### 5. うまくいかなければやり直し

```bash
$ jj undo
# 何度でもやり直せる
```

### 複雑なコンフリクトの場合

```bash
# コンフリクト解決用の一時changeを作る
$ jj new
# 元のコンフリクトは残ったまま、新しいchangeで作業

# 解決できたら、元のchangeに戻る
$ jj edit <コンフリクトchange>

# 解決内容を適用
$ jj squash --from <一時change>
```

## まとめ

jjでの「分岐の付け替え」には、次の2つの方法があります。

1. **rebase方式** (`jj rebase -r @ -d main`)
   - 履歴をクリーンに保つ
   - 個人開発・ローカルブランチに最適

2. **merge方式** (`jj new @ main -m "..."`)
   - 履歴を明示的に記録
   - チーム開発・公開ブランチに最適

どちらも`jj undo`で簡単に取り消せるので、**迷ったら両方試してみる**のがjj流です。

