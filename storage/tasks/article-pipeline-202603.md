# Article Pipeline Sprint - 2026年3月後半

**Feature**: article-pipeline-202603
**Version**: 1.0.0
**Status**: In Progress
**Date**: 2026-03-11

> new-articles-202603 完了後の次スプリント。
> 未公開記事の公開判断と、新記事ネタの収集・執筆計画を行う。

---

## 背景

`storage/tasks/new-articles-202603.md` の全タスクが完了済み。
未公開記事が2本あり、新しいraws/資料が枯渇しているため、
公開確認と次のネタ仕込みを並行で進める。

| 記事 | 状態 | 判断者 |
|------|------|--------|
| claude-code-multiagent-terminal.md | published: false（執筆完了） | imudak確認待ち |
| google-play-console-setup-guide.md | published: false（公開可能） | imudak判断待ち |

---

## Phase 1: 未公開記事の公開判断（imudak待ち）

- [ ] **TASK-AP-001**: `claude-code-multiagent-terminal.md` の公開判断
  - imudakが内容確認後、`published: true` に変更してpush
  - 対応者: imudak

- [ ] **TASK-AP-002**: `google-play-console-setup-guide.md` の公開判断
  - 校正・textlint確認済み。imudakが公開OKなら `published: true` に変更してpush
  - 対応者: imudak

---

## Phase 2: 保留中raws資料の再評価

- [x] **TASK-AP-003**: `raws/clawdbot_research.md` の記事化判断
  - 調査日: 2026-01-29
  - 現状: 調査データのみ（実際に試した記録なし）
  - **判断結果（2026-03-11）**: **保留継続**
    - Clawdbot/Moltbot = OpenClawは同一プロダクト
    - OpenClaw関連記事はすでに7本公開済み（openclaw-*.md）
    - 改めてclawdbot研究を記事化する価値は低い
    - 実際にインストール・運用した新たな体験が生じた場合に再評価

---

## Phase 3: 新記事ネタ収集

- [x] **TASK-AP-004**: 最近の技術体験からネタを洗い出す（2026-03-11 調査完了）

  ### 発見した候補

  #### 候補A: ObsidianでClaude Skills管理
  - ファイル: `articles/obsidian-claude-skills-management.md`（スタブのみ、2026-01-19作成）
  - 内容: Windows 11でClaude CodeのSkillsをObsidianで管理する
  - 状態: フロントマターのみ、本文未着手
  - **判断**: 実際にObsidian管理を運用しているなら書ける。rawsはないが体験ベース記事

  #### 候補B: OpenClaw VPS常駐設定
  - ファイル: `raws/google_ai_mode_openclaw_vps_conversation.md`（1063行）
  - 内容: VPS選定〜常駐設定の調査資料（AI会話ログ形式）
  - 状態: rawsあり、記事スタブなし
  - **判断**: 実際にVPS設定した体験があれば記事化可能。体験なければ保留。

  #### 候補C: MUSUBIや百式での最新発見
  - `musubi-not-really-using-it.md`は公開済み
  - 新しい発見・運用改善があれば新規記事として執筆

  ### 未使用raws一覧
  | ファイル | 内容 | 状態 |
  |---------|------|------|
  | `clawdbot_research.md` | Moltbot/OpenClaw調査 | 保留（Task-AP-003参照） |
  | `google_ai_mode_openclaw_vps_conversation.md` | VPS常駐設定 | 候補B |
  | `wsl_tmux_mechanism.md` | WSL+tmuxマルチエージェント解説 | multiagent-terminal記事に使用済みの可能性 |
  | `windows_alternatives.md` | Windowsマルチエージェント代替 | 同上 |
  | `multiagent_comparison.md` | マルチエージェント比較 | 同上 |
  | `kimi_k_research.md` | Kimi K2調査 | 保留（前スプリント判断） |

---

## KPI

| 指標 | 目標 | 現状 |
|------|------|------|
| textlint エラー数 | 0 | - |
| 公開記事数（本スプリント） | 1〜2 | 0（判断待ち） |
| 新ネタ候補数 | 1以上 | 2候補（候補A/B） |
