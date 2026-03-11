# Draft Article Publishing Tasks

**Feature**: draft-article-publishing
**Version**: 1.0.0
**Status**: Phase 1 Completed
**Date**: 2026-03-11

> 全content-managementタスク完了後の次スプリント。
> 完成済みdraft記事の校正・公開と、未完成記事の状況整理を行う。

---

## 背景

`storage/tasks/content-management-tasks.md` の全17タスクが完了済み。
以下の4つのdraft記事が未公開状態として残っている。

| 記事 | 状態 | textlint |
|------|------|----------|
| task-file-ai-workflow.md | 完成 | OK |
| openclaw-browser-relay-trouble.md | 完成 | OK |
| obsidian-claude-skills-management.md | 未着手（フロントマターのみ） | - |
| google-play-console-setup-guide.md | 途中 | - |

---

## Phase 1: 完成記事の公開

- [x] **TASK-DAP-001**: `task-file-ai-workflow.md` の校正・公開
  - textlint: OK（エラー0確認済み）
  - 校正スキル適用 → published: true に変更
  - 公開日: 2026-03-11

- [x] **TASK-DAP-002**: `openclaw-browser-relay-trouble.md` の校正・公開
  - textlint: OK（エラー0確認済み）
  - 校正スキル適用 → published: true に変更
  - 公開日: 2026-03-11

---

## Phase 2: 未完成記事の状況整理

- [ ] **TASK-DAP-003**: `obsidian-claude-skills-management.md` の執筆開始判断
  - フロントマターのみ存在。raws/に関連資料がある場合は執筆開始。
  - 関連資料なし → 保留または削除

- [ ] **TASK-DAP-004**: `google-play-console-setup-guide.md` の状況確認
  - 途中まで書かれている。続きを書くか保留判断。

---

## KPI

| 指標 | 目標 | 現状 |
|------|------|------|
| textlint エラー数 | 0 | - |
| 公開記事数（本スプリント） | 2 | 2 ✅ |
