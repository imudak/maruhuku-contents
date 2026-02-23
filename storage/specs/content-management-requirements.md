# Content Management Requirements

**Feature**: content-management
**Version**: 1.0.0
**Status**: Implemented
**Date**: 2026-02-24

---

## Overview

Zenn記事・ブックコンテンツの管理・執筆・公開に関する要件定義。
まるふく工房の技術発信拠点として、継続的な高品質記事の公開を実現する。

---

## Requirements

### REQ-CM-001: Article Storage

The system SHALL store all Zenn articles as Markdown files under the `articles/` directory.

**Acceptance Criteria:**
- All articles exist as `.md` files in `articles/`
- Each article has valid YAML frontmatter (`title`, `emoji`, `type`, `topics`, `published`)
- File naming follows kebab-case slug convention

---

### REQ-CM-002: Version Control

The system SHALL manage all content changes with jj/Git version control.

**Acceptance Criteria:**
- All content changes are tracked in VCS history
- Repository is synced to GitHub (`https://github.com/imudak/maruhuku-contents`)
- `jj git push` publishes changes to remote

---

### REQ-CM-003: Article Publishing

WHEN an article's frontmatter has `published: true` AND `jj git push` is executed, the system SHALL publish the article to Zenn (`https://zenn.dev/imudak`).

**Acceptance Criteria:**
- Article appears on Zenn within minutes of push
- Article URL matches `https://zenn.dev/imudak/articles/{slug}`

---

### REQ-CM-004: Draft Management

WHILE an article has `published: false`, the system SHALL keep the article as a draft not visible on Zenn.

**Acceptance Criteria:**
- Draft articles are not publicly accessible on Zenn
- Draft articles can be previewed locally with `npx zenn preview`

---

### REQ-CM-005: Lint Validation

WHEN an article is ready for publication, the system SHALL pass `npx textlint` with zero errors before the `published` flag is set to true.

**Acceptance Criteria:**
- `npx textlint articles/{slug}.md` exits with code 0
- No textlint or markdownlint errors present

---

### REQ-CM-006: Article Writing Flow

The system SHALL support a structured article writing flow aligned with `flow-manager/docs/flows/article-writing.md`.

**Acceptance Criteria:**
- Articles progress through statuses: 未処理 → 候補 → 執筆中 → おねがい待ち → 公開済み
- Article evaluation uses 5-axis scoring (タイムリーさ/読者需要/まるふく実績/差別化/収益性, 20点×5)
- Publication requires explicit imudak approval ("公開してよい")

---

### REQ-CM-007: Author Style Consistency

The system SHALL enforce author persona and writing style rules defined in `CLAUDE.md`.

**Acceptance Criteria:**
- All articles use ですます調
- No AI-like expressions (「以下に示します」etc.)
- Articles start with concrete episode hooks, not abstract problem statements
- Author persona: 55歳個人事業主プログラマ、淡々としたトーン

---

### REQ-CM-008: Book Management

The system SHALL manage Zenn books as directories under `books/`.

**Acceptance Criteria:**
- Book configurations exist as `config.yaml` within each book directory
- Book chapters are stored as numbered Markdown files

---

### REQ-CM-009: KPI Tracking

IF monthly article publication count falls below 4, THEN the system SHALL flag the deficit against KPI targets.

**Acceptance Criteria:**
- Monthly published article count ≥ 4
- Zenn follower growth ≥ +50/month
- Paid article subscription count reaches cumulative 100

---

### REQ-CM-010: Dependency Management

The system SHALL manage Node.js dependencies for Zenn CLI via `package.json`.

**Acceptance Criteria:**
- `npx zenn` commands work after `npm install`
- `npx textlint` linting works with configured rules

---

## Traceability Matrix

| Requirement | Design Section | Implementation |
|-------------|---------------|----------------|
| REQ-CM-001 | DIR-001 | `articles/*.md` |
| REQ-CM-002 | DIR-002 | `.jj/`, `.git/` |
| REQ-CM-003 | FLOW-001 | frontmatter `published: true` |
| REQ-CM-004 | FLOW-001 | frontmatter `published: false` |
| REQ-CM-005 | FLOW-002 | `.textlintrc`, `package.json` |
| REQ-CM-006 | FLOW-003 | `flow-manager/docs/flows/article-writing.md` |
| REQ-CM-007 | STYLE-001 | `CLAUDE.md`, `.claude/skills/japanese-article-proofreading/` |
| REQ-CM-008 | DIR-003 | `books/*/` |
| REQ-CM-009 | KPI-001 | 百式 KPI tracking |
| REQ-CM-010 | TECH-001 | `package.json`, `node_modules/` |
