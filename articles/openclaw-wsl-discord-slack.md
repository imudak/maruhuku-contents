---
title: "ミニPCのWSL2でOpenClawを動かしてDiscordとSlack両方で使う"
emoji: "🤖"
type: tech
topics:
  - openclaw
  - discord
  - slack
  - wsl
  - ai
published: false
---

## はじめに

自宅のミニPCをAIアシスタントサーバーにしたいと思いました。OpenClawを使えば、DiscordやSlackから話しかけるだけでAIと対話できます。

前回はSlack連携だけ設定しましたが、Slack無料プランは90日でメッセージ履歴が消えてしまいます。個人用途ならDiscordの方が向いていると感じたので、今回は両方設定して使い分けられるようにします。

## 環境

- ミニPC: NiPoGi Ryzen 3 4300U / 16GB RAM
- OS: Windows 11 Pro + WSL2 (Ubuntu)
- 外部接続: Tailscale経由でSSH
- Node.js: v24.13.0（nvm経由）
- OpenClaw: 2026.1.30

## SlackとDiscordの比較

比較した結果をまとめます。

| 観点 | Slack (Free) | Discord (無料) |
|------|--------------|----------------|
| メッセージ履歴 | 90日で消失 | 無制限 |
| Bot設定の複雑さ | やや複雑（トークン2種類） | シンプル（トークン1種類） |
| スレッド機能 | 強力 | あるが弱い |
| 通知設定 | 細かく制御可能 | 普通 |

個人用AIアシスタントにはDiscordが向いていると判断しました。履歴が消えないのが大きいです。

ただ、職場でSlackを使っているので操作感が同じ方が楽という面もあり、両方設定して併用することにしました。

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
7. 「Discord channels access」→ Allowlist (recommended)
8. 「Discord channels allowlist」→ `サーバー名/#チャンネル名`（例: `AI Assistant/#一般`）

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

<!-- TODO: 動作確認後に成功時のログを記載 -->

## Slack連携の設定

Discordがメインなので、Slackは簡潔にまとめます。詳細は前回の記事を参照してください。

https://zenn.dev/maruhuku/articles/openclaw-slack-troubleshoot

### ポイント

- `botToken`は`xoxb-`で始まる（OAuth & Permissions）
- `appToken`は`xapp-`で始まる（Basic Information → App-Level Tokens）
- App Manifestで権限を一括設定すると楽
- 設定後は「Reinstall to Workspace」を忘れずに

## 使い分け

| 用途 | 使うサービス |
|------|--------------|
| 日常のAI対話 | Discord |
| 通知を受け取りたいとき | Slack |
| 仕事関連の質問 | Slack（職場と同じ操作感） |

## トラブルシューティング

<!-- TODO: 実際にハマったことを記載 -->

## まとめ

ここまでの作業で以下が完了しました。

| 項目 | 状態 |
|------|------|
| Node.js / npm | 完了（v24.13.0 nvm経由） |
| OpenClaw | 完了（2026.1.30） |
| Claude Code | 完了（OAuth トークン取得済み） |
| Discord Bot作成 | 完了（Developer Portal） |
| OpenClaw Discord設定 | 完了（トークン・チャンネル設定済み） |
| Gateway systemdサービス | 完了（インストール済み） |
| AIプロバイダー設定 | 完了（Anthropic OAuth） |
| Slack連携 | 未設定 |

<!-- TODO: 動作確認後に最終状態を更新 -->

## 関連情報

- [OpenClaw公式サイト](https://openclaw.ai/)
- [OpenClaw Discordドキュメント](https://docs.openclaw.ai/channels/discord)
- [前回のSlack連携記事](https://zenn.dev/maruhuku/articles/openclaw-slack-troubleshoot)
