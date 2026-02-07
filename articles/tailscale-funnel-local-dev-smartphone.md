---
title: "Tailscale Serve/Funnelでローカル開発サーバーをスマホから確認する"
emoji: "📱"
type: "tech"
topics: ["tailscale", "wsl2", "開発環境", "スマホ"]
published: true
---

## はじめに

ローカルで動かしているWebアプリをスマホでどう見えるか確認したい、という場面がありました。

同じLAN内ならIPアドレス直打ちでアクセスできますが、WSL2だとネットワーク構成が複雑で面倒になりがちです。ngrokを使う手もありますが、毎回URLが変わりますし無料枠の制限もあります。

**Tailscale Serve/Funnel**を使ったところ、固定URLでHTTPSアクセスできる環境が一瞬で作れました。

## 前提条件

- WSL2上で開発サーバーが動いている（Next.js、Viteなど）
- Tailscaleインストール済み

## Serve vs Funnel：どちらを使うか

| 機能 | Tailscale Serve | Tailscale Funnel |
|------|----------------|------------------|
| アクセス元 | Tailscaleネットワーク内のみ | インターネット全体 |
| スマホ側の準備 | Tailscaleアプリ + VPN接続が必要 | 不要 |
| セキュリティ | 高（VPN内のみ） | 低（URL知ってれば誰でもアクセス可） |
| 用途 | 自分のスマホで確認 | 他人に見せたい場合 |

**基本はServeを使い、必要な時だけFunnelを使う**のがおすすめです。

## 共通：権限設定（初回のみ）

```bash
# 現在のユーザーにTailscale操作権限を付与
sudo tailscale set --operator=$USER
```

これで `sudo` なしでServe/Funnelが使えるようになります。

## 方法1：Tailscale Serve（推奨）

自分のスマホにTailscaleアプリが入っている場合はこちら。

### 手順

```bash
# 開発サーバーがポート3000で動いている場合
tailscale serve 3000

# バックグラウンドで実行したい場合
tailscale serve --bg 3000
```

成功すると、以下のような出力が表示されます。

```
Available within your tailnet:

https://your-machine-name.tail*****.ts.net/
|-- proxy http://127.0.0.1:3000
```

### スマホからアクセス

1. スマホのTailscaleアプリでVPNを有効にする
2. 表示されたURLにブラウザからアクセス

### 停止方法

```bash
# フォアグラウンド実行中なら Ctrl+C
# バックグラウンド実行の場合
tailscale serve --https=443 off
```

## 方法2：Tailscale Funnel

スマホにTailscaleアプリがない場合や、他の人に見せたい場合はこちら。

### 手順

```bash
# 開発サーバーがポート3000で動いている場合
tailscale funnel 3000

# バックグラウンドで実行したい場合
tailscale funnel --bg 3000
```

成功すると、以下のような出力が表示されます。

```
Available on the internet:

https://your-machine-name.tail*****.ts.net/
|-- proxy http://127.0.0.1:3000

Funnel started.
```

### スマホからアクセス

表示されたURLにブラウザからアクセスするだけです。VPN接続は不要です。

### 注意点

FunnelはURLを知っていれば誰でもアクセスできます。機密データを扱う場合は注意が必要です。

### 停止方法

```bash
# フォアグラウンド実行中なら Ctrl+C
# バックグラウンド実行の場合
tailscale funnel off
```

## 補足

### HTTPSについて

Serve/FunnelはどちらもHTTPSで提供されます。セキュアコンテキストが必要なAPI（カメラ、マイクなど）のテストにも対応できます。

### --hostオプション

Viteなどでは、ローカルホスト以外からのアクセスを許可する設定が必要です。

```bash
npm run dev -- --host
tailscale serve 5173
```

### 実用例

```bash
# Next.js
npm run dev &
tailscale serve --bg 3000

# Vite
npm run dev -- --host &
tailscale serve --bg 5173
```

## まとめ

```bash
# 初回のみ
sudo tailscale set --operator=$USER

# 自分のスマホで確認（推奨）
tailscale serve --bg ポート番号

# 他の人に見せたい場合
tailscale funnel --bg ポート番号
```

ngrokのようなトンネルサービスと違い、Tailscaleを既に使っているなら追加設定不要です。固定URLでHTTPS、しかも無料で使えます。
