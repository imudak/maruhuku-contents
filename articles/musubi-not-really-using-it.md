---
title: "MUSUBIを使ってるつもりで使ってなかった話 — 40プロジェクトの仕様管理を一括整備した記録"
emoji: "🎋"
type: "tech"
topics:
  - MUSUBI
  - SDD
  - 仕様管理
  - AI
  - 開発プロセス
published: false
---

## 「最終仕様はどこを見ればいいの？」

ある日、自分のプロジェクトのGitHubリポジトリを見ていて、ふと思いました。

**「MUSUBIで開発してるはずなのに、最終的な仕様ってどのファイルを見ればいいんだ？」**

[MUSUBI](https://github.com/nahisaho/MUSUBI)は仕様駆動開発（SDD）のフレームワークで、要件定義→設計→タスク→実装→検証のフローを回すツールです。AIコーディングエージェント（Claude Code、GitHub Copilot等）と組み合わせて使います。

私は40以上のプロジェクトで `musubi init` を実行済み。SDDコマンド（`/sdd-requirements`、`/sdd-design`等）も使っていました。

**使ってるつもりだった。**

## 何が起きていたか

AIエージェント（OpenClaw + Claude Code）に聞いてみたところ、以下の問題が判明しました。

### 根本原因: 「ああMUSUBIね、はいはいわかってますよ」

`musubi init` を実行すると、CLAUDE.mdやプロンプトファイルが生成されます。Claude Codeはこれを読んで——

**「ああMUSUBIね、はいはい、仕様駆動開発でしょ。わかってますよ」**

——という顔をして作業を始めます。しかし **わかっていません。** MUSUBIの正式な手順やファイル配置ルールまでは理解しておらず、「なんとなくそれっぽい」SDD文書を自己流で書き始めます。ファイル名も配置場所も、その時の気分次第。これが以下の全ての問題の根っこでした。

### 問題1: 仕様ファイルの置き場所がバラバラ

MUSUBIのv6.3.0では、SDD文書の出力先が明確に定義されています。

```
storage/
├── specs/          # 要件定義（Requirements）
├── design/         # 設計（Design）
├── tasks/          # タスク分解
├── changes/        # 仕様変更の差分記録
└── validation/     # 検証レポート
```

ところが私のプロジェクトでは、一部の仕様が `steering/features/` に、別の仕様が `storage/specs/` に散在していました。`steering/` はプロジェクトメモリ（プロダクト概要・技術スタック・構造等）の場所であって、個別機能の仕様を置く場所ではありません。

### 問題2: 仕様変更の管理をしていなかった

MUSUBIには `musubi-change` というChange Managementの仕組みがあります。仕様変更時にDelta Specification（差分仕様書）を作成し、変更履歴を追跡できます。

```bash
musubi-change init CHANGE-001 --title "フィルタリング機能の追加"
musubi-change validate CHANGE-001
# 実装...
musubi-change apply CHANGE-001
musubi-change archive CHANGE-001
```

**この機能の存在を知らなかった。** 仕様変更のたびに、既存のrequirementsを書き換えるか、新しいファイルを作るかを場当たり的に判断していました。

### 問題3: init だけして放置しているプロジェクトが大半

40プロジェクト中、実際にSDD文書（storage/specs/）が存在したのは **4プロジェクトだけ**。残り35プロジェクトは `musubi init` を実行しただけで、steering filesの自動生成（`musubi-onboard`）すらしていませんでした。

### 問題4: テストのギャップ

メインプロジェクト（jimucho）で `musubi-gaps detect` を実行したところ：

```
📊 Gap Detection Summary
Total Gaps: 79
  Untested Code: 79
```

79件の「テストなしコード」。MUSUBIの憲法（constitution）にはTest-First原則があるのに、テストカバレッジのトレーサビリティが完全に抜けていました。

## やったこと

AIエージェントと一緒に、半日で全プロジェクトを一括整備しました。

### 1. SDD出力先の統一

`steering/features/` にあった仕様ファイルを `storage/specs/` と `storage/design/` に移動。

```bash
# jimucho の例
cp steering/features/onegai-management/requirements.ja.md \
   storage/specs/onegai-management-requirements.ja.md
cp steering/features/onegai-management/design.ja.md \
   storage/design/onegai-management-design.ja.md
rm -r steering/features/
```

### 2. musubi-sdd グローバルインストール

```bash
npm install -g musubi-sdd
musubi --version  # 6.3.1
```

`npx` だとキャッシュの問題で古いバージョンを使い続けるリスクがあります。グローバルインストールにして、各プロジェクトで `musubi upgrade` を実行。

```bash
for d in ~/projects/*/; do
  if [ -d "$d/steering" ]; then
    cd "$d" && musubi upgrade --force
  fi
done
```

### 3. 未活用プロジェクトの一括onboard

35プロジェクトに `musubi-onboard` を一括実行。コードベースを分析して steering files を自動生成します。

```bash
for d in ~/projects/*/; do
  cd "$d" && yes | musubi-onboard
done
```

これで各プロジェクトに `steering/product.md`、`steering/tech.md`、`steering/structure.md` 等が生成されました。

### 4. ギャップ解消

メインプロジェクト（jimucho: 79件）とflow-manager（14件）のギャップをClaude Codeに委譲して解消。

```bash
cd ~/projects/jimucho
claude --dangerously-skip-permissions -p "
musubi-gaps detect が79件の Untested Code を報告している。解消せよ。
既存テストは活かす。UIはスモークテスト。libはユニットテスト。
npm test で全PASS確認。musubi-gaps detect で0件確認。
"
```

結果：**79件 → 0件、567テスト全PASS。**

```
✓ No gaps detected! 100% traceability achieved.
```

## 学んだこと

### steering/ と storage/ の役割

| ディレクトリ | 役割 | 内容 |
|-------------|------|------|
| `steering/` | プロジェクトの「何であるか」 | product, tech, structure, constitution |
| `storage/` | 各機能の「どう動くか」 | requirements, design, tasks, changes |
| `plans/` | 一時的な計画 | フェーズ計画、実装計画 |

**最終仕様を確認するなら `storage/specs/` を見る。** これが今回の最初の質問への答えです。

### init しただけでは使っていない

`musubi init` はスタートラインに立っただけ。実際に使うには：

1. `musubi-onboard` でsteering docs を生成する
2. 機能追加時に `/sdd-requirements` → `/sdd-design` → `/sdd-tasks` → `/sdd-implement` のフローを回す
3. 仕様変更時に `musubi-change` でDelta Specを作る
4. `musubi-gaps detect` で定期的にギャップを確認する

### 「決定論的にやる」が鍵

SDD出力先、Change Managementの手順——これらを曖昧にしておくと、人間もAIエージェントも場当たり的に判断してしまいます。ルールを明文化して判断の余地をなくすことが重要でした。

### MUSUBIスキルの導入

根本原因は「Claude CodeがMUSUBIの正式手順を知らない」ことでした。musubi.md（運用手順書）を毎回コンテキストに入れるのはトークンの無駄遣いなので、スキル化して必要な時だけ自動ロードされるようにしました。

- **OpenClaw用**: `~/.openclaw/workspace/skills/musubi/SKILL.md`
- **Claude Code用**: `.claude/skills/musubi/SKILL.md`（全プロジェクトに配布）

## まとめ

「使ってるつもり」が一番危険です。

- `musubi init` → ✅ やった
- `/sdd-requirements` → ✅ やった
- 仕様ファイルの配置ルール → ❌ 理解してなかった
- Change Management → ❌ 存在を知らなかった
- ギャップ検出 → ❌ 実行してなかった

ツールの機能の30%しか使っていなかったのに、「MUSUBIで開発している」と思い込んでいました。

改善のきっかけは **「最終仕様はどこ？」という素朴な疑問** でした。答えに詰まった時点で、何かがおかしいと気づくべきだったのかもしれません。

今は40プロジェクト全てが整備済み。次に仕様を変更する時は `musubi-change` から始めます。
