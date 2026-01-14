# jjでの「分岐の付け替え」: rebase vs merge

## 背景

Gitから移行したユーザーがjjを使っていると、よくある状況に遭遇します：

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

**A:** jjは自動的にコンフリクトマーカーを残してくれます。

```bash
$ jj rebase -r @ -d main
# コンフリクトが発生

$ jj status
# コンフリクトファイルを表示

# 手動で解決してから
$ jj commit -m "Resolve conflicts"
```

## まとめ

jjでの「分岐の付け替え」には2つの方法があります：

1. **rebase方式** (`jj rebase -r @ -d main`)
   - 履歴をクリーンに保つ
   - 個人開発・ローカルブランチに最適

2. **merge方式** (`jj new @ main -m "..."`)
   - 履歴を明示的に記録
   - チーム開発・公開ブランチに最適

どちらも`jj undo`で簡単に取り消せるので、**迷ったら両方試してみる**のがjj流です。

