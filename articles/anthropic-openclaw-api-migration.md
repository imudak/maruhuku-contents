---
title: "AnthropicがOpenClawのMAXプラン利用を終了——APIキー移行で何が変わったか【Part 1】"
emoji: "🔑"
type: "tech"
topics:
  - anthropic
  - claude
  - openclaw
  - api
  - claudecode
published: true
---

朝起きたらDiscordのボットが返事をしなくなっていました。

2026年4月5日の早朝、Anthropicが変更を発表しました。Claude ProおよびMAXプランのサブスクリプション枠が、OpenClawなどサードパーティツールには適用されなくなったとのことです。前日の4月4日（PT時間）から発効していました。

OpenClawをAPIキー方式に移行したので、その記録を残しておきます。

## 何が変わったのか

[Boris Cherny（Claude Code責任者）の投稿](https://x.com/bcherny/status/2040206440556826908)によると、サードパーティツールはプロンプトキャッシュのヒット率が低く、Anthropicのリソースを想定以上に消費していたとのことです。

> 「サードパーティのサービスはこの最適化が行われていないため、持続的に提供することが難しい」

変更の前後をまとめると次のとおりです。

| 変更前 | 変更後 |
|--------|--------|
| MAXサブスク枠でOpenClaw動作 | MAXサブスクはAnthropic公式ツールのみ |
| 追加課金なし | Extra Usage（従量制）またはAPIキーが必要 |

## Extra UsageかAPIキーか

選択肢として浮かんだのは2つでした。

- claude.aiのExtra Usageを有効化してそのまま使い続ける
- `platform.claude.com`でAPIキーを発行してOpenClawに設定する

Extra UsageはMAXサブスク上限の超過分が別途請求される仕組みです。一見手軽ですが、OpenClawのドキュメントを確認すると気になる記述がありました。

> *Prompt caching is API-only; legacy Anthropic token auth does not honor cache settings.*

OpenClawのシステムプロンプトはMEMORY.mdやSOUL.mdなど複数のコンテキストファイルを含むため、相当な長さになります。プロンプトキャッシュが有効かどうかはコストに直結するので、APIキー方式を選ぶことにしました。API方式では繰り返し送信される部分のトークンコストを最大90%削減できます。

## 移行後の構成

課金先が整理されました。

```mermaid
graph LR
  Discord -->|メッセージ| OpenClaw
  OpenClaw -->|APIキー課金| Anthropic["Anthropic API"]
  OpenClaw -->|タスク委譲| ClaudeCode["Claude Code CLI"]
  ClaudeCode -->|MAXサブスク| AnthropicMax["Anthropic MAX"]
```

| 用途 | ツール | 課金先 |
|------|--------|--------|
| Discord対話・cronプロンプト実行 | OpenClaw | Anthropic APIキー（従量課金） |
| コード実装・百式巡回の実装部分 | Claude Code CLI | MAXサブスク |

Claude Codeは公式ツールのため、MAXプランが引き続き適用されます。変更の影響を受けるのはOpenClaw部分だけでした。

cronの流れで言うと、OpenClawがスケジュール管理とプロンプト判断をAPIキーで行い、実装の委譲先であるClaude CodeにはMAXプランが使われます。「判断」と「実装」で課金先が分離した形です。

## 補償について

今回の変更に際して、Anthropicは以下を提供しています。

- 既存サブスク額相当のクレジット（4月17日まで有効）
- Extra Usageバンドルの30%割引

MAX x20（$200/月）の場合、$200相当のクレジットが付与されます。APIキー方式へ移行した場合も`platform.claude.com`側にクレジットが付与されているので、コンソールで確認しておくとよいでしょう。

## 移行手順

OpenClawの設定ファイル（`~/.openclaw/openclaw.json`）を次のように変更します。

```json
{
  "auth": {
    "profiles": {
      "anthropic:default": {
        "provider": "anthropic",
        "mode": "api_key"
      }
    }
  },
  "env": {
    "ANTHROPIC_API_KEY": "sk-ant-..."
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6"
      }
    }
  }
}
```

変更後はゲートウェイを再起動します。

```bash
systemctl --user restart openclaw-gateway
```

モデルをOpusからSonnetに変えているのはコスト最適化のためです。重要な判断が必要な場面では`/model opus`で一時的に切り替えられます。

## まとめ

移行後は実質的な運用への影響はほぼありませんでした。むしろプロンプトキャッシュが有効になり、コスト面では改善しています。

OpenClaw（対話・自律実行）はAPIキー従量課金、Claude Code（実装）はMAXサブスクという棲み分けに落ち着いています。

なお、Boris ChernyはプロンプトキャッシュのヒットRate改善PRをOpenClaw本体に送ったとも述べています。公式ツールとサードパーティの共存を意識している様子は伝わりました。

## 続編

移行後の翌朝（4月6日）、コンソールを開いたら直近2日間で$40を超えていました。原因はcronのClaude CodeがAPIキーで動いていたことでした。

→ [OpenClaw APIキー移行後に想定外の出費——cronのClaude Codeが原因だった](https://zenn.dev/imudak/articles/anthropic-openclaw-api-migration-part2)

さらに、GitHub Copilotのリクエスト課金がAI常駐用途に向いている理由については別記事にまとめています。

→ [GitHub CopilotのリクエストはなぜAI常駐用途に向いているのか](https://zenn.dev/imudak/articles/copilot-request-billing-vs-token)
