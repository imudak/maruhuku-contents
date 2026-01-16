# Jujutsu (jj) Windows環境での便利なTips

## はじめに

Jujutsu（jj）をWindows環境で使う際の便利なTipsをまとめます。日常的な操作をより効率的にするためのコマンドや設定方法を紹介します。

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

**注意**: この設定では以下の警告が表示されますが、ページャーは正常に無効化されます。

```text
Warning: Failed to spawn pager '': program path has no file name
Hint: Consider using the `:builtin` pager.
```

警告を消したい場合は `pager = ":builtin"` を使用できますが、この場合はjj組み込みページャーが有効になります。

#### 一時的に無効化

個別のコマンドでのみ無効化したい場合：

```powershell
jj log --no-pager
```

### Tip 3: PowerShellでの文字化け対策

日本語コミットメッセージが文字化けする場合、UTF-8エンコーディングを設定します。

#### PowerShellプロファイルの編集

プロファイルファイルのパスを確認：

```powershell
$PROFILE
C:\Users\<ユーザー名>\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
```

プロファイルに以下を追加：

```powershell
# UTF-8エンコーディングを設定
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

設定を即座に適用：

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

### Tip 5: `jj commit`と`jj describe`の違い

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

### Tip 6: 不要なchangeを削除する（`jj abandon`）

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

### Tip 7: mainブランチへの反映方法

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

#### 推奨ワークフロー

mainに反映させるには、以下のいずれかを使用：

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

**注意**: `jj commit`を使う場合は、その後の`jj bookmark set main`に`-r '@-'`が必要。

```powershell
# jj commitを使う場合
jj commit -m "feat: 新機能を追加" && jj bookmark set main -r '@-'
```

## まとめ

Jujutsuは強力なバージョン管理ツールですが、Windows環境では特有の問題に遭遇することがあります。この記事で紹介した解決方法とTipsを活用することで、より快適にJujutsuを使用できます。

特に重要なポイント：

1. **PowerShell設定**：UTF-8エンコーディングとページャー無効化を設定
2. **`jj abandon`で不要なchangeを削除**：履歴をクリーンに保つ
3. **改行コード問題**：[JujutsuとGitの改行コード互換性問題と解決方法](jj-git-crlf-compatibility.md)を参照

## 参考リンク

- [Jujutsu公式ドキュメント](https://martinvonz.github.io/jj/)
- [Jujutsu GitHubリポジトリ](https://github.com/martinvonz/jj)
