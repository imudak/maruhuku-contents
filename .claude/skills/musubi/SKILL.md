---
name: musubi
description: "MUSUBI SDD workflow. Use for feature additions, spec changes, gap detection, and onboarding."
---

# MUSUBI — 仕様駆動開発

正の情報源: `~/projects/flow-manager/docs/flows/musubi.md`（作業前に必ず読むこと）

## ディレクトリ構造
- `steering/` — プロジェクトメモリ（product, tech, structure, constitution）
- `storage/specs/` — 要件定義、`storage/design/` — 設計、`storage/tasks/` — タスク
- `storage/changes/` — 仕様変更Delta Spec
- `plans/` — フェーズ計画（プロジェクトルート直下）
- **`steering/features/` は使わない**

## 正規フロー
1. `/sdd-requirements` → storage/specs/
2. `/sdd-design` → storage/design/
3. `/sdd-tasks` → storage/tasks/
4. `/sdd-implement` → テスト先行
5. `/sdd-validate` → constitution準拠確認
6. `jj git push`

## 仕様変更
```bash
musubi-change init CHANGE-NNN --title "変更内容"
musubi-change validate CHANGE-NNN
# 実装...
musubi-change apply CHANGE-NNN
musubi-change archive CHANGE-NNN
```

## ギャップ検出
```bash
musubi-gaps detect --verbose
musubi-gaps coverage
```
