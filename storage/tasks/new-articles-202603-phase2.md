# New Articles Sprint Phase 2 - 2026年3月後半

**Feature**: new-articles-202603-phase2
**Version**: 1.0.0
**Status**: Pending（imudak確認待ち）
**Date**: 2026-03-11

> article-pipeline-202603 の TASK-AP-004 で発見した候補記事を執筆するスプリント。
> TASK-AP-001（claude-code-multiagent-terminal.md）と TASK-AP-002（google-play-console-setup-guide.md）の公開判断はimudakに委ねる。

---

## 背景

`storage/tasks/article-pipeline-202603.md` の TASK-AP-004 で以下の候補が発見された。

| 候補 | ファイル | 状態 | 実施条件 |
|------|---------|------|---------|
| A: Obsidian × Claude Skills管理 | `articles/obsidian-claude-skills-management.md` | スタブのみ | imudakが実際に運用している場合 |
| B: OpenClaw VPS常駐設定 | なし（raws/google_ai_mode_openclaw_vps_conversation.md） | rawsあり | imudakが実際にVPS設定した場合 |

---

## Phase 1: 候補Aの執筆（Obsidian × Claude Skills管理）

- [ ] **TASK-NA2-001**: imudakによる実施可否確認
  - 確認事項: Windows 11でObsidianを使ってClaude Code Skillsを管理しているか
  - 対応者: imudak
  - 判断期限: imudak任意

- [ ] **TASK-NA2-002**: `obsidian-claude-skills-management.md` の執筆
  - 条件: TASK-NA2-001でimudakがOKを出した場合
  - ソース: imudakの実体験（rawsなし）
  - テーマ: Windows 11でClaude CodeのSkillsをObsidianで管理するワークフロー
  - 想定構成:
    - フックネタ（Obsidianで管理するようになったきっかけ）
    - Obsidianでの管理方法（フォルダ構成・リンク活用等）
    - Claude Codeとの連携（.claude/skills/配置まで）
    - 運用してみての所感
  - 対応者: Claude（imudakの体験を元に執筆）

- [ ] **TASK-NA2-003**: textlint確認・校正スキル適用
  - 条件: TASK-NA2-002完了後
  - コマンド: `npx textlint articles/obsidian-claude-skills-management.md`

---

## Phase 2: 候補Bの執筆（OpenClaw VPS常駐設定）

- [ ] **TASK-NA2-004**: imudakによる実施可否確認
  - 確認事項: OpenClawをVPSに常駐設定した実体験があるか
  - rawsファイル: `raws/google_ai_mode_openclaw_vps_conversation.md`（1063行の調査資料）
  - 対応者: imudak
  - 判断期限: imudak任意

- [ ] **TASK-NA2-005**: OpenClaw VPS常駐設定記事の執筆
  - 条件: TASK-NA2-004でimudakがOKを出した場合
  - ソース: `raws/google_ai_mode_openclaw_vps_conversation.md` + imudakの実体験
  - テーマ: OpenClawをVPSに常駐設定して24時間動かすまでの記録
  - スラッグ候補: `openclaw-vps-24h-setup`
  - 対応者: Claude（rawsと実体験を元に執筆）

- [ ] **TASK-NA2-006**: textlint確認・校正スキル適用
  - 条件: TASK-NA2-005完了後
  - コマンド: `npx textlint articles/openclaw-vps-24h-setup.md`

---

## KPI

| 指標 | 目標 | 現状 |
|------|------|------|
| textlint エラー数 | 0 | - |
| 公開記事数（本スプリント） | 1〜2 | 0（imudak確認待ち） |
