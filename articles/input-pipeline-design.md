---
title: "一人会社のインプット処理パイプライン設計 — NotionからSQLiteへ"
emoji: "🔄"
type: "tech"
topics:
  - "notion"
  - "sqlite"
  - "ai"
  - "自動化"
  - "個人開発"
published: true
---

## この記事について

一人で会社をやっていると、日々のインプット情報が散らかりがちです。X（Twitter）で見かけた気になるサービス、Redditの投稿、技術記事。「あとで読む」のつもりが永遠に読まれないまま埋もれていく。

この問題を解決するために、Notion APIベースの管理から脱却してSQLite + AI + cronによる3段階パイプラインを設計しました。現在592件のインプットを処理し、185件の事業のタネを抽出しています。

このパイプラインは「[jimucho（事務長）](https://github.com/imudak/jimucho)」という社内ダッシュボードの中核機能として動いています。jimuchoの全体像については「[AIエージェントに"事務総長"を作らせた話](https://zenn.dev/imudak/articles/ai-agent-secretary-general)」で紹介しています。

## Notionの何が問題だったか

最初はNotionのデータベースでインプット情報を管理していました。Notionは手動操作には便利ですが、自動化の基盤にすると問題が出てきます。

- **API応答が遅い。** 100件取得で数秒かかることがある
- **レート制限が厳しい。** バッチ処理するとすぐ429が返ってくる
- **スキーマ変更が面倒。** プロパティの型を後から変えにくい
- **中間データの保持ができない。** AI分析の生データ（JSON）をNotionのプロパティに入れると構造が崩れる

特に最後の問題が致命的でした。AIにインプット情報を分析させた結果をそのまま保持しておきたいのに、Notionのプロパティでは表現しきれません。分析をやり直すたびにデータが消えてしまう状態でした。

## 設計の全体像

NotionからSQLiteに移行して、3段階のパイプラインを組みました。

```text
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  取り込み    │────▶│  分析・振分  │────▶│  昇格・記事化 │
│  (Phase 1)  │     │  (Phase 2)  │     │  (Phase 3)   │
└─────────────┘     └─────────────┘     └──────────────┘
  毎日 10:33         毎日 11:00          毎日 11:30
```

それぞれのフェーズが独立したcronジョブとして動きます。1時間の間に3段階を順次実行する設計です。

## データモデル — 3テーブル構成

情報の流れに合わせて3つのテーブルを用意しました。

### inputs — インプット蓄積

すべての情報はまずここに入ります。

```sql
CREATE TABLE inputs (
  id TEXT PRIMARY KEY,
  title TEXT,
  url TEXT,
  source TEXT,          -- 情報源（twitter, article等）
  memo TEXT,
  description TEXT,     -- AI生成の要約
  category TEXT,        -- 分類結果
  action TEXT,          -- 次のアクション
  analysis TEXT,        -- AI分析の生データ（JSON）
  status TEXT           -- 未処理 / 分析済 / 振分済 / 完了 / 除外
);
```

ポイントは`analysis`カラムです。AIが判定した結果のJSON全体を保持しているので、分類ロジックを変えたくなったら過去データを再分析できます。Notionではこれができませんでした。

### seeds — 事業のタネ

inputsから「事業のタネ候補」と判定されたものが昇格してきます。

```sql
CREATE TABLE seeds (
  id TEXT PRIMARY KEY,
  title TEXT,
  url TEXT,
  summary TEXT,
  score INTEGER DEFAULT 100,  -- 評価スコア
  problem TEXT,               -- 解決する課題
  tags TEXT,                  -- JSON配列
  source_input_id TEXT,       -- 元inputsへの参照
  status TEXT                 -- 未処理 / 検討中 / 採用 / 却下
);
```

### articles — 記事ネタ

記事として書けそうなネタの管理用です。

```sql
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  title TEXT,
  theme TEXT,
  angle TEXT,            -- 切り口・着眼点
  source_url TEXT,
  source_input_id TEXT,  -- 元inputsへの参照
  status TEXT            -- 未処理 / 執筆中 / 公開済 / 却下
);
```

3テーブルとも`source_input_id`で元データへの参照を持っています。「この事業のタネ、元ネタは何だったっけ」とたどれるようにするためです。

## Phase 1: 取り込み（毎日 10:33）

Notion未整理DBとDiscordチャンネルから情報を吸い上げるフェーズです。

```typescript
// Notion未整理DBから取得
const pages = await notion.databases.query({
  database_id: UNSORTED_DB_ID,
  filter: { property: "Status", status: { equals: "未処理" } }
});

// X/Twitterリンクの場合、fxtwitter APIで本文展開
for (const page of pages.results) {
  const url = extractUrl(page);
  let expandedText = "";

  if (url?.includes("twitter.com") || url?.includes("x.com")) {
    const fxUrl = url.replace(/twitter\.com|x\.com/, "api.fxtwitter.com");
    const res = await fetch(fxUrl);
    const data = await res.json();
    expandedText = data.tweet?.text ?? "";
  }

  // inputsテーブルにINSERT（重複URLチェック付き）
  await db.run(`
    INSERT OR IGNORE INTO inputs (id, title, url, source, memo, status)
    VALUES (?, ?, ?, ?, ?, '未処理')
  `, [generateId(), page.title, url, "notion", expandedText]);
}
```

Xのポストはそのままだと内容がわからないので、fxtwitter APIで本文を展開しています。これをやらないとAI分析の材料がなくなります。

## Phase 2: 分析・振り分け（毎日 11:00）

未処理のインプットをAIが分析して、4つのカテゴリに振り分けます。1回の実行で最大10件を処理します。

```typescript
const unprocessed = await db.all(`
  SELECT * FROM inputs WHERE status = '未処理'
  ORDER BY rowid DESC LIMIT 10
`);

for (const input of unprocessed) {
  // AIによる分析
  const analysis = await analyzeInput(input);

  // 分析結果をinputsに保存
  await db.run(`
    UPDATE inputs SET
      description = ?, category = ?, action = ?,
      analysis = ?, status = '振分済'
    WHERE id = ?
  `, [analysis.description, analysis.category,
      analysis.action, JSON.stringify(analysis), input.id]);

  // カテゴリに応じて振り分け
  switch (analysis.category) {
    case "百式事業のタネ候補":
      await db.run(`INSERT INTO seeds ...`, [...]);
      break;
    case "記事ネタ":
      await db.run(`INSERT INTO articles ...`, [...]);
      break;
    case "開発プロセス改善":
      await db.run(`INSERT INTO kaizen_neta ...`, [...]);
      break;
    case "参考情報":
      await db.run(`UPDATE inputs SET status = '完了' WHERE id = ?`,
        [input.id]);
      break;
  }
}
```

振り分けロジックの判定基準はこうなっています。

| カテゴリ | 判定基準 | 振り分け先 |
|---------|---------|-----------|
| 事業のタネ候補 | 課題・不満・ニーズ、新サービスのヒント | seeds |
| 開発プロセス改善 | 開発手法・ツールTips | kaizen_neta |
| 記事ネタ | 知見共有・トレンド分析 | articles |
| 参考情報 | 面白い話・一般教養 | inputs内で完了 |

「参考情報」はどこにも転送せず、inputsテーブル内でステータスを完了にするだけです。以前はNotionの参考情報アーカイブに書き込んでいましたが、その手間のわりに見返すことがなかったので廃止しました。

## Phase 3: 昇格レビュー（毎日 11:30）

Phase 2で「開発プロセス改善」に分類されたネタの中から、独立したプロダクトになりそうなものを事業のタネに昇格させます。

```typescript
const kaizenItems = await db.all(`
  SELECT * FROM kaizen_neta WHERE status = '未処理'
`);

for (const item of kaizenItems) {
  const evaluation = await evaluateForPromotion(item);

  if (evaluation.shouldPromote) {
    // seedsに昇格
    await db.run(`
      INSERT INTO seeds (id, title, url, summary, score, problem, status)
      VALUES (?, ?, ?, ?, ?, ?, '未処理')
    `, [generateId(), evaluation.productName, item.url,
        evaluation.summary, evaluation.score, evaluation.problem]);

    // kaizen_netaに昇格済みマーク
    await db.run(`
      UPDATE kaizen_neta SET status = '昇格済' WHERE id = ?
    `, [item.id]);
  }
}
```

昇格の基準は3つです。

- ツール・サービスとして独立プロダクト化できる可能性がある
- 既存の不満・課題を解決する新サービスのヒントになる
- 市場にまだ十分な解決策がない

たとえば「CIのキャッシュ設定でビルド時間を半減できた」はただのTipsなので昇格しません。一方、「CI設定の属人化が問題で、チーム全員が困っている」なら、それを解決するツールとしてプロダクト化できるかもしれないので昇格対象です。

## 運用してみた結果

このパイプラインを2ヶ月ほど運用した結果です。

| 項目 | 数値 |
|------|------|
| inputs総件数 | 592件 |
| seeds（事業のタネ） | 185件 |
| articles（記事ネタ） | 42件 |
| kaizen_neta（改善ネタ） | 87件 |
| 参考情報（完了） | 278件 |
| cronジョブ | 3本（10:33 / 11:00 / 11:30） |

592件のインプットのうち、約31%が事業のタネとして抽出されています。参考情報が約47%で最も多く、これは「面白いけどアクションにつながらない」情報がそれだけ多いということです。以前はこういう情報も全部Notionに溜め込んでいたので、自動的にフィルタリングされるだけでもかなり楽になりました。

## Notion APIとの比較

SQLiteに移行した前後の違いをまとめます。

| 項目 | Notion API | SQLite |
|------|-----------|--------|
| 100件取得 | 2-5秒 | 数ミリ秒 |
| レート制限 | 3リクエスト/秒 | なし |
| スキーマ変更 | 手動でプロパティ追加 | ALTER TABLE一発 |
| AI分析結果の保持 | プロパティに収まらない | JSONカラムでそのまま |
| バックアップ | エクスポート機能 | ファイルコピー |
| 複数テーブルのJOIN | 不可 | 普通にできる |

Notionは取り込み口（ブラウザ拡張やモバイルアプリからの投入）として残しています。手元のスマホでさっと情報を放り込むにはNotionが便利なので、入り口だけNotionを使い、処理基盤はSQLiteという構成です。

## 設計で気をつけたこと

### 各フェーズを独立させる

3つのcronジョブはそれぞれ独立して動作します。Phase 1が失敗してもPhase 2は前回取り込んだデータを処理できますし、Phase 2が遅延してもPhase 3は既にkaizen_netaにあるデータを処理できます。

テーブルのステータスカラムが各フェーズ間のインターフェースになっています。`未処理`→`振分済`→`完了`と遷移するだけなので、障害時のリカバリも単純です。

### バッチサイズを制限する

Phase 2は1回の実行で最大10件しか処理しません。AI分析にはAPIコールが伴うので、一度に大量処理するとコストとレート制限の両方で問題が出ます。毎日10件ずつ着実に消化していく設計です。

未処理が溜まっても焦らず、翌日以降に順次処理されます。既存の571件を移行した際も、約2ヶ月かけて全件処理しました。

### 再分析を可能にする

`inputs.analysis`カラムにAI分析の生JSONを保持しているのは、分類ロジックを変更したときに過去データを再分析するためです。実際に一度、カテゴリの判定基準を変更した際にこのデータが役に立ちました。

## まとめ

Notion APIベースのインプット管理をSQLite + AI + cronの3段階パイプラインに移行しました。

- Phase 1（取り込み）でNotionとDiscordから情報を吸い上げる
- Phase 2（分析・振分）でAIが4カテゴリに分類する
- Phase 3（昇格）で改善ネタの中から事業のタネを抽出する

一人会社で日々大量のインプットを処理する必要がある場合、Notionに溜め込んで手動で整理するよりも、SQLiteで自動化するほうが確実に回ります。NotionはUI操作向けのツールであり、自動処理の基盤として使うには制約が多すぎました。

Notionを完全に捨てたわけではなく、入り口として残しています。入力はNotion、処理はSQLite。この役割分担が今のところうまく機能しています。

このパイプラインを含むjimuchoの全体設計やAIエージェントとの連携については、以下の記事で紹介しています。

https://zenn.dev/imudak/articles/ai-agent-secretary-general
