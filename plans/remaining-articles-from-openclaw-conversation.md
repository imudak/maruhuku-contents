# 会話ログからの記事候補プラン

ソース: `raws/google_ai_mode_openclaw_vps_conversation.md`

## 完了済み

1. ✅ **VPS vs 自宅ミニPC：常駐サーバーのコスト比較**
   - `articles/vps-vs-minipc-server-cost.md` として公開済み

---

## 残りの記事候補

### 2. WSL2を外部からSSH接続できるようにする（Tailscale編）

**内容:**
- Tailscale vs Cloudflare Tunnel の比較（DNS移行が不要な点がポイント）
- WSL側の設定（SSH + Tailscale インストール）
- systemdでの自動起動設定
- 接続側PCの設定

**ソース:** Q29〜Q35

**想定ファイル:** `articles/wsl-ssh-tailscale.md`

---

### 3. WSL2をWindowsログイン不要で自動起動する方法

**内容:**
- WSLはユーザーセッションに依存する問題
- タスクスケジューラでの設定
- `-u root` オプションがポイント
- systemdとの組み合わせ

**ソース:** Q36〜Q37

**想定ファイル:** `articles/wsl-auto-start-without-login.md`

**検討:** 記事2と統合した方が良いかもしれない（SSH接続の前提として自動起動が必要）

---

### 4. ミニPCをヘッドレスサーバーにする手順

**内容:**
- リモートデスクトップの初期設定（モニター・キーボードなしで）
- HDMIダミープラグの必要性
- キーボード配列問題（日本語→英語になる問題）の解決
- シン・テレワークシステムの紹介

**ソース:** Q15〜Q25

**想定ファイル:** `articles/minipc-headless-server-setup.md`

---

### 5. OpenClawをSlackと連携させる手順

**内容:**
- Bot Token / App Token の取得手順
- Socket Modeの有効化
- .env ファイルへの設定
- チャンネルへの招待

**ソース:** Q21〜Q23

**想定ファイル:** `articles/openclaw-slack-integration.md`

---

## 優先順位の提案

| 順位 | 記事 | 理由 |
|------|------|------|
| 1 | WSL SSH + Tailscale（2+3統合） | 今回実際に設定した内容で、情報がまとまっている |
| 2 | ミニPCヘッドレス化 | ミニPC記事の続編として自然 |
| 3 | OpenClaw Slack連携 | OpenClaw固有の内容なので需要は限定的 |

---

## 次のアクション

ユーザーに確認：
- どの記事を次に書くか
- 記事2と3を統合するか、別々にするか
