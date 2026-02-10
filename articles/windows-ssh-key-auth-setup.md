---
title: "WindowsからSSH公開鍵認証でパスワードなしログインする設定手順"
emoji: "🔑"
type: "tech"
topics:
  - ssh
  - windows
  - linux
published: true
---

## やりたいこと

WindowsからLinuxサーバーにSSH接続するとき、毎回パスワードを入力していました。公開鍵認証でパスワードなしログインできるように設定したので、手順をまとめます。

## 前提

- Windows 10/11（OpenSSHクライアントがインストール済み）
- 接続先のLinuxサーバー（Ubuntu）
- SSH鍵ペアは作成済み

```powershell
# 鍵の確認
ls ~/.ssh/id_rsa*
```

鍵がない場合は `ssh-keygen -t rsa -b 4096` で作成します。

## 手順

### 1. 公開鍵をサーバーに登録

公開鍵をサーバーの `~/.ssh/authorized_keys` に追加します。

```powershell
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh ユーザー名@サーバーIP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
```

このコマンドはパスワードを聞かれますが、これが最後のパスワード入力になります。

### 2. SSH configを設定

毎回IPアドレスやユーザー名を入力せずに済むよう、`~/.ssh/config` にホスト設定を追加します。

```powershell
notepad $env:USERPROFILE\.ssh\config
```

以下のような設定を追加します。

```text
Host myserver
  HostName 192.168.1.100
  User myuser
  IdentityFile ~/.ssh/id_rsa
```

これで `ssh myserver` だけで接続できるようになります。

### 3. 接続テスト

```powershell
ssh myserver
```

公開鍵認証が成功すれば、パスワードは聞かれません。

## パスフレーズ付き鍵の場合

秘密鍵にパスフレーズを設定している場合、接続時にパスフレーズの入力を求められます。

```text
Enter passphrase for key 'C:\Users\username/.ssh/id_rsa':
```

毎回入力するのが面倒な場合は、ssh-agentを使います。

### ssh-agentの設定

PowerShellを**管理者権限**で開いて、ssh-agentサービスを有効化します。

```powershell
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent
```

通常のPowerShellで鍵を登録します（パスフレーズは一度だけ入力）。

```powershell
ssh-add $env:USERPROFILE\.ssh\id_rsa
```

これでWindows再起動までパスフレーズなしで接続できます。

## トラブルシューティング

### パスワードを聞かれる場合

公開鍵認証が効いていません。サーバー側で以下を確認します。

```bash
# 公開鍵が登録されているか
cat ~/.ssh/authorized_keys

# パーミッションの確認
ls -la ~/.ssh/
# .ssh ディレクトリ: drwx------ (700)
# authorized_keys: -rw------- (600)
```

パーミッションが違う場合は修正します。

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### デバッグ方法

接続時に `-v` オプションを付けると詳細なログが出ます。

```powershell
ssh -v myserver
```

`Offering public key` や `Server accepts key` といったメッセージが出ていれば、公開鍵認証が試行されています。

## まとめ

1. 公開鍵をサーバーの `authorized_keys` に登録
2. SSH configでホスト設定を追加
3. パスフレーズ付き鍵はssh-agentで管理

一度設定すれば、以降は `ssh myserver` だけで接続できるようになります。
