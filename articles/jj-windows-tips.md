---
title: Jujutsu (jj) Windows環境での便利なTips
emoji: 💡
type: tech
topics:
  - jujutsu
  - vcs
  - git
  - windows
  - powershell
published: true
published_at: 2026-01-15
---

# Jujutsu (jj) Windows環境での便利なTips

## はじめに

Jujutsu（jj）をWindows環境で使う際の便利なTipsをまとめました。日常的な操作をより効率的にするためのコマンドや設定方法です。

## 便利なTips

### Tip 1: 長い履歴を表示する

#### 件数指定で表示

```powershell
# 最新20件を表示
jj log -n 20
jj log --limit 20
```

#### すべての履歴を表示

```powershell
# すべてのコミットを表示
jj log -r 'all()'
```

#### 特定範囲を表示

```powershell
# 現在のコミットから10世代前まで
jj log -r 'ancestors(@, 10)'
```

### Tip 2: ページャーを無効化する

Jujutsuはデフォルトでページャー（less等）を使用しますが、ターミナルで直接スクロールしたい場合は無効化できます。

#### 恒久的に無効化

`~/.jjconfig.toml` を編集（なければ新規作成）します。

```toml
[ui]
pager = ""
```

Windowsの場合、ファイルの場所は `C:\Users\<ユーザー名>\.jjconfig.toml` です。

設定後、すぐに反映されます。

```powershell
jj log -r "all()"
```

この設定では以下の警告が表示されるが、ページャーは正常に無効化される。

```text
Warning: Failed to spawn pager '': program path has no file name
Hint: Consider using the `:builtin` pager.
```

警告を消したい場合は `pager = ":builtin"` を使用できますが、この場合はjj組み込みページャーが有効になります。

#### 一時的に無効化

個別のコマンドでのみ無効化したい場合は以下の通りです。

```powershell
jj log --no-pager
```

### Tip 3: PowerShellでの文字化け対策

日本語コミットメッセージが文字化けする場合、UTF-8エンコーディングを設定します。

#### PowerShellプロファイルの編集

プロファイルファイルのパスを確認します。

```powershell
$PROFILE
C:\Users\<ユーザー名>\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
```

プロファイルに以下を追加します。

```powershell
# UTF-8エンコーディングを設定
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

設定を即座に適用します。

```powershell
. $PROFILE
```

### Tip 4: PowerShellで`@`記号を使う

PowerShellでは`@`が特殊文字として扱われるため、引用符で囲む必要があります。

```powershell
# ❌ エラーになる
jj log -r @-

# ✅ 正しい
jj log -r '@-'
jj log -r "@-"
```

### Tip 5: リポジトリごとにユーザー情報を設定する

Jujutsuでは、グローバル設定とは別に、リポジトリごとに異なるユーザー情報を設定できます。これは個人プロジェクトと業務プロジェクトで異なる名前・メールアドレスを使い分ける場合に便利です。

#### 設定の優先順位

Jujutsuは以下の優先順位で設定を読み込みます。

1. **リポジトリローカル設定**（`.jj/repo/config.toml`）
2. **ユーザー設定**（`~/.jjconfig.toml`）

#### グローバル設定の確認

```powershell
# 現在の設定を確認
jj config list | Select-String "user"
```

#### リポジトリごとの設定

特定のリポジトリでのみ異なるユーザー情報を使う場合は以下の通りです。

```powershell
# このリポジトリだけの設定
jj config set --repo user.name "imudak"
jj config set --repo user.email "imudak@gmail.com"
```

設定ファイルは `.jj/repo/config.toml` に保存されます。

#### 現在のworking copyのauthor情報を更新

リポジトリ設定を変更した後、現在作業中のchangeのauthor情報も更新する場合：

```powershell
jj metaedit --update-author
```

これにより、現在のworking copy（`@`）のauthor情報が新しい設定に更新されます。

#### 設定の確認

```powershell
# リポジトリ固有の設定を確認
jj config list --repo | Select-String "user"

# 実際に使われる設定を確認（統合された結果）
jj config list | Select-String "user"
```

#### 重要な注意点

**Jujutsuの設定とGitの設定は別物です**：

- `git config user.name` → Gitコマンド使用時に適用
- `jj config set user.name` → Jujutsuコマンド使用時に適用

`jj describe`や`jj commit`などでコミットを作成すると、**Jujutsuの設定**が使われます。そのため、GitとJujutsuを併用する場合は両方の設定を揃えておくのがよさそうです。

```powershell
# 両方の設定を確認
git config user.name
git config user.email
jj config list | Select-String "user"
```

#### 使用例

```powershell
# グローバル設定（業務用）
jj config set --user user.name "OKANO Kazumi"
jj config set --user user.email "kazumi.okano@morson.jp"

# 個人プロジェクトのリポジトリで
cd ~/my-personal-project
jj config set --repo user.name "imudak"
jj config set --repo user.email "imudak@gmail.com"

# 現在のchangeのauthorも更新
jj metaedit --update-author
```

### Tip 6: `jj commit`と`jj describe`の違い

#### `jj describe`（`jj desc`）

```powershell
jj describe -m "説明"
# または
jj desc -m "説明"
```

**効果**：

- 現在のchangeに説明を設定するだけ
- **新しいchangeは作成しない**
- そのまま同じchangeで作業を続ける

#### `jj commit`

```powershell
jj commit -m "説明"
```

**効果**：

- 現在のchangeに説明を設定
- **新しい空のchangeを自動作成**
- 次の作業に移る

つまり、`jj commit` = `jj describe` + `jj new` のショートカットです。

#### 使い分け

| ケース | 使うコマンド |
| -------- | ------------- |
| まだ作業を続ける | `jj describe` |
| 作業を完了して次へ | `jj commit` |
| 過去のchangeを編集 | `jj describe @-` |

#### 実例

```powershell
# ❌ 間違い：まだ作業中なのにcommit
jj commit -m "WIP: 作業中"
# → 新しいchangeが作られて、前のchangeに戻るのが面倒

# ✅ 正しい：作業中は describe
jj describe -m "WIP: 作業中"
# → 同じchangeで作業を続けられる

# ✅ 完了したら commit
jj commit -m "feat: 機能完成"
# → 新しいchangeで次の作業へ
```

### Tip 7: 不要なchangeを削除する（`jj abandon`）

古いコミットや不要になったchangeは`jj abandon`で削除できます。

```powershell
# 現在のchangeの履歴を確認
jj log

# 不要なchangeを削除（change IDを指定）
jj abandon xztxukmv

# 複数のchangeを削除
jj abandon xztxukmv pqrstuvw
```

使用例：

- Gitでrebase/reset後に残った古いchangeを削除
- 実験的な変更が不要になった場合
- conflictになっているchangeを削除

注意：`jj abandon`はchangeを削除します。削除後の復元はできません。

### Tip 8: mainブランチへの反映方法

#### ブックマークを使った方法

```powershell
# 1. 現在のchangeをmainに設定
jj bookmark set main

# 2. 新しい作業用changeを作成
jj new
```

**効果**：

- 現在のchangeに`main`ブックマークが設定される
- **mainブランチに変更が即座に反映される**
- 新しい空のchangeで次の作業を開始

#### `jj commit`との違い

```powershell
jj commit -m "説明"
```

**効果**：

- 現在のchangeに説明を設定
- 新しい空のchangeを作成
- **ブックマーク（main）は移動しない** ← ここが重要！

#### ワークフロー例

mainに反映させるには、以下のいずれかを使います。

##### パターン1：先にmainに反映

```powershell
# 1. mainブックマークを現在のchange(@)に移動
jj bookmark set main

# 2. 新しい作業用changeを作成
jj new
# この時点で @ は新しい空のchange、@- がmainを設定したchange

# 3. 後から説明を追加（必要なら）
jj describe '@-' -m "feat: 新機能を追加"
```

##### パターン2：先に説明を付ける

```powershell
# 1. 変更に説明を付けて新しいchangeを作成
jj commit -m "feat: 新機能を追加"
# この時点で @ は新しい空のchange、@- が説明を付けたchange

# 2. mainブックマークを @-（説明を付けたchange）に移動
jj bookmark set main -r '@-'
# ※ jj newは不要（jj commitで既に新しいchangeが作成されている）
```

##### パターン3：全部まとめて（パターン1と同じ）

```powershell
# 説明を付けてmainに反映、新しいchangeを作成
jj describe -m "feat: 新機能を追加" && jj bookmark set main && jj new
```

`jj commit`を使う場合は、その後の`jj bookmark set main`に`-r '@-'`が必要になる。

```powershell
# jj commitを使う場合
jj commit -m "feat: 新機能を追加" && jj bookmark set main -r '@-'
```

### Tip 9: `jj split`のビルトインエディターの使い方

`jj split`でコミットを分割するとき、ターミナル上に謎のエディターが表示されます。これはjjのビルトインdiffエディターです。

#### 基本操作

```text
┌─────────────────────────────────────────────────────────────┐
│ Changed files                                               │
│ ─────────────────────────────────────────────────────────── │
│ [x] articles/jj-git-submodule-gitlink.md                    │
│ [ ] CLAUDE.md                                               │
│                                                             │
│ Instructions:                                               │
│   [Space] Toggle selection                                  │
│   [Enter] Accept                                            │
│   [Esc]   Cancel                                            │
└─────────────────────────────────────────────────────────────┘
```

| キー | 動作 |
|------|------|
| `↑` / `↓` | ファイル間を移動 |
| `Space` | 選択/選択解除をトグル |
| `Enter` | 選択を確定して分割実行 |
| `Esc` | キャンセルして中断 |

#### splitの実行例

1つのコミットに複数ファイルの変更が含まれていて、分割したい場合：

```powershell
# 対象のコミットを分割
jj split -r <change-id>

# または特定ファイルだけを選択して分割
jj split -r <change-id> path/to/file.md
```

ファイルパスを指定すると、そのファイルの変更だけが最初のコミットに含まれ、残りは2つ目のコミットになります。エディターを使わずに済むので便利です。

#### 分割後の操作

分割後は2つのコミットが作成され、それぞれに同じメッセージが付きます。必要に応じてメッセージを修正します。

```powershell
# 分割後の状態を確認
jj log --limit 5

# 最初のコミットのメッセージを修正
jj desc -r <1つ目のchange-id> -m "docs: 記事を更新"

# 2つ目のコミットのメッセージを修正
jj desc -r <2つ目のchange-id> -m "chore: CLAUDE.mdを追加"
```

## まとめ

JujutsuをWindows環境で使う際に遭遇した問題と、その解決方法をまとめました。

特に重要なポイントは以下の通りです。

1. **PowerShell設定**：UTF-8エンコーディングとページャー無効化を設定
2. **`jj abandon`で不要なchangeを削除**：履歴をクリーンに保つ
3. **改行コード問題**：[JujutsuとGitの改行コード互換性問題と解決方法](jj-git-crlf-compatibility)を参照

## 参考リンク

- [Jujutsu公式ドキュメント](https://martinvonz.github.io/jj/)
- [Jujutsu GitHubリポジトリ](https://github.com/martinvonz/jj)
