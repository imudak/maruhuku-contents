---
title: "MUSUBIの二通りの使い方 — 新規プロジェクトと既存プロジェクトで全然違う"
emoji: "🌱"
type: "tech"
topics:
  - MUSUBI
  - SDD
  - 仕様駆動開発
  - AIコーディング
  - チュートリアル
published: false
---

## 仕様書作ってもらおうと思ったら、コード直し始めた

動いているプロジェクトにMUSUBIを入れて、既存機能の仕様を整理しようとしました。AIエージェントに `/sdd-implement` を実行させたら、仕様書を作るどころか **既存のコードを書き換え始めた。**

慌てて止めました。

調べてわかったのですが、MUSUBIには **二通りの使い方** があります。新規プロジェクト（Greenfield）と既存プロジェクト（Brownfield）で、やることが全然違う。動いているプロジェクトに新規用のコマンドを打てば、そりゃおかしくなります。

## Greenfield: まっさらなプロジェクト

新しいプロジェクトを始める場合のフローです。

### セットアップ

```bash
mkdir my-project && cd my-project
git init
npm install -g musubi-sdd
musubi init
```

これで `steering/` ディレクトリとプロンプトファイルが生成されます。

### 開発フロー

機能を追加するたびに、5つのステップを順番に回します。

```
/sdd-requirements → /sdd-design → /sdd-tasks → /sdd-implement → /sdd-validate
```

各ステップの出力先は決まっています。

| ステップ | コマンド | 出力先 |
|---------|---------|--------|
| 要件定義 | `/sdd-requirements` | `storage/specs/{feature}-requirements.md` |
| 設計 | `/sdd-design` | `storage/design/{feature}-design.md` |
| タスク分解 | `/sdd-tasks` | `storage/tasks/{feature}-tasks.md` |
| 実装 | `/sdd-implement` | ソースコード + テスト |
| 検証 | `/sdd-validate` | `storage/validation/{feature}-validation-report.md` |

### ポイント: 実装の前に仕様を書く

「いきなりコードを書きたい」という衝動をぐっと抑えて、まずrequirementsとdesignを書きます。AIコーディングエージェント（Claude Code等）に任せる場合でも同じです。

むしろAIに任せるからこそ重要で、仕様がないとAIが「なんとなくそれっぽいもの」を作り始めます。Requirements Driven であることが、AIコーディングの品質を決定的に左右します。

## Brownfield: 既存のコードベースがあるプロジェクト

こちらの方が現実には多いケースです。すでにコードがあって、後からMUSUBIを導入する場合。

### セットアップ

```bash
cd existing-project
musubi init
musubi-onboard    # コードベースを分析してsteering docsを自動生成
```

`musubi-onboard` がコードを読み取って、以下を自動生成してくれます。

- `steering/product.md` — プロダクトの概要
- `steering/tech.md` — 技術スタック
- `steering/structure.md` — アーキテクチャ構造

### 既存機能の仕様起こし（任意）

既存の機能についてSDD文書を書き起こすことができます。ただしこれは任意です。

```
/sdd-requirements existing-feature  # 実装からEARS形式で要件を逆起こし
/sdd-design existing-feature        # 設計を文書化
```

**⚠️ `/sdd-implement` は絶対に実行しない** — 既存コードを上書き・二重実装するリスクがあります。

### 新機能の追加

ここからはGreenfieldと同じフローです。

### 仕様変更: Change Management

Brownfieldで最も重要なのが、**既存機能の仕様変更を管理する仕組み** です。

MUSUBIには `musubi-change` というCLIがあります。

```bash
# 1. 変更提案を作成
musubi-change init CHANGE-001 --title "検索機能にフィルタを追加"

# 2. Delta Specification を記入
#    storage/changes/CHANGE-001.md に差分仕様を書く
```

Delta Specificationは、「何が追加・変更・削除されたか」を明示的に記録します。

```markdown
## Requirements Changes

### ADDED
- REQ-SEARCH-004: ユーザーはカテゴリでフィルタできること

### MODIFIED
- REQ-SEARCH-001: 検索結果の表示
  - **Before**: 全件表示
  - **After**: フィルタ条件に一致するもののみ表示
  - **Reason**: 件数増加によりフィルタが必要になった
```

```bash
# 3. バリデーション
musubi-change validate CHANGE-001

# 4. 実装（通常のSDDフロー）

# 5. 適用・アーカイブ
musubi-change apply CHANGE-001
musubi-change archive CHANGE-001
```

## Greenfield と Brownfield の違いまとめ

| | Greenfield | Brownfield |
|---|-----------|------------|
| **初期化** | `musubi init` | `musubi init` + `musubi-onboard` |
| **既存コードの扱い** | なし | 仕様の逆起こし（任意） |
| **新機能追加** | SDDフロー（共通） | SDDフロー（共通） |
| **仕様変更** | ファイルを直接更新 | `musubi-change` でDelta Spec |
| **注意点** | 特になし | `/sdd-implement` を既存機能に実行しない |

## ギャップ検出: どちらでも使える

プロジェクトの健全性を確認するツールが `musubi-gaps` です。

```bash
musubi-gaps detect --verbose   # トレーサビリティのギャップを検出
musubi-gaps coverage           # カバレッジ統計
```

出力例：

```
📊 Gap Detection Summary
Total Gaps: 0
✓ No gaps detected! 100% traceability achieved.
```

これが出れば、要件→設計→コード→テストの連鎖が100%繋がっていることが確認できます。

## 40プロジェクトを一括で整備した話

私の場合、40プロジェクト中35が「init だけして放置」状態でした。これを一括で整備したときのスクリプトです。

```bash
# 全プロジェクトでonboard
for d in ~/projects/*/; do
  if [ -d "$d/steering" ]; then
    cd "$d" && yes | musubi-onboard
  fi
done

# 全プロジェクトでupgrade
for d in ~/projects/*/; do
  if [ -d "$d/steering" ]; then
    cd "$d" && musubi upgrade --force
  fi
done
```

この話の詳細は[別の記事](https://zenn.dev/imudak/articles/musubi-not-really-using-it)に書いています。

## まとめ

- **新規プロジェクト** → `musubi init` して SDDフローを回す
- **既存プロジェクト** → `musubi-onboard` でコード分析 → 仕様変更は `musubi-change` で管理
- **どちらでも** → `musubi-gaps` で定期的にギャップチェック

「initしたけど次に何すればいいかわからない」という人は、まず `musubi-onboard` を実行してみてください。コードベースを分析してsteering docsを自動生成してくれるので、そこからスタートできます。
