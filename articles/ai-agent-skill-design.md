---
title: "せっかく一緒に調べたのに翌日には忘れてる — AIエージェントにスキルを持たせた話"
emoji: "🧠"
type: "tech"
topics:
  - AI
  - OpenClaw
  - Claude Code
  - AgentSkill
  - プロンプトエンジニアリング
published: true
---

## せっかく一緒に調べたのに、次の日には忘れている

AIエージェントと一緒にMUSUBIの公式ドキュメントを読み込んで、ファイル配置のルールを確認して、Change Managementの手順を整理して——「よし、これで完璧だ」と思った翌日。

新しいセッションで機能追加を依頼したら、**昨日決めたルールを全部忘れて自己流で作業を始めました。**

AIエージェントにはセッション間の記憶がありません。毎回ゼロからスタートです。じゃあ毎回同じドキュメントを読ませるのかというと、300行の手順書を毎回コンテキストに入れるのはトークンの無駄遣いです。

この問題を解決するのが「スキル」という仕組みでした。

## 知識 vs 手順

AIエージェントは膨大な知識を持っています。MUSUBIのことも、Reactのことも、SQLのことも「知って」います。

でも「知っている」と「正しく運用できる」は全然違います。

- ✅ 知識: 「MUSUBIは仕様駆動開発のフレームワーク」
- ❌ 手順: 「このプロジェクトでは `storage/specs/` に要件を書き、変更時は `musubi-change` を使う」

手順はプロジェクト固有で、かつ頻繁に変わります。これをエージェントに伝える仕組みが **スキル** です。

## スキルとは何か

スキルは、AIエージェントに特定のドメインの **手順書** を渡す仕組みです。毎回プロンプトに書く代わりに、ファイルとして用意しておき、必要な時だけ読み込ませます。

### Claude Code のスキル

`.claude/skills/` ディレクトリにSKILL.mdを配置します。

```
.claude/skills/musubi/
└── SKILL.md
```

Claude Codeはタスクの内容を見て、関連するスキルを自動的に読み込みます。

SKILL.mdの中身はシンプルです。

```markdown
---
name: musubi
description: "MUSUBI SDD workflow. Use for feature additions, spec changes, gap detection."
---

# MUSUBI — 仕様駆動開発

正の情報源: ~/projects/flow-manager/docs/flows/musubi.md（作業前に必ず読むこと）

## 正規フロー
1. /sdd-requirements → storage/specs/
2. /sdd-design → storage/design/
3. /sdd-tasks → storage/tasks/
4. /sdd-implement → テスト先行
5. /sdd-validate → constitution準拠確認

## 仕様変更
musubi-change init CHANGE-NNN --title "変更内容"
...
```

### OpenClaw のスキル

OpenClaw（AIエージェント基盤）では、`~/.openclaw/workspace/skills/` にスキルを配置します。

```
~/.openclaw/workspace/skills/musubi/
└── SKILL.md
```

こちらはエージェントがタスクの説明（description）を見て、自動的にスキルを選択・ロードします。

## 設計パターン

### パターン1: 正の情報源への参照

スキル自体に全ての手順を書くのではなく、**正の情報源（Single Source of Truth）を参照させる** 設計です。

```markdown
正の情報源: ~/projects/flow-manager/docs/flows/musubi.md（作業前に必ず読むこと）
```

スキルには要約だけを書き、詳細が必要な時は正の情報源を読みに行かせます。

**メリット:**
- 手順を更新する時、正の情報源1ファイルを直すだけで全エージェントに反映される
- スキルのサイズが小さくなり、コンテキストウィンドウを圧迫しない

### パターン2: 全プロジェクトへの配布

スキルをテンプレートリポジトリで管理し、全プロジェクトに配布します。

```bash
# テンプレートリポジトリからコピー
for d in ~/projects/*/; do
  mkdir -p "$d/.claude/skills/musubi"
  cp template/.claude/skills/musubi/SKILL.md "$d/.claude/skills/musubi/"
done
```

私の場合、maruhuku-hub（テンプレート管理リポジトリ）にスキルのマスターを置き、template-syncスキルで全プロジェクトに同期しています。

### パターン3: 二層スキル構成

OpenClaw用とClaude Code用で、同じ知識を二つのフォーマットで持ちます。

| レイヤー | 配置 | 用途 |
|---------|------|------|
| **オーケストレーター** | `~/.openclaw/workspace/skills/` | タスク判断・委譲時の知識 |
| **ワーカー** | `.claude/skills/`（各プロジェクト） | 実装時の手順 |

オーケストレーター（OpenClaw）は「どのフローを使うべきか」を判断し、ワーカー（Claude Code）は「具体的にどうファイルを配置するか」を知っています。

## スキルに書くべきこと・書かないこと

### 書くべきこと
- **ファイルの配置ルール** — どこに何を置くか
- **コマンドと手順** — 何をどの順で実行するか
- **禁止事項** — やってはいけないこと（例: `steering/features/` にSDD文書を置くな）

### 書かないこと
- **一般的な技術知識** — AIは既に知っている
- **プロジェクトの詳細な仕様** — それはsteering/やstorage/の仕事
- **長大なドキュメント** — コンテキストを圧迫する。参照にとどめる

## コンテキスト効率の考え方

AIエージェントのコンテキストウィンドウは有限です。全ての知識を毎回読み込ませるのは非効率です。

```
全ての知識をプロンプトに入れる → コンテキスト圧迫 → 他の情報が落ちる
                ↓ 改善
スキルで必要な時だけ読み込む → コンテキスト節約 → 精度向上
```

MUSUBIの運用手順書は300行以上あります。これを毎回コンテキストに入れるのは無駄です。スキルのdescriptionフィールドで「いつ読み込むか」を定義し、必要な時だけロードさせます。

```yaml
description: "MUSUBI SDD workflow. Use for feature additions, spec changes, gap detection."
```

この一文で、エージェントは「機能追加の話だからMUSUBIスキルを読もう」と判断できます。

## 効果

スキル導入前と後で、明確な差が出ました。

| | Before | After |
|---|--------|-------|
| SDD文書の配置 | 自己流（steering/features/等） | 統一（storage/specs/等） |
| Change Management | 使われない | `musubi-change` が使われる |
| musubi-gaps | 79件のギャップ | 0件 |
| 仕様変更の追跡 | 不可能 | Delta Specで追跡可能 |

## まとめ

AIエージェントの「わかったフリ」は、知識と手順のギャップから生まれます。

スキルはそのギャップを埋める仕組みです。ポイントは3つ：

1. **正の情報源を参照させる** — スキル自体は軽量に、詳細は別ファイルに
2. **全プロジェクトに配布する** — テンプレート同期で一元管理
3. **コンテキスト効率を意識する** — 必要な時だけロード、300行を毎回入れない

AIは知識を持っています。足りないのは、プロジェクト固有の手順です。

## 関連記事

https://zenn.dev/imudak/articles/musubi-not-really-using-it

https://zenn.dev/imudak/articles/musubi-greenfield-brownfield
