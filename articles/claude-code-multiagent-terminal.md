---
title: "Claude Codeを複数並列で動かすとき、ターミナルは何を使えばいいか"
emoji: "🪖"
type: "tech"
topics:
  - "claudecode"
  - "tmux"
  - "docker"
  - "wsl"
  - "terminal"
published: false
---

複数のClaude Codeエージェントを同時に動かしたくなりました。あるプロジェクトで「調査・設計・実装を並列でやらせたら速いのでは」と思ったのがきっかけです。

ところが実際に試してみると、エージェントに指示を渡すための仕組みが意外とカギになることがわかりました。**tmuxのsend-keys**が事実上の必須機能で、それが使えないツールは並列エージェント制御には向かない、というのが調べて出た結論です。

## なぜsend-keysが必要なのか

Claude Codeを複数起動するだけなら、ターミナルを複数開けばできます。ただし「あるエージェントが終わったら、別のエージェントに次の指示を渡す」という自動化をするには、スクリプトから別のターミナルにキー入力を送れる機能が必要です。

tmuxにはそれが`send-keys`コマンドとして備わっています。

```bash
# 別のペインにコマンドを送信する
tmux send-keys -t shogun:0.1 'claude' Enter
```

エージェント制御の階層（たとえば「将軍が家老に指示して、家老が足軽に指示する」）を自動化しようとすると、このsend-keysが必要になります。

## 候補ツールの比較

WSL2+tmuxを前提にしていると当たり前のように使えますが、「WSL2が使えない環境はどうするか」を調べてみました。

| ツール | send-keys相当 | セッション永続 | ペイン管理 |
|--------|:-------------:|:-------------:|:---------:|
| **WSL2 + tmux** | ◎ | ◎ | ◎ |
| Docker | ○ | ◎ | ◎ |
| psmux | ○ | ○ | ○ |
| WezTerm | △ | ○ | ○ |
| Windows Terminal | × | × | ○ |
| ConEmu | × | × | ○ |

「セッション永続」はターミナルを閉じてもプロセスが継続するかどうかで、これも並列実行では重要です。

## WSL2 + tmux（最有力）

結局これが一番成熟しています。send-keysは完全に動作し、detach/attachでセッションを永続化でき、30年以上の実績があるので安定性の心配がありません。

WSL2が入っている環境であれば迷わずこれを選ぶのが無難です。

## Docker（WSL2不要の代替案）

WSL2が使えない場合、Dockerがもっとも扱いやすい代替です。

`docker exec`でコンテナ内プロセスにコマンドを送れます。tmuxのsend-keysと完全に同等ではありませんが、自動化の用途は満たせます。

```bash
docker exec -it agent1 bash -c 'echo "次の指示" | claude'
```

Windows 10/11 ProであればHyper-Vバックエンドを使えば、WSL2なしでDockerを動かせます。Docker Desktopの設定で「Use the WSL 2 based engine」をオフにすればそのモードになります。

並列エージェント構成にするなら、エージェントごとにコンテナを分けてボリューム共有する形が整理しやすいです。

```bash
docker run -d --name agent1 -v ./project:/workspace my-claude-image
docker run -d --name agent2 -v ./project:/workspace my-claude-image
```

ライセンス面では、商用利用（大企業）はDocker Desktopが有料になるので注意が必要です。個人開発や小規模チームは無料のまま使えます。

## psmux（Windows Native候補）

**psmux**はRust製のWindows Nativeなtmux代替ツールです。WSL不要で、コマンドもtmux互換です。

```powershell
psmux new-session -s shogun
psmux split-window -v
psmux send-keys -t shogun:0.1 'claude' Enter
```

ただし2026年3月時点では比較的新しいプロジェクトで、ドキュメントもまだ少ないです。個人で実験的に使う分には面白い選択肢ですが、本番運用に使うかは慎重に判断したほうがいいです。

## WezTerm（Lua制御できるターミナル）

**WezTerm**はGPUアクセラレーション対応のクロスプラットフォームターミナルで、Luaスクリプトで細かく制御できます。マルチプレクサ機能も内蔵しています。

send-keysに相当する機能はLua APIを通じて実現できますが、tmuxのsend-keysほど単純ではなく、Luaを書く手間がかかります。

```lua
-- WezTermのLua APIでペインにテキスト送信
local pane = window:active_pane()
pane:send_text("claude\n")
```

クロスプラットフォームで動かしたい場合には選択肢に入りますが、Luaの学習コストは覚悟が必要です。

## Windows Terminal（並列制御には不向き）

Windows Terminalはペインを分割して複数ターミナルを表示できますが、別のペインにキー入力を送る機能がありません。そのため、自動化された並列エージェント制御には使えません。

人間が手動で操作するだけでよければ問題ありませんが、エージェント間の自動通信が必要になる用途には向かないです。

## まとめ

Claude Codeのマルチエージェント並列実行を自動化するには、send-keys相当の機能が必要で、現時点では以下の優先順位になります。

1. **WSL2 + tmux** — 迷ったらこれ
2. **Docker** — WSL2が使えない場合に扱いやすい代替
3. **psmux** — Windows Nativeで試したい場合（安定性は要確認）
4. **WezTerm** — クロスプラットフォーム要件があるとき

「tmuxのsend-keysが使えるか」がポイントです。それ以外の機能（画面分割、タブなど）はどのツールでもおおむね揃っているので、そこが判断基準になりました。
