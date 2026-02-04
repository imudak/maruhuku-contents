# OpenClaw アップデート失敗トラブル報告

**発生日時**: 2026年2月4日
**報告者**: Claude Code (claude-opus-4-5-20251101)

## 概要

Discordからopenclawのアップデートを依頼した後、応答がなくなり `openclaw --version` も失敗する状態になった。

## OpenClawエージェントが実行した手順

Discordから「特に作業していなければあなた自身をupdateしてください」と依頼を受け、以下の手順を実行した。

### 1. gateway ツールによる更新試行

```
gateway action=update.run
→ タイムアウト（10秒後）
```

### 2. 状態確認

```bash
openclaw status
→ "Update available (npm 2026.2.2-3)" と表示
```

### 3. openclaw update 実行

```bash
openclaw update
```

結果:
```
npm error code ENOTEMPTY
npm error syscall rename
npm error path /home/imudak/.nvm/versions/node/v24.13.0/lib/node_modules/openclaw
npm error dest /home/imudak/.nvm/versions/node/v24.13.0/lib/node_modules/.openclaw-2PbyTivh
npm error errno -39
```

### 4. npmキャッシュクリア試行

```bash
npm cache clean --force && npm install -g openclaw@latest
```

結果: キャッシュディレクトリ自体の削除でENOTEMPTYエラー

### 5. キャッシュ強制削除後に再試行

```bash
rm -rf ~/.npm/_cacache && npm install -g openclaw@latest
```

結果: 再びENOTEMPTYエラー（パッケージディレクトリのrename失敗）

この時点でOpenClawエージェントは応答不能となった。

## 症状

- Discordからのアップデート依頼後、応答なし
- `openclaw --version` が `command not found` エラー
- `npm list -g` で `openclaw@` とバージョンが空欄で表示される

## 原因

アップデート処理が中途半端な状態で中断され、パッケージが壊れた状態になっていた。

### 具体的な状態

```
~/.nvm/versions/node/v24.13.0/
├── bin/openclaw -> ../lib/node_modules/openclaw/openclaw.mjs  （シンボリックリンクは存在）
└── lib/node_modules/openclaw/
    └── extensions/  （このフォルダのみ存在）
    └── openclaw.mjs （存在しない！）
```

シンボリックリンクの参照先ファイル（`openclaw.mjs`）が存在しないため、コマンドが実行できない状態だった。

## 復旧手順

### 1. 状況確認

```bash
# プロセス確認（アップデート中のプロセスがないか）
ps aux | grep -iE "(npm|yarn|pnpm)"

# パッケージ状態確認
npm list -g --depth=0

# インストールディレクトリ確認
ls -la ~/.nvm/versions/node/v24.13.0/lib/node_modules/openclaw/
```

### 2. 設定ファイルの保存場所確認

`~/.openclaw/` に以下の設定・データが保存されており、npmパッケージとは別の場所にあるため再インストールしても影響なし：

| パス | 内容 |
|------|------|
| `openclaw.json` | メイン設定ファイル |
| `credentials/` | 認証情報 |
| `agents/` | エージェント設定 |
| `workspace/` | ワークスペースデータ |
| `identity/` | アイデンティティ情報 |
| `media/` | メディアファイル |

### 3. 壊れたパッケージの削除

```bash
# 通常のアンインストールは ENOTEMPTY エラーで失敗したため手動削除
rm -rf ~/.nvm/versions/node/v24.13.0/lib/node_modules/openclaw
rm -f ~/.nvm/versions/node/v24.13.0/bin/openclaw
```

### 4. 再インストール

```bash
npm install -g openclaw
```

結果: 700パッケージがインストールされ、バージョン `2026.2.2-3` が正常にインストールされた。

### 5. gatewayの再起動

openclawはsystemdユーザーサービスとしてgatewayを実行しているため、新しいバージョンを反映するには再起動が必要。

```bash
# サービス状態確認
systemctl --user status openclaw-gateway

# 再起動
systemctl --user restart openclaw-gateway

# 動作確認
openclaw health
```

## 復旧後の確認結果

```
$ openclaw --version
2026.2.2-3

$ openclaw health
Discord: ok (@OpenClaw) (786ms)
Agents: main (default)
...
```

## 教訓・注意点

1. **アップデート中の中断は危険**: npmパッケージのインストール中に中断すると、パッケージが壊れた状態で残る可能性がある

2. **設定は別の場所に保存**: `~/.openclaw/` に設定が保存されているため、パッケージの再インストールでは設定は失われない

3. **gatewayの再起動を忘れずに**: CLIをアップデートしても、systemdサービスとして動いているgatewayは古いバージョンのまま。再起動が必要

4. **手動削除が必要な場合がある**: パッケージが壊れた状態だと `npm uninstall` が失敗することがあり、手動での削除が必要になる場合がある

## 今後の対策

### 1. アップデート前にgatewayを停止する

```bash
systemctl --user stop openclaw-gateway
openclaw update
systemctl --user start openclaw-gateway
```

### 2. ENOTEMPTYエラーが出たら即座に手動対応

中途半端な状態を放置せず、壊れたパッケージを手動削除してからクリーンインストール:

```bash
rm -rf ~/.nvm/versions/node/v24.13.0/lib/node_modules/openclaw
rm -f ~/.nvm/versions/node/v24.13.0/bin/openclaw
npm install -g openclaw
systemctl --user restart openclaw-gateway
```

### 3. アップデートは人間が監視できる状態で実行

- Discordからエージェントに依頼→エージェント実行は危険
- 失敗時に復旧できる人がいる状態で行う
- または、アップデート専用のスクリプトを用意しておく

## 関連ファイル

- 設定ディレクトリ: `~/.openclaw/`
- systemdサービス: `~/.config/systemd/user/openclaw-gateway.service`
- npmパッケージ: `~/.nvm/versions/node/v24.13.0/lib/node_modules/openclaw/`

---

## 記事化依頼

このrawファイルをもとに、Zenn記事として整形してください。

- タイトル案: 「OpenClawのアップデートで応答不能に！復旧手順と対策まとめ」
- 対象読者: OpenClawユーザー、npmグローバルパッケージを使う開発者
- トーン: 実体験ベースのトラブルシューティング記事
- 含めるべき内容:
  - 何が起きたか（エージェントからのアップデート依頼→応答不能）
  - なぜ起きたか（ENOTEMPTY、パッケージ破損）
  - どう直したか（手動削除→再インストール→gateway再起動）
  - 今後どうすべきか（対策3点）
