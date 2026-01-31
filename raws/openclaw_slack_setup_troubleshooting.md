# OpenClaw Slack統合 セットアップとトラブルシューティング

## 概要

OpenClawは、オープンソースのセルフホスト型AIアシスタントです。Slackとの統合により、Slackチャンネルやダイレクトメッセージから直接AIアシスタントを利用できます。

## 前提条件

- OpenClawがインストール済み（`openclaw` コマンドが利用可能）
- Slackワークスペースの管理者権限
- WSL2/Linux環境（本ドキュメントではWSL2を使用）

## 重要な注意事項：OpenClaw Dashboardについて

OpenClawの公式サイト（https://openclaw.ai/）には「Dashboard」という管理画面が用意されていますが、**DashboardでSlack API登録を行っただけでは、OpenClawは動作しません。**

**実際に必要な手順:**
1. OpenClaw Dashboardでトークンの登録や初期設定を行う
2. **ローカル環境で `openclaw gateway --port 18789` コマンドを実行してGatewayを起動する**
3. Gatewayが起動して待機状態になることで、初めてSlackとの連携が開始される

多くの初心者が「Dashboard側で設定したら自動的に動くはず」と誤解しがちですが、OpenClawはセルフホスト型アプリケーションのため、**自分の環境でGatewayプロセスを起動し続ける必要があります**。

## セットアップ手順

### 1. Slack Appの作成

1. https://api.slack.com/apps にアクセス
2. **「Create New App」** をクリック
3. **「From an app manifest」** を選択
4. 使用するワークスペースを選択
5. **JSON** タブを選択し、以下のManifestを貼り付け

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
      ],
      "user": [
        "channels:history",
        "channels:read",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "mpim:history",
        "mpim:read",
        "users:read",
        "reactions:read",
        "pins:read",
        "emoji:read",
        "search:read"
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
        "message.mpim",
        "reaction_added",
        "reaction_removed",
        "member_joined_channel",
        "member_left_channel",
        "channel_rename",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

### 2. トークンの取得

#### App Token (xapp-...)の取得

1. Slack App設定画面で **Basic Information** を開く
2. **App-Level Tokens** セクションを探す
3. **Generate Token and Scopes** をクリック
4. Token名を入力（例: `socket-mode-token`）
5. スコープ **connections:write** を追加
6. **Generate** をクリック
7. 生成されたトークン（`xapp-1-...` 形式）をコピー

#### Bot Token (xoxb-...)の取得

1. **OAuth & Permissions** に移動
2. **Install to Workspace** をクリック
3. 権限を承認
4. **Bot User OAuth Token** （`xoxb-...` 形式）をコピー

### 3. OpenClaw設定ファイルの編集

設定ファイルのパス: `~/.openclaw/openclaw.json`

編集:
```bash
nano ~/.openclaw/openclaw.json
```

以下の部分を修正:
```json
"channels": {
  "slack": {
    "mode": "socket",
    "enabled": true,
    "botToken": "xoxb-YOUR-BOT-TOKEN-HERE",
    "appToken": "xapp-YOUR-APP-TOKEN-HERE",
    ...
  }
}
```

- `botToken`: Bot User OAuth Token（`xoxb-` で始まる）
- `appToken`: App-Level Token（`xapp-` で始まる）

### 4. OpenClawの起動

```bash
openclaw gateway --port 18789
```

成功すると以下のようなログが表示されます:
```
[slack] channels resolved: #general→C03MGAYFZ, #openclaw-channel→C0AD10QU1RN
[slack] socket mode connected
```

## トラブルシューティング

### よくある誤解: Dashboard設定後に何も起きない

**症状:**
- OpenClaw Dashboard（https://openclaw.ai/）でSlackのAPI登録を完了した
- しかし、Slackワークスペースに何も表示されない
- 「次に何をすればいいのかわからない」状態になる

**原因:**
OpenClawはセルフホスト型のため、Dashboardでの設定だけではGatewayが起動していません。

**解決方法:**
ターミナルで以下のコマンドを実行してGatewayを起動してください:

```bash
openclaw gateway --port 18789
```

このコマンドを実行すると、OpenClawが起動し、Slackとの接続が開始されます。ログに以下のような表示が出れば成功です:

```
[slack] socket mode connected
```

**重要:** このコマンドを実行したターミナルは開いたままにしておく必要があります。閉じるとOpenClawが停止します。常時稼働させたい場合は、「バックグラウンド実行」のセクションを参照してください。

### エラー1: `invalid_auth`

**症状:**
```
[openclaw] Unhandled promise rejection: Error: An API error occurred: invalid_auth
```

**原因:**
- トークンが設定されていない
- トークンの種類が間違っている（botTokenとappTokenが逆、または両方ともxapp-になっている）

**解決方法:**
1. `~/.openclaw/openclaw.json` を確認
2. `botToken` に `xoxb-` で始まるトークンが設定されているか確認
3. `appToken` に `xapp-` で始まるトークンが設定されているか確認

**実際に遭遇したケース:**
```json
// 誤った設定（両方ともxapp-になっていた）
"botToken": "xapp-X-XXXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"appToken": "xapp-X-XXXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

// 正しい設定
"botToken": "xoxb-XXXXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX",
"appToken": "xapp-X-XXXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### エラー2: `missing_scope`

**症状:**
```
[slack] channel resolve failed; using config entries. Error: An API error occurred: missing_scope
[slack] socket mode connected
```

**原因:**
- Slack AppのBot Token Scopesに必要な権限が不足している

**解決方法:**

#### 方法1: 手動でスコープを追加

Slack App設定画面で **OAuth & Permissions** → **Bot Token Scopes** に以下を追加:
- `chat:write`
- `channels:history`
- `channels:read`
- `groups:history`
- `groups:read`
- `groups:write`
- `im:history`
- `im:read`
- `im:write`
- `mpim:history`
- `mpim:read`
- `mpim:write`
- `users:read`
- `app_mentions:read`
- `reactions:read`
- `reactions:write`
- `pins:read`
- `pins:write`
- `emoji:read`
- `commands`
- `files:read`
- `files:write`

スコープ追加後、必ず **「Reinstall to Workspace」** をクリックして権限を再承認してください。

#### 方法2: App Manifestを使用（推奨）

上記の「セットアップ手順」で提供しているManifestを使用すれば、すべての必要なスコープとイベントが自動的に設定されます。

### エラー3: Slackワークスペースに表示されない

**原因:**
- 「Install to Workspace」が完了していない
- Botがチャンネルに招待されていない

**解決方法:**
1. Slack App設定画面で **OAuth & Permissions** から「Install to Workspace」を実行
2. Slackで使用したいチャンネルを開く
3. `/invite @OpenClaw` を実行してBotを招待
4. または、DMで直接Botにメッセージを送る

## 動作確認

### OpenClawの起動ログを確認

正常に動作している場合:
```
[slack] channels resolved: #general→C03MGAYFZ, #openclaw-channel→C0AD10QU1RN
[slack] socket mode connected
[slack] delivered reply to channel:C0AD10QU1RN
```

エラーがある場合:
```
[slack] channel resolve failed; using config entries. Error: An API error occurred: missing_scope
```

### Slackでテスト

1. **チャンネルでメンション:**
   ```
   @OpenClaw こんにちは
   ```

2. **ダイレクトメッセージ:**
   OpenClawに直接DMを送信

3. **スラッシュコマンド:**
   ```
   /openclaw メッセージ
   ```

## バックグラウンド実行

### systemdサービスとして登録（Linux/WSL2）

```bash
openclaw gateway install
```

これにより、OS起動時に自動的にOpenClawが起動します。

### VPS/クラウドへのデプロイ

常時稼働させるには、以下のクラウドサービスの利用を推奨:
- DigitalOcean（月$24〜）
- Alibaba Cloud（月$8〜）
- Railway（ワンクリックデプロイ対応）
- AWS/Hetzner（Pulumi + Tailscale）

ローカルPCでの常時稼働はセキュリティリスクがあるため推奨されません。

## 設定ファイルの例

`~/.openclaw/openclaw.json` の関連部分:

```json
{
  "channels": {
    "slack": {
      "mode": "socket",
      "webhookPath": "/slack/events",
      "enabled": true,
      "botToken": "xoxb-XXXXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX",
      "appToken": "xapp-X-XXXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "userTokenReadOnly": true,
      "groupPolicy": "allowlist",
      "channels": {
        "#general": {
          "allow": true
        },
        "#openclaw-channel": {
          "allow": true
        }
      }
    }
  }
}
```

## 参考リンク

- [OpenClaw公式サイト](https://openclaw.ai/)
- [OpenClaw Slackドキュメント](https://docs.openclaw.ai/channels/slack)
- [Slack API Apps](https://api.slack.com/apps)
- [How to Deploy OpenClaw - DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-run-openclaw)

## 備考

- OpenClawはセルフホスト型アプリケーションのため、常時稼働させる必要があります
- トークンはセキュリティ上重要な情報です。第三者と共有しないでください
- 本ドキュメントは2026年2月1日時点の情報です（OpenClaw 2026.1.30）
