# 会話ログからの記事候補プラン

ソース: `raws/google_ai_mode_openclaw_vps_conversation.md`

## 完了済み

1. ✅ **VPS vs 自宅ミニPC：常駐サーバーのコスト比較**
   - `articles/vps-vs-minipc-server-cost.md` として公開済み

2. ✅ **OpenClawをSlackと連携させる手順**
   - `articles/openclaw-slack-troubleshoot.md` として公開済み
   - トラブルシューティング記事として執筆済み

3. ✅ **ミニPCをヘッドレスサーバーにする手順**
   - `articles/minipc-headless-server-setup.md` として執筆完了
   - 公開待ち

---

## 残りの記事候補

### 1. WSL2を外部からSSH接続できるようにする（Tailscale + 自動起動編）

**内容:**
- Tailscale vs Cloudflare Tunnel の比較（DNS移行が不要な点がポイント）
- WSL側の設定（SSH + Tailscale インストール）
- systemdでの自動起動設定
- タスクスケジューラでのWSL自動起動（`-u root` オプションがポイント）
- 接続側PCの設定

**ソース:** Q29〜Q37

**想定ファイル:** `articles/wsl-ssh-tailscale-autostart.md`

**備考:** 旧プランの記事2（SSH接続）と記事3（自動起動）を統合。SSH接続の前提として自動起動が必要なため。

---

---

## 優先順位

| 順位 | 記事                           | 理由                                           |
|------|--------------------------------|------------------------------------------------|
| 1    | WSL SSH + Tailscale + 自動起動 | 実際に設定した内容で、情報が最も充実している   |

---

## 次のアクション

WSL SSH + Tailscale + 自動起動の記事を執筆する。
