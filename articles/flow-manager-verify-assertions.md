---
title: "ドキュメントが嘘をつかない仕組み — Markdownに動的テストを埋め込む"
emoji: "📋"
type: "tech"
topics:
  - AI
  - CLI
  - ドキュメント
  - 自動化
published: false
---

## はじめに

筆者は合同会社で、AIエージェント（OpenClaw + Claude）にシステム運用を任せています。cronジョブの管理、データベースの整合性チェック、品質レポートの生成——こうした定型業務をエージェントが自律的にこなす体制です。

エージェントは**フロー定義書**（Markdown）を「正の情報源」として参照し、行動を決定します。たとえば「cronジョブを追加するときの手順」はフロー定義書に書かれていて、エージェントはそれに従います。

ある日、こう指摘されました。

> 「cronのドキュメント内容、古くないですか？」

確認してみると、**フロー定義書のジョブ一覧と、実際のcron登録が完全に乖離していました。**

## 乖離の実態

実際のcronジョブ一覧（`openclaw cron list`）とドキュメントを突き合わせた結果です。

**ドキュメントに書いてあるが、実際には存在しないジョブ：3件**
**実際に動いているが、ドキュメントに書かれていないジョブ：6件**
**配信先に指定されたDiscordチャンネルが、すでに削除済み：2件**

ドキュメントが嘘をついていたわけです。エージェントがこのドキュメントを参照して「今こういうジョブが動いているはず」と判断していたら、完全に間違った前提で行動することになります。

## 静的チェックでは検出できない

筆者は運用フロー定義書の管理ツール（Node.js CLI）を自作しており、いくつかのチェック機能を持っています。

- **構造チェック**: Markdownのセクション構成が正しいか
- **リンク切れチェック**: 他ドキュメントへの参照リンクが有効か
- **品質スコアリング**: 4軸で定義書の完成度を0-100点で採点

これらは**静的チェック**です。ドキュメントのテキストだけを見て、形式的な正しさを確認します。

しかし、今回の問題はこうです：

> ドキュメントに「日報生成ジョブ（毎朝6:07）」と書いてある。
> **実際にそのジョブが存在するかどうかは、cronシステムに問い合わせないとわからない。**

これは静的チェックでは原理的に検出できません。ドキュメントの文面自体はMarkdownとして完璧に正しいからです。

## 解決策：ドキュメントに「テストコマンド」を埋め込む

発想はシンプルです。**ドキュメントの中に、検証用のコマンドをコメントとして書いてしまう。** そしてCLIツールがそのコメントを見つけて、実際にコマンドを実行し、結果を判定する。

こんな感じです：

```markdown
## ジョブ一覧

以下のcronジョブが稼働しています。

<!-- ASSERT: openclaw cron list 2>/dev/null | grep -q "日報生成" -->

| ジョブ名 | スケジュール | 説明 |
|---------|-------------|------|
| 日報生成 | 毎朝 06:07 | 前日の活動を日報として記録 |
```

`<!-- ASSERT: ... -->` がポイントです。これはHTMLコメントなので、Markdownをレンダリングすると**人間には見えません**。しかしCLIツールはこのコメントを検出し、中のコマンドを実行します。

`openclaw cron list | grep -q "日報生成"` が成功（exit code 0）なら、「日報生成ジョブは実際に存在する」と確認できます。失敗すれば、「ドキュメントには書いてあるが、実際には存在しない」と検出できます。

**これが「動的テスト」です。** ドキュメントの内容が正しいかどうかを、実際にシステムに問い合わせて検証します。

## 3種類のアサーション

用途に応じて3種類の形式を用意しました。

### ASSERT: コマンドが成功するか

```markdown
<!-- ASSERT: curl -s http://localhost:3100/health | grep -q "ok" -->
```

コマンドの終了コードが0なら成功。「このAPIは生きているか？」「このファイルは存在するか？」といったYes/No判定に使います。

### ASSERT-MATCH: 出力に特定の文字列が含まれるか

```markdown
<!-- ASSERT-MATCH: openclaw cron list 2>/dev/null | flow-manager-quality -->
```

コマンドの標準出力に、`|` の右側の文字列が含まれていれば成功。「一覧の中にこの項目があるか？」という確認に使います。

### ASSERT-COUNT: 件数が足りているか

```markdown
<!-- ASSERT-COUNT: ls docs/flows/*.md | wc -l | 20 -->
```

コマンドの出力を数値として解釈し、`|` の右側の数値以上なら成功。「フロー定義は最低20本あるはず」といった確認に使います。

## 実行してみる

CLIで `verify` コマンドを実行すると、全フロー定義書からアサーションを抽出して順番に実行します。

```bash
$ flow-manager verify

📋 cron-management.md (5 assertions)
  ✅ L24 [exit=0] openclaw cron list | grep -q "CLI定期アップデート"
  ✅ L25 [exit=0] openclaw cron list | grep -q "日報生成"
  ✅ L26 [exit=0] openclaw cron list | grep -q "flow-manager-health"
  ✅ L27 [exit=0] openclaw cron list | grep -q "週報生成"
  ✅ L28 [MATCH]  openclaw cron list | flow-manager-quality

────────────────────────────────────────
📊 結果: ✅ 5 / ❌ 0 / 合計 5
🎉 全アサーションPASS
```

特定のフローだけ検証することもできます：

```bash
$ flow-manager verify --flow cron-management
```

## 初回実行で早速バグを発見した話

実装して最初に実行したとき、いきなり2件失敗しました。

```bash
  ❌ L26 [exit=0] openclaw cron list | grep -q "flow-manager-health-daily"
     → Exit code: 1
  ❌ L28 [MATCH]  openclaw cron list | flow-manager-quality-trend
     → Expected "flow-manager-quality-trend" not found in output
```

「あれ？ジョブは存在しているはずなのに……」

原因を調べると、`openclaw cron list` が長い名前を省略表示していました：

```
flow-manager-quality-...    ← "trend" が切れている
flow-manager-health-d...    ← "aily" が切れている
```

完全な名前でgrepしていたので見つからなかったのです。アサーションを部分一致に修正して解決しました。

**この「初回実行で即バグ発見」が、動的テストの価値を端的に示すエピソードです。** 静的チェックでは絶対に見つからない、「実際に実行してみないとわからない挙動」を捉えました。

## 実装のポイント

### アサーションの抽出

正規表現でHTMLコメントからアサーションを抽出します。

```typescript
export function extractAssertions(content: string, flowName: string): Assertion[] {
  const assertions: Assertion[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // <!-- ASSERT: command -->
    const assertMatch = line.match(/<!--\s*ASSERT:\s*(.+?)\s*-->/);
    if (assertMatch) {
      assertions.push({
        flow: flowName,
        type: "ASSERT",
        command: assertMatch[1],
        line: i + 1,
      });
    }
    // ASSERT-MATCH, ASSERT-COUNT も同様に抽出
  }
  return assertions;
}
```

### アサーションの実行

`child_process.execSync` で実行します。各アサーションに10秒のタイムアウトを設けて、暴走を防ぎます。

```typescript
export function executeAssertion(assertion: Assertion): AssertionResult {
  try {
    const output = execSync(assertion.command, {
      encoding: "utf-8",
      timeout: 10000,  // 10秒でタイムアウト
    }).trim();

    switch (assertion.type) {
      case "ASSERT":
        return { assertion, passed: true };  // exit 0 = 成功

      case "ASSERT-MATCH":
        return {
          assertion,
          passed: output.includes(assertion.expected!),
        };

      case "ASSERT-COUNT": {
        const actual = parseInt(output, 10);
        const minimum = parseInt(assertion.expected!, 10);
        return {
          assertion,
          passed: !isNaN(actual) && actual >= minimum,
        };
      }
    }
  } catch (err: any) {
    // タイムアウトまたは非ゼロ終了
    return { assertion, passed: false, error: err.message };
  }
}
```

### テスト

テスト用のモックMarkdownを使って、アサーション抽出と実行のロジックを検証します。

```typescript
it("should extract ASSERT comments", () => {
  const content = `# Test\n<!-- ASSERT: echo hello -->`;
  const assertions = extractAssertions(content, "test-flow");
  expect(assertions).toHaveLength(1);
  expect(assertions[0].type).toBe("ASSERT");
  expect(assertions[0].command).toBe("echo hello");
});

it("should pass when command exits 0", () => {
  const assertion = { type: "ASSERT", command: "true", ... };
  const result = executeAssertion(assertion);
  expect(result.passed).toBe(true);
});

it("should fail with timeout for slow commands", () => {
  const assertion = { type: "ASSERT", command: "sleep 30", ... };
  const result = executeAssertion(assertion);
  expect(result.passed).toBe(false);
}, 15000);
```

## 活用例

cron以外にも、さまざまなフロー定義書で使えます。

```markdown
<!-- APIの疎通確認 -->
<!-- ASSERT: curl -sf http://localhost:3100/health -->

<!-- 必須ファイルの存在確認 -->
<!-- ASSERT: test -f ~/.config/app/settings.json -->

<!-- プロセスの稼働確認 -->
<!-- ASSERT: pgrep -x nginx -->

<!-- ログの最終更新が24時間以内か -->
<!-- ASSERT: find /var/log/app.log -mmin -1440 | grep -q . -->
```

cronジョブとして定期実行すれば、ドキュメントと実環境の乖離を常時監視できます。

## まとめ

| 従来のドキュメント | アサーション付きドキュメント |
|------------------|--------------------------|
| 書いた時点でのみ正確 | 実行のたびに正確さを検証 |
| 乖離は誰かが気づくまで放置 | 乖離を自動検出 |
| 人間が読むだけ | 人間が読み、システムが検証する |

やっていることは単純です。**ドキュメントの中に、そのドキュメントの正しさを検証するコマンドをコメントとして埋め込む。** それだけで、ドキュメントが「自己検証能力」を持ちます。

特にAIエージェントがドキュメントを参照して自律的に動く環境では、ドキュメントの正確さは判断品質に直結します。「ドキュメントが嘘をつかない仕組み」は、地味ですが確実に効く基盤です。

---

## 参考

- [MUSUBI](https://github.com/nahisaho/MUSUBI) — 仕様駆動開発フレームワーク
- [OpenClaw](https://github.com/openclaw/openclaw) — AIエージェント基盤
