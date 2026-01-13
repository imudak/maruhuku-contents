# jjを使っていて驚いた「1変更1コミット」という哲学

## はじめに

前回の記事でjj (Jujutsu) の基本的な使い方を紹介しました。ファイルの変更が自動で記録され、コミットメッセージを後から書けるという便利さに魅了されて使い始めたのですが、使っているうちに**もっと根本的な思想の違い**に気づいてしまいました。

それは「**1つの修正に対して1つのコミット（change）を使い、説明を上書きしていく**」というスタイルです。作業履歴はローカルにとどめ、共有するのは1つのchangeのみ。issueやPRに対してもchangeは1つで、手元の作業履歴をどんどん修正していきます。

これは、Git/GitHubに慣れた私にとって**大きな思想の転換**でした。なぜjjがこういう設計なのか調べていくと、Googleで使われている**Gerrit**というコードレビューシステムの思想にたどり着きました。

## Gerritのコードレビュー：すべてはここから始まっていた

多くの開発者にとって、コードレビューと言えばGitHubのPull Requestですよね。私もそうでした。しかし、Google社内やAndroidプロジェクトなどで使われているGerritは、まったく異なるアプローチを取っていることを知りました。

### Gerritの「1変更1コミット」モデル

Gerritでは、**1つの論理的な変更に対して1つのコミットをレビューする**のが基本原則です。

```text
# Gerritの世界
Issue #123 → 1つのコミット → レビュー → マージ

# GitHub/GitLabの世界
Issue #123 → ブランチ → 複数のコミット → PR → マージ
```

Gerritでレビューを受ける流れは次のようになります。

1. 1つのコミットを作る
2. `git push origin HEAD:refs/for/main` でレビュー用に送信
3. レビュアーからフィードバックを受ける
4. **同じコミットを修正**（`git commit --amend`）
5. 再度pushする
6. これを繰り返す

ここで重要なのは、**コミットは1つのまま、内容だけを更新し続ける**という点です。修正のたびに新しいコミットを作るのではありません。

### Change-Id：同じ変更を追跡する仕組み

Gerritは各コミットに`Change-Id`という識別子を付けます。

```text
commit abc123...
Author: ...
Date: ...

    Add user authentication feature

    Change-Id: I8f2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0
```

この`Change-Id`があるおかげで、コミットハッシュが変わっても（amendするたびに変わる）、Gerritは「これは同じ変更の更新版だ」と認識できるんですね。

## jjの設計思想を知って衝撃を受けた

jj（Jujutsu）は、Googleのエンジニアによって作られたのですが、調べてみると**Gerritワークフローをネイティブにサポートする**ことを設計思想の中心に据えていることがわかりました。

### jjの「1変更1コミット」哲学

jjでは、Gerritの思想がさらに徹底されています。

- **基本的に1つの修正 = 1つのchange（jjではコミットのことをchangeと呼ぶ）**
- **説明を上書きしていくスタイル**
- **作業履歴はローカルにとどめ、共有するのは1つのchangeのみ**

```bash
# jjでの典型的なワークフロー
jj new                    # 新しいchangeを作成
# コードを編集...
jj describe -m "Add feature"  # 説明を追加(jj desc でも可)

# レビュー指摘を受けたら
# コードを修正...
jj desc -m "Add feature (updated)"  # 説明を更新

# さらに修正...
jj desc -m "Add feature (final)"    # また更新

# 最終的にpushするのは1つのchange
jj git push
```

### Git/GitHubとの根本的な違いに気づいた

これは、Git/GitHubに慣れていた私にとって**大きな思想の転換**でした。

| Git/GitHub | jj/Gerrit |
| ---------- | --------- |
| 1 issue → ブランチ → 複数コミット → PR | 1 issue → 1 change → レビュー |
| コミット履歴を残す | 作業履歴はローカルのみ |
| `git commit` を積み重ねる | 同じchangeを更新し続ける |
| 作業の過程も共有 | 完成形だけを共有 |
| ブランチを積極的に使う | ブランチはあまり使わない |

### なぜブランチを使わないのか？

Gitでは「機能ごとにブランチを切る」のが常識ですよね。しかしjjでは以下のようになります。

```bash
# Gitの世界
git checkout -b feature/user-auth
git commit -m "Add login form"
git commit -m "Add password validation"
git commit -m "Fix typo"
git commit -m "Address review comments"
git push origin feature/user-auth

# jjの世界
jj new  # これだけ。ブランチ名すら不要
# あとは同じchangeを更新し続ける
```

なぜかというと、以下の理由があります。

- **1つのchangeには1つの論理的な変更しか含まれない**
- だから、複数のchangeを「枝分かれ」させて管理する必要がそもそも薄い
- jjは変更をDAG（有向非巡回グラフ）で管理するので、ブランチという概念に頼る必要がない

### 作業履歴はローカルに、共有は最小限に

これがjjの革新的な点だと気づきました。

```text
ローカルでの作業履歴：
Change A (v1) → Change A (v2) → Change A (v3) → Change A (v4)
  ↓              ↓                ↓               ↓
試行錯誤      リファクタ        バグ修正      レビュー対応

共有されるもの：
Change A (v4) のみ
```

Git/GitHubでは以下のようになります。

```text
ローカル：
commit 1 → commit 2 → commit 3 → commit 4

リモート：
全部共有される（PR上で全コミットが見える）
```

### Change-Idの自動管理

jjでは、Change-Idの概念が内部的に組み込まれています。開発者が意識する必要はありませんが、裏では各changeに一意のIDが割り当てられ、それによって変更の履歴が追跡されています。

```bash
jj log
# @  mknwrwop 2026-01-13 12:34:56 user@example.com
# │  Add user authentication
# │  Change-ID: kou... (自動生成される)
```

## この思想転換を理解して驚いたこと

### 私が特に驚いた点

1. **「コミット履歴は神聖」という常識の破壊**
   - Gitでは「一度pushしたコミットは変更しない」が鉄則
   - jjでは「changeは何度でも更新するもの」が前提

2. **「ブランチで整理」からの解放**
   - feature/XXX, fix/YYYというブランチ名を考える必要がない
   - changeそのものが作業単位

3. **「作業過程の透明性」vs「結果の明確性」**
   - GitHub: 試行錯誤の過程も見える（`fix typo`というコミットも残る）
   - jj: 最終的な変更だけが見える（クリーンな履歴）

4. **PRという概念の希薄化**
   - GitHubのPRは「複数コミットをまとめてマージする単位」
   - jjでは「1つのchangeをレビューしてマージ」だけ

### メリット

- **レビューが明確** - 「この変更は何をしているのか」が1つのchangeで完結
- **履歴がクリーン** - `fix typo`や`address comments`といったノイズがない
- **ローカルで自由** - 何度でも書き直せる。pushするまで共有されない
- **概念がシンプル** - ブランチ戦略やrebaseの複雑さから解放

### デメリット（慣れるまで）

- **Git/GitHubの常識が通用しない**
- **「コミット = 作業の記録」という感覚からの脱却が必要**
- **チーム全体での理解が必要** - 一部の人だけjjを使うのは難しい

## 実際のワークフロー例

### jjでのissue対応

```bash
# Issue #123: ユーザー認証機能の追加

# 1. 新しいchangeを作成
jj new -m "Add user authentication feature (#123)"

# 2. コードを書く
# ... 編集 ...

# 3. レビュー依頼（実際はGitHubのPRなどに変換）
jj git push -c @

# 4. レビューで指摘を受ける
# 「パスワードのバリデーションが甘い」

# 5. 同じchangeを修正
# ... コード修正 ...
jj desc -m "Add user authentication feature (#123)

Implements password validation with:
- Minimum 8 characters
- At least one uppercase letter
- At least one number"

# 6. 再度push（同じchangeの更新）
jj git push -c @

# 7. さらに修正があれば繰り返す
# 最終的にpushされるのは1つのchange
```

### GitHubとの併用

jjはGitリポジトリを操作できるので、既存のGitHub中心のワークフローでも使えます。

```bash
# jjでローカル作業
jj new
# 編集...

# GitHubのPRとして送る時は1つにまとめる
jj git push --branch feature/auth

# あとはGitHub上で普通にPRを作成
```

ただし、この場合でも「1つのPRには1つの論理的な変更」という思想は活きてきます。

## 作業中のバックアップはどうするのか?

ここまで読んで、Gitに慣れた方なら次のような疑問を持つのではないでしょうか。

> **「Gitではfeatureブランチでどんどんcommitしてpushして、サーバーにバックアップできる。jjでは`jj desc`で説明を上書きしていくけど、サーバーには上げないからバックアップとして不安では?」**

これは非常に重要な指摘です。実際、私も最初にこの疑問を持ちました。PCが突然故障したら、ローカルの作業が全て失われてしまうのでは?

### jjでもバックアップは可能

実は、jjでもちゃんとバックアップの仕組みがあります。

#### 1. 作業中のchangeをpushする

```bash
# 現在のchangeをプライベートブランチとしてpush
jj git push --change @

# または短縮形で
jj git push -c @
```

これにより、現在のchangeがGitリポジトリの一時的なブランチとしてpushされます。まだレビュー準備ができていなくても、バックアップ目的でpushできるんです。

**Git側でのブランチ名**は、jjが自動的に`push-<change-id>`という形式で生成します。例えば次のようになります。

- `push-mknwrwopqrst`
- `push-yqosqzytrlsw`

changeのIDが使われるため、同じchangeを何度pushしても同じブランチ名になり、そのブランチが上書き更新されます。

明示的にブランチ名を指定したい場合は、次のようにします。

```bash
jj git push --branch feature/my-feature
```

このように`--branch`オプションを使えば、任意のブランチ名でpushできます。

#### 2. 複数の作業履歴をそのままpushする

jjでは、ローカルで複数のchangeを積み重ねて作業できます。

```bash
# 作業途中の状態を複数のchangeで管理
jj new -m "WIP: Initial implementation"
# コード編集...

jj new -m "WIP: Add validation"
# さらに編集...

jj new -m "WIP: Fix edge cases"
# 編集...

# すべてをバックアップとしてpush
jj git push --all
```

この方法なら、作業の各段階がchangeとして保存され、サーバーにバックアップされます。

#### 3. 定期的なpushでバックアップ

```bash
# 作業中、こまめにバックアップpush
jj git push -c @

# コード修正...
# また同じchangeを更新してpush
jj git push -c @

# さらに修正...
jj git push -c @
```

同じchangeを何度pushしても、リモートのブランチが上書きされるだけです。これにより以下のメリットがあります。

- **作業が失われる心配がない** - PCが故障してもリモートに最新の作業が残る
- **レビュー準備ができていなくても安全** - 途中でも気軽にpushできる
- **最終的には1つのchangeとしてマージできる** - 履歴はクリーンなまま
- **複数のcommitがリモートに残らない** - 同じブランチが上書きされるだけ

Gitのfeatureブランチで複数commitを積み重ねるのとは異なり、jjでは同じchangeを更新し続けるため、バックアップとレビューを分けて考えられます。

### 実際の作業フロー例

```bash
# 新しい機能の作業開始
jj new -m "Add user settings page"

# 1時間作業...
# バックアップpush
jj git push -c @

# さらに2時間作業...
# またpush(同じchangeが更新される)
jj git push -c @

# レビュー指摘を受けて修正
# コード修正...
jj desc -m "Add user settings page

Implements:
- Profile editing
- Password change
- Email preferences"

# 最終版をpush
jj git push -c @

# レビュー承認されたらマージ
```

このように、**作業中でもバックアップのためにpushできる**のがjjの強みです。

### どんどんpushしても大丈夫?

はい、大丈夫です。

- リモートには作業用の一時ブランチができるだけ
- 他の人に影響しない
- 最終的に1つのchangeとしてマージするので、履歴はクリーン
- Gerritの思想では「push = バックアップ」「レビュー = 別の段階」と分けて考える

実際、Gerrit環境では、開発者は頻繁に`git push`してバックアップを取りながら作業します。jjも同じ思想で設計されています。

## まとめ：新しいワークフローの体験

jjは単なる「Gitの代替ツール」ではありませんでした。**コードレビューとバージョン管理に対する根本的に異なる哲学**を体現していたんです。

Gerritで培われた「1変更1コミット」「changeは更新するもの」という思想を、モダンなツールとして再構築したのがjjだったんですね。

最初は、Git/GitHub中心の世界に慣れていた私にとって、この考え方は奇妙に感じられました。しかし以下のような利点を実際に体験すると考えが変わりました。

- **レビューの明確性**
- **履歴のクリーンさ**
- **作業の自由度**

これらの利点を実際に体験すると、「なぜ今まで何十個も`fix typo`コミットを積み重ねていたんだろう？」と思うようになりました。

jjは、バージョン管理の新しい地平を切り開く挑戦です。そして、その背景にはGoogleの大規模開発で磨かれたGerritの知恵があります。前回の記事でjjの基本的な使い方に感動しましたが、この思想を知ってさらに深く理解できました。

---

**参考リンク：**

- [Jujutsu VCS](https://github.com/jj-vcs/jj)
- [Gerrit Code Review](https://www.gerritcodereview.com/)
- [Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/pub45424/)
