---
title: Jujutsu (jj) Windows環境でのトラブルシューティングとTips
emoji: 🔧
type: tech
topics:
  - jujutsu
  - vcs
  - git
  - windows
  - powershell
published: false
---

# Jujutsu (jj) Windows環境でのトラブルシューティングとTips

## はじめに

Jujutsu（jj）は次世代のバージョン管理システムですが、Windows環境特有の問題に遭遇することがあります。この記事では、実際に遭遇したトラブルとその解決方法、そして日常的に便利なTipsをまとめます。

## トラブルシューティング

### 問題1: `nul`ファイルによるエラー

#### エラー内容

```powershell
PS> jj status
Error: Failed to reset Git HEAD state
Caused by:
1: Could not create index from tree at 3cb8fa35f0e166ce4f8ef4fe438be082e5d662d5
2: The path "nul" is invalid
3: Windows device-names may have side-effects and are not allowed
```

#### 原因

Windowsでは`nul`、`con`、`prn`、`aux`などはデバイス名として予約されており、ファイル名として使用できません。誤ってこれらの名前のファイルがリポジトリに含まれると、Gitが正常に動作しなくなります。

#### 解決方法

##### Step 1: Jujutsuを一時退避

```powershell
Rename-Item -Path .jj -NewName .jj.bak
```

##### Step 2: 問題のファイルを確認

```powershell
git log --oneline -n 10
git ls-tree HEAD | Select-String nul
```

##### Step 3: Gitインデックスを削除

```powershell
Remove-Item -Path .git/index -Force
```

##### Step 4: 新しいブランチで修正

```powershell
# 新しいブランチを作成
git checkout -b fix-nul-file

# 現在のワーキングディレクトリの内容を追加（nulを除く）
git add .

# コミット
git commit -m "fix: nulファイルを削除（Windowsデバイス名との衝突を解消）"
```

##### Step 5: mainブランチを更新

```powershell
# mainブランチを新しいコミットに移動
git branch -f main fix-nul-file

# HEADを切り替え
git symbolic-ref HEAD refs/heads/main
git reset --hard HEAD
```

##### Step 6: Jujutsuを再初期化

```powershell
# 古いバックアップを削除
Remove-Item -Path .jj.bak -Recurse -Force

# Jujutsuを再初期化
jj git init --colocate

# リモートブランチのトラッキング設定
jj bookmark track main --remote=origin
```

##### Step 7: 動作確認

```powershell
jj status
```

### 問題2: Git rebase後のconflict

Gitでrebaseを実行した後、Jujutsuで古いコミットがconflict状態になることがあります。

#### 解決方法

不要なコミットを`jj abandon`で削除します：

```powershell
# conflictになっているコミットIDを確認
jj log

# 不要なコミットを削除
jj abandon xztxukmv
```

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

#### 一時的に無効化

```powershell
jj log --no-pager
```

#### 恒久的に無効化

PowerShellプロファイルに以下を追加：

```powershell
# Jujutsuのページャーを無効化
$env:JJ_PAGER = ""
```

### Tip 3: PowerShellでの文字化け対策

日本語コミットメッセージが文字化けする場合、UTF-8エンコーディングを設定します。

#### PowerShellプロファイルの編集

プロファイルファイルのパスを確認：

```powershell
$PROFILE
```

プロファイルに以下を追加：

```powershell
# UTF-8エンコーディングを設定
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Jujutsuのページャーを無効化
$env:JJ_PAGER = ""
```

設定を即座に適用：

```powershell
. $PROFILE
```

### Tip 4: PowerShellで`@`記号を使う

PowerShellでは`@`が特殊文字として扱われるため、引用符で囲む必要があります：

```powershell
# ❌ エラーになる
jj log -r @-

# ✅ 正しい
jj log -r '@-'
jj log -r "@"
```

## .gitattributesで改行コードを管理

Windows環境では改行コードの扱いが問題になることがあります。プロジェクトルートに`.gitattributes`ファイルを作成して、改行コードを明示的に管理しましょう：

```gitattributes
# デフォルト動作: チェックアウト時にCRLFに変換
* text=auto

# テキストファイルは常にLFで保存
*.md text eol=lf
*.yaml text eol=lf
*.yml text eol=lf
*.json text eol=lf

# Dartファイル
*.dart text eol=lf

# シェルスクリプト（LF必須）
*.sh text eol=lf

# バッチファイル（CRLF必須）
*.bat text eol=crlf
*.cmd text eol=crlf

# バイナリファイル
*.png binary
*.jpg binary
*.ico binary
*.ttf binary
*.woff binary
*.woff2 binary
```

## まとめ

Jujutsuは強力なバージョン管理ツールですが、Windows環境では特有の問題に遭遇することがあります。この記事で紹介した解決方法とTipsを活用することで、より快適にJujutsuを使用できます。

特に重要なポイント：

1. **Windows予約デバイス名に注意**：`nul`、`con`、`prn`などをファイル名に使わない
2. **PowerShell設定**：UTF-8エンコーディングとページャー無効化を設定
3. **不要なコミットは`jj abandon`で削除**：conflictを避ける
4. **`.gitattributes`で改行コードを管理**：一貫性を保つ

## 参考リンク

- [Jujutsu公式ドキュメント](https://martinvonz.github.io/jj/)
- [Jujutsu GitHubリポジトリ](https://github.com/martinvonz/jj)
