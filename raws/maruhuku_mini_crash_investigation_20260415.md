# MARUHUKU-MINI クラッシュ調査レポート（2026年4月15日）

調査日: 2026年4月16日  
対象PC: MARUHUKU-MINI（BIOS: AMI 5.16 / 2025-10-27）

---

## 概要

2026年4月15日早朝にPCが突然クラッシュし、約19時間後の翌日深夜0時45分まで起動できない状態が続いた。
Windowsイベントログおよびシステムログを調査した結果、以下の2点を特定した。

1. **クラッシュ原因**: スリープ中のSSD I/Oエラーによるカーネルパニック（BSOD）
2. **再起動できなかった理由**: BSOD後にWindows回復画面等で止まり、手動操作が必要な状態になっていた

---

## 1. 最初のクラッシュ原因

### 発生時刻

**2026年4月15日 午前5時40分43秒（JST）**

※「昼過ぎに落ちていた」と認識していたが、実際のクラッシュは早朝5:40。  
　昼過ぎに気づいた際にはすでに落ちた状態だったと推定される。

### イベントログの証拠

**Event ID 41（Microsoft-Windows-Kernel-Power）**

```
BugcheckCode          : 30 (0x1E)
BugcheckParameter1    : 0xffffffffc0000006  ← STATUS_IN_PAGE_ERROR
BugcheckParameter2    : 0x0
ConnectedStandbyInProgress : true
BugcheckInfoFromEFI   : true
LongPowerButtonPressDetected : false
```

**Event ID 6008（EventLog）**

```
以前のシステム シャットダウン ( 2026/04/15 5:40:43) は予期されていませんでした。
```

### 原因の詳細

`BugcheckParameter1 = 0xC0000006` は NTSTATUSコード **STATUS_IN_PAGE_ERROR**。  
これはページングファイルや仮想メモリのディスク読み取り中にI/Oエラーが発生したことを意味する。

`ConnectedStandbyInProgress: true` は、クラッシュ時にシステムが Connected Standby（モダンスリープ）関連の処理中であったことを示す。

通常のミニダンプファイルは生成されず（`BugcheckInfoFromEFI: true`）、クラッシュ情報はEFIファームウェアのNVRAMに保存された。

### クラッシュ直前の経緯

| 時刻 | イベント |
|------|---------|
| 2:23 AM | Windows起動（BootId=58） |
| 3:15〜3:16 AM | スリープ→復帰→ロック解除 |
| 3:37〜3:38 AM | スリープ→復帰→ロック解除 |
| 3:53〜3:54 AM | スリープ→復帰→ロック解除 |
| 4:30〜4:31 AM | スリープ→復帰→ロック解除 |
| 5:03〜5:04 AM | スリープ→復帰→ロック解除 |
| 5:04 AM | **Windows Update 開始**（ScreenSketch・PowerAutomateDesktop のインストール成功） |
| 5:15〜5:16 AM | スリープ→復帰→ロック解除 |
| 5:26〜5:27 AM | スリープ→復帰→ロック解除（最後の正常イベント） |
| **5:40 AM** | **BSOD クラッシュ** |

Windows Updateのインストール後、スリープと復帰を繰り返す中でSSDアクセス時にI/Oエラーが発生したと見られる。

---

## 2. Windowsが再起動できなかった理由

### BootID の追跡

WindowsはBootごとに連番ID（BootId）を割り当てる。

| BootId | 起動時刻 | 備考 |
|--------|---------|------|
| 57 | 4/13 13:42 | 正常起動 |
| 58 | 4/15 2:23 AM | 正常起動 → **5:40 AM にBSOD** |
| 59 | 4/16 0:45 AM | 正常起動（約19時間後） |

BootIdが58→59と**一つしか増えていない**。  
これはBSOD後に**Windowsが起動できる段階まで達した試行が一度もなかった**ことを意味する。  
（Windowsが起動前に止まった場合はBootIdが記録されない）

### 19時間の空白

- クラッシュ（5:40 AM）から次の正常起動（翌日0:45 AM）まで約19時間
- Windows起動修復ログ（SrtTrail.txt）は存在しない
- CBS.logも4/15 04:22の後は4/16 00:52まで空白

**考えられるシナリオ:**

- BSODの後、自動再起動を試みたがストレージI/Oエラーが再現しWindowsが起動できなかった
- 「PCが起動しない」状態（BSOD画面または回復画面）で約19時間放置された
- 深夜0時頃に手動で電源を操作し、その際は正常に起動した

デスクトップ型ミニPC（バッテリーなし）であるため、手動操作なしでは自己復旧できない。

---

## 3. システム構成

| 項目 | 内容 |
|------|------|
| PC名 | MARUHUKU-MINI |
| OS | Windows 10.00.26200（ビルド26200） |
| BIOS | AMI 5.16（2025年10月27日） |
| スリープ方式 | S3（Connected Standby S0は現在無効） |

### SSD構成

| ドライブ | モデル | 容量 | FWバージョン | 健全性 |
|----------|--------|------|------------|--------|
| システム | SSD 256GB | 256GB | X0411B0 | Healthy |
| データ | SPCC M.2 PCIe SSD（Silicon Power） | 1TB | SN25634 | Healthy |

---

## 4. 対策

### Connected Standby について

現在このPCでは **S0（Connected Standby）はすでに無効**（ファームウェア非対応）。  
`powercfg /a` の出力:
```
スタンバイ (S0 低電力アイドル)
　システム ファームウェアはこのスタンバイ状態をサポートしていません。
```

改めての対応は不要。念のためレジストリで明示的に無効化する場合:

```powershell
# 管理者PowerShellで実行
# 0 = S3強制（S0無効）
reg add HKLM\SYSTEM\CurrentControlSet\Control\Power /v PlatformAoAcOverride /t REG_DWORD /d 0 /f
```

### SSDファームウェアの更新

交換可能なSPCC（Silicon Power）側のファームウェア確認を推奨。

1. Silicon Power Toolbox をSiliconpowerのサポートページからダウンロード・インストール
2. 「Firmware Update」タブで最新版を確認
3. **更新前に重要データのバックアップを取ること**

256GB側（モデル名「SSD 256GB」/ FW `X0411B0`）はモデルが汎用的でメーカー不明。  
MARUHUKU-MINI本体のメーカーサポートページで確認する。

---

## 5. 今後の監視ポイント

- Event ID 41（Kernel-Power）の再発がないか定期確認
- SSDのSMART情報（現在はHealthy）の継続監視
- スリープ後の復帰時にストレージエラーが出ないか注意
