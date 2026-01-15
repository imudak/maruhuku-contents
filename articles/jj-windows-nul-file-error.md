---
title: Jujutsu (jj) Windows予約デバイス名エラーの解決方法
emoji: ⚠️
type: tech
topics:
  - jujutsu
  - git
  - windows
  - troubleshooting
published: false
---

# Jujutsu (jj) Windows予約デバイス名エラーの解決方法

## 問題の概要

Windowsでは`nul`、`con`、`prn`、`aux`などはデバイス名として予約されており、これらの名前のファイルがリポジトリに含まれるとJujutsu（jj）やGitが正常に動作しなくなります。

## エラー内容

```powershell
PS> jj status
Error: Failed to reset Git HEAD state
Caused by:
1: Could not create index from tree at 3cb8fa35f0e166ce4f8ef4fe438be082e5d662d5
2: The path "nul" is invalid
3: Windows device-names may have side-effects and are not allowed
```

## 原因

Windowsシステムで予約されているデバイス名：

- `nul` - ヌルデバイス（Unix/Linuxの`/dev/null`相当）
- `con` - コンソール
- `prn` - プリンター
- `aux` - 補助デバイス
- `com1` ～ `com9` - シリアルポート
- `lpt1` ～ `lpt9` - パラレルポート

これらの名前がファイル名として使用されると、Windowsファイルシステムがデバイスとして解釈しようとするため、Gitのインデックス操作が失敗します。

## 解決手順

### Step 1: Jujutsuを一時退避

```powershell
Rename-Item -Path .jj -NewName .jj.bak
```

Jujutsuのメタデータを一時的にバックアップします。これにより、Gitで修正作業を行えるようになります。

### Step 2: 問題のファイルを確認

```powershell
# 最近のコミット履歴を確認
git log --oneline -n 10

# HEADツリー内でnulファイルを検索
git ls-tree HEAD | Select-String nul
```

問題のファイルがいつ、どのコミットで追加されたかを確認します。

### Step 3: Gitインデックスを削除

```powershell
Remove-Item -Path .git/index -Force
```

破損したGitインデックスを削除します。次の`git add`で新しいインデックスが作成されます。

### Step 4: 新しいブランチで修正

```powershell
# 新しいブランチを作成
git checkout -b fix-nul-file

# 現在のワーキングディレクトリの内容を追加（nulを除く）
git add .

# コミット
git commit -m "fix: nulファイルを削除（Windowsデバイス名との衝突を解消）"
```

問題のファイルを除外した状態で新しいコミットを作成します。

### Step 5: mainブランチを更新

```powershell
# mainブランチを新しいコミットに移動
git branch -f main fix-nul-file

# HEADを切り替え
git symbolic-ref HEAD refs/heads/main
git reset --hard HEAD
```

mainブランチを修正後のコミットに強制的に移動します。

### Step 6: Jujutsuを再初期化

```powershell
# 古いバックアップを削除
Remove-Item -Path .jj.bak -Recurse -Force

# Jujutsuを再初期化
jj git init --colocate

# リモートブランチのトラッキング設定
jj bookmark track main --remote=origin
```

Jujutsuを再初期化し、リポジトリの管理を再開します。

### Step 7: 動作確認

```powershell
jj status
```

エラーが解消され、正常に動作することを確認します。

## 予防策

### 1. `.gitignore`で予約デバイス名を除外

プロジェクトルートの`.gitignore`に以下を追加：

```gitignore
# Windows予約デバイス名
nul
con
prn
aux
com[1-9]
lpt[1-9]
```

### 2. Gitフックでチェック

`.git/hooks/pre-commit`を作成して、コミット前に予約デバイス名をチェック：

```bash
#!/bin/sh
# Windows予約デバイス名のチェック
reserved_names="nul con prn aux com1 com2 com3 com4 com5 com6 com7 com8 com9 lpt1 lpt2 lpt3 lpt4 lpt5 lpt6 lpt7 lpt8 lpt9"

for name in $reserved_names; do
    if git diff --cached --name-only | grep -qi "^${name}$\|/${name}$"; then
        echo "エラー: Windows予約デバイス名 '${name}' を含むファイルはコミットできません"
        exit 1
    fi
done
```

### 3. CIでの検証

GitHub Actionsなどで、リポジトリに予約デバイス名のファイルが含まれていないかチェック：

```yaml
- name: Check for Windows reserved names
  run: |
    git ls-files | grep -Ei '^(nul|con|prn|aux|com[1-9]|lpt[1-9])$' && exit 1 || exit 0
```

## トラブルシューティング

### Q: リモートリポジトリにすでにpushされている場合は？

A: `git push --force`でリモートも更新する必要があります：

```powershell
git push --force origin main
```

**注意**: 他の開発者との共同作業の場合は、事前に連絡してください。

### Q: 特定のコミットだけを修正したい場合は？

A: `git filter-branch`や`git filter-repo`を使って履歴を書き換えます：

```powershell
# git filter-repoを使った例（推奨）
git filter-repo --path nul --invert-paths
```

### Q: Linuxでは問題なかったのに、なぜWindowsでエラーになる？

A: Linux/macOSではこれらは通常のファイル名として扱えますが、Windowsではシステムレベルで予約されています。クロスプラットフォーム開発では、これらの名前を避けることが重要です。

## まとめ

- Windows予約デバイス名（`nul`、`con`等）はファイル名として使用できない
- リポジトリに含まれると、Jujutsu/Gitの動作に重大な問題が発生
- `.gitignore`やGitフックで事前にチェックすることで予防可能
- 発生時は、Gitインデックスの再構築とJujutsuの再初期化で解決

クロスプラットフォーム開発では、これらの予約デバイス名を避けることが重要です。
