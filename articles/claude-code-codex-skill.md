---
title: Claude CodeとCodexの連携をSkillで設定してみた
emoji: 🔄
type: tech
topics:
  - ClaudeCode
  - OpenAI
  - Codex
  - AI
  - 開発環境
published: false
---

# Claude CodeとCodexの連携をSkillで設定してみた

## きっかけ

[@owayo](https://zenn.dev/owayo)さんの記事「[Claude CodeとCodexの連携をMCPからSkillに変えたら体験が劇的に改善した](https://zenn.dev/owayo/articles/63d325934ba0de)」を読んで、自分のプロジェクトにも適用してみた。

基本的な設定方法は元記事の通りなので、ここでは追加で行った設定を記録する。

## 追加で設定したこと

### 1. Codexスキルだけをgit管理対象にする

`.claude/`ディレクトリは`.gitignore`で除外しているプロジェクトが多いと思う。自分のプロジェクトもMUSUBIフレームワークの設定で`.claude/`全体を除外していた。

しかし、追加したCodexスキルだけは共有したい。そこで`.gitignore`の否定パターンを使って、Codexスキルだけを許可した：

```gitignore
# .claude/は基本的に除外
.claude/*
# skillsディレクトリは許可
!.claude/skills/
# skills配下は除外
.claude/skills/*
# codexスキルだけ許可
!.claude/skills/codex/
```

これで `.claude/skills/codex/SKILL.md` だけがgit管理対象になる。

### 2. CLAUDE.mdへの記載

プロジェクトの`CLAUDE.md`（Claude Codeへの指示ファイル）にCodexスキルの使い方を追加した：

```markdown
### Codexスキル（セカンドオピニオン）

OpenAI Codex CLIを使用して、Claude以外の視点からコードベース分析を行います。

/codex PitchProviderの音声処理フローを説明して
/codex AudioInputServiceをレビューして
/codex このプロジェクトのデザインパターンを分析して
```

これでプロジェクト固有の使い方が明確になる。

### 3. 環境変数の設定（Windows）

元記事ではMac/Linux向けの`export`コマンドが紹介されていたが、Windowsでは以下のコマンドで永続的に設定する：

```powershell
[System.Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-your-key", "User")
```

**注意**: 設定後はClaude Codeを再起動しないと環境変数が反映されない。

## ハマったポイント

### jjとの相性

自分のプロジェクトは[jj（Jujutsu）](https://github.com/martinvonz/jj)でバージョン管理している。jjは`.gitignore`を尊重するが、一度追跡したファイルは`jj file untrack`で明示的に除外する必要があった。

`.gitignore`を変更した後、既に追跡されているファイルがあると：

```bash
# 追跡を解除
jj file untrack ".claude/"
```

が必要になる場合がある。

## まとめ

元記事の設定をそのまま適用した上で、以下を追加した：

1. `.gitignore`の否定パターンでCodexスキルだけをgit管理
2. `CLAUDE.md`にプロジェクト固有の使い方を記載
3. Windows向けの環境変数設定方法

元記事に感謝。

## 参考

- [Claude CodeとCodexの連携をMCPからSkillに変えたら体験が劇的に改善した](https://zenn.dev/owayo/articles/63d325934ba0de) - @owayo
