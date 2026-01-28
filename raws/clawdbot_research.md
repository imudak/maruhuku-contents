# Clawdbot 調査レポート

> **調査日**: 2026-01-29
> **調査者**: ashigaru1
> **タスクID**: subtask_001

## 概要・目的

**Clawdbot**（現在は**Moltbot**に名称変更）は、Peter Steinberger氏（PSPDFKit創業者）が開発したオープンソースのパーソナルAIアシスタントである。

### 特徴
- **ローカル実行型**: ユーザーのマシン上で動作し、プライバシーを保護
- **マルチプラットフォーム対応**: WhatsApp, Telegram, Discord, Slack, Signal, iMessage, WebChat に対応
- **Claude連携**: Anthropic Claude APIを主要なLLMバックエンドとして使用
- **自律エージェント**: タスクを自律的に実行し、システム全体にアクセス可能

### 目的
日常業務の自動化を実現する「パーソナルAIアシスタント」として、メール管理、ブラウザ操作、ファイル管理、スケジュール管理などを一元化する。

## 主要な機能

### コア機能
| 機能 | 説明 |
|------|------|
| 永続メモリ | ユーザーの好みやコンテキストを学習・記憶 |
| ブラウザ自動化 | Web検索、フォーム入力、フライト予約など |
| システムアクセス | ファイル操作、シェルコマンド実行、Git操作 |
| スキル拡張 | プラグインアーキテクチャで機能追加可能 |
| プロアクティブ通知 | 朝のブリーフィング、リマインダー、ステータス更新 |

### 50以上の連携サービス
- **メッセージング**: WhatsApp, Telegram, Discord, Slack, Signal, iMessage
- **プロダクティビティ**: Gmail, GitHub, Obsidian, Calendar
- **メディア**: Spotify, Twitter
- **スマートホーム**: Philips Hue 等

### 技術アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                    Gateway Server                        │
│              (TypeScript, Port 18789)                   │
├─────────────────────────────────────────────────────────┤
│  WhatsApp │ Telegram │ Discord │ Slack │ Signal │ iMsg │
├─────────────────────────────────────────────────────────┤
│                    Agent System                          │
│    (Tool Streaming, Skills Platform, Model Selection)   │
├─────────────────────────────────────────────────────────┤
│  macOS App │ iOS App │ Android App │ WebChat           │
└─────────────────────────────────────────────────────────┘
```

## 使い方・設定方法

### インストール方法

**ワンライナー（推奨）**
```bash
curl -fsSL https://molt.bot/install.sh | bash
```

**NPM経由**
```bash
npm i -g clawdbot
```

**ソースからビルド**
```bash
git clone https://github.com/moltbot/moltbot
cd moltbot
pnpm install
pnpm build
pnpm ui:build
```

### 設定ファイル
- 設定: `~/.clawdbot/clawdbot.json`
- 認証情報: `~/.clawdbot/credentials/`
- セッション: `~/.clawdbot/sessions/`
- ワークスペース: `~/clawd/`（カスタマイズ可能）

### サポートOS
- macOS
- Windows
- Linux

### 対応AIモデル
- Anthropic Claude（主要）
- OpenAI GPT
- ローカルLLM

## 関連リンク・リポジトリ

### 公式サイト
- **Moltbot（新名称）**: https://molt.bot/
- **旧サイト**: https://clawd.bot/（Moltbotにリダイレクト）

### GitHubリポジトリ
- **メインリポジトリ**: https://github.com/moltbot/moltbot
- **Claude Codeスキル**: https://github.com/justbecauselabs/clawd-skills
- **スキルコレクション**: https://github.com/VoltAgent/awesome-moltbot-skills
- **旧リポジトリ（フォーク）**: https://github.com/HarleyCoops/CLAWDBOT

### 参考記事
- [TechCrunch: Everything you need to know about viral personal AI assistant clawdbot](https://techcrunch.com/2026/01/27/everything-you-need-to-know-about-viral-personal-ai-assistant-clawdbot-now-moltbot/)
- [DEV.to: From Clawdbot to Moltbot - The Full Story](https://dev.to/sivarampg/from-clawdbot-to-moltbot-how-a-cd-crypto-scammers-and-10-seconds-of-chaos-took-down-the-4eck)
- [Medium: Clawdbot vs Claude Code](https://medium.com/ai-software-engineer/clawdbot-vs-claude-code-one-for-coding-one-for-everything-else-dont-get-confused-51d91611dab3)

## 補足情報：名称変更の経緯

### タイムライン
- **2025年末**: Clawdbotが急速に普及、数日で60,000+ GitHubスターを獲得
- **2026年1月27日**: Anthropic社から商標に関する要請（「Clawd」と「Claude」の類似性）
- **同日**: Moltbotへのリブランド発表
- **名称変更時**: GitHub/Twitter アカウント名変更の隙を突かれ、約10秒で暗号詐欺師に旧アカウント名を奪取される
- **その後**: 偽$CLAWDトークン詐欺が発生（一時時価総額$16M）

### 現状
- ソフトウェア自体は**Moltbot**として継続運用中
- コミュニティは8,900+のDiscordメンバーを維持
- セキュリティ強化とブランド再構築を進行中

## Claude Codeとの関係

ClawdbotはClaude Codeとは**別プロダクト**である。

| 項目 | Claude Code | Clawdbot/Moltbot |
|------|-------------|------------------|
| 開発元 | Anthropic | Peter Steinberger (OSS) |
| 主目的 | コーディング支援 | パーソナル自動化 |
| 実行環境 | ターミナル | マルチチャネル（メッセージアプリ等） |
| 連携 | エディタ/IDE | 50+サービス |

ただし、**clawd-skills**というClaude Code用スキルセットが存在し、Claude CodeからClawdbot/Moltbotを操作・連携することが可能。

---

*調査完了*
