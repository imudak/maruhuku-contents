---
title: "ドキュメントが嘘をつかない仕組み — フロー定義書に動的検証を埋め込む"
emoji: "📋"
type: "tech"
topics:
  - AI
  - CLI
  - ドキュメント
  - 自動化
published: false
---

## ドキュメントと現実の乖離という根深い問題

「ドキュメントが古い」——開発現場でよく聞く言葉です。しかし、AIエージェントにシステム管理を委ねている場合、この問題は想定以上に深刻な形で現れることがあります。

筆者は OpenClaw + Claude Code を使って、AI エージェント（クロウ候）に開発・運用業務を自動化させています。エージェントが自律的に動き続けることで、人間が寝ている間も各種ジョブが実行される体制です。

ある日、こんな指摘を受けました。

> 「cronのドキュメント内容、古くないですか？」

確認すると、**cron-management.md のジョブ一覧と実際の cron 登録内容が完全に乖離していました**。

## 実態調査の結果：衝撃の乖離

`openclaw cron list` で現状を確認し、ドキュメントと照合した結果がこちらです：

**ドキュメントにあるが存在しないジョブ（3件）**
- マネタイズ100パターン自律実行
- Notion AI記事定期整理
- 事務総長ヘルスチェック

**存在するがドキュメントにないジョブ（6件）**
- flow-manager-quality-trend
- 発掘サイクル ×3
- 週次判断サマリー
- 週次フォーカス提案

**さらに深刻な問題**
- 配信先の Discord チャンネルが削除済み: **2件**

これは単純なドキュメント更新漏れの問題ではありません。AIエージェントはフロー定義書を「正の情報源」として参照して行動を決定します。**ドキュメントが嘘をつくと、エージェントの判断も誤る**わけです。

## なぜこうなったのか：静的チェックの限界

flow-manager CLI には既にいくつかのチェック機能があります。

```bash
# 構造チェック（ファイルフォーマット・用語統一など）
flow-manager lint

# リンク切れチェック
flow-manager check-links

# 品質スコア
flow-manager score
```

これらは**静的チェック**——つまり「ドキュメント自体が正しい形式か」を確認します。

しかし、「**ドキュメントに書いてあることが、実際の実行環境でも正しいか**」は検証できません。

```
静的チェックで検出できること:
  ✅ Markdownの構造が正しいか
  ✅ リンクが有効か
  ✅ 用語が統一されているか

静的チェックで検出できないこと:
  ❌ ドキュメントに記載したcronジョブが実際に存在するか
  ❌ APIエンドポイントが生きているか
  ❌ 設定ファイルが期待通りの内容か
  ❌ 配信先チャンネルが存在するか
```

ドキュメント自体は文法的に正しくても、現実との乖離は検出できない。これが静的チェックの根本的な限界です。

## 解決策：ドキュメントにアサーションを埋め込む

「ドキュメントの中に、検証コマンドを書いてしまえばいい」——この発想が解決策の起点です。

Markdown ファイルに HTML コメント形式でアサーションを埋め込み、CLIでそのコメントを抽出して実行する仕組みを作りました。

### 3種類のアサーション形式

```markdown
<!-- ASSERT: コマンド -->
```
コマンドの終了コードが 0 なら成功。最もシンプルな形式。

```markdown
<!-- ASSERT-MATCH: コマンド | 期待する文字列 -->
```
コマンドの標準出力に期待する文字列が含まれれば成功。

```markdown
<!-- ASSERT-COUNT: コマンド | 最小件数 -->
```
コマンドの出力を数値として解釈し、指定した最小値以上なら成功。

### 実際のcron-management.mdへの適用例

```markdown
# cron管理フロー

## ジョブ一覧（正の情報源）

<!-- ASSERT: openclaw cron list 2>/dev/null | grep -q "CLI定期アップデート" -->
<!-- ASSERT: openclaw cron list --json 2>/dev/null | grep -q "flow-manager-health-daily" -->
<!-- ASSERT-MATCH: openclaw cron list 2>/dev/null | grep "日報生成" | 日報生成 -->
<!-- ASSERT-MATCH: openclaw cron list --json 2>/dev/null | grep "flow-manager-consistency-weekly" | flow-manager-consistency-weekly -->
<!-- ASSERT-COUNT: openclaw cron list 2>/dev/null | grep -c "isolated" | 7 -->
```

ドキュメントを読む人間には HTML コメントなので表示されません。しかし CLI ツールにはアサーションとして解釈・実行されます。**ドキュメントに自己検証能力を持たせる**イメージです。

## verify コマンドの実装

```typescript
// REQ-VERIFY-002, REQ-VERIFY-003, REQ-VERIFY-004: Three assertion types
export interface Assertion {
  flow: string;
  type: "ASSERT" | "ASSERT-MATCH" | "ASSERT-COUNT";
  command: string;
  expected?: string;
  line: number;
}
```

### アサーションの抽出

正規表現で Markdown ファイルから HTML コメントを抽出します：

```typescript
export function extractAssertions(content: string, flowName: string): Assertion[] {
  const assertions: Assertion[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ASSERT: コマンドの終了コードで判定
    const assertMatch = line.match(/<!--\s*ASSERT:\s*(.+?)\s*-->/);
    if (assertMatch) {
      assertions.push({
        flow: flowName,
        type: "ASSERT",
        command: assertMatch[1],
        line: i + 1,
      });
      continue;
    }

    // ASSERT-MATCH: 出力に文字列が含まれるか
    const matchMatch = line.match(/<!--\s*ASSERT-MATCH:\s*(.+)\s*\|\s*([^|]+?)\s*-->/);
    if (matchMatch) {
      assertions.push({
        flow: flowName,
        type: "ASSERT-MATCH",
        command: matchMatch[1].trim(),
        expected: matchMatch[2].trim(),
        line: i + 1,
      });
      continue;
    }

    // ASSERT-COUNT: 出力を数値として比較
    const countMatch = line.match(/<!--\s*ASSERT-COUNT:\s*(.+?)\s*\|\s*(\d+)\s*-->/);
    if (countMatch) {
      assertions.push({
        flow: flowName,
        type: "ASSERT-COUNT",
        command: countMatch[1].trim(),
        expected: countMatch[2].trim(),
        line: i + 1,
      });
      continue;
    }
  }

  return assertions;
}
```

### アサーションの実行

`child_process.execSync` で実行し、タイムアウトは 10 秒です：

```typescript
export function executeAssertion(assertion: Assertion): AssertionResult {
  try {
    const output = execSync(assertion.command, {
      encoding: "utf-8",
      timeout: 10000,  // 10秒タイムアウト
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    switch (assertion.type) {
      case "ASSERT":
        // exit code 0 = 成功
        return { assertion, passed: true, output };

      case "ASSERT-MATCH":
        const matchPassed = output.includes(assertion.expected!);
        return {
          assertion,
          passed: matchPassed,
          error: matchPassed
            ? undefined
            : `Expected "${assertion.expected}" not found in output`,
        };

      case "ASSERT-COUNT": {
        const actual = parseInt(output, 10);
        const minimum = parseInt(assertion.expected!, 10);
        const countPassed = !isNaN(actual) && actual >= minimum;
        return {
          assertion,
          passed: countPassed,
          error: countPassed
            ? undefined
            : `Expected >= ${minimum}, got ${actual}`,
        };
      }
    }
  } catch (err: any) {
    if (err.killed || err.signal === "SIGTERM") {
      return { assertion, passed: false, error: "Timeout (10s)" };
    }
    if (assertion.type === "ASSERT") {
      return { assertion, passed: false, error: `Exit code: ${err.status}` };
    }
    return { assertion, passed: false, error: err.message };
  }
}
```

### 実行結果の出力例

```bash
$ flow-manager verify

📋 cron-management.md (5 assertions)
  ✅ L18 [] openclaw cron list 2>/dev/null | grep -q "CLI定期アップデート"
  ✅ L19 [] openclaw cron list --json 2>/dev/null | grep -q "flow-manager-health-daily"
  ✅ L20 [MATCH] openclaw cron list 2>/dev/null | grep "日報生成"
  ✅ L21 [MATCH] openclaw cron list --json 2>/dev/null | grep "flow-manager-consiste...
  ✅ L22 [COUNT] openclaw cron list 2>/dev/null | grep -c "isolated"

────────────────────────────────────────
結果: ✅5件成功 / ❌0件失敗 / 計5件
```

特定フローだけを検証する `--flow` オプションや、CI 連携向けの `--json` オプションも実装しました。

```bash
# 特定フローのみ検証
flow-manager verify --flow cron-management

# JSON出力（CI/パイプライン用）
flow-manager verify --json
```

## 初回実行で早速バグを発見

実装を完了して初回の `flow-manager verify` を実行すると、いきなり失敗が出ました。

```bash
📋 cron-management.md (5 assertions)
  ✅ L18 [] openclaw cron list 2>/dev/null | grep -q "CLI定期アップデート"
  ✅ L19 [] openclaw cron list --json 2>/dev/null | grep -q "flow-manager-health-daily"
  ❌ L20 [MATCH] openclaw cron list 2>/dev/null | grep "日報生成"
     → Expected "日報生成" not found in output
  ❌ L21 [MATCH] openclaw cron list --json 2>/dev/null | grep "flow-manager-consiste...
     → Expected "flow-manager-consistency-weekly" not found in output
  ✅ L22 [COUNT] openclaw cron list 2>/dev/null | grep -c "isolated"
```

「あれ？日報生成ジョブは存在しているはず」と思い、`openclaw cron list` を直接実行してみると…

```
日報生成（毎朝6:07...
```

**名前が省略表示されていました。**`openclaw cron list` は長い名前を途中で切り詰めて表示するため、`grep "日報生成"` は見つかっても、長い完全名でのマッチングを意図した別のアサーションが失敗していたのです。

この問題は2種類のアプローチで修正しました：

1. **JSONオプションを使う**（完全名が取得できる）
   ```markdown
   <!-- ASSERT: openclaw cron list --json 2>/dev/null | grep -q "日報生成" -->
   ```

2. **部分一致に変更する**
   ```markdown
   <!-- ASSERT-MATCH: openclaw cron list 2>/dev/null | grep "日報生" | 日報生 -->
   ```

この「初回実行で即バグ発見」こそが、動的検証の価値を示す象徴的なエピソードです。静的チェックでは絶対に発見できない、「実際に実行してみないとわからない挙動の差異」を捉えました。

## MUSUBI（仕様駆動開発）との統合

この機能は、仕様駆動開発フレームワーク「MUSUBI」に従って実装しました。

### EARS形式の要件定義（抜粋）

```markdown
### REQ-VERIFY-001

**When** ユーザーが `verify` コマンドを実行する場合、
**the system shall** `docs/flows/*.md` の全フロー定義書を走査して
アサーションコメントを抽出し、各アサーションを順次実行して結果を集計・報告する。

**受入基準:**
- アサーションが0件の場合は専用メッセージを出力すること
- 全アサーション通過時は終了コード0で終了すること
- 1件以上失敗時は終了コード1で終了すること

### REQ-VERIFY-007

**The system shall** コマンド実行時に10秒のタイムアウトを設け、
タイムアウト時は失敗として報告する。
```

### 実装コードへのREQ-IDコメント

```typescript
// REQ-VERIFY-001: Extract assertions from flow definition
export function extractAssertions(content: string, flowName: string): Assertion[] {
  ...
}

// REQ-VERIFY-007: Execute with 10s timeout
export function executeAssertion(assertion: Assertion): AssertionResult {
  const output = execSync(assertion.command, {
    timeout: 10000,  // REQ-VERIFY-007
    ...
  });
  ...
}
```

### テストコードへのREQ-ID参照

```typescript
// tests/commands/verify.test.ts
describe("extractAssertions", () => {
  it("REQ-VERIFY-002: ASSERT型を抽出できる", () => {
    const content = '<!-- ASSERT: echo "hello" -->';
    const result = extractAssertions(content, "test");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("ASSERT");
  });

  it("REQ-VERIFY-003: ASSERT-MATCH型を抽出できる", () => {
    const content = '<!-- ASSERT-MATCH: echo "hello world" | hello -->';
    const result = extractAssertions(content, "test");
    expect(result[0].type).toBe("ASSERT-MATCH");
    expect(result[0].expected).toBe("hello");
  });
});
```

最終的な成果：
- **要件定義**: REQ-VERIFY-001〜008（8件）
- **実装**: 全関数に REQ-ID コメント
- **テスト**: 12テスト、全 REQ-ID 参照
- **musubi-gaps detect**: Gap **0件**、100% トレーサビリティ維持

## ドキュメントとしての可読性を損なわない設計

重要な設計原則として、**人間が読む際の可読性を損なわない**ことを優先しました。

```markdown
## ジョブ一覧（正の情報源）

<!-- ASSERT: openclaw cron list 2>/dev/null | grep -q "CLI定期アップデート" -->
<!-- ASSERT-COUNT: openclaw cron list 2>/dev/null | grep -c "isolated" | 7 -->

### 日次ジョブ

| ジョブ名 | スケジュール | 配信先 | 説明 |
|---------|-------------|--------|------|
| CLI定期アップデート | 06:00 | announce | Claude Code/Codex更新 |
| 日報生成 | 06:07 | #合同会社 | 前日活動を日報として記録 |
```

HTML コメントは Markdown レンダリング時には非表示。普段ドキュメントを読む人には見えませんが、`flow-manager verify` を実行すると自動的に検証されます。

この「ドキュメントの中に検証コードが潜んでいる」構造は、テストコードと仕様書を一体化する試みです。

## 今後の展開

### 他のフロー定義書へのアサーション追加

現在 cron-management.md に実装済みですが、他のフローにも順次追加していきます：

```markdown
<!-- jimucho API の疎通確認 -->
<!-- ASSERT: curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/health | grep -q "200" -->

<!-- 必須ファイルの存在確認 -->
<!-- ASSERT: test -f ~/projects/flow-manager/docs/flows/work-protocol.md -->

<!-- Discordチャンネルへの到達確認（特定メッセージが取得できるか）-->
<!-- ASSERT-COUNT: openclaw channel list 2>/dev/null | grep -c "1474700912705409227" | 1 -->
```

### cron との連携による定期実行

`flow-manager verify` を cron ジョブとして登録すれば、常に最新の状態でドキュメントの整合性を確認できます：

```bash
# 週次でverifyを実行し、失敗があればDiscordに通知
openclaw cron add "flow-definition-verify" \
  --schedule "0 9 * * 1" \
  --payload '{"type": "agentTurn", "message": "flow-manager verifyを実行して、失敗したアサーションをDiscordに報告してください"}'
```

### 失敗時の自動修復フロー

将来的には、失敗したアサーションに対してエージェントが自動的に修復アクションを提案・実行するフローも構想しています。

## まとめ：「自己検証するドキュメント」という考え方

この取り組みを振り返ると、核心にある考え方は **「ドキュメントは仕様書ではなく、実行可能なテストスイートであるべき」** ということです。

| 従来の静的ドキュメント | 動的アサーション付きドキュメント |
|----------------------|-------------------------------|
| 書いた時点でのみ正確 | 実行のたびに正確さを検証 |
| 乖離は手動発見 | 乖離を自動検出 |
| CIと分離 | CI/cronに統合可能 |
| 読む人だけのもの | 人間とシステム両方が使う |

AIエージェントがシステムを管理する時代、エージェントが参照するドキュメントの信頼性は特に重要です。「ドキュメントが嘘をつかない仕組み」は、エージェントの判断品質を直接支える基盤になります。

cron ジョブの増減、API エンドポイントの変更、設定ファイルのパス変更——こうした変更が起きるたびにドキュメントとの乖離リスクが生まれます。しかし、ドキュメント自体が検証コードを内包していれば、乖離は次の verify 実行時に即座に明らかになります。

**「動的検証の仕組みを先に作っておく」——これがドキュメントメンテナンスの負債を溜めないための、地味だが効果的なアプローチです。**

---

## 参考

- [flow-manager](https://github.com/imudak/flow-manager) — 本記事で紹介したツール
- [MUSUBI](https://github.com/nahisaho/MUSUBI) — 仕様駆動開発フレームワーク
- [OpenClaw](https://openclaw.dev) — AIエージェント基盤
