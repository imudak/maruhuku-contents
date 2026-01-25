---
title: Jujutsu (jj) でgit submoduleを追加したらgitlinkがコミットされない問題
emoji: 🔗
type: tech
topics:
  - jujutsu
  - git
  - submodule
  - monorepo
published: false
---

## TL;DR（結論）

`git submodule add`で追加したsubmoduleのgitlinkは、jjではなく**gitで直接コミット**する必要があります。

```bash
# submoduleを追加
git submodule add https://github.com/user/repo.git projects/repo

# gitlinkをstage（警告は無視してよい）
git add projects/repo

# gitで直接コミット
git commit -m "chore: repoをsubmoduleとして追加"

# jjにインポートしてpush
jj git import
jj git push
```

jjはgitのstagingを見ないため、`jj commit`ではgitlinkがコミットされません。

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

後日、submodule内で更新を行い、親リポジトリで参照を更新しようとしたところ：

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

```
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

submodule内で更新を行い、親リポジトリの参照を更新する場合も、gitで直接操作します：

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

## まとめ

| 操作 | jjで可能か | 備考 |
|------|-----------|------|
| `git submodule add` | ✗ | gitで実行 |
| gitlinkのコミット | ✗ | gitで直接コミット |
| submodule参照の更新 | ✗ | gitで直接コミット |
| 通常のファイル編集 | ✓ | jjで問題なし |

jjとgitを併用する環境でsubmoduleを扱う場合、**gitlinkに関する操作はgitで直接行う**ことを覚えておきましょう。

jjはgitのstagingを見ないため、staging経由で追加されるgitlinkはjjでは扱えません。これはjjの設計上の制約であり、バグではありません。

## 参考

- [Jujutsu公式ドキュメント](https://martinvonz.github.io/jj/)
- [Git submodule のしくみ](https://git-scm.com/book/ja/v2/Git-のさまざまなツール-サブモジュール)
