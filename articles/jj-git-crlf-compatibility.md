---
title: JujutsuとGitの改行コード管理でうまくいった設定
emoji: 🔄
type: tech
topics:
  - jujutsu
  - git
  - vcs
  - windows
  - gitattributes
published: true
published_at: 2026-01-20
---

## TL;DR（結論）

うまくいった設定は以下の通りです。

```powershell
# Git設定
git config --global core.autocrlf false
git config --global core.safecrlf true

# jj設定（デフォルトのまま）
# working-copy.eol-conversion = none

# .gitattributes で制御
* text=auto
*.md text eol=lf
*.sh text eol=lf
*.bat text eol=crlf
```

`core.autocrlf`に頼らず、`.gitattributes`でリポジトリレベル制御が現代の主流です。

## 問題の背景

### 従来のアプローチ（非推奨）

Windows環境でGitを使う際、`core.autocrlf=true`を設定することが推奨されてきました。

```powershell
# 古い方法（現在は非推奨）
git config --global core.autocrlf true
```

しかし、この設定には以下の問題があります。

1. Jujutsuとの非互換性：jjは`core.autocrlf`を認識せず、差分が発生
2. 予測不可能な動作：意図しない変換が発生する可能性
3. チーム間の不整合：個人設定に依存するため統一が困難

### Jujutsuの改行コード処理

Jujutsu（v0.32.0以降）には`working-copy.eol-conversion`設定があります。

- デフォルト値は`none`（変換なし）
- `.gitattributes`非対応（現在v0.37.0は未実装、[Issue #53](https://github.com/jj-vcs/jj/issues/53)）
- Git設定も無視（`core.autocrlf`を読み取らない）

つまり、jjは`.gitattributes`もGit設定も認識しないため、独自の設定が必要です。

## うまくいった設定

### 基本方針

1. **`.gitattributes`でリポジトリレベル制御**（最優先）
2. **`core.autocrlf=false`で個人設定を無効化**
3. **jjはデフォルト値（`none`）のまま**

### 設定手順

#### 1. Git設定を変更

```powershell
# グローバル設定（全プロジェクト共通）
git config --global core.autocrlf false
git config --global core.safecrlf true  # 安全性チェック有効化
```

理由は以下の通りです。

- `autocrlf=false`で`.gitattributes`による制御を優先
- `safecrlf=true`で意図しない改行コード変換を検出

#### 2. `.gitattributes`を作成

プロジェクトルートに`.gitattributes`を配置：

```gitattributes
# デフォルト：自動判定
* text=auto

# Windowsバッチファイルは必ずCRLF
*.bat text eol=crlf
*.cmd text eol=crlf

# Unix系スクリプトは必ずLF
*.sh text eol=lf

# ソースコード・ドキュメントはLF統一
*.dart text eol=lf
*.md text eol=lf
*.json text eol=lf
*.yaml text eol=lf

# バイナリファイル
*.png binary
*.jpg binary
```

#### 3. 既存ファイルを正規化

```powershell
# インデックスをクリア
git rm --cached -r .

# HEADから再チェックアウト（.gitattributesが適用される）
git reset --hard HEAD
```

#### 4. jj設定（オプション）

基本的に設定不要ですが、明示的に指定する場合：

```powershell
# デフォルト値を明示
jj config set --user working-copy.eol-conversion none
```

`input-output`は設定しないでください（`.gitattributes`と競合する可能性があります）。

#### 5. 動作確認

```powershell
# Gitで差分なし
git status
# → "nothing to commit, working tree clean"

# jjでも差分なし
jj status
# → "The working copy has no changes."

# ファイルの改行コード確認
git ls-files --eol '*.md' | head -5
# → "i/lf    w/lf    attr/text eol=lf"
```

## 設定比較表

| 設定方法                                 | リポジトリ | ワークツリー | Git/jj互換 | チーム統一 |
| ---------------------------------------- | ---------- | ------------ | ---------- | ---------- |
| `autocrlf=true`                          | LF         | CRLF         | ✗          | ✗          |
| `autocrlf=input`                         | LF         | 可変         | △          | △          |
| `autocrlf=false` + `.gitattributes`      | LF         | LF           | ✓          | ✓          |

## なぜ`.gitattributes`が最適なのか

### 1. リポジトリレベル制御

個人設定（`core.autocrlf`）に依存せず、チーム全体で統一された動作を保証。

### 2. ファイルタイプ別の柔軟な制御

```gitattributes
# 用途に応じた細かい制御が可能
*.sh text eol=lf      # Unixスクリプト
*.bat text eol=crlf   # Windowsバッチ
*.md text eol=lf      # Markdown
*.c text eol=lf       # C言語
```

### 3. モダンなエディタ完全対応

VSCode、Vim、Emacsなど主要エディタはすべてLFをネイティブサポート。

### 4. 予測可能な動作

`.gitattributes`は明示的で透明性が高く、意図しない変換が発生しない。

## トラブルシューティング

### Q1. 既存のCRLFファイルが残っている

**症状**:

```powershell
git ls-files --eol file.md
# → "i/lf    w/crlf  attr/text eol=lf"
```

**解決**:

```powershell
# ファイルを再チェックアウト
git ls-files '*.md' | xargs git rm --cached
git checkout HEAD -- .
```

### Q2. jjで差分が出続ける

**症状**:

```powershell
jj status
# → "M file1.md"（Gitでは差分なし）
```

**原因**: jjの`eol-conversion`設定が`input-output`になっている可能性。

**解決**:

```powershell
# デフォルトに戻す
jj config set --user working-copy.eol-conversion none

# 新しい作業コピーを作成
jj new @
```

### Q3. `safecrlf`警告が出る

**症状**:

```text
fatal: LF would be replaced by CRLF in file.txt
```

**原因**: ワークツリーとリポジトリの改行コードが不一致。

**解決**:

```powershell
# ファイルを正規化
git add --renormalize .
git commit -m "chore: normalize line endings"
```

## 参考資料

### 公式ドキュメント

- [GitHub: Configuring Git to handle line endings](https://docs.github.com/en/get-started/getting-started-with-git/configuring-git-to-handle-line-endings)
- [Jujutsu: Working on Windows](https://docs.jj-vcs.dev/latest/windows/)
- [Jujutsu Issue #53: Add support for .gitattributes](https://github.com/jj-vcs/jj/issues/53)

### 参考記事

- [Git, Still Using autocrlf in 2025? That's Frustrating](https://blog.popekim.com/en/2025/08/28/stop-using-autocrlf.html)
- [CRLF vs. LF: Normalizing Line Endings in Git](https://www.aleksandrhovhannisyan.com/blog/crlf-vs-lf-normalizing-line-endings-in-git/)

## まとめ

`core.autocrlf`を使わず、以下の設定でうまくいきました。

- `.gitattributes`でリポジトリレベル制御
- `core.autocrlf=false`で個人設定を無効化
- `core.safecrlf=true`で安全性チェック
- jjはデフォルト設定（`none`）のまま

この設定により、Git/jj両方でクリーンな状態を維持し、チーム全体で統一された改行コード管理が可能になります。

モダンなエディタはLFをネイティブサポートしているため、Windows環境でも問題なく開発できます。

**もう`autocrlf`で悩む必要はありません。**
