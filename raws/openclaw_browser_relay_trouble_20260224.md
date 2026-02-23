# OpenClaw Browser Relay設定トラブルと対処（2026-02-24）

## 経緯

Browser Relay設定のためにWSL外部からゲートウェイにアクセスできるようにしようとして、以下の変更を行った：

1. `~/.openclaw/openclaw.json` の `gateway.bind` を `"all"` に変更
2. Windows側で `netsh interface portproxy` でポート18792のフォワーディングを追加

結果、Discordチャンネルとの接続が切れた。

## 原因

**`gateway.bind: "all"` が不正な設定値だった。**

- OpenClaw v2026.2.21-2 では `gateway.bind` に `"all"` は有効な値として認識されない
- 設定バリデーションエラーが発生し、ゲートウェイが正常に起動・動作しなくなった
- `openclaw status` で `gateway.bind: Invalid input` エラーが表示される
- ゲートウェイが停止状態（`state activating`）のまま接続を受け付けなくなった
- Discordプロバイダもゲートウェイ経由で動作するため、接続が切れた

### netshコマンドは関係あったか？

**直接の原因ではない。** netshのポートプロキシ（ポート18792）はゲートウェイ（ポート18789）とは別ポートであり、削除しても追加しても今回のDiscord接続断には影響しない。

問題の本質は `openclaw.json` の `gateway.bind` 設定値の不正であり、netshの操作とは独立した問題だった。ただし、同じタイミングで両方の変更を行ったため、原因の切り分けが難しくなっていた。

削除したポートプロキシの内容：
```
listenaddress=0.0.0.0  listenport=18792  →  connectaddress=172.27.204.237  connectport=18792
```

## 対処

`openclaw.json` から `gateway.bind` キーを削除し、デフォルト値（loopback）に戻した。

**変更前：**
```json
"gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "all",
    ...
}
```

**変更後：**
```json
"gateway": {
    "port": 18789,
    "mode": "local",
    ...
}
```

その後 `openclaw gateway restart` でゲートウェイを再起動し、Discordへの再接続を確認。

### 注意点

- 設定バリデーションエラーが発生すると `openclaw config set` 等のCLIコマンドも動作しなくなるため、直接JSONファイルを編集する必要があった
- `openclaw doctor --fix` もconfig修正は行わなかった

## 現在の状態（対処後）

- ゲートウェイ: `ws://127.0.0.1:18789` でリスン中（loopbackのみ）
- Discord: `@Lord Claw` としてログイン済み
- Windows側ポートプロキシ: なし（削除済み）

---

## Browser Relay設定案

### 目的

Windows側のブラウザからWSL上のOpenClawゲートウェイ（Control UI / Browser Relay）にアクセスする。

現状、ゲートウェイは `127.0.0.1:18789`（WSL内loopback）でのみリスンしており、Windows側のブラウザから直接アクセスできない。

### 案1: Tailscale（推奨）

OpenClawにはTailscale統合が組み込まれている。

```json
"gateway": {
    "port": 18789,
    "mode": "local",
    "tailscale": {
        "mode": "on",
        "resetOnExit": false
    }
}
```

- メリット: OpenClaw公式サポート、セキュア、NATトラバーサル不要、外出先からもアクセス可能
- デメリット: Tailscaleアカウントとクライアントのセットアップが必要
- 手順:
  1. WSLとWindowsの両方にTailscaleをインストール
  2. 同じTailnetに参加
  3. 上記の設定を適用してゲートウェイ再起動
  4. Windows側ブラウザからTailscale IPでアクセス

### 案2: SSHポートフォワーディング

Windows側からWSLへSSHトンネルを張る。

```powershell
# PowerShellから実行
ssh -L 18789:127.0.0.1:18789 imudak@localhost
```

- メリット: 追加ソフト不要、ゲートウェイ設定の変更不要、セキュア
- デメリット: SSHセッションを維持する必要がある、WSL側のSSHサーバーが必要
- アクセス: Windowsブラウザから `http://127.0.0.1:18789/`

### 案3: netsh portproxy + gateway.bind の正しい値

`gateway.bind` の正しい設定値を確認した上で、全インターフェースにバインドし、Windowsからportproxyでアクセスする。

```powershell
# WSLのIPを取得
wsl hostname -I

# ポートプロキシ設定（WSL_IPは実際のIPに置換）
netsh interface portproxy add v4tov4 listenport=18789 listenaddress=0.0.0.0 connectport=18789 connectaddress=<WSL_IP>
```

- メリット: 常時接続、追加プロセス不要
- デメリット:
  - `gateway.bind` の正しい設定値の調査が必要（`"all"` は無効だった。ドキュメントまたは `openclaw configure` で確認する必要あり）
  - WSLのIPはWSL再起動で変わるため、都度更新が必要
  - ゲートウェイがネットワーク全体に露出するためセキュリティリスクあり
- 注意: `gateway.auth` のtoken認証が設定済みなので認証面は対応済み

### 案4: リバースプロキシ（nginx / Caddy）

WSL内でnginxやCaddyを立て、Windows側からアクセスする。WSLのポートフォワーディングが自動で効くポートを使えばnetshも不要。

- メリット: TLS終端、細かいアクセス制御が可能
- デメリット: 設定が複雑、追加サービスの管理が必要
- 通常のBrowser Relay用途ではオーバーキル

### 推奨

**案2（SSHフォワーディング）** が最も手軽で安全。すぐ試せる。

中長期的には **案1（Tailscale）** がOpenClaw公式統合もあり、最も安定的。

### 次のステップ

1. どの方式でBrowser Relayにアクセスするか決定する
2. 案3を採用する場合は、`gateway.bind` の正しい設定値をOpenClawドキュメントまたは `openclaw configure` ウィザードで確認する
3. Browser Relay自体の機能設定（`browser/service` は既に有効: `Browser control service ready (profiles=2)`）
4. Control UIからペアリングとBrowser Relayの動作確認
