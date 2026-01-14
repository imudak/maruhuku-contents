# jjで複数のissueを並行作業する方法

## はじめに

最近、jjを使っていて「あるissueの作業中に、別のissueも対応したい」という状況になりました。Gitなら`git worktree`を使うところですが、jjではもっとシンプルに解決できることがわかりました。

この記事では、jjで複数のchangeを並行して作業する方法と、その際の注意点をまとめます。

## 結論: Git workspaceは不要

jjでは、**同じディレクトリ内で複数のchangeを自由に切り替えられます**。Gitの`git worktree`のように、物理的に別のディレクトリを作る必要はありません。

### 基本的な流れ

```bash
# 現在の作業（issue #123）
@  change-123 "Fix: issue #123"

# 別のissue #456の作業を開始したい場合
$ jj new -m "Fix: issue #456"

# これで新しいchangeが作成される
@  change-456 "Fix: issue #456"  # ← 今ここ
◆  change-123 "Fix: issue #123"
```

### changeの切り替え

```bash
# 履歴を確認
$ jj log

# issue #123の作業に戻る
$ jj edit change-123

# または、change IDの最初の数文字だけでOK
$ jj edit abc  # abc...がchange-123のIDなら
```

## Gitのworkspaceとの違い

| Git workspace                 | jj                                       |
|-------------------------------|------------------------------------------|
| 物理的に別のディレクトリ      | 同じディレクトリ内でchangeを切り替え     |
| `git worktree add` が必要     | `jj new` / `jj edit` だけ                |
| ディスク容量を消費            | 軽量                                     |
| 複数のファイルツリー          | 1つのファイルツリー                      |

## 編集途中の内容はどうなる？

ここが重要なポイントです。**`jj new`を実行すると、編集途中の内容は自動的に現在のchangeに保存されます。**

### 具体例

```bash
# 1. issue #123を作業中
@  change-123 (empty) "Fix: user auth (#123)"
$ vim src/auth.dart
# 編集中...

$ jj status
Working copy changes:
M src/auth.dart

# 2. 別のissueに切り替える
$ jj new -m "Fix: database connection (#456)"

# 3. 自動的に以下のようになる
@  change-456 (empty) "Fix: database connection (#456)"  # ← 今ここ
◆  change-123 "Fix: user auth (#123)"  # ← auth.dartの編集内容はここに保存された

$ jj status
# 何も表示されない（作業ディレクトリはクリーン）

# 4. issue #123に戻る
$ jj edit change-123

# 5. 編集内容が復元される
$ jj status
Working copy changes:
M src/auth.dart
```

### Gitとの違い

| Git                              | jj                                        |
|----------------------------------|-------------------------------------------|
| `git stash` で一時退避が必要     | 自動的に現在のchangeに保存                |
| `git stash pop` で復元           | `jj edit` で切り替えると自動復元          |
| stashを忘れると困る              | 常に安全                                  |

これがjjの「安全性」の一つです。編集内容を失うことなく、自由にchangeを切り替えられます。

## 重要な注意点: 親changeの選び方

ここが最初につまずいたポイントです。**割り込みで入った別のissueは、mainから分岐させるべきです。**

### 問題のあるパターン

```bash
# 1. issue #123を作業中
@  change-123 "Fix: issue #123"
◆  main

# 2. このままjj newすると...
$ jj new -m "Fix: issue #456"

@  change-456 "Fix: issue #456"  # ← 親がchange-123になる
◆  change-123 "Fix: issue #123"  # ← 未検証の変更
◆  main
```

**何が問題か:**

- `change-456`の親が未検証の`change-123`
- `change-456`を先にマージしたくても、`change-123`が含まれてしまう
- `change-123`に問題があると、`change-456`も影響を受ける

### 正しいパターン

```bash
# 1. issue #123を作業中
@  change-123 "Fix: issue #123"
◆  main

# 2. mainから新しいchangeを作る
$ jj new main -m "Fix: issue #456"

@  change-456 "Fix: issue #456"  # ← 親がmain
│
│ ◆  change-123 "Fix: issue #123"  # ← 独立した並行ブランチ
├─╯
◆  main
```

**メリット:**

- 2つのchangeが独立している
- どちらを先にマージしても問題ない
- `change-123`の問題が`change-456`に影響しない

## 実践的なワークフロー

### パターン1: 緊急バグ修正が入った場合

```bash
# issue #123を作業中
@  feature-123 "Feature: new auth system (#123)"
◆  main

# 緊急バグ発見！mainから分岐
$ jj new main -m "Hotfix: critical bug (#456)"

@  hotfix-456 "Hotfix: critical bug (#456)"
│
│ ◆  feature-123 "Feature: new auth system (#123)"
├─╯
◆  main

# hotfixを修正してマージ
$ vim src/bug.dart
$ jj git push --change @

# 元のfeatureに戻る
$ jj edit feature-123

# mainが進んだので、featureをrebase
$ jj rebase -r @ -d main

@  feature-123 "Feature: new auth system (#123)"
◆  hotfix-456 "Hotfix: critical bug (#456)"  # ← hotfixがマージされた
◆  main
```

### パターン2: developブランチを使う場合

```bash
# developから作業を開始
@  feature-123 "Feature: auth (#123)"
◆  develop
◆  main

# 別のissueを開始（developから）
$ jj new develop -m "Feature: database (#456)"

@  feature-456 "Feature: database (#456)"
│
│ ◆  feature-123 "Feature: auth (#123)"
├─╯
◆  develop
◆  main

# 両方が独立して作業できる
# feature-123が先に完成したらdevelopにマージ
$ jj edit feature-123
$ jj git push --change @

# developを更新
$ jj git fetch
$ jj bookmark set develop -r <新しいコミット>

# feature-456をdevelopに追従
$ jj edit feature-456
$ jj rebase -r @ -d develop
```

## コンフリクトへの対応

同じファイルを複数のchangeで編集している場合、切り替え時にコンフリクトが発生する可能性があります。

```bash
# change Aで src/main.dart を編集
$ jj edit change-a
$ vim src/main.dart
# 編集...

# change Bに切り替え
$ jj edit change-b
$ vim src/main.dart
# また編集...

# change Aに戻るとコンフリクトが発生する可能性
$ jj edit change-a
# コンフリクトマーカーが表示される
```

### 解決方法

```bash
# コンフリクトを確認
$ jj status

# ファイルを編集してコンフリクトを解決
$ vim src/main.dart
# コンフリクトマーカーを削除

# 自動的に現在のchangeに反映される
```

## 便利なエイリアス設定

頻繁に使うコマンドは、エイリアスを設定すると便利です。

```toml
# ~/.jjconfig.toml
[aliases]
# mainから新しいchangeを作る
feature = ["new", "main", "-m"]

# developから新しいchangeを作る
dev-feature = ["new", "develop", "-m"]

# 現在のchangeをmainにrebase
sync-main = ["rebase", "-r", "@", "-d", "main"]
```

使用例：

```bash
# mainから新しいfeatureを開始
$ jj feature "Fix: issue (#456)"

# mainに追従
$ jj sync-main
```

## 例外: 依存関係がある場合

ただし、**意図的に依存関係を持たせたい場合**は、元のchangeから分岐させます。

```bash
# issue #123のchangeが必要
@  change-123 "Feature: base implementation (#123)"
◆  main

# change-123に依存するissue #124
$ jj new -m "Feature: extended implementation (#124)"

@  change-124 "Feature: extended implementation (#124)"  # ← 依存関係が明示的
◆  change-123 "Feature: base implementation (#123)"
◆  main
```

この場合、次のように両方を一緒にマージします。

```bash
# change-124をpush（change-123も含まれる）
$ jj git push --change @

# または、change-123を先にマージしてからchange-124をrebase
$ jj edit change-123
$ jj git push --change @

$ jj edit change-124
$ jj rebase -r @ -d main  # mainにchange-123がマージされた後
```

## changeの統合: 複数のchangeを1つにまとめる

作業していて「やっぱり2つのchangeを1つにまとめたい」という場合があります。そんなときは`jj squash`を使います。

### 基本的な使い方

```bash
# 現在の状態
@  change-2 "Fix: 追加の修正"
◆  change-1 "Fix: 初期修正"
◆  main

# 現在のchangeを親changeに統合
$ jj squash

# 実行後
@  (empty) (no description set)  # 新しい空のchange
◆  change-1 "Fix: 初期修正"     # change-2の内容が統合された
◆  main
```

### よくあるユースケース

**ケース1: 細かく分けすぎたchangeを統合**

```bash
# 作業中に細かく分けすぎてしまった
@  fix-3 "Fix: タイポ修正"
◆  fix-2 "Fix: スタイル修正"
◆  fix-1 "Fix: バグ修正"
◆  main

# 全部1つにまとめたい
$ jj squash  # fix-3をfix-2に統合
$ jj squash  # fix-2をfix-1に統合

# 結果
@  (empty)
◆  fix-1 "Fix: バグ修正"  # 全ての変更が統合された
◆  main
```

**ケース2: 別のissueだと思ったが実は同じだった**

```bash
# 2つのissueを並行作業
@  issue-456 "Fix: database (#456)"
│
│ ◆  issue-123 "Fix: auth (#123)"
├─╯
◆  main

# 実は同じ問題だったので統合したい
$ jj squash --into issue-123

# 結果
@  (empty)
│
◆  issue-123 "Fix: auth (#123)"  # issue-456の内容も含まれた
◆  main
```

### オプション

```bash
# 説明も統合したい場合（インタラクティブに編集）
$ jj squash -i
# または
$ jj squash --interactive

# 特定のchangeに統合
$ jj squash --into <change-id>

# 別のchangeから現在のchangeに統合
$ jj squash --from <change-id>

# メッセージを指定して統合
$ jj squash -m "新しい説明"
```

### 注意点

**squash後は空のchangeが残る**

`jj squash`を実行すると、現在のchangeは空になります。これは意図的な設計です。

```bash
# squash後
@  (empty) (no description set)  # ← ここに残る
◆  統合されたchange
```

次の作業に進むには：

```bash
# 新しいchangeを作る
$ jj new -m "次の作業"

# または、空のchangeを削除したい場合
$ jj abandon @
```

### Gitとの比較

| Git | jj |
|-----|-----|
| `git rebase -i` で squash | `jj squash` |
| 手動でコミットを選択 | コマンド1つで統合 |
| エディタが開く | シンプルに実行 |
| 履歴を書き換える | 安全に統合（undo可能） |

### 実践例: 作業を整理する

```bash
# レビュー前に細かいchangeをまとめる
$ jj log
@  docs "docs: コメント追加"
◆  style "style: フォーマット"
◆  fix "fix: バグ修正"
◆  main

# まとめて1つのchangeにする
$ jj edit docs
$ jj squash  # docsをstyleに統合

$ jj edit style  # (現在のchange)
$ jj squash  # styleをfixに統合

# 結果: きれいな1つのchange
@  (empty)
◆  fix "fix: バグ修正"  # 全ての変更が含まれる
◆  main

# 説明を更新
$ jj edit fix
$ jj describe -m "fix: バグ修正とコード整理"
```

## まとめ

### 基本的な使い方

```bash
# 割り込みタスク（独立している）
$ jj new main -m "新しいタスク"  # ← 推奨

# 現在の作業を続ける（依存関係がある）
$ jj new -m "続きの作業"  # ← 特定の場合のみ
```

### ベストプラクティス

1. **デフォルト**: `jj new main` または `jj new develop`
2. **依存関係がある場合のみ**: `jj new`（現在のchangeから）
3. **迷ったら**: mainから分岐（後でrebaseできる）

### jjのメリット

- Git workspaceのような複雑さなし
- 編集内容は自動的に保存される
- 同じディレクトリ内で高速に切り替え
- コンフリクトも管理しやすい

Gitでは`git worktree`を使って複雑に管理していた並行作業が、jjではシンプルに実現できます。特に、編集内容が自動保存されるのは安心感があります。

割り込みタスクが入ったときは、とりあえず`jj new main`で分岐させておけば、後から柔軟に対応できます。これが、私が最近jjを気に入っている理由の一つです。
