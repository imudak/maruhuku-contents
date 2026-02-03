# OpenClaw Discord連携セットアップ計画

## 目的

mini-PC（WSL2）上でOpenClawを動かし、Discordから使えるようにする。

## 現状

- mini-PC: WSL2 (Ubuntu) 導入済み、Tailscale設定済み
- Node.js: v24.13.0（nvm 0.40.1経由）✅
- OpenClaw: 2026.1.30 ✅
- Claude Code: インストール済み、OAuth認証済み ✅
- Discord Bot: 作成済み、OpenClawに設定済み ✅
- AIプロバイダー: Anthropic OAuth設定済み（Claude Code サブスク経由）✅
- Discord連携: 動作確認済み ✅

## 作業項目

### Phase 1: 基盤構築

- [x] WSL環境確認（Node.js、npm）
- [x] OpenClawインストール
- [x] 基本動作確認

### Phase 2: Discord連携

- [x] Discord Developer Portalでアプリ作成
- [x] Botトークン取得
- [x] MESSAGE CONTENT INTENT有効化
- [x] サーバー作成・Bot招待
- [x] OpenClawにトークン設定
- [x] Gatewayサービスインストール
- [x] AIプロバイダーAPIキー設定
- [x] 動作確認

### Phase 3: トラブルシューティング（解決済み）

- [x] channels unresolvedエラー → `groupPolicy: "open"` + `guilds: {}` で解決
- [x] Invalid bearer tokenエラー → Claude Code再ログイン + setup-token再生成で解決

### Phase 4: 発展（後日）

- [ ] Notion MCP Server調査
- [ ] GitHub連携調査
- [ ] Slack連携（別記事として検討）

## 記事化

- 記事: `articles/openclaw-wsl-discord-slack.md`（Discord専用に変更）
- 状態: 執筆完了、公開前

## 参考

- 前回のSlack連携記事: `articles/openclaw-slack-troubleshoot.md`
