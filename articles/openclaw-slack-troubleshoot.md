---
title: OpenClawのSlack連携でinvalid_authとmissing_scopeエラーにハマった話
emoji: "🤖"
type: tech
topics:
  - slack
  - openclaw
  - ai
  - troubleshooting
  - wsl
published: true
---

## はじめに

OpenClawはセルフホスト型のAIアシスタントです。Slackと連携すれば、チャンネルやDMからAIに話しかけられるようになります。

設定自体は簡単そうに見えたのですが、何度かハマりました。同じエラーに遭遇した方の参考になればと思います。

:::message
OpenClawはセルフホスト型のため、Dashboardで設定しただけでは動きません。ローカル環境で`openclaw gateway`コマンドを実行してGatewayを起動する必要があります。
:::

## 環境

- OpenClaw 2026.1.30
- WSL2 (Ubuntu)
- Slackワークスペース（管理者権限あり）

## Dashboard設定後に何も起きない

### 症状

OpenClaw Dashboardでトークンの登録を完了したのに、Slackに何も表示されない。次に何をすればいいのかわからない状態になりました。

### 原因

OpenClawはセルフホスト型のため、Dashboardでの設定だけではGatewayが起動していません。

### 解決方法

ターミナルで以下のコマンドを実行してGatewayを起動します。

```bash
openclaw gateway --port 18789
```

ログに以下の表示が出れば成功です。

```text
[slack] socket mode connected
```

このコマンドを実行したターミナルは開いたままにしておく必要があります。閉じるとOpenClawが停止します。

常時稼働させたい場合は、systemdサービスとして登録できます。

```bash
openclaw gateway install
```

## エラー1: invalid_auth

### 症状

OpenClawを起動すると、以下のエラーが出て接続に失敗します。

```text
[openclaw] Unhandled promise rejection: Error: An API error occurred: invalid_auth
```

### 原因

設定ファイル `~/.openclaw/openclaw.json` を確認したところ、`botToken`と`appToken`の両方に`xapp-`で始まるトークンを設定していました。

誤った設定の例:

```json
"botToken": "xapp-X-XXXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"appToken": "xapp-X-XXXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Slack Appには2種類のトークンがあり、それぞれ取得場所と用途が異なります。

| トークン | プレフィックス | 取得場所 |
| -------- | -------------- | -------- |
| Bot Token | `xoxb-` | OAuth & Permissions |
| App Token | `xapp-` | Basic Information → App-Level Tokens |

### 解決方法

OAuth & Permissionsページから正しいBot Tokenを取得し、設定ファイルを修正しました。

正しい設定:

```json
"botToken": "xoxb-XXXXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX",
"appToken": "xapp-X-XXXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

## エラー2: missing_scope

### 症状

`invalid_auth`を解決した後、今度は別のエラーが出ました。

```text
[slack] channel resolve failed; using config entries. Error: An API error occurred: missing_scope
[slack] socket mode connected
```

接続はできるものの、チャンネルの解決に失敗しています。

### 原因

Bot Token Scopesに必要な権限が不足していました。Slack Appを作成した際に、必要なスコープを設定していなかったことが原因です。

### 解決方法

App Manifestを使って一括設定するのが確実です。Slack App設定画面で「App Manifest」を開き、以下のJSONを適用します。

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": false
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "chat:write",
        "channels:history",
        "channels:read",
        "groups:history",
        "groups:read",
        "groups:write",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "users:read",
        "app_mentions:read",
        "reactions:read",
        "reactions:write",
        "pins:read",
        "pins:write",
        "emoji:read",
        "commands",
        "files:read",
        "files:write"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim"
      ]
    }
  }
}
```

Manifest適用後、**「Reinstall to Workspace」を必ずクリック**します。スコープを変更しただけではBot Tokenに反映されず、再インストールが必要です。

## エラー3: Slackワークスペースに表示されない

### 症状

OpenClawの起動は成功しているのに、Slackのアプリ一覧にBotが表示されない。

### 原因

「Install to Workspace」が完了していない、またはBotがチャンネルに招待されていない状態でした。

### 解決方法

1. OAuth & Permissionsから「Install to Workspace」を実行
2. 使用したいチャンネルで `/invite @OpenClaw` を実行

## 成功時のログ

すべて正しく設定できると、以下のようなログが表示されます。

```text
[slack] channels resolved: #general→C03MGAYFZ, #openclaw-channel→C0AD10QU1RN
[slack] socket mode connected
```

Slackでメンションを送ると、返答が返ってきます。

```text
[slack] delivered reply to channel:C0AD10QU1RN
```

## 設定ファイルの最終形

参考までに、動作した設定ファイルの該当部分を載せておきます。

```json
{
  "channels": {
    "slack": {
      "mode": "socket",
      "enabled": true,
      "botToken": "xoxb-YOUR-BOT-TOKEN",
      "appToken": "xapp-YOUR-APP-TOKEN",
      "channels": {
        "#general": { "allow": true },
        "#openclaw-channel": { "allow": true }
      }
    }
  }
}
```

## まとめ

OpenClawのSlack連携で遭遇したエラーと解決方法です。

| 症状 | 原因 | 解決方法 |
| ---- | ---- | -------- |
| Dashboard設定後に動かない | Gatewayが起動していない | `openclaw gateway --port 18789` を実行 |
| `invalid_auth` | トークンの種類が間違っている | `botToken`は`xoxb-`、`appToken`は`xapp-`を確認 |
| `missing_scope` | 権限不足 | App Manifestで一括設定 → Reinstall |
| 表示されない | インストール/招待されていない | Install to Workspace → `/invite` |

## 関連情報

- [OpenClaw公式サイト](https://openclaw.ai/)
- [OpenClaw Slackドキュメント](https://docs.openclaw.ai/channels/slack)
- [Slack API Apps](https://api.slack.com/apps)
