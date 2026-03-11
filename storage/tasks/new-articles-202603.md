# New Articles Sprint - 2026年3月

**Feature**: new-articles-202603
**Version**: 1.0.0
**Status**: Completed
**Date**: 2026-03-11

> draft-article-publishing タスク全完了後の次スプリント。
> raws/ に蓄積された調査資料を活かして新記事を執筆する。

---

## 背景

`storage/tasks/draft-article-publishing-tasks.md` の全タスクが完了済み。
`raws/` に以下の未使用調査資料がある。

| rawsファイル | 内容 | 記事化状況 |
|-------------|------|-----------|
| multiagent_comparison.md | Claude Code マルチエージェント並列環境 比較 | 未記事化 |
| windows_alternatives.md | Windows環境でのマルチエージェント代替手段 | 未記事化 |
| kimi_k_research.md | Kimi K2 モデル調査 | 未記事化 |
| clawdbot_research.md | Clawdbot (Moltbot) 調査 | 未記事化 |

---

## Phase 1: マルチエージェント並列環境 比較記事

- [x] **TASK-NA-001**: `claude-code-multiagent-terminal.md` の執筆
  - ソース: `raws/multiagent_comparison.md`, `raws/windows_alternatives.md`
  - テーマ: Claude Code で複数エージェントを並列で動かすとき、何を使えばいいか
  - 視点: WSL2+tmux, Docker, psmux, WezTerm を実際に比較した記録
  - textlint: エラー0確認済み
  - 校正スキル適用済み
  - 状態: `published: false`（imudak確認後に公開）
  - 完了日: 2026-03-11

---

## Phase 2: Kimi K2 所感記事（検討）

- [x] **TASK-NA-002**: `kimi-k2-first-impressions.md` の執筆判断
  - ソース: `raws/kimi_k_research.md`
  - テーマ: Kimi K2 を試してみた所感（Claude との比較）
  - 判断: **保留**
    - `raws/kimi_k_research.md` はベンチマーク・スペック調査データのみ。実際に「試してみた」体験記録がない
    - 調査時点（2026-01-29）からKimi K2.5がリリース済みで、K2単体記事は鮮度が低い
    - 著者ペルソナ（実体験ベース）に反する記事になるため、実際に試したタイミングで執筆する
  - 判断日: 2026-03-11

---

## KPI

| 指標 | 目標 | 現状 |
|------|------|------|
| textlint エラー数 | 0 | - |
| 公開記事数（本スプリント） | 1〜2 | 1（draft）✅ |
