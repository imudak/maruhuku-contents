# OpenClaw Discord/Slack連携セットアップ計画

## 目的

mini-PC（WSL2）上でOpenClawを動かし、Discord（メイン）とSlack（サブ）の両方で使えるようにする。

## 現状

- mini-PC: WSL2 (Ubuntu) 導入済み、Tailscale設定済み
- Node.js: v24.13.0（nvm 0.40.1経由）✅
- OpenClaw: 2026.1.30 ✅
- Claude Code: 未インストール
- Discord: アカウントあり
- Slack: アカウントあり、前回別PCで連携経験あり
- Notion: アカウントあり、メモ蓄積
- GitHub: アカウントあり

## 作業項目

### Phase 1: 基盤構築

- [x] WSL環境確認（Node.js、npm）
- [x] OpenClawインストール
- [ ] 基本動作確認

### Phase 2: Discord連携（メイン）

- [ ] Discord Developer Portalでアプリ作成
- [ ] Botトークン取得
- [ ] OpenClawにトークン設定
- [ ] Gateway起動・動作確認

### Phase 3: Slack連携（サブ）

- [ ] Slack APIでアプリ作成
- [ ] Bot Token (xoxb-) 取得
- [ ] App Token (xapp-) 取得
- [ ] App Manifest設定
- [ ] OpenClawにトークン設定
- [ ] 動作確認

### Phase 4: 発展（後日）

- [ ] Notion MCP Server調査
- [ ] GitHub連携調査
- [ ] 常駐化（systemd）

## 記事化

作業中にハマったポイントは `articles/openclaw-wsl-discord-slack.md` に記録する。

## 参考

- 前回のSlack連携記事: `articles/openclaw-slack-troubleshoot.md`
- 会話ログ: `raws/google_ai_mode_openclaw_vps_conversation.md`
