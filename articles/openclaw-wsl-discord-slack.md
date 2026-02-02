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

### 3. サーバーへの招待

左メニューの「OAuth2」→「URL Generator」を開きます。

1. **SCOPES**: `bot` にチェック
2. **BOT PERMISSIONS**: `Send Messages`、`Read Message History`、`Use Slash Commands`
3. 生成されたURLでBotを招待

### 4. OpenClawへの設定

<!-- TODO: 設定完了後に記載 -->

### 5. 動作確認

<!-- TODO: 成功時のログを記載 -->

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

<!-- TODO: 作業完了後に記載 -->

## 関連情報

- [OpenClaw公式サイト](https://openclaw.ai/)
- [OpenClaw Discordドキュメント](https://docs.openclaw.ai/channels/discord)
- [前回のSlack連携記事](https://zenn.dev/maruhuku/articles/openclaw-slack-troubleshoot)
