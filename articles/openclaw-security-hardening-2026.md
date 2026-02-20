---
title: "OpenClawセキュリティ危機と個人運用者がやるべき対策 — CVE-2026-25253からgateway hardening まで"
emoji: "🛡️"
type: "tech"
topics:
  - AI
  - OpenClaw
  - セキュリティ
  - 自動化
  - インフラ
published: false
---

## はじめに

2026年2月、AIエージェントフレームワーク「OpenClaw」を取り巻くセキュリティ状況が大きく動いた。CVE-2026-25253（CVSS 8.8）の公開、ClawHubマーケットプレイスへの大規模サプライチェーン攻撃、そして3万台以上のインスタンスがインターネットに露出していたという報告。

筆者はOpenClawを日常業務のAIアシスタントとして運用している。本記事では、これらのセキュリティ問題の概要と、個人・小規模チームの運用者が実際に取るべき対策を、自分の対応経験を交えて解説する。

## 何が起きたのか

### CVE-2026-25253: 1クリックRCE

2026年1月末に公開されたこの脆弱性は、OpenClawのControl UIが`gatewayUrl`をクエリ文字列から無検証で信頼してしまう問題だった。

**攻撃シナリオ：**
1. 攻撃者が細工したリンクを用意
2. 被害者がリンクをクリック
3. ブラウザがgatewayトークンを攻撃者のサーバーに送信
4. 攻撃者がトークンを使ってgatewayに接続
5. 設定変更 → サンドボックス無効化 → 任意コード実行

localhostにバインドされたインスタンスでも攻撃可能という点が衝撃的だった。v2026.1.29で修正済み。

### ClawHavocキャンペーン：スキルマーケットプレイスの汚染

ClawHub（OpenClawのスキルマーケットプレイス）で341件の悪意あるスキルが発見された。その後の調査で800件以上（レジストリの約20%）に拡大。主にmacOS向けの情報窃取マルウェア（Atomic Stealer / AMOS）を配布していた。

npmやブラウザ拡張のエコシステムで繰り返されてきたサプライチェーン攻撃が、AIエージェントの世界にも到来した形だ。

### 3万台以上のインターネット露出

Censys、Bitsight、Hunt.ioなどの調査チームが、認証なしでインターネットに公開されたOpenClawインスタンスを3万台以上発見。企業端末上での「Shadow AI」としての展開も確認されている。

## v2026.2.19のセキュリティ強化

これらの問題を受け、OpenClawの開発チームは大規模なセキュリティ修正をリリースした。v2026.2.19のCHANGELOGを見ると、セキュリティ関連の修正が **40件以上** 含まれている。主要なものを分類する。

### ネットワーク層

| 修正内容 | 影響 |
|----------|------|
| `ws://` plaintext non-loopback接続のブロック | Tailscale等の内部ネットワークでも暗号化必須に |
| SSRF対策の強化（NAT64, 6to4, Teredo対応） | IPv6トンネリングを使ったSSRFバイパスを防止 |
| ブラウザURL navigation のSSRFガード | Browser Relay経由の内部ネットワークアクセスを制限 |
| Canvas/A2UIのセッションスコープ化 | 共有IP認証からノードスコープのcapability URLに変更 |

### 認証・認可

| 修正内容 | 影響 |
|----------|------|
| gateway.auth.tokenのデフォルト自動生成 | 認証なしgatewayの防止 |
| hooks.tokenとgateway.auth.tokenの重複禁止 | トークン再利用による権限昇格を防止 |
| 非CLIクライアントの最小権限化 | エージェントツールからのcron/gateway操作を制限 |
| Discord moderation actionの権限チェック強化 | 信頼されないsenderIdによる権限昇格を防止 |

### コマンド実行

| 修正内容 | 影響 |
|----------|------|
| `execSync` → `execFileSync` への置換 | シェル引数インジェクションの排除 |
| safeBinsの信頼パスからの解決を必須化 | PATH hijackによるallowlistバイパスを防止 |
| safeBinsのファイル存在オラクル除去 | allowlist判定でホストのファイル存在が漏洩する問題を修正 |
| Lobster（Windows）のシェルフォールバック除去 | Windowsでのコマンドインジェクションを防止 |

### プラグイン・スキル

| 修正内容 | 影響 |
|----------|------|
| プラグインのパス脱出防止（realpath検証） | シンボリックリンクによる信頼境界の突破を防止 |
| スキルパッケージのシンボリックリンク拒否 | 配布アーカイブへの外部ファイル混入を防止 |
| unpinnedプラグインの警告 | 整合性メタデータなしのプラグインを検出 |

## 個人運用者が今すぐやるべきこと

### 1. バージョンを確認・更新する

```bash
openclaw --version
# v2026.1.29未満なら最優先で更新（CVE-2026-25253対象）
# v2026.2.19未満でも更新推奨
```

### 2. gateway.bindを確認する

```bash
openclaw config get gateway.bind
```

`tailnet` や `0.0.0.0` になっていたら、外部からの接続が必要でない限り `loopback` に変更する。

```bash
openclaw config set gateway.bind loopback
openclaw gateway restart
```

筆者の環境では、Tailscale内部ネットワークにバインドしていたが、v2026.2.19の `ws://` non-loopbackブロックにより、CLIからgatewayにアクセスできなくなった。`loopback` に変更して解決。

### 3. gateway.auth.modeを確認する

```bash
openclaw config get gateway.auth.mode
```

`none` は論外。`token` が設定されていることを確認する。v2026.2.19以降はデフォルトでトークンが自動生成される。

### 4. スキルの棚卸し

ClawHubから導入したスキルがあれば、出所を確認する。公式スキル以外は特に注意。

```bash
# インストール済みスキルの確認
ls ~/.openclaw/skills/
```

### 5. ソースコードのミラーリング（保険）

OpenClawはオープンソースだが、開発体制が変動しやすい（創設者のOpenAI移籍、財団化）。急にリポジトリが消えるリスクに備えて、privateミラーを持っておくと安心。

```bash
cd ~/projects
git clone https://github.com/openclaw/openclaw.git
cd openclaw
# forkではなくmirrorとして管理（fork関係を非公開にできる）
gh repo create yourname/openclaw-mirror --private
git remote rename origin upstream
git remote add origin https://github.com/yourname/openclaw-mirror.git
git push -u origin main --tags
```

定期的に同期：
```bash
git fetch upstream && git merge upstream/main --no-edit && git push origin main --tags
```

### 6. 自動更新の仕組み

手動更新は忘れる。cronで自動化しておく。

```bash
# バージョン比較して差分があれば更新
CURRENT=$(openclaw --version)
LATEST=$(npm view openclaw version)
if [ "$CURRENT" != "$LATEST" ]; then
  openclaw gateway update.run
fi
```

ただし、破壊的変更のリスクがあるため、ミラーでロールバック可能な状態にしてから自動化すること。

## OpenClawのセキュリティは「AIエージェント全体の課題」

OpenClawの問題は、OpenClaw固有ではない。AIエージェントが本質的に持つリスクだ。

**広範なシステム権限：** ファイルアクセス、コマンド実行、ネットワーク通信。これらがなければエージェントは役に立たないが、あれば攻撃面が巨大になる。

**マーケットプレイスの信頼モデル：** npmやChrome Web Storeと同じ問題がスキルマーケットプレイスでも発生する。「便利なスキル」と「悪意あるスキル」の区別は、レビューだけでは限界がある。

**「自分のマシンで動く」という安心感の罠：** SaaSと違い「データは手元にある」という安心感があるが、ローカル実行だからこそ、侵害されたときの被害はSaaS以上になりうる。

## まとめ

OpenClawは強力なツールだが、セキュリティ面ではまだ成熟途上にある。個人運用者として、以下を心がけている：

1. **更新を自動化する** — セキュリティ修正は速やかに適用
2. **ミラーを持つ** — ロールバック可能にしてから自動化
3. **loopbackバインド** — 外部接続が不要ならloopback
4. **スキルは慎重に** — 公式以外は出所を確認
5. **CHANGELOGを読む** — セキュリティ修正の内容を把握してから更新

AIエージェントの時代はまだ始まったばかりだ。便利さとセキュリティのバランスは、運用者自身が判断するしかない。

---

*この記事は、筆者がOpenClawのv2026.2.17→v2026.2.19-2への更新で実際に遭遇した問題と対応を元に書いています。*
