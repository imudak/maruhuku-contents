---
title: Jujutsu (jj) でgit submoduleを追加したらgitlinkがコミットされない問題
emoji: 🔗
type: tech
topics:
  - jujutsu
  - git
  - submodule
  - monorepo
published: true
---

## TL;DR（結論）

**最終結論**: jjをメインで使いたいなら、**submoduleをやめてVSCodeマルチルートワークスペース**に移行する方が楽でした（[後日談](#後日談submoduleをやめてvscodeワークスペースに移行した)参照）。

**submoduleを使い続ける場合**: gitlinkはjjではなく**gitで直接コミット**する必要があります。

```bash
# submoduleを追加
git submodule add https://github.com/user/repo.git projects/repo

# gitで直接コミット（git submodule addで自動的にstageされている）
git commit -m "chore: repoをsubmoduleとして追加"

# jjにインポートしてpush
jj git import
jj git push
```

jjはgitのstagingを見ないため、`jj commit`ではgitlinkがコミットされません。また、`jj status`でsubmoduleが`D`(Deleted)と誤表示される問題もあり、運用上の課題が多いです。

## 問題の発生状況

### やったこと

モノレポ構成で新規プロジェクトをsubmoduleとして追加しようとしました。

```bash
# GitHubでリポジトリ作成済み
# submoduleとして追加
git submodule add https://github.com/user/new-project.git projects/new-project

# .gitmodulesが更新されたことを確認
cat .gitmodules
# [submodule "projects/new-project"]
#     path = projects/new-project
#     url = https://github.com/user/new-project.git

# jjでコミット
jj commit -m "chore: new-projectをsubmoduleとして追加"
jj bookmark set main -r @-
jj git push
```

一見うまくいったように見えました。

### 発覚した問題

後日、submodule内で更新し、親リポジトリで参照を更新しようとしたところ、問題が発覚しました。

```bash
git submodule status
# （空の出力）

git status
# Untracked files:
#   projects/
```

`projects/`ディレクトリがuntrackedになっている！

### 原因の調査

コミット履歴を確認：

```bash
git show <commit-hash> --stat
# .gitmodules                    |   3 +
# steering/plans/roadmap.md     | 179 ++++++++++
# 2 files changed, 182 insertions(+)
```

`.gitmodules`は追加されているが、**submodule自体（gitlink）が含まれていない**。

gitlinkがtrackされているか確認：

```bash
git ls-files --stage projects/new-project
# （空の出力）

git ls-tree HEAD projects/
# （空の出力）
```

gitlinkがコミットされていなかった。

## 原因：jjはgitのstagingを見ない

### gitのsubmodule追加の仕組み

`git submodule add`を実行すると、以下が行われます：

1. `.gitmodules`ファイルの更新（submodule設定の追加）
2. gitのindex（staging area）に**gitlink**を追加

gitlinkとは、submoduleが参照するコミットハッシュを格納する特殊なエントリです。`git ls-files --stage`で確認すると、モード`160000`で表示されます：

```bash
git ls-files --stage projects/new-project
# 160000 abc123... 0  projects/new-project
```

### jjの動作

jjはgitのstagingを使わず、**working copy（作業ディレクトリ）の変更**を追跡します。

- jjがstagingを見ない理由：jjは独自のコミットモデルを持ち、gitとの互換性のために`.git`を使用するが、stagingは使わない
- `git submodule add`はstagingにgitlinkを追加するが、jjはこれを認識しない
- 結果、`jj commit`ではgitlinkがコミットされない

### 図解

```text
┌──────────────────────────────────────────────────────┐
│ git submodule add                                    │
│   ├── .gitmodules (working copy) ← jjが認識         │
│   └── gitlink (staging area)     ← jjが認識しない   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ jj commit                                            │
│   └── .gitmodules のみコミット                      │
│       （gitlinkは含まれない）                        │
└──────────────────────────────────────────────────────┘
```

## 解決方法

### 正しい手順

submoduleを追加する際は、gitで直接コミットします：

```bash
# 1. submoduleを追加
git submodule add https://github.com/user/repo.git projects/repo

# 2. gitlinkがstageされたことを確認
git ls-files --stage projects/repo
# 出力例: 160000 abc123... 0  projects/repo

# 3. .gitmodulesもstageされていることを確認
git status
# Changes to be committed:
#   new file:   .gitmodules
#   new file:   projects/repo

# 4. gitで直接コミット
git commit -m "chore: repoをsubmoduleとして追加"

# 5. jjにインポート
jj git import

# 6. push
jj git push
```

### 既存の問題を修復する場合

すでに`.gitmodules`だけコミットされてしまった場合：

```bash
# 1. submoduleディレクトリが存在することを確認
ls projects/repo

# 2. gitlinkを明示的にstage
git add projects/repo
# 警告が出るが無視してよい

# 3. stageされたことを確認
git ls-files --stage projects/repo
# 160000 <commit-hash> 0  projects/repo

# 4. gitで直接コミット
git commit -m "chore: submodule gitlinkを追加"

# 5. jjにインポートしてpush
jj git import
jj git push
```

### 参照の更新時も同様

submodule内で更新し、親リポジトリの参照を更新する場合も、gitで直接操作します。

```bash
# submodule内で更新をpush済みの状態で

# 1. gitlinkを更新
git add projects/repo

# 2. コミット
git commit -m "chore: repoのsubmodule参照を更新"

# 3. jjにインポートしてpush
jj git import
jj git push
```

## 検証方法

### submoduleが正しく登録されているか確認

```bash
# 方法1: git submodule status
git submodule status
# abc123... projects/repo (heads/main)

# 方法2: git ls-tree
git ls-tree HEAD projects/
# 160000 commit abc123...  projects/repo

# 方法3: git ls-files
git ls-files --stage projects/repo
# 160000 abc123... 0  projects/repo
```

出力があればOK。空の場合はgitlinkがコミットされていません。

## 追加の問題：jj statusでsubmoduleが「削除」と表示される

submoduleが正しく登録されていても、`jj status`を実行すると予期せぬ表示が出ます：

```bash
jj st
# Working copy changes:
# D projects/project-a
# D projects/project-b
```

すべてのsubmoduleが`D`(Deleted)と表示される！

### なぜこうなるか

jjの視点では：

1. 親コミット（HEAD）にはgitlinkエントリがある
2. しかしjjはgitlinkを認識できない（ファイルではないため）
3. 「あったものが消えた」→ `D`(Deleted)と判定

### 試した回避策

| 方法 | 結果 |
|------|------|
| `jj restore` | ✗ gitlinkを復元できない |
| `snapshot.auto-track`で除外 | ✗ 既にHEADにあるgitlinkの「削除」検出は止められない |
| `.gitignore`に追加 | ✗ gitlinkはファイルではないので除外不可 |

### 危険な状態

この`D`マークがついた状態で`jj new`すると、gitlinkの「削除」がコミットされてしまう可能性があります。つまり、**submoduleの参照が消える**。

### 根本的な問題

jjはgitlinkを扱えません。これはjjの設計上の制約で、[issue #494](https://github.com/jj-vcs/jj/issues/494)で議論されています。現時点ではworkaroundで解決できる問題ではなく、jj本体でのsubmoduleサポートを待つ必要があります。

## まとめ

| 操作 | jjで可能か | 備考 |
|------|-----------|------|
| `git submodule add` | ✗ | gitで実行 |
| gitlinkのコミット | ✗ | gitで直接コミット |
| submodule参照の更新 | ✗ | gitで直接コミット |
| 通常のファイル編集 | ✓ | jjで問題なし |
| `jj status`の表示 | ✗ | submoduleが`D`と誤表示される |

jjとgitを併用する環境でsubmoduleを扱う場合、**gitlinkに関する操作はgitで直接行う**必要があります。

jjはgitのstagingを見ないため、staging経由で追加されるgitlinkはjjでは扱えません。これはjjの設計上の制約であり、バグではありません。

## 後日談：submoduleをやめてVSCodeワークスペースに移行した

### submodule運用の課題

実際にsubmoduleでモノレポ管理を運用してみると、本記事で解説した問題以外にも課題が出てきました。

- **参照更新の手間**: submodule内で変更するたびに、親リポジトリでgitlinkを更新してコミットする必要がある
- **jjとの相性**: 前述の通り、submodule操作はgitで直接行う必要があり、jjのシンプルなワークフローが崩れる
- **クローン時の複雑さ**: `--recurse-submodules`オプションが必要で、忘れるとsubmoduleが空になる
- **IDE連携**: 一部のIDEやツールがsubmoduleを正しく認識しないことがある

### VSCodeマルチルートワークスペースという選択肢

検討した結果、**VSCodeマルチルートワークスペース**に移行しました。

```text
# 従来（submodule構成）
parent-repo/
├── .gitmodules
└── projects/
    ├── project-a/  (submodule)
    └── project-b/  (submodule)

# 移行後（ワークスペース構成）
workspace/
├── hub/            # ドキュメント・計画管理
├── project-a/      # 独立リポジトリ
└── project-b/      # 独立リポジトリ

hub/workspace.code-workspace  # VSCodeワークスペース定義
```

### ワークスペース形式のメリット

| 観点 | submodule | VSCodeワークスペース |
|------|-----------|---------------------|
| リポジトリ独立性 | 親に依存 | 完全独立 |
| 参照更新 | 手動で必要 | 不要 |
| jjとの相性 | 一部git直接操作 | 問題なし |
| クローン | `--recurse-submodules` | 各リポジトリを個別clone |
| IDE統合 | △ | ◎（VSCode前提） |

### 移行手順

```bash
# 1. submoduleを削除
git submodule deinit -f projects/project-a
git rm -f projects/project-a
rm -rf .git/modules/projects/project-a

# 2. .gitmodulesを削除（最後のsubmoduleの場合）
git rm .gitmodules

# 3. ワークスペースファイルを作成
cat > workspace.code-workspace << 'EOF'
{
  "folders": [
    { "path": ".", "name": "hub" },
    { "path": "../project-a", "name": "project-a" },
    { "path": "../project-b", "name": "project-b" }
  ]
}
EOF

# 4. コミット
git add -A
git commit -m "chore: submoduleからワークスペース構成に移行"
```

### どちらを選ぶべきか

**submoduleが適している場合:**

- 特定のコミットに固定したい（ライブラリのバージョン管理など）
- CI/CDで再現性のあるビルドが必要
- VSCode以外のIDEをメインで使う

**ワークスペースが適している場合:**

- 各プロジェクトは常に最新を参照したい
- jjをメインで使いたい
- VSCodeで開発している
- プロジェクト間の依存関係が緩い

私の場合、個人プロジェクトの統合管理が目的で厳密なバージョン固定は不要だったため、ワークスペース形式に移行しました。

## 参考

- [Jujutsu公式ドキュメント](https://martinvonz.github.io/jj/)
- [Git submodule のしくみ](https://git-scm.com/book/ja/v2/Git-のさまざまなツール-サブモジュール)
- [jj issue #494: Add support for Git submodules](https://github.com/jj-vcs/jj/issues/494)
