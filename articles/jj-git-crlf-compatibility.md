---
title: JujutsuとGitの改行コード互換性問題と解決方法
emoji: 🔄
type: tech
topics:
  - jujutsu
  - git
  - vcs
  - windows
  - crlf
published: true
---

# JujutsuとGitの改行コード互換性問題と解決方法

## 問題の概要

Windows環境でJujutsu（jj）とGitを併用する際、改行コード（CRLF/LF）の扱いの違いにより、Gitでは差分が検出されないのにjjでは差分が検出される問題が発生します。

## 問題の詳細

### 症状

```powershell
# Gitでは差分なし
PS> git status
nothing to commit, working tree clean

# jjでは大量の差分が検出される
PS> jj status
Working copy changes:
M file1.dart
M file2.md
M file3.yaml
...（多数のファイル）
```

### 原因

Gitのグローバル設定で`core.autocrlf=true`が設定されている場合、Gitは以下の動作をします：

- **チェックアウト時**：LF → CRLF に変換（Windowsエディタ用）
- **コミット時**：CRLF → LF に変換（リポジトリ保存用）

しかし、Jujutsuはこの変換メカニズムを完全にサポートしていないため、ワークツリーのCRLFとリポジトリのLFの差を実際の変更として検出してしまいます。

## 解決方法

### 推奨設定：`core.autocrlf=input`

プロジェクトのローカル設定として`core.autocrlf=input`を使用します：

```powershell
git config --local core.autocrlf input
```

この設定により：

| 動作 | `false` | `input` | `true` |
|------|---------|---------|--------|
| ワークツリー | LF | CRLF可 | CRLF |
| リポジトリ | LF | LF | LF |
| コミット時変換 | なし | CRLF→LF | CRLF→LF |
| チェックアウト時変換 | なし | なし | LF→CRLF |
| jj互換性 | ✓ | ✓ | ✗ |
| Windowsエディタ | △ | ✓ | ✓ |

### 設定手順

#### 1. ローカル設定を変更

```powershell
# プロジェクトディレクトリで実行
git config --local core.autocrlf input
```

**注意**：`--local`を使用することで、グローバル設定には影響しません。

#### 2. 既存ファイルを正規化

```powershell
# すべてのファイルをインデックスから削除（実ファイルは削除されない）
git rm --cached -r .

# HEADの状態で再チェックアウト（LFで取得）
git reset --hard HEAD
```

#### 3. jjの作業ディレクトリを更新

```powershell
# 現在のGit HEADをベースに新しいjj作業ディレクトリを作成
jj new <commit-hash>
```

#### 4. 動作確認

```powershell
# git reset後もjjで差分が出ないことを確認
git reset --hard HEAD
jj status
# → "The working copy has no changes." と表示されればOK
```

## 設定による挙動の違い

### `core.autocrlf=false`

- ワークツリーもリポジトリもLF
- 改行コード変換が一切行われない
- Windowsエディタが勝手にCRLFで保存すると差分になる
- jjとの互換性は良好

### `core.autocrlf=input`（推奨）

- ワークツリーはCRLFでもOK（エディタが自由に保存可能）
- リポジトリは常にLF
- コミット時のみCRLF→LFに変換
- jjとの互換性も良好
- **Windows環境で最適**

### `core.autocrlf=true`（非推奨 for jj）

- ワークツリーは常にCRLF
- リポジトリは常にLF
- チェックアウトとコミット両方で変換
- jjがこの変換を認識できず差分が出る

## よくある質問

### Q1. グローバル設定は変更したくない

A. `--local`オプションを使用すれば、そのプロジェクトのみで設定が有効になります：

```powershell
git config --local core.autocrlf input
```

### Q2. 既存のコミットの改行コードを一括変換したい

A. `.gitattributes`を使用して正規化できますが、jjとの互換性を考えると`core.autocrlf=input`の方がシンプルです：

```gitattributes
# .gitattributes（必要な場合のみ）
* text=auto eol=lf
```

### Q3. 他の開発者への影響は？

A. ローカル設定なので、他の開発者には影響しません。チーム全体で統一したい場合は：

1. プロジェクトのREADMEに設定方法を記載
2. または`.gitattributes`でプロジェクト全体の改行コードを統一

### Q4. シェルスクリプトやバッチファイルは？

A. 特定のファイルタイプのみ改行コードを固定したい場合は`.gitattributes`を併用：

```gitattributes
# Windowsバッチファイルは必ずCRLF
*.bat text eol=crlf
*.cmd text eol=crlf

# シェルスクリプトは必ずLF
*.sh text eol=lf
```

## まとめ

- **問題**：GitのCRLF自動変換をjjが認識せず、不要な差分が検出される
- **原因**：`core.autocrlf=true`による双方向変換
- **解決**：`git config --local core.autocrlf input`に設定
- **効果**：手元はCRLF可、リポジトリはLF、Git/jj両方で整合性維持

この設定により、Windows環境でのJujutsuとGitの共存がスムーズになります。
