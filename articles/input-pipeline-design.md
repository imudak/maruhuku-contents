---
title: "一人会社のインプット処理パイプライン設計 — NotionからSQLiteへ"
emoji: "🔁"
type: "tech"
topics: ["notion", "sqlite", "ai", "個人開発", "automation"]
published: false
---

# 一人会社のインプット処理パイプライン設計 — NotionからSQLiteへ

個人でSaaSを開発しながら合同会社を運営していると、毎日大量の情報が押し寄せてくる。X（旧Twitter）でバズった記事、Reddit の不満ツイート、自分が深夜に思いついたアイデア……それらを「後で見る」に入れた瞬間、90%は永遠に忘れられる。

これは単純な怠惰ではなく、**処理システムの欠如**だ。

この記事では、私が Notion ベースの手動管理から脱却し、SQLite + AI + cron によるインプット処理パイプラインを設計・実装した経緯と、その具体的な設計を紹介する。

---

## なぜ Notion から移行したか

### Notion でやっていたこと

移行前は、以下のような Notion 構成で情報管理をしていた。

- **📥 未整理DB**: 気になった URL をとりあえず投入するインボックス
- **📚 インプットDB**: カテゴリ・メモを付けた中間ステージ
- **事業のタネDB**: 新規プロジェクト候補
- **改善ネタDB**: 自社開発の改善アイデア

流れ自体は悪くなかった。問題は「手動 + AI 補助」という運用だった。毎朝 Notion を開き、未整理に溜まった URL を一つひとつ確認して、AI に「これは事業のタネ？記事ネタ？」と聞きながら分類していた。

### 3つの痛点

#### 1. Notion API がボトルネック

Notion の API はレート制限が厳しく（3 req/秒）、バルク処理が遅い。100件の未処理インプットを一気に処理しようとすると、API 呼び出しだけで数分かかる。構造を変えたいときも「プロパティの型を変更できない」「フォーミュラが壊れる」といった問題が頻発した。

#### 2. パイプラインが暗黙知

「この情報は事業のタネになる」という判断基準が頭の中にしかなかった。AI に毎回ゼロから説明するか、プロンプトを使い回すかしかなく、判断の一貫性が保てなかった。同じ記事を処理しても、体調や気分次第で分類が変わる。

#### 3. 中間データが消失する

AI が分析した生データは Notion のプロパティに収まりきらない。「要約は記録したが、なぜその分類にしたかのロジックは保存していない」という状態になり、後から再分析しようとしても元データがなかった。

---

## 設計したパイプライン

### 全体像

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  取り込み    │────▶│  分析・振分  │────▶│  昇格・記事化 │
│  (Phase 1)  │     │  (Phase 2)  │     │  (Phase 3)   │
└─────────────┘     └─────────────┘     └──────────────┘
  毎日 10:33 JST      毎日 11:00 JST      毎日 11:30 JST
```

cron は 3本。すべて jimucho（自社の社内 API サーバー）が担当し、SQLite を直接読み書きする。

### データモデル（4テーブル）

```sql
-- インプット情報の蓄積（すべての起点）
CREATE TABLE inputs (
  id          TEXT PRIMARY KEY,  -- UUID
  title       TEXT,
  url         TEXT UNIQUE,
  source      TEXT,              -- twitter, article, discord, etc.
  memo        TEXT,
  description TEXT,              -- AI生成の要約
  category    TEXT,              -- 百式事業のタネ候補 / 開発プロセス改善 / 記事ネタ / 参考情報
  action      TEXT,
  analysis    TEXT,              -- AI判断の生データ（JSON）← ここが重要
  status      TEXT DEFAULT '未処理',
  notion_id   TEXT               -- 移行元Notion ID（レガシー）
);

-- 百式事業のタネDB（新規プロジェクト候補）
CREATE TABLE seeds (
  id              TEXT PRIMARY KEY,
  title           TEXT,
  url             TEXT,
  summary         TEXT,
  score           INTEGER DEFAULT 100,
  problem         TEXT,          -- 解決する課題
  tags            TEXT,          -- JSON配列
  source_input_id TEXT,          -- inputs.id への外部キー
  status          TEXT DEFAULT '未処理'
);

-- 記事ネタDB
CREATE TABLE articles (
  id              TEXT PRIMARY KEY,
  title           TEXT,
  theme           TEXT,
  angle           TEXT,          -- 切り口・着眼点
  source_url      TEXT,
  source_input_id TEXT,
  status          TEXT DEFAULT '未処理'
);

-- 開発・業務プロセス改善ネタ
CREATE TABLE kaizen_neta (
  id     TEXT PRIMARY KEY,
  title  TEXT,
  memo   TEXT,
  source TEXT,
  status TEXT DEFAULT '未着手'
);
```

ポイントは `inputs.analysis` カラムだ。AI の判断根拠を JSON で丸ごと保存しておくことで、後から「なぜこの分類になったか」を追跡でき、再分析も可能になる。

---

## Phase 1: 取り込み（毎日 10:33 JST）

### 何をするか

Notion 未整理DB と Discord の `#未整理` チャンネルから新着情報を取得し、`inputs` テーブルに格納する。

```typescript
// Phase 1 の疑似コード
async function phase1_ingest() {
  // Notion未整理DBから未処理アイテム取得
  const notionItems = await fetchNotionUnprocessed();
  
  // Discord #未整理 チャンネルからURL付きメッセージ取得
  const discordMessages = await fetchDiscordChannel('1473248517446307885');
  
  for (const item of [...notionItems, ...discordMessages]) {
    // X/TwitterリンクはfxTwitter APIで本文展開
    let content = item.url;
    if (isTwitterUrl(item.url)) {
      content = await expandWithFxTwitter(item.url);
    }
    
    // 重複URLチェック付きでINSERT
    await db.run(`
      INSERT OR IGNORE INTO inputs (id, title, url, source, memo, status)
      VALUES (?, ?, ?, ?, ?, '未処理')
    `, [uuid(), item.title, item.url, item.source, content]);
    
    // 元ソースに✅リアクション
    await markAsProcessed(item);
  }
}
```

移行時は Notion から 571件をインポートし、現在は inputs テーブルに 592件が蓄積されている。毎日の cron で着実に増えていく。

---

## Phase 2: 分析・振り分け（毎日 11:00 JST）

### 何をするか

`inputs` テーブルの未処理レコードをバッチ10件ずつ AI が分析し、4つのアウトプット先に振り分ける。

```typescript
type Category = '百式事業のタネ候補' | '開発プロセス改善' | '記事ネタ' | '参考情報';

interface AnalysisResult {
  description: string;   // 要約（2〜3文）
  category: Category;
  action: string;        // 次のアクション
  reasoning: string;     // 分類の根拠（analysis カラムに保存）
}

async function phase2_analyze() {
  const unprocessed = await db.all(`
    SELECT * FROM inputs 
    WHERE status = '未処理' 
    ORDER BY rowid ASC 
    LIMIT 10
  `);
  
  for (const input of unprocessed) {
    // AIでURLの内容を読み取り・分析
    const result: AnalysisResult = await analyzeWithAI(input);
    
    // 生データを analysis カラムに保存（重要）
    await db.run(`
      UPDATE inputs SET
        description = ?,
        category = ?,
        action = ?,
        analysis = ?,
        status = '振分済'
      WHERE id = ?
    `, [result.description, result.category, result.action, 
        JSON.stringify(result), input.id]);
    
    // カテゴリに応じてルーティング
    await route(input, result);
  }
}

async function route(input: Input, result: AnalysisResult) {
  switch (result.category) {
    case '百式事業のタネ候補':
      await fetch('http://localhost:3100/api/seeds', {
        method: 'POST',
        body: JSON.stringify({
          title: input.title,
          summary: result.description,
          source_input_id: input.id,
          problem: result.reasoning,
          status: '未処理'
        })
      });
      break;
    
    case '開発プロセス改善':
      await fetch('http://localhost:3100/api/kaizen', {
        method: 'POST',
        body: JSON.stringify({ title: input.title, memo: result.description })
      });
      break;
    
    case '記事ネタ':
      await fetch('http://localhost:3100/api/articles', {
        method: 'POST',
        body: JSON.stringify({
          title: input.title,
          angle: result.action,
          source_url: input.url,
          source_input_id: input.id
        })
      });
      break;
    
    case '参考情報':
      // アウトプット先なし。inputs内で完結
      await fetch(`http://localhost:3100/api/inputs/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: '完了', category: '参考情報' })
      });
      break;
  }
}
```

### 振り分け先の比率（実績）

現時点での振り分け傾向：

| カテゴリ | 件数 | 割合 |
|---------|------|------|
| 百式事業のタネ候補 | 185件 | 31% |
| 開発プロセス改善 | 97件 | 16% |
| 記事ネタ | 53件 | 9% |
| 参考情報 | 257件 | 43% |

「参考情報」が最多なのは想定内。インプット時点では「面白そう」と思っても、分析すると「特にアクション不要」なものが多い。それを自動で捌いてくれるのが大きい。

---

## Phase 3: 昇格（毎日 11:30 JST）

### 何をするか

`kaizen_neta`（改善ネタ）の中から、独立プロダクトとして成立しうるものを `seeds`（事業のタネ）に昇格させる。

```typescript
async function phase3_promote() {
  const kaizenItems = await fetch('http://localhost:3100/api/kaizen').then(r => r.json());
  
  for (const item of kaizenItems.filter(k => k.status === '未着手')) {
    const shouldPromote = await evaluateForPromotion(item);
    
    if (shouldPromote) {
      // seeds テーブルに昇格
      await fetch('http://localhost:3100/api/seeds', {
        method: 'POST',
        body: JSON.stringify({
          title: `[昇格] ${item.title}`,
          problem: item.memo,
          score: shouldPromote.score,  // 深刻度スコア 1-10
          status: '未処理'
        })
      });
      
      // 元の改善ネタに昇格済マーク
      await fetch(`http://localhost:3100/api/kaizen/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: '昇格済' })
      });
    }
  }
}
```

### 昇格判定の基準

```
昇格する:
  ✅ ツール/サービスとして独立プロダクト化できる可能性がある
  ✅ 既存の不満・課題を解決する新サービスのヒントになる
  ✅ 市場にまだ十分な解決策がない領域

昇格しない:
  ❌ 純粋な Tips/ベストプラクティス（自分たちの開発改善にのみ有用）
  ❌ 既に十分な競合がある
  ❌ 単なる情報共有
```

改善ネタから事業のタネへの昇格は「見落とし防止」が主目的だ。手動レビューなら「これはただの開発メモだな」と流してしまうものでも、AIが「実は市場に解がない」と気づいてくれることがある。

---

## AI + cron 設計のポイント

### 「決定論的」にする

Notion 時代の最大の問題は、AI への入力が毎回変わることだった。プロンプトを使い回しても、Notion のプロパティ構造が変われば挙動が変わる。

SQLite にすることで、スキーマが固定され、AI への入力フォーマットが安定した。`inputs` テーブルの1レコードが「処理の単位」として明確になり、「このレコードを処理した結果このカラムを更新する」という関数型の設計ができた。

### 中間状態を捨てない

```
未処理 → 分析済 → 振分済 → 完了
                          → 除外
```

各ステータス遷移で「元のデータ」は消えない。`analysis` カラムには AI の生レスポンスを JSON で丸ごと保存しているので、後からプロンプトを改善して再分析するときも履歴が残る。

Notion だと「プロパティに収まらない」のでここが詰まっていた。SQLite なら `TEXT` カラムに何でも詰め込める。

### cron の時間設計

```
10:33 - Phase 1: 取り込み（Notion/Discord → inputs）
11:00 - Phase 2: 分析（inputs → seeds/kaizen/articles）
11:30 - Phase 3: 昇格（kaizen → seeds）
```

あえて時間をずらしている。Phase 1 が完了してから Phase 2 が走り、Phase 2 が完了してから Phase 3 が走る。直列パイプラインで、各ステップが前段の出力を受け取れる。

:::message
cron は OpenClaw の `agentTurn` ジョブとして実装している。AI エージェントがジョブを受け取り、jimucho API を叩いてパイプラインを実行する構成だ。
:::

---

## 移行の実際

### ステップ

1. **Notion から全データを SQLite にインポート**（既存 571件）
2. **テーブル構造を改修**（`inputs` 拡張、`pipeline_neta` → `seeds` に改名、`articles` 新設）
3. **全データをリセット**（ステータスを未処理に戻して再処理）
4. **cron を更新・再有効化**（3本）
5. **Notion 未整理DB は取り込み口としてのみ残存**（将来的に廃止予定）

### 手動運用との比較

| 項目 | Before（Notion手動） | After（SQLite+cron） |
|------|---------------------|---------------------|
| 1日あたりの処理件数 | 5〜10件（時間があれば） | 最大30件（自動） |
| 振り分け一貫性 | 低（気分次第） | 高（プロンプト固定） |
| 中間データの保持 | なし | `analysis` カラムに全保存 |
| API 速度 | Notion API（遅い） | SQLite（ほぼ瞬時） |
| 構造変更 | 難（プロパティ型制約） | 容易（マイグレーション） |

---

## 設計から得た教訓

### 「取り込み」と「分析」を分離する

最初は「取り込みと同時に分析」を考えていたが、やめた。取り込みは「とにかく全部入れる」で良く、分析は「じっくり考える」フェーズ。混ぜると、分析に失敗したとき取り込み済みかどうかも不明になる。

分離することで、Phase 2 の再実行が安全になる。`status = '未処理'` のレコードを対象にするだけで、べき等に動く。

### AI は「判定」に使い、「保管」は DB に任せる

AI は判定が得意だが、記憶は苦手だ。判定結果を DB に保存し、次回は DB を参照する設計にすることで、AI の「毎回ゼロから考える」問題を回避できた。

### 小さく始めて、後から自動化する

最初の1ヶ月は Phase 1 の cron だけ動かし、Phase 2 は手動で実行していた。パイプラインの動作を確認してから Phase 2、Phase 3 の cron を追加した。

一度に全部自動化しようとすると、バグったときの原因が特定しにくい。段階的な自動化を強く推奨する。

---

## まとめ

「一人会社」というスケールでも、パイプライン設計は有効だ。

手動管理の限界は処理量ではなく**一貫性**にある。同じ情報を見ても、今日と来月では判断が変わる。AI + cron + SQLite の組み合わせは、この一貫性問題をほぼ解決してくれた。

今では毎朝 11:30 を過ぎると、seeds テーブルには新しい事業のタネが数件追加されており、articles テーブルには記事ネタが待っている。この記事も、そのパイプラインから生まれた。

情報が「ちゃんと処理されている」という安心感は、思いのほか精神的に良い。

---

## 参考

- jimucho: 自社の社内 API サーバー（Next.js + SQLite + jimucho API）
- OpenClaw: AI エージェント実行基盤（cron ジョブ管理）
- fxTwitter API: X（Twitter）リンクの本文展開

---

*この記事は、実際に稼働中のパイプライン（v0.3.0、2026-02-18 時点）を元に書いています。*
