---
title: 複数GitHubアカウント環境でのjj git push認証エラー解決法
emoji: 🔑
type: tech
topics:
  - jujutsu
  - git
  - github
  - troubleshooting
  - windows
published: true
---

## 問題の発生

`jj git push` を実行したところ、以下のエラーが発生しました。

```
Changes to push to origin:
  Move forward bookmark main from 2f33a734d41a to 225c246f4d08
remote: Repository not found.
Error: Git process failed: External git program failed:
fatal: repository 'https://github.com/personal-account/my-project.git/' not found
```

以前は正常に動作していましたが、同じPC上で別のプロジェクトを別のGitHubアカウントで操作した後に発生しました。

## 原因の特定

リモートURL自体は正しく設定されていることを確認しました。

```bash
jj git remote list
# 出力: origin https://github.com/personal-account/my-project.git
```

問題の原因は、Windows Git Credential Managerに保存された認証情報にありました。現在保存されているGitHubアカウントを確認してみます。

```bash
git credential-manager github list
# 出力: work-account
```

別のアカウント（`work-account`）の認証情報が優先されているため、`personal-account`のリポジトリにアクセスできない状態でした。

## 解決手順

### 1. 不要なアカウントの認証情報を削除（オプション）

```bash
git credential-manager github logout work-account
```

### 2. 正しいアカウントの認証情報を追加

Personal Access Token (PAT) を使用して、Git Credential Managerに認証情報を保存します。

```bash
echo "protocol=https
host=github.com
username=personal-account
password=YOUR_PERSONAL_ACCESS_TOKEN" | git credential-manager store
```

`YOUR_PERSONAL_ACCESS_TOKEN` の部分には、GitHubで生成したPATを使用します。

### 3. 登録されたアカウントを確認

```bash
git credential-manager github list
# 出力:
# work-account
# personal-account
```

両方のアカウントが登録されていることを確認できました。

### 4. プッシュを実行

```bash
jj git push
# 出力: Warning: No bookmarks found in the default push revset...
# Nothing changed.
```

成功です。「Nothing changed」は既に変更が同期済みだったためです。

## 動作の仕組み

Git Credential Managerは、複数のGitHubアカウントを同時に管理できます。リポジトリのオーナー（URL内のアカウント名）に基づいて、対応するアカウントの認証情報を自動的に選択します。

今回のケースでは次のようになります。

- `https://github.com/personal-account/my-project.git` → `personal-account`アカウントを使用
- `https://github.com/work-account/other-repo.git` → `work-account`アカウントを使用

## 回避すべき方法

### PATをリモートURLに埋め込む（非推奨）

以下の方法は動作しますが、セキュリティ上推奨されません。

```bash
jj git remote set-url origin https://TOKEN@github.com/your-account/your-repo.git
```

推奨されない理由は以下の通りです。

- `jj git remote list` で誰でもトークンが見える
- トークンが履歴に残る可能性がある
- リポジトリ設定ファイルに平文で保存される

## まとめ

複数のGitHubアカウントを使用する場合は、Git Credential Managerに各アカウントの認証情報を登録します。Personal Access Tokenを使用することで、安全に認証情報を管理できます。

## 関連情報

- [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager)
- GitHub Personal Access Token生成: Settings → Developer settings → Personal access tokens
- [Jujutsu (jj) VCS](https://github.com/martinvonz/jj)
