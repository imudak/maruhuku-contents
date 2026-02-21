---
title: "OpenClawのアップデートで応答不能に！復旧手順と対策まとめ"
emoji: "🔧"
type: tech
topics:
  - openclaw
  - npm
  - トラブルシューティング
  - wsl
  - nodejs
published: true
---

## はじめに

OpenClawをDiscordから「自分自身をアップデートして」と依頼したら、応答がなくなりました。`openclaw --version`も失敗する状態です。

この記事では、アップデート失敗でOpenClawが壊れたときの復旧手順と、同じトラブルを防ぐための対策をまとめます。

## 環境

- OS: Windows 11 Pro + WSL2 (Ubuntu)
- Node.js: v24.13.0（nvm経由）
- OpenClaw: 2026.2.2-3（アップデート後）

## 何が起きたか

Discordから「特に作業していなければあなた自身をupdateしてください」とOpenClawに依頼しました。

OpenClawは以下の手順でアップデートを試みました。

```bash
openclaw update
```

結果、`ENOTEMPTY`エラーが発生しました。

```
npm error code ENOTEMPTY
npm error syscall rename
npm error path /home/imudak/.nvm/versions/node/v24.13.0/lib/node_modules/openclaw
npm error dest /home/imudak/.nvm/versions/node/v24.13.0/lib/node_modules/.openclaw-2PbyTivh
npm error errno -39
```

npmキャッシュクリアなども試みましたが、すべて失敗。この時点でOpenClawは応答不能になりました。

## 症状

- Discordからのメッセージに応答しない
- `openclaw --version`が`command not found`
- `npm list -g`でopenclawのバージョンが空欄

## 原因

アップデート処理が途中で中断され、パッケージが壊れた状態になっていました。

具体的には、シンボリックリンク（`bin/openclaw`）は存在するものの、参照先の`openclaw.mjs`が存在しない状態でした。

```
~/.nvm/versions/node/v24.13.0/
├── bin/openclaw -> ../lib/node_modules/openclaw/openclaw.mjs  # リンクは存在
└── lib/node_modules/openclaw/
    └── extensions/  # フォルダのみ
    └── openclaw.mjs # 存在しない！
```

## 復旧手順

### 1. 状況確認

まず、アップデート中のプロセスがないか確認します。

```bash
ps aux | grep -iE "(npm|yarn|pnpm)"
```

パッケージの状態も確認します。

```bash
npm list -g --depth=0
ls -la ~/.nvm/versions/node/v24.13.0/lib/node_modules/openclaw/
```

### 2. 設定ファイルの場所を確認

`~/.openclaw/`に設定が保存されています。npmパッケージとは別の場所なので、再インストールしても設定は消えません。

| パス | 内容 |
|------|------|
| `openclaw.json` | メイン設定 |
| `credentials/` | 認証情報 |
| `agents/` | エージェント設定 |
| `workspace/` | ワークスペース |

### 3. 壊れたパッケージを手動削除

通常の`npm uninstall -g openclaw`は`ENOTEMPTY`で失敗するため、手動で削除します。

```bash
rm -rf ~/.nvm/versions/node/v24.13.0/lib/node_modules/openclaw
rm -f ~/.nvm/versions/node/v24.13.0/bin/openclaw
```

### 4. 再インストール

```bash
npm install -g openclaw
```

### 5. gatewayを再起動

OpenClawはsystemdユーザーサービスとしてgatewayを実行しています。CLIを更新しただけだとgatewayが古いままなので、再起動が必要です。

```bash
systemctl --user restart openclaw-gateway
```

### 6. 動作確認

```bash
openclaw --version
openclaw health
```

正常に動作すれば復旧完了です。

## 今後の対策

### 1. アップデート前にgatewayを停止する

```bash
systemctl --user stop openclaw-gateway
openclaw update
systemctl --user start openclaw-gateway
```

gatewayがopenclawのファイルを使用中だと、`ENOTEMPTY`エラーの原因になる可能性があります。

### 2. ENOTEMPTYエラーが出たら即座に手動対応

中途半端な状態を放置せず、すぐに手動削除してクリーンインストールします。

```bash
rm -rf ~/.nvm/versions/node/v24.13.0/lib/node_modules/openclaw
rm -f ~/.nvm/versions/node/v24.13.0/bin/openclaw
npm install -g openclaw
systemctl --user restart openclaw-gateway
```

### 3. アップデートは人間が監視できる状態で実行

Discordからエージェントにアップデートを依頼するのは危険です。失敗時に復旧できる人がいる状態で実行しましょう。

## まとめ

OpenClawのアップデートが`ENOTEMPTY`で失敗した場合は、以下の手順で復旧できます。

1. 壊れたパッケージを`rm -rf`で手動削除
2. `npm install -g openclaw`で再インストール
3. `systemctl --user restart openclaw-gateway`でgateway再起動

設定は`~/.openclaw/`に保存されているので、再インストールしても消えません。

アップデートはgatewayを停止してから行うと安全です。

## おまけ：WSL起動時のchdirエラー

WSL起動時に以下のエラーが表示される場合の対処法です。

```
PS C:\Users\username> wsl
<3>WSL (43429 - Relay) ERROR: CreateProcessCommon:792: chdir(/mnt/c/Users/username) failed 5
```

WSLがWindowsのカレントディレクトリ（`/mnt/c/Users/username`）にアクセスできなかったというエラーです。エラーコード5は「アクセス拒否」を意味します。

### 対処法

**1. WSLを再起動する**

```powershell
wsl --shutdown
wsl
```

多くの場合、これで解決します。

**2. 起動時にホームディレクトリへ移動する**

PowerShellから起動する際、ホームディレクトリを指定します。

```powershell
wsl ~
```

**3. .bashrcで回避する**

`~/.bashrc`の先頭に以下を追加すると、エラー時でも自動的にホームへ移動します。

```bash
cd ~ 2>/dev/null
```

### 補足

このエラーが出ても、WSL自体は起動しています（プロンプトが表示される）。Windowsのディレクトリにアクセスできなかっただけなので、動作に大きな影響はありません。

## 関連記事

https://zenn.dev/imudak/articles/openclaw-pairing-scope-investigation

https://zenn.dev/imudak/articles/openclaw-security-hardening-2026
