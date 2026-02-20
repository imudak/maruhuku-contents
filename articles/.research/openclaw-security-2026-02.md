# OpenClaw セキュリティ調査メモ（2026年2月）

調査日: 2026-02-20
記事: openclaw-security-hardening-2026.md

## ソース

- https://conscia.com/blog/the-openclaw-security-crisis/ (2026-02-18)
- https://thehackernews.com/2026/02/openclaw-bug-enables-one-click-remote.html (2026-02-02)
- https://socradar.io/blog/cve-2026-25253-rce-openclaw-auth-token/
- https://www.theregister.com/2026/02/02/openclaw_security_issues/
- https://security.utoronto.ca/advisories/openclaw-vulnerability-notification/ (2026-02-03)

## CVE-2026-25253

- CVSS 8.8, CWE-669 (Incorrect Resource Transfer Between Spheres)
- Control UIがgatewayUrlをクエリ文字列から無検証で信頼
- WebSocket接続時にgatewayトークンを送信 → トークン窃取 → RCE
- localhost-boundインスタンスでも攻撃可能
- v2026.1.29で修正（2026-01-30リリース）
- GHSA: https://github.com/openclaw/openclaw/security/advisories/GHSA-g8p2-7wf7-98mq
- 発見者: Mav Levin (DepthFirst)

## ClawHavocキャンペーン

- ClawHub（スキルマーケットプレイス）での大規模サプライチェーン攻撃
- 初期発見: 341件の悪意あるスキル
- 追加調査: 800件以上（レジストリの約20%）
- 配布マルウェア: Atomic macOS Stealer (AMOS)
- レジストリ総数: 当初2,857件 → 10,700件以上に成長

## インターネット露出

- 30,000台以上が認証なしで公開（Censys, Bitsight, Hunt.io調査）
- 企業端末上の「Shadow AI」としての展開も確認（Bitdefender GravityZone telemetry）

## アーキテクチャ上の構造的リスク（Conscia分析）

- 認証情報が平文ファイルに保存
- WebSocket接続にオリジン検証なし
- マーケットプレイスの審査が最小限

## OpenClawの経緯

- 2025年11月: オーストリアの開発者Peter Steinbergerが「Clawdbot」としてリリース
- Anthropicの商標圧力で2回改名 → OpenClawに
- 2026年1月末: GitHub 180,000スター超、週200万訪問者
- 2026年2月14日: SteinbergerがOpenAI移籍発表、独立財団化へ

## v2026.2.19 セキュリティ修正一覧（CHANGELOGから抽出）

### ネットワーク
- ws:// plaintext non-loopbackブロック (#20803)
- SSRF: NAT64/6to4/Teredo IPv6対応
- SSRF: dotted-decimal IPv4のみ許可、octal/hex/short/packed拒否
- ブラウザURL navigationのSSRFガード (browser.ssrfPolicy)
- Canvas/A2UIをnode-scoped capability URLに変更
- OTLP endpoint URL sanitize (#13791)

### 認証・認可
- gateway.auth.tokenデフォルト自動生成 (#20686)
- hooks.token == gateway.auth.token 起動時拒否 (#20813)
- 非CLIクライアントの最小権限化（cron/gateway/whatsapp_login → owner-only）
- Discord moderation actionの権限チェック強化
- WebChatからのsessions.patch/delete ブロック
- config.apply/patch/update.run のレート制限（3req/min per device+IP）
- ACP: duplicate-session refresh, idle reaping, burst rate limiting
- ACP: prompt text 2MiB制限

### コマンド実行
- execSync → execFileSync (#20655)
- safeBins: 信頼パスからの解決必須
- safeBins: ファイル存在オラクル除去
- safeBins: output/recursive flags ブロック (sort -o, grep -f等)
- Lobster (Windows): シェルフォールバック除去
- exec script preflight: workdir境界制約

### プラグイン・スキル
- プラグインパス脱出防止（realpath検証）
- スキルパッケージのシンボリックリンク拒否
- unpinnedプラグイン警告 + integrity drift検出
- plugins.allow空 + 発見可能プラグインがある場合の警告
- load-path provenance なしプラグインの警告

### メディア・ファイル
- TTS temp file: crypto.randomBytes + owner-only perms (#20654)
- Feishu media: パストラバーサル防止（UUID化）
- LINE media: UUID-based temp paths (#20792)
- saveMediaSource: TOCTOU/symlink swap対策

### チャネル固有
- Telegram: message/channel_post統一
- Telegram: topic target対応 (cron/heartbeat)
- iMessage: SSH/SCP strict host-key verification
- Feishu: mention regex injection/ReDoS防止 (#20916)
- Feishu: webhook-mode token preconditions, loopback bind
- Zalo: replay dedupe, constant-time secret comparison
- Discord: backtick escape in exec-approval embed (#20854)
- Matrix: matrix.to mention format対応 (#16941)

### その他
- セキュリティヘッダー（X-Content-Type-Options, Referrer-Policy）追加 (#10526)
- YAML frontmatter: YAML 1.2 core schema（on/off暗黙変換防止）(#20857)
- Dependabot security patches (#20832)
- @cypress/requestへの移行 (#20836)
- Cron webhook: SSRF-guarded fetch
- coding-agentスキル: shell-command injection防止
