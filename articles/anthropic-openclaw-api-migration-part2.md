---
title: "OpenClaw APIキー移行後に想定外の出費——cronのClaude Codeが原因だった"
emoji: "💸"
type: "tech"
topics:
  - anthropic
  - claude
  - openclaw
  - claudecode
  - api
published: false
---

[前の記事](https://zenn.dev/imudak/articles/anthropic-openclaw-api-migration)で「移行後のコストは月$10〜30程度になりそう」と書きました。

翌朝、Anthropicのコンソールを開いたら2日間で$40を超えていました。

## 何が起きていたか

Apr 4: $22.90
Apr 5: $17.29

月換算すると$300を超えます。明らかにおかしい。

最初は「会話が重いのかな」と思いました。OpenClawとのDiscord会話が長くなると1回のやり取りで大きなトークンを消費するので、それが積み重なったかと。

でも計算が合わない。この2日間はほとんど会話していない。

調べてみると、原因は別のところにありました。

## cronのClaude Codeが毎時APIキーを使っていた

前の記事で構成を「OpenClaw（対話・自律実行）はAPIキー、Claude Code（実装）はMAX」と整理したつもりでした。

ところが実際には、cronで起動するClaude Codeにも`ANTHROPIC_API_KEY`環境変数が流れ込んでいました。

仕組みとしてはこうです。

`openclaw.json`に設定したAPIキーは、OpenClawが起動する際に環境変数として展開されます。

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-ant-..."
  }
}
```

この環境変数は、OpenClaw経由で起動したプロセスに継承されます。そしてClaude CodeはAPIキーが環境変数にあると、MAXのOAuth認証より優先してAPIキーを使います。

百式巡回は毎時45分に起動します。発掘サイクルは3時間ごとに2本。加えてメンション確認が15分おき。これだけのcronが全部APIキーで動いていたわけです。

さらにもう一つ問題がありました。cronの環境にはNVMのパスが含まれないため、`claude`コマンドが見つからずエラーになっていました。

```
setsid: failed to execute claude: No such file or directory
```

4月6日の早朝3時台のログに残っていました。PATHエラーで落ちた場合は課金されませんが、それ以前は正常に起動してAPIキーを消費していたということです。

## 対応した内容

2つ直しました。

### 1. cronスクリプトにPATHを追加

cron-runnerの各スクリプト（9ファイル）の先頭に追加しました。

```bash
set -euo pipefail
export PATH="$HOME/.nvm/versions/node/v24.13.0/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
```

これで`claude`、`jq`、`openclaw`がcronの環境でも見つかるようになりました。

### 2. Claude Code起動前にAPIキーをunset

`run-claude-task.sh`（cronからClaude Codeを起動するラッパー）で、claude起動の直前にAPIキーを除外します。

```bash
# openclaw.jsonのenv注入でAPIキーが環境変数に入る場合があるが
# cronのClaude CodeはMAXサブスクを使うべきなので明示的に除外する
unset ANTHROPIC_API_KEY
timeout --kill-after=60 3600 setsid claude --permission-mode bypassPermissions \
  --output-format text -p "${PROMPT}" >> "${LOG_FILE}" 2>&1
```

API使用量の事前チェック部分も同様に`unset`しています。

## 修正後の構成（確定版）

| 用途 | ツール | 課金先 |
|------|--------|--------|
| Discord対話 | OpenClaw | Anthropic APIキー（従量課金）|
| cronプロンプト判断 | OpenClaw | Anthropic APIキー（従量課金）|
| 実装・自律実行 | Claude Code CLI | MAXサブスク |

「判断と対話」がAPIキー、「実装の手足」がMAXという整理が実態と合いました。

修正後は百式巡回が04:45から正常に再開し、ログも通るようになっています。

## 反省

前の記事では「移行後はほぼ影響なし」と書きました。実態は、影響がなかったのではなく確認が足りていなかったのでした。

`openclaw.json`に書いたAPIキーが環境変数として子プロセスに流れることは、動作として自然です。ただClaude Codeが「APIキーがあればOAuth認証より優先する」という仕様まで把握できていませんでした。

コスト対策を入れたら、移行直後に消費量を数日分確認する——これを怠ったのが原因です。

なお、Anthropicからの補償クレジット（$200分）があるので実害は限定的でしたが、もし補償期間が終わったあとに気づいていたら痛かったと思います。

## まとめ

- OpenClawのAPIキーは環境変数経由でcron起動のClaude Codeにも流れる
- Claude Codeはenv変数のAPIキーを優先するため、意図せず全cronがAPIキー課金になっていた
- 対策はcronスクリプトでの`unset ANTHROPIC_API_KEY`
- 移行後は消費量を数日追うべきだった
