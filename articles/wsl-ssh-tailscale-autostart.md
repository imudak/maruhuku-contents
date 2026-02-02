---
title: "WSL2に外部からSSH接続する方法（Tailscale + 自動起動）"
emoji: "🔗"
type: "tech"
topics:
  - wsl
  - tailscale
  - ssh
  - windows
published: true
---

## はじめに

前回の記事で、ミニPCをヘッドレスサーバーとして運用する方法を紹介しました。

https://zenn.dev/maruhuku/articles/minipc-headless-server-setup

シン・テレワークシステムで外部からリモートデスクトップ接続はできるようになりましたが、Windowsの画面をまるごと転送するのはネットワーク負荷が重いです。WSL2に直接SSH接続できれば、もっと軽快に作業できます。

この記事では、Tailscaleを使ってWSL2に外部からSSH接続する方法と、Windows起動時にWSLを自動起動させる設定を紹介します。

## Cloudflare Tunnel vs Tailscale

外部からWSL2にアクセスする方法として、Cloudflare TunnelとTailscaleの2つを検討しました。

### Cloudflare Tunnel

- ルーターのポート開放が不要
- 独自ドメインでアクセスできる
- **ただし、ドメインのネームサーバーをCloudflareに移管する必要がある**

既にレンタルサーバーなどでDNS設定を使っている場合、移行作業が発生します。MXレコードなどを手動で再設定する必要があり、ミスするとメールが届かなくなるリスクもあります。

### Tailscale

- ルーターのポート開放が不要
- **DNS設定の変更が一切不要**
- インストールして認証するだけで使える
- 個人利用は無料

今回は既存のDNS設定を触りたくなかったので、**Tailscale**を選択しました。

## 前提条件

- Windows 11搭載のミニPC（WSL2がインストール済み）
- WSL2上でUbuntuが動作している
- 外出先で使うPC（Windows/Mac/Linux）

## WSL側の設定

### 1. SSHサーバーのインストールと起動

```bash
sudo apt update && sudo apt install openssh-server -y
sudo service ssh start
```

### 2. Tailscaleのインストール

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

### 3. Tailscaleを起動して認証

```bash
sudo tailscale up
```

認証用のURLが表示されるので、ブラウザで開いてGoogleアカウント等でログインします。

### 4. TailscaleのIPアドレスを確認

```bash
tailscale ip -4
```

`100.x.x.x` のようなIPが表示されます。これがTailscaleネットワーク内でのWSLのアドレスです。

## systemdでサービスを自動起動

WSL2ではsystemdを有効にすることで、Linux標準のサービス管理が使えます。

### 1. systemdを有効化

```bash
sudo nano /etc/wsl.conf
```

以下を追記します。

```ini
[boot]
systemd = true
```

### 2. WSLを再起動

PowerShellで以下を実行します。

```powershell
wsl --shutdown
```

その後、WSLを再度起動します。

### 3. SSHとTailscaleを自動起動に設定

```bash
sudo systemctl enable ssh
sudo systemctl enable tailscaled
```

確認します。

```bash
systemctl is-enabled ssh tailscaled
```

両方とも `enabled` と表示されれば成功です。

## Windows起動時にWSLを自動起動させる

ここまでの設定で、WSL内のサービスは自動起動するようになりました。しかし、**WSL自体はWindowsにログインしないと起動しません**。

ミニPCを再起動した後、ログインせずにSSH接続したい場合は、タスクスケジューラでWSLを自動起動させます。

### タスクスケジューラの設定

1. Windowsの検索で「タスクスケジューラ」を開く
2. 「タスクの作成」をクリック
3. 全般タブ
   - 名前: `WSL AutoStart`
   - 「ユーザーがログオンしているかどうかにかかわらず実行する」を選択
   - 「最上位の特権で実行する」にチェック
4. トリガータブ
   - 「新規」→「スタートアップ時」を選択
5. 操作タブ
   - プログラム: `C:\Windows\System32\wsl.exe`
   - 引数: `-u root`

引数に `-u root` を指定するのがポイントです。これがないと、ユーザーセッションがない状態ではWSLが起動しません。

### 動作確認

1. ミニPCを再起動
2. Windowsにログインせずに待機
3. 外部のPCからSSH接続を試す

```bash
ssh ユーザー名@100.x.x.x
```

接続できれば成功です。

## 外出先PCの設定

外出先で使うPCにもTailscaleをインストールします。

- Windows: https://tailscale.com/download/windows
- Mac: https://tailscale.com/download/mac
- Linux: https://tailscale.com/download/linux

インストール後、WSL側と同じアカウントでログインします。

### 自動起動の確認

Tailscaleはインストール時にスタートアップに登録されるため、PC起動時に自動で接続されます。タスクバー右下のシステムトレイにTailscaleのアイコンがあれば起動しています。

もし自動起動していない場合は、Tailscaleアプリの設定で「Run at login」にチェックを入れてください。

## 補足：同一ネットワーク内でも同じ方法で接続できる

Tailscaleは**外出先でも自宅内でも同じコマンドで接続できます**。

同一ネットワーク内にいる場合、Tailscaleは自動的にローカルIPアドレス経由で直接接続します。インターネットを経由しないため、遅延も最小限です。

```bash
# 自宅内から接続した場合の例
$ tailscale ping maruhuku-mini
pong from maruhuku-mini (100.122.114.36) via 192.168.11.21:61571 in 9ms
```

`via 192.168.11.21:61571` のようにローカルIPが表示されれば、LAN内で直接通信しています。外出先からの接続では、Tailscaleが自動的にインターネット経由のP2P接続に切り替えます。

つまり、ノートPCを自宅で使うときも外出先で使うときも、`ssh ユーザー名@100.x.x.x` で同じように接続できます。ネットワーク環境を意識する必要がありません。

## まとめ

WSL2に外部からSSH接続するための設定をまとめます。

1. **Tailscaleを選択** - DNS設定の変更が不要で導入が簡単
2. **WSL側でSSHとTailscaleをインストール** - systemdで自動起動に設定
3. **タスクスケジューラでWSL自動起動** - `-u root` オプションがポイント
4. **外出先PCにもTailscaleをインストール** - 同じアカウントでログイン

これで、ミニPCの電源を入れるだけで、どこからでもSSH接続できる環境が整いました。
