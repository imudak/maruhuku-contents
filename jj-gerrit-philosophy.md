# jjを使っていて驚いた「1つの変更を育てていく」という哲学

## はじめに

前回の記事でjj (Jujutsu) の基本的な使い方を紹介しました。ファイルの変更が自動で記録され、コミットメッセージを後から書けるという便利さに魅了されて使い始めたのですが、使っているうちに**もっと根本的な思想の違い**に気づいてしまいました。

それは「**1つの修正に対して1つの変更単位（change）を使い、説明を上書きしていく**」というスタイルです。作業履歴はローカルにとどめ、共有するのは1つのchangeのみ。issueやPRに対してもchangeは1つで、手元の作業履歴をどんどん修正していきます。

つまり、**複数のコミットを積み重ねるのではなく、1つの変更を完成するまで何度も更新し続ける**のです。まるで盆栽を育てるように、同じ変更を丁寧に磨き上げていくイメージです。

これは、Git/GitHubに慣れた私にとって**大きな思想の転換**でした。なぜjjがこういう設計なのか調べていくと、Googleで使われている**Gerrit**というコードレビューシステムの思想にたどり着きました。

## Gerritのコードレビュー：すべてはここから始まっていた

多くの開発者にとって、コードレビューと言えばGitHubのPull Requestです。私もそうでした。しかし、Google社内やAndroidプロジェクトなどで使われているGerritは、まったく異なるアプローチを取っています。

### Gerritの「1変更1change」モデル

Gerritでは、**1つの論理的な変更に対して1つのchange（変更単位）をレビューする**のが基本原則です。

```text
# Gerritの世界
Issue #123 → 1つのchange → レビュー → マージ

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

ここで重要なのは、**changeは1つのまま、内容だけを更新し続ける**という点です。修正のたびに新しいchangeを作るのではありません。

> **補足:** Gerritでは、実際には「Change-Id」という識別子で変更を追跡します。`git commit --amend`でコミットハッシュが変わっても、Change-Idが同じであれば「同じchangeの更新版」として認識されます。技術的には複数のgitコミットに同じChange-Idを付けることも可能ですが、実践的には1つのコミットを更新し続けるワークフローが一般的です。

### Change-Id：同じ変更を追跡する仕組み

Gerritは各コミットに`Change-Id`という識別子を付けます。

```text
commit abc123...
Author: ...
Date: ...

    Add user authentication feature

    Change-Id: I8f2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0
```

この`Change-Id`があるおかげで、コミットハッシュが変わっても（amendするたびに変わる）、Gerritは「これは同じchangeの更新版だ」と認識できるのです。

## jjの設計思想を知って衝撃を受けた

jj（Jujutsu）は、Googleのエンジニアによって作られたツールで、**Gerritワークフローをネイティブにサポートする**ことを設計思想の中心に据えています。

### jjの「1変更1change」哲学

jjでは、Gerritの思想がさらに徹底されています。

- **基本的に1つの修正 = 1つのchange**
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
| gitコミット履歴を残す | 作業履歴はローカルのみ |
| `git commit` を積み重ねる | 同じchangeを更新し続ける |
| 作業の過程も共有 | 完成形だけを共有 |
| ブランチを積極的に使う | ブランチはあまり使わない |

### なぜブランチを使わないのか？

Gitでは「機能ごとにブランチを切る」のが常識です。しかしjjでは以下のようになります。

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

1. **「gitコミット履歴は神聖」という常識の破壊**
   - Gitでは「一度pushしたコミットは変更しない」が鉄則
   - jjでは「changeは何度でも更新するもの」が前提

2. **「ブランチで整理」からの解放**
   - feature/XXX, fix/YYYというブランチ名を考える必要がない
   - changeそのものが作業単位

3. **「作業過程の透明性」vs「結果の明確性」**
   - GitHub: 試行錯誤の過程も見える（`fix typo`というgitコミットも残る）
   - jj: 最終的な変更だけが見える（クリーンな履歴）

4. **PRという概念の希薄化**
   - GitHubのPRは「複数のgitコミットをまとめてマージする単位」
   - jjでは「1つのchangeをレビューしてマージ」だけ

### メリット

- **レビューが明確** - 「この変更は何をしているのか」が1つのchangeで完結
- **履歴がクリーン** - `fix typo`や`address comments`といったノイズがない
- **ローカルで自由** - 何度でも書き直せる。pushするまで共有されない
- **概念がシンプル** - ブランチ戦略やrebaseの複雑さから解放

### デメリット（慣れるまで）

- **Git/GitHubの常識が通用しない**
- **「gitコミット = 作業の記録」という感覚からの脱却が必要**
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
jj git push

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
jj git push

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

ここまで理解して、気になったのがバックアップの問題です。

> **「Gitではfeatureブランチでどんどんcommitしてpushして、サーバーにバックアップできる。jjでは`jj desc`で説明を上書きしていくけど、サーバーには上げないからバックアップとして不安では?」**

jjでもリモートへのバックアップは可能です。

### 作業中のchangeをpushする

```bash
# 現在のchangeをリモートにpush
jj git push
```

これにより、現在のchangeがGitリポジトリの一時的なブランチとしてpushされます。まだレビュー準備ができていなくても、バックアップ目的でpushできるのです。

Git側でのブランチ名は、jjが自動的に`push-<change-id>`という形式で生成します。例えば次のようになります。

- `push-mknwrwopqrst`
- `push-yqosqzytrlsw`

同じchangeを何度編集してpushしても、Change IDは変わりません。そのため同じブランチ名(`push-<change-id>`)にpushされ、リモートのブランチが上書き更新されます。

重要な注意点: リモートにpushされるのは**changeの現在の状態**だけです。ローカルの操作履歴(`jj op log`で見える履歴)はpushされません。操作履歴は完全にローカルに留まります。

明示的にブランチ名を指定したい場合:

```bash
jj git push --branch feature/my-feature
```

### 定期的なpushでバックアップ

```bash
# 作業中、こまめにバックアップpush
jj git push

# コード修正...
# また同じchangeを更新してpush
jj git push

# さらに修正...
jj git push
```

同じchangeを何度pushしても、リモートのブランチが上書きされるだけです。

重要なポイント:

- PCが故障してもリモートに最新の作業が残る
- レビュー準備ができていなくても、途中でも気軽にpushできる
- 最終的には1つのchangeとしてマージするので、履歴はクリーン
- リモートには作業用の一時ブランチができるだけで、他の人に影響しない

### 実際の作業フロー例

```bash
# 新しい機能の作業開始
jj new -m "Add user settings page"

# 1時間作業...
# バックアップpush
jj git push

# さらに2時間作業...
# またpush(同じchangeが更新される)
jj git push

# レビュー指摘を受けて修正
# コード修正...
jj desc -m "Add user settings page

Implements:
- Profile editing
- Password change
- Email preferences"

# 最終版をpush
jj git push

# レビュー承認されたらマージ
```

Gerritの思想では「push = バックアップ」「レビュー = 別の段階」と分けて考えます。jjも同じ思想で、作業中でも安心してpushできます。

## squashとは何が違うのか？

この記事を公開したところ、次のようなコメントをいただきました。

> **「gitでsquashしたら同じじゃないの？新しい地平感は感じないな」**

実は私自身、何かあるたびにgit commitしてpushする習慣があり、リモートのgitコミット履歴が非常に長くなってしまうタイプでした。squashすれば整理できることはわかっていましたが、作業の履歴が完全に消えてしまうことに抵抗がありました。

確かにGitでも以下のようにすれば、複数のgitコミットを1つにまとめられます。

```bash
# Gitでの作業
git commit -m "Add login form"
git commit -m "Add validation"
git commit -m "Fix typo"
git commit -m "Address review comments"

# squashで1つにまとめる
git rebase -i HEAD~4
# エディタで "pick" を "squash" に変更...
```

しかし、jjの革新的な点は**操作履歴(operation log)の自動記録**にあります。これはGitのsquashとは本質的に異なるものです。

### jjの操作履歴は「完全な安全網」

jjでは、**ファイルを編集するだけで、その操作履歴が自動的に記録されます**。`jj desc`でコミットメッセージを書く必要すらありません。

```bash
# ファイルを編集するだけ...
# (何もコマンドを実行しない)

# 操作履歴を確認
jj op log
```

すると、以下のような履歴が見えます。

```text
@  a1b2c3d4 2026-01-19 14:23:45
│  snapshot working copy
│  args: jj op log
○  e5f6g7h8 2026-01-19 14:20:12
│  snapshot working copy
│  args: (ファイル編集)
○  i9j0k1l2 2026-01-19 14:15:30
│  describe commit ...
│  args: jj desc -m "Add user authentication"
○  m3n4o5p6 2026-01-19 14:10:00
│  new empty change
│  args: jj new
```

重要なポイント:

1. **ファイルを編集するだけで自動的にスナップショットが作られる**
2. **すべての操作が記録される** - `jj desc`, `jj new`, ファイル編集、すべて
3. **いつでも任意の時点に戻れる** - `jj op undo` または `jj op restore`

### Gitのsquashでは失われるもの

Gitでsquashすると、中間の履歴は**完全に失われます**。

```bash
# Gitの場合
git commit -m "Add feature"
git commit -m "Oops, broke something"
git commit -m "Fix the breakage"

# squashすると...
# → "Oops, broke something" の状態には二度と戻れない
```

Gitにも`git reflog`がありますが、以下の点でjjとは異なります。

| Git reflog | jj operation log |
| ---------- | ---------------- |
| gitコミットの参照変更を記録 | **すべての操作**を記録 |
| ファイル編集は記録されない | **ファイル編集も自動記録** |
| ガベージコレクションで消える可能性あり | より永続的 |
| 「いつgit commitしたか」がわかる | 「いつ何をしたか」がわかる |

### jjならいつでも巻き戻せる

```bash
# 作業中...
# ファイルを編集
# 「あ、さっきの変更、やっぱりやめたい」

# 1つ前の操作に戻る
jj op undo

# または、特定の操作時点に戻る
jj op restore a1b2c3d4

# 履歴を確認しながら安心して作業できる
jj op log
```

これは**Gitのsquashにはない安全網**です。jjでは以下が可能です。

- 「2時間前の状態に戻りたい」→ `jj op log`で確認して`jj op restore`
- 「間違って`jj desc`で上書きしてしまった」→ `jj op undo`で元に戻せる
- 「試行錯誤の過程を全部見たい」→ `jj op log`ですべて確認できる

### squashとの本質的な違い

Gitのsquashは「過去を書き換える」操作です。一度squashしたら、中間の状態は（reflogに残る可能性はあるものの）基本的に失われます。

jjは違います。**過去は常に保存されていて、いつでも参照・復元できる**。これは以下を意味します。

- **安心して実験できる** - どんなに失敗しても戻れる
- **作業の過程を追跡できる** - 「なぜこうなったか」を後から確認できる
- **changeは1つでも、裏には完全な履歴がある** - クリーンな履歴と完全なバックアップの両立

つまり、jjは**「共有する履歴」と「ローカルの操作履歴」を完全に分離**しています。

```text
共有される履歴 (git log):
  → クリーンな1つのchange

ローカルの操作履歴 (jj op log):
  → すべての試行錯誤、すべての操作が記録されている
```

これがGitのsquashとjjの根本的な違いです。

### 操作履歴もバックアップしたい場合は？

ここまで理解して、さらに疑問が湧いてきました。

> **「操作履歴も含めてバックアップしたい場合はどうすればいいの？」**

技術的には可能です。jjのすべての情報(操作履歴を含む)は`.jj/`ディレクトリに保存されているため、このディレクトリをバックアップすれば操作履歴も保存できます。例えば、クラウドストレージへの定期的な同期などが考えられます。

しかし、これはjjの設計思想とは異なるアプローチです。jjでは以下のように考えます。

- **操作履歴はローカルの試行錯誤** - 個人的な作業メモのようなもの
- **共有すべきは完成形のchange** - チームに見せるのはクリーンな結果のみ

もし「作業の途中経過も残したい」というニーズがあるなら、以下の方法が思想に沿っています。

```bash
# 作業の節目で別のchangeとして保存
jj new -m "WIP: Initial approach"
# 試行錯誤...

jj new -m "WIP: Refactored version"
# さらに試行錯誤...

jj new -m "Final implementation"
# 最終版

# すべてをpush
jj git push --all
```

この方法なら、作業の各段階がchangeとして保存され、リモートにもバックアップされます。ただし最終的にマージするのは1つのchangeにまとめることが推奨されます。

## まとめ：新しいワークフローの体験

jjは単なる「Gitの代替ツール」ではありません。**コードレビューとバージョン管理に対する根本的に異なる哲学**を体現しています。

Gerritで培われた「1変更1コミット」「changeは更新するもの」という思想を、モダンなツールとして再構築したのがjjです。

最初は、Git/GitHub中心の世界に慣れていた私にとって、この考え方は奇妙に感じられました。しかし以下のような利点を実際に体験すると考えが変わりました。

- **レビューの明確性** - 1つのchangeで完結する
- **履歴のクリーンさ** - `fix typo`といったノイズがない
- **操作履歴による安全性** - いつでも巻き戻せる安心感
- **作業の自由度** - 何度でも書き直せる

そして何より重要なのは、jjが**「共有する履歴」と「ローカルの操作履歴」を完全に分離**していることです。チームには完成形だけを見せながら、個人の試行錯誤は完全に保護される。この設計により、クリーンな履歴と完全な安全網を両立できます。

これらの利点を実際に体験すると、「なぜ今まで何十個も`fix typo`コミットを積み重ねていたんだろう？」と思うようになりました。

jjを使うことで、Git/GitHubとは異なるワークフローを体験できます。Gerritの思想に基づいた「1つの変更を育てていく」というアプローチは、最初は違和感があるかもしれませんが、使っていくうちにその合理性が見えてくるかもしれません。

---

**参考リンク：**

- [Jujutsu VCS](https://github.com/jj-vcs/jj)
- [Gerrit Code Review](https://www.gerritcodereview.com/)
- [Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/pub45424/)
