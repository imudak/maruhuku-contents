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

### 3. config.tomlの設定（Windows）

**重要**: Codex CLI v0.86.0では、環境変数ではなく`~/.codex/config.toml`での設定が必須。

以下の手順でセットアップする：

```powershell
# 1. Codex CLIをグローバルインストール
npm install -g @openai/codex

# 2. PATHを通す（初回のみ）
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$npmPath = (npm config get prefix)
if ($currentPath -notlike "*$npmPath*") {
    $newPath = "$currentPath;$npmPath"
    [System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
}
# PowerShellを再起動

# 3. config.tomlを作成
mkdir ~\.codex\ -ErrorAction SilentlyContinue
@"
api_key = "sk-proj-your-api-key-here"
model_provider = "openai"
"@ | Out-File -FilePath ~\.codex\config.toml -Encoding utf8NoBOM

# 4. 確認
codex --version
cat ~\.codex\config.toml
```

**ポイント:**

- **環境変数は不要**: Codex CLI v0.86.0では`OPENAI_API_KEY`環境変数は使用されない
- **model_provider必須**: `model_provider = "openai"` を文字列として設定しないと401エラーになる
- **プロジェクトスコープAPIキー**: OpenAI Platformでは`sk-proj-`で始まるプロジェクトスコープのAPIキーのみ作成可能（2026年1月時点）

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
