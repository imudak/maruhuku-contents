# remaining-articles-from-openclaw-conversation.md 更新プラン

## 目的

調査結果を反映して、記事候補プランを最新の状態に更新する。

## 変更内容

### 1. 記事候補5（OpenClaw Slack連携）を削除

- 理由: `articles/openclaw-slack-troubleshoot.md` として既に公開済み
- 「完了済み」セクションに移動

### 2. 記事候補2と3を統合

- 統合後タイトル: 「WSL2を外部からSSH接続できるようにする（Tailscale + 自動起動編）」
- 理由: SSH接続の前提としてWSL自動起動が必要であり、分割する意味がない
- ソース: Q29〜Q37

### 3. 優先順位の更新

| 順位 | 記事 | 理由 |
|------|------|------|
| 1 | WSL SSH + Tailscale + 自動起動（統合版） | 実際に設定した内容、情報が最も充実 |
| 2 | ミニPCヘッドレス化 | ミニPC記事の続編として自然 |

### 4. 次のアクションを更新

- どの記事を次に書くかのみの確認に簡略化

## 対象ファイル

- `plans/remaining-articles-from-openclaw-conversation.md`

## 検証方法

- 更新後のファイルを確認し、整合性をチェック
