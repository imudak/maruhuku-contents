---
title: jjを使っていて驚いた「1つの変更を育てていく」という哲学
emoji: 🎯
type: tech
topics:
  - jj
  - git
  - Gerrit
  - workflow
  - versioncontrol
published: true
published_at: 2026-01-13
---

# jjを使っていて驚いた「1つの変更を育てていく」という哲学

## はじめに

前回の記事でjj (Jujutsu) の基本的な使い方を紹介しました。ファイルの変更が自動で記録され、コミットメッセージを後から書けるという便利さに魅了されて使い始めたのですが、使っているうちに**もっと根本的な思想の違い**に気づいてしまいました。

それは「**1つの修正に対して1つの変更単位（change）を使い、説明を上書きしていく**」というスタイルです。作業履歴はローカルにとどめ、共有するのは1つのchangeのみ。issueやPRに対してもchangeは1つで、手元の作業履歴をどんどん修正していきます。

つまり、**複数のコミットを積み重ねるのではなく、1つの変更を完成するまで何度も更新し続ける**のです。まるで盆栽を育てるように、同じ変更を丁寧に育てていくイメージです。

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

1. 1つのchangeを作る
2. Gerritにレビュー用として送信
3. レビュアーからフィードバックを受ける
4. **同じchangeを更新**
5. 再度送信する
6. これを繰り返してchangeを育てる

ここで重要なのは、**changeは1つのまま、内容を育てていく**という点です。修正のたびに新しいchangeを作るのではなく、レビューのフィードバックを受けながら、同じchangeを完成形に向けて育てていきます。

### Change-Id：同じ変更を追跡する仕組み

Gerritは各コミットに`Change-Id`という識別子を付けます。

```text
commit abc123...
Author: ...
Date: ...

    Add user authentication feature

    Change-Id: I8f2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0
```

この`Change-Id`があるおかげで、Gerritは「これは同じchangeの更新版だ」と認識できるのです。

## jjの設計思想を知って衝撃を受けた

jj（Jujutsu）は、Googleのエンジニアによって作られたツールで、**Gerritワークフローをネイティブにサポートする**ことを設計思想の中心に据えています。

### jjの「1変更1change」哲学

jjでは、Gerritの思想がさらに徹底されています。

- **基本的に1つの修正 = 1つのchange**
- **説明を充実させていくスタイル**
- **作業履歴はローカルにとどめ、共有するのは1つのchangeのみ**

```bash
# jjでの典型的なワークフロー
jj new                    # 新しいchangeを作成
# コードを編集...
jj describe -m "Add feature"  # 説明を追加(jj desc でも可)

# レビュー指摘を受けたら
# コードを修正...
jj desc -m "Add feature with validation"  # changeを育てる

# さらに修正...
jj desc -m "Add feature with validation and error handling"  # さらに育てる

# 最終的にPR用としてpush（明示的なブランチ名を指定）
jj git push --branch feature/my-feature
```

### Git/GitHubとの根本的な違いに気づいた

これは、Git/GitHubに慣れていた私にとって**大きな思想の転換**でした。

| Git/GitHub | jj/Gerrit |
| ---------- | --------- |
| 1 issue → ブランチ → 複数コミット → PR | 1 issue → 1 change → レビュー |
| すべてのgitコミットを共有 | changeの最終形だけを共有 |
| `git commit` を積み重ねる | 同じchangeを育てていく |
| 作業の過程も共有 | 完成形だけを共有 |
| ブランチを積極的に使う | ブランチはあまり使わない |

これを視覚的に表すと以下のようになります:

```text
【Git/GitHub: コミットを積み重ねる】
時系列 →

main ───────────────────────────────────●
                                        ↑ merge
feature ─●────●────●────●───────────────┘
         │    │    │    │
      commit commit commit commit
         1     2     3     4

→ PR上で commit 1, 2, 3, 4 すべてが見える (横に長い履歴)


【jj/Gerrit: changeを育てる】
時系列 →

              (ローカルで何度も更新)
              v1 → v2 → v3 → v4
               ↓    ↓    ↓    ↓
              [jj op logで追跡可能]

                    ↓ 共有されるのは

main ─────────────●─────────────────────●
                  │                     ↑ merge
              Change A                  │
              (完成形のみ)               │
              "Add login form ───────────┘
               with validation"

→ レビュー画面では完成した1つのchangeだけが見える
```

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
- changeそのものが作業単位なので、ブランチで区別する必要がない

### Change-Idの自動管理

jjでは、Change-Idの概念が内部的に組み込まれています。開発者が意識する必要はありませんが、裏では各changeに一意のIDが割り当てられ、それによって変更の履歴が追跡されています。

```bash
jj log
# @  mknwrwop 2026-01-13 12:34:56 user@example.com
# │  Add user authentication
# │  Change-Id: kou... (自動生成される)
```

## この思想の何が革新的なのか

「1つの変更を育てていく」という考え方は、以下のような根本的な転換をもたらします。

### 変更への向き合い方の転換

- **レビューが明確** - 「この変更は何をしているのか」が1つのchangeで完結
- **履歴がクリーンに育つ** - `fix typo`や`address comments`といったノイズがなく、changeが完成形に向かって成長していく
- **ローカルで自由に育成** - 何度でも書き直せる。pushするまで共有されない
- **概念がシンプル** - ブランチ戦略やrebaseの複雑さから解放

### デメリット（慣れるまで）

- **Git/GitHubの常識が通用しない**
- **「gitコミット = 作業の記録」という感覚からの脱却が必要**

## 実際のワークフロー例

### jjでのissue対応

```bash
# Issue #123: ユーザー認証機能の追加

# 1. 新しいchangeを作成
jj new

# 2. コードを書く
# ... 編集 ...

# 3. 説明を追加
jj desc -m "Add user authentication feature (#123)"

# 4. 作業中のバックアップ（現在のchangeをpush）
jj git push --change @

# さらにコードを修正...
# またバックアップpush（同じブックマークが更新される）
jj git push --change @

# 5. PR作成（明示的なブランチ名を指定）
jj git push --branch feature/auth-123

# 6. レビューで指摘を受ける
# 「パスワードのバリデーションが甘い」

# 7. 同じchangeを修正
# ... コード修正 ...

# 説明も充実させる（changeを育てる）
jj desc -m "Add user authentication feature (#123)

Enhanced password validation with:
- Minimum 8 characters
- At least one uppercase letter
- At least one number"

# 8. 再度push（同じブランチが更新される）
jj git push --branch feature/auth-123

# 9. さらに修正があれば繰り返す
# 最終的にpushされるのは1つのchange
```

補足: `jj git push --change @`では、現在のchange（@）に対して自動的にブックマーク名が生成されます（デフォルトは`push-<change_id>`形式）。このブックマークは自動的にtrackされ、2回目以降の`jj git push --change @`では同じブックマークが更新されます。一方、ステップ5やステップ8の`--branch`オプションでは明示的なブランチ名を指定し、PR用のブックマークとして扱います。

## squashとは何が違うのか？

この記事を公開したところ、次のようなコメントをいただきました。

> **「gitでsquashしたら同じじゃないの？新しい地平感は感じないな」**

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
3. **いつでも任意の時点に戻れる** - `jj undo` または `jj op restore`

### Gitのsquashでは失われるもの

Gitでsquashすると、中間の履歴は失われます。

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
| ファイル編集は記録されない | **作業のスナップショットも自動記録** |
| ガベージコレクションで消える可能性あり | より永続的 |
| 「いつgit commitしたか」がわかる | 「いつ何をしたか」がわかる |

### jjならいつでも巻き戻せる

```bash
# 作業中...
# ファイルを編集
# 「あ、さっきの変更、やっぱりやめたい」

# 1つ前の操作に戻る
jj undo

# または、特定の操作時点に戻る
jj op restore a1b2c3d4

# 履歴を確認しながら安心して作業できる
jj op log
```

これは**Gitのsquashにはない安全網**です。jjでは以下が可能です。

- 「2時間前の状態に戻りたい」→ `jj op log`で確認して`jj op restore`
- 「間違って`jj desc`で上書きしてしまった」→ `jj undo`で元に戻せる
- 「試行錯誤の過程を全部見たい」→ `jj op log`ですべて確認できる

### squashとの本質的な違い

Gitのsquashは「過去を書き換える」操作です。一度squashしたら、中間の状態は（reflogに残る可能性はあるものの）基本的に失われます。

jjは違います。**過去は常に保存されていて、いつでも参照・復元できる**。これは以下を意味します。

- **安心して実験できる** - どんなに失敗しても戻れる
- **作業の過程を追跡できる** - 「なぜこうなったか」を後から確認できる
- **changeは1つでも、裏には履歴がある** - クリーンな履歴とバックアップの両立

つまり、jjは**「共有する履歴」と「ローカルの操作履歴」を分離**しています。

```text
【jj/Gerrit: changeを育てるアプローチ】

ローカルの操作履歴 (jj op log):
  試行錯誤 → リファクタ → バグ修正 → レビュー対応
     ↓          ↓           ↓            ↓
  [すべて自動記録・いつでも戻れる]

           ↓ (育てた結果)

共有される履歴 (git log):
  → 完成した1つのchange


【Git/GitHub: コミットを積み重ねるアプローチ】

ローカル:
  commit 1 → commit 2 → commit 3 → commit 4
     ↓          ↓           ↓            ↓
  [すべてリモートに共有される]

リモート (PR):
  commit 1, 2, 3, 4 すべてが見える
```

これがGitのsquashとjjの根本的な違いです。

### 操作履歴もバックアップしたい場合は？

ここまで理解して、さらに疑問が湧いてきました。

> **「操作履歴も含めてバックアップしたい場合はどうすればいいの？」**

技術的には可能です。jjのすべての情報(操作履歴を含む)は`.jj/`ディレクトリに保存されているため、このディレクトリをバックアップすれば操作履歴も保存できます。例えば、クラウドストレージへの定期的な同期などが考えられます。

しかし、これはjjの設計思想とは異なるアプローチです。jjでは以下のように考えます。

- **操作履歴はローカルの試行錯誤** - 個人的な作業メモのようなもの
- **共有すべきは完成形のchange** - チームに見せるのはクリーンな結果のみ

jjの思想では、作業の途中経過は`jj op log`で保護されており、それをリモートにpushする必要はないと考えます。

## まとめ：新しいワークフローの体験

jjは単なる「Gitの代替ツール」ではありません。**コードレビューとバージョン管理に対する根本的に異なる哲学**を体現しています。

Gerritで培われた「1つの変更を育てていく」という思想を、モダンなツールとして再構築したのがjjです。

最初は、Git/GitHub中心の世界に慣れていた私にとって、この考え方は奇妙に感じられました。しかし以下のような利点を実際に体験すると考えが変わりました。

- **レビューの明確性** - 1つのchangeで完結する
- **履歴のクリーンさ** - `fix typo`といったノイズがない
- **操作履歴による安全性** - いつでも巻き戻せる安心感
- **作業の自由度** - 何度でも書き直せる

そして何より重要なのは、jjが**「共有する履歴」と「ローカルの操作履歴」を分離**していることです。チームには完成形だけを見せながら、個人の試行錯誤は保護される。この設計により、クリーンな履歴と安全網を両立できます。

これらを体験すると、「なぜ今まで何十個も`fix typo`コミットを積み重ねていたんだろう？」と思うようになりました。changeを丁寧に育てるというアプローチは、コードレビューとバージョン管理に対する新しい視点を与えてくれます。

---

**参考リンク：**

- [Jujutsu VCS](https://github.com/jj-vcs/jj)
- [Gerrit Code Review](https://www.gerritcodereview.com/)
- [Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/pub45424/)
