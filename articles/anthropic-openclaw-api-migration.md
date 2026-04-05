---
title: "AnthropicがOpenClawのMAXプラン利用を終了——APIキー移行で何が変わったか"
emoji: "🔑"
type: "tech"
topics:
  - anthropic
  - claude
  - openclaw
  - api
  - claudecode
published: false
---

2026年4月4日（日本時間4月5日早朝）、Anthropicがひとつの変更を発表しました。

**Claude ProおよびMAXプランのサブスクリプション枠が、OpenClawなどサードパーティツールには適用されなくなった**

私はこの変更によってOpenClawをAPIキー方式に移行しました。その際に理解したことを整理しておきます。

## 何が変わったのか

Anthropicの[Boris Cherny（Claude Code責任者）の投稿](https://x.com/bcherny/status/2040206440556826908)によると、サードパーティツールはプロンプトキャッシュのヒット率が低く、AnthropicのリソースをMAXプランの想定以上に消費していたとのことです。

> 「サードパーティのサービスはこの最適化が行われていないため、持続的に提供することが難しい」

変更の内容を整理します。

| 変更前 | 変更後 |
|--------|--------|
| MAXサブスク枠でOpenClaw動作 | MAXサブスクはAnthropic公式ツールのみ |
| 追加課金なし | Extra Usage（従量制）またはAPIキーが必要 |

## 3つの選択肢

この変更に対して、取れる選択肢は以下の3つです。

### A. Anthropic APIキーに移行する

`platform.claude.com`でAPIキーを発行し、OpenClawの認証方式をtoken認証からAPIキー認証へ切り替えます。トークン使用量ベースの従量課金になります。

### B. Extra Usageを使う

claude.aiのサブスク設定からExtra Usageを有効化します。サブスク額の上限を超えた分が別途請求されます。ただしプロンプトキャッシュは効きません。

### C. OpenClaw自体を使わない

Claude Codeなど公式ツールのみに絞ります。ただしDiscord連携や定期実行などの機能は失われます。

## APIキー方式を選んだ理由

私はA案（APIキー）を選びました。理由はOpenClawのドキュメントに明記されていた一文です。

> *Prompt caching is API-only; legacy Anthropic token auth does not honor cache settings.*

OpenClawのシステムプロンプトはMEMORY.mdやSOUL.mdなど複数のコンテキストファイルを含むため、相当な長さになります。プロンプトキャッシュが効くかどうかは、コストに直結します。

API方式では繰り返し送信される部分のトークンコストを最大90%削減できます。Extra Usage経由ではこれが適用されません。

## 移行後の構成

移行後の課金先の整理です。

| 用途 | ツール | 課金先 |
|------|--------|--------|
| Discord対話・cronプロンプト実行 | OpenClaw | Anthropic APIキー（従量課金） |
| コード実装・百式巡回の実装部分 | Claude Code CLI | MAXサブスク |

**Claude Codeは公式ツールのため、MAXプランが引き続き適用されます。** 変更の影響を受けるのはOpenClaw部分だけです。

cronの流れで言うと、OpenClawがスケジュールを管理しプロンプト判断をAPIキーで行い、実装の委譲先であるClaude CodeはMAXプランが使われます。

## Anthropicからの補償

今回の変更に際して、Anthropicは以下を提供しています。

- **既存サブスク額相当のクレジット**（4月17日まで有効）
- **Extra Usageバンドルの30%割引**

MAXx20（$200/月）の場合、$200相当のクレジットが付与されます。APIキー方式でも`platform.claude.com`側にクレジットが付与されているか確認しておきましょう。

## 移行手順

OpenClawの設定ファイル（`~/.openclaw/openclaw.json`）を以下のように変更します。

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

モデルをOpusからSonnetに変えているのはコスト最適化のためです。重要な判断が必要な場合は`/model opus`で一時的に切り替えられます。

## まとめ

今回の変更は突然でしたが、**APIキーへの移行によって実質的な運用への影響はほぼありません。** むしろプロンプトキャッシュが有効になったことでコスト面では改善しています。

課金体系が明確になったとも言えます。OpenClaw（対話・自律実行）はAPIキー従量課金、Claude Code（実装）はMAXサブスク、という棲み分けです。

Anthropicがプロンプトキャッシュ最適化のPRをOpenClawに送ったというのも興味深い点です。公式ツールとサードパーティの共存をある程度意識していることが伝わります。
