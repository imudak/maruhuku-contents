---
title: "ミニPCのWSL2でOpenClawを動かしてDiscordから使う"
emoji: "🤖"
type: tech
topics:
  - openclaw
  - discord
  - wsl
  - ai
  - claudecode
published: true
---

## はじめに

自宅のミニPCをAIアシスタントサーバーにしたいと思いました。OpenClawを使えば、Discordから話しかけるだけでAIと対話できます。

Discordを選んだ理由は、メッセージ履歴が無制限で残ること、Bot設定がシンプルなことです。

## 環境

- ミニPC: NiPoGi Ryzen 3 4300U / 16GB RAM
- OS: Windows 11 Pro + WSL2 (Ubuntu)
- 外部接続: Tailscale経由でSSH
- Node.js: v24.13.0（nvm経由）
- OpenClaw: 2026.1.30

## OpenClawのインストール

OpenClawはNode.js 22以上が必要です。nvmを使うと後でバージョン管理が楽になります。

### Node.jsのインストール（nvm経由）

```bash
# nvmのインストール
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# シェルを再読み込み
source ~/.bashrc

# Node.js LTSをインストール
nvm install --lts

# 確認
node --version  # v24.13.0
npm --version   # 11.6.2
```

:::message
`apt install nodejs`でも入りますが、バージョンが古いことが多いです。nvmなら後でバージョンアップも簡単です。
:::

### OpenClawのインストール

```bash
# グローバルインストール
npm install -g openclaw

# 確認
openclaw --version  # 2026.1.30
```

依存パッケージの非推奨警告が出ますが、動作に問題はありません。

## Discord連携の設定

### 1. Discord Developer Portalでアプリ作成

[Discord Developer Portal](https://discord.com/developers/applications) にアクセスします。

1. 「New Application」をクリック
2. アプリ名を入力（例: `OpenClaw`）
3. 「Create」

### 2. Botの設定とトークン取得

左メニューの「Bot」を開きます。

1. 「Reset Token」でBotトークンを取得（メモしておく）
2. **MESSAGE CONTENT INTENT**をONにする（重要）

### 3. サーバー作成とBotの招待

まず自分専用のDiscordサーバーを作成します（既存のサーバーでも可）。

1. Discordアプリの左側で「+」ボタンをクリック
2. 「オリジナルを作成」→「自分と友達のため」
3. サーバー名を入力して作成

次に、Developer Portalの「OAuth2」→「URL Generator」を開きます。

1. **SCOPES**: `bot` にチェック
2. **BOT PERMISSIONS**: `Send Messages`、`Read Message History`、`Use Slash Commands`
3. 生成されたURLをブラウザで開く
4. 作成したサーバーを選択して「認証」

### 4. OpenClawへの設定

`openclaw onboard` コマンドで対話形式で設定します。

```bash
openclaw onboard
```

1. 「I understand this is powerful...」→ Yes
2. 「Onboarding mode」→ QuickStart
3. 「Model/auth provider」→ Skip for now（後で設定）
4. 「Select channel」→ Discord (Bot API)
5. 「Enter Discord bot token」→ 先ほど取得したトークンを貼り付け
6. 「Configure Discord channels access?」→ Yes
7. 「Discord channels access」→ **Open (allow all channels)**

:::message
「Allowlist」で特定チャンネルのみ許可する設定にすると、「channels unresolved」エラーが出ることがあります。個人用サーバーなら「Open」で全チャンネル許可にする方が確実です。
:::

設定が完了すると、systemdサービスとしてGatewayがインストールされます。

```text
Installed systemd service: ~/.config/systemd/user/openclaw-gateway.service
Discord: ok (@OpenClaw)
```

### 5. AIプロバイダーの設定（必須）

:::message alert
OpenClawを動かすには、AIプロバイダー（Anthropic、OpenAI等）のAPIキーが必要です。APIキーがないとBotは応答しません。
:::

#### Claude Code サブスクリプションを使う方法

Claude Code（Anthropicの公式CLI）のサブスクリプションを持っていれば、別途APIキーを取得しなくても OpenClaw を動かせます。

まず Claude Code をインストールします。

```bash
npm install -g @anthropic-ai/claude-code
```

ログインします。WSL ではブラウザが開かないので、表示される URL を手動でブラウザで開いて認証します。

```bash
claude login
```

次に setup-token を生成します。これも同様に URL を開いて認可が必要です。

```bash
claude setup-token
```

成功すると、1年間有効な OAuth トークンが表示されます。

```text
✓ Long-lived authentication token created successfully!

Your OAuth token (valid for 1 year):

sk-ant-oat01-xxxxx...

Store this token securely. You won't be able to see it again.
```

このトークンを OpenClaw に設定します。

```bash
openclaw configure
```

1. 「Where will the Gateway run?」→ Local (this machine)
2. 「Select sections to configure」→ **Model** を選択
3. 「Paste Anthropic setup-token」→ 先ほどのトークンを貼り付け
4. 「Token name」→ default のまま Enter
5. 「Anthropic OAuth models」→ 使いたいモデルをスペースキーで選択（複数可）
6. 「Select sections to configure」→ Continue で終了

設定後、Gateway を再起動します。

```bash
systemctl --user restart openclaw-gateway
```

#### 従来の API キーを使う方法

Anthropic Console や OpenAI で API キーを取得している場合は、`openclaw configure` の Model セクションで直接設定できます。

## 動作確認

Discordで `@OpenClaw こんにちは` とメンションを送ります。

:::message
`@` を入力して表示される入力補完リストから `@OpenClaw` を選択してください。

- `@OpenClaw#6551` のようにコピペや手入力すると、プレーンテキストとして送信されメンションとして認識されません
- メッセージを編集してメンションを追加しても、Botには通知されません。新規メッセージで送信してください

:::

正常に動作すれば、目のリアクション（👀）が付いた後、Botから応答が返ってきます。

## トラブルシューティング

### channels unresolved エラー

```text
[discord] channels unresolved: 1234567890/9876543210
```

特定チャンネルのみ許可する設定（Allowlist）で、チャンネルIDの解決に失敗しています。

**解決方法:**

```bash
openclaw configure
```

1. Channels → Configure/link → Discord → Modify settings
2. 「Discord channels access」→ **Open (allow all channels)** に変更

設定ファイル（`~/.openclaw/openclaw.json`）を直接編集する場合は、`guilds` を空にします。

```json
"channels": {
  "discord": {
    "enabled": true,
    "token": "...",
    "groupPolicy": "open",
    "guilds": {}
  }
}
```

### Invalid bearer token / authentication_error

```text
HTTP 401 authentication_error: Invalid bearer token
```

Claude Code のセッションが切れています。

**解決方法:**

```bash
# Claude Code に再ログイン
claude login

# 新しい setup-token を生成
claude setup-token

# OpenClaw に再設定
openclaw configure
# → Model を選択して新しいトークンを貼り付け

# Gateway 再起動
systemctl --user restart openclaw-gateway
```

### Provider is in cooldown

```text
Provider anthropic is in cooldown (all profiles unavailable)
```

認証エラーが発生した後、プロバイダーが一時停止状態になっています。

**解決方法:**

上記の「Invalid bearer token」を解決した後、Gateway を再起動します。

```bash
systemctl --user stop openclaw-gateway
sleep 5
systemctl --user start openclaw-gateway
```

### ログの確認方法

```bash
# リアルタイムログ
journalctl --user -u openclaw-gateway -f

# 詳細ログ
cat /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log
```

## 便利な使い方

### 自身のバージョンアップ

OpenClawに「バージョンアップして」と頼むと、自分自身を更新してくれます。

```text
@OpenClaw OpenClawのバージョンアップをお願いします
```

実行してよいか確認された後、`npm update -g openclaw` を実行し、Gatewayを再起動してくれます。

## まとめ

ここまでの作業で以下が完了しました。

| 項目 | 状態 |
| ---- | ---- |
| Node.js / npm | 完了（v24.13.0 nvm経由） |
| OpenClaw | 完了（2026.2.1） |
| Claude Code | 完了（OAuth トークン取得済み） |
| Discord Bot作成 | 完了（Developer Portal） |
| OpenClaw Discord設定 | 完了（Open設定） |
| Gateway systemdサービス | 完了（自動起動） |
| AIプロバイダー設定 | 完了（Anthropic OAuth） |
| 動作確認 | 完了 |

これでDiscordからいつでもAIアシスタントに話しかけられるようになりました。

## 関連情報

- [OpenClaw公式サイト](https://openclaw.ai/)
- [OpenClaw Discordドキュメント](https://docs.openclaw.ai/channels/discord)
