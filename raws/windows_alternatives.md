# Windows環境でのマルチエージェント構成 代替手段調査レポート

> **調査日**: 2026-01-29
> **調査担当**: 足軽2号（シニアソフトウェアエンジニア）
> **タスクID**: subtask_002

---

## 概要

本レポートは、WSL2 + tmux を使用しない Windows 環境でのマルチエージェント並列開発構成の代替手段を調査したものである。

---

## 1. Windows Terminal + PowerShell による構成

### 1.1 Windows Terminal のペイン機能

Windows Terminal は Microsoft 公式のモダンターミナルアプリケーションであり、以下の機能を持つ：

**ペイン操作**:
- `Alt + Shift + +`: 水平分割（横並び）
- `Alt + Shift + -`: 垂直分割（縦並び）
- `Alt + クリック`: プロファイル選択して分割

**コマンドラインからの起動**:
```powershell
# 3ペイン構成の例
wt -p "Command Prompt" ; split-pane -p "Windows PowerShell" ; split-pane -H wsl.exe
```

**評価**:
| 項目 | 評価 |
|------|------|
| ペイン分割 | ○ 可能 |
| プログラム制御 | △ 限定的 |
| セッション永続化 | × 不可 |
| send-keys相当 | × なし |

### 1.2 PowerShell のジョブ機能

PowerShell 7+ では複数の並列実行機構が利用可能：

#### a) ForEach-Object -Parallel（推奨）
```powershell
1..10 | ForEach-Object -Parallel {
    # 並列処理
    Start-Sleep -Seconds 1
    "処理 $_"
} -ThrottleLimit 4
```

#### b) Start-Job（バックグラウンドジョブ）
```powershell
$job = Start-Job -ScriptBlock { Get-Process }
Receive-Job -Job $job
```

#### c) Start-ThreadJob（スレッドジョブ）
```powershell
$job = Start-ThreadJob -ScriptBlock { Get-Process }
```

**比較表**:
| 機能 | ForEach-Object -Parallel | Start-Job | Start-ThreadJob |
|------|-------------------------|-----------|-----------------|
| 実行単位 | スレッド | プロセス | スレッド |
| オーバーヘッド | 低 | 高 | 低 |
| ThrottleLimit | あり | なし | あり |
| セッション永続 | なし | なし | なし |

**制限事項**:
- ローカルジョブはセッションに紐づく（ログオフで終了）
- エージェント間の通信機構がない
- tmux の send-keys に相当する機能がない

---

## 2. Windows Native の tmux 代替ツール

### 2.1 psmux（PowerShell Multiplexer）

**概要**: Windows ネイティブの tmux 代替。Rust で実装。

**特徴**:
- WSL/Cygwin 不要
- セッション永続化（detach/reattach）
- 同期入力（複数ペインに同時入力）
- tmux 互換キーバインド

**基本操作**:
```powershell
psmux new-session -s mysession
psmux split-window -v
psmux split-window -h
psmux detach
psmux attach -t mysession
```

**評価**:
| 項目 | 評価 |
|------|------|
| セッション永続 | ○ 可能 |
| ペイン管理 | ○ 可能 |
| send-keys相当 | ○ 可能 |
| 成熟度 | △ 新しいプロジェクト |

**参照**: [GitHub - marlocarlo/psmux](https://github.com/marlocarlo/psmux)

### 2.2 ConEmu

**概要**: 高機能ターミナルエミュレータ。長い歴史を持つ。

**特徴**:
- タブ・ペイン対応
- CMD, PowerShell, Cygwin, PuTTY 等対応
- 豊富なカスタマイズ

**制限**:
- send-keys に相当するプログラム制御なし
- セッション永続化なし

**評価**:
| 項目 | 評価 |
|------|------|
| ペイン管理 | ○ 可能 |
| カスタマイズ | ◎ 豊富 |
| プログラム制御 | × 限定的 |
| セッション永続 | × 不可 |

### 2.3 Cmder

**概要**: ConEmu ベースのポータブルターミナル。

**特徴**:
- 完全ポータブル（USB 可）
- Clink 統合
- Git 統合

**制限**: ConEmu と同様

### 2.4 WezTerm

**概要**: Rust 製の高性能クロスプラットフォームターミナル。

**特徴**:
- GPU アクセラレーション
- Lua スクリプトによる設定
- マルチプレクサ機能内蔵
- SSH 統合

**評価**:
| 項目 | 評価 |
|------|------|
| ペイン管理 | ○ 可能 |
| Lua スクリプト | ◎ 柔軟 |
| セッション管理 | ○ 可能 |
| クロスプラットフォーム | ○ |

### 2.5 Tabby

**概要**: モダンなクロスプラットフォームターミナル。

**特徴**:
- タブ・ペイン記憶
- SSH 接続管理
- シリアル接続対応

---

## 3. その他の代替手段

### 3.1 Docker を使った方法

**Docker Sandboxes（推奨）**:
```bash
docker sandbox run claude-code
```
Docker Desktop 4.50+ で利用可能。

**コンテナベースの並列実行**:
```bash
# 複数のエージェントコンテナを起動
docker run -d --name agent1 -v ./project:/workspace claude-code
docker run -d --name agent2 -v ./project:/workspace claude-code
```

**利点**:
- 完全な分離
- 再現性
- セキュリティ

**参照**: [Docker Docs - Claude Code](https://docs.docker.com/ai/sandboxes/claude-code/)

### 3.2 WSL2 なしの方法

#### a) Docker Desktop（Hyper-V バックエンド）
Windows 10/11 Pro では WSL2 なしで Docker を実行可能。

```powershell
# Hyper-V バックエンドに切り替え
# Docker Desktop Settings > General > Use the WSL 2 based engine をオフ
```

#### b) psmux + PowerShell ジョブの組み合わせ
```powershell
# psmux でセッション管理
psmux new-session -s shogun
psmux split-window -v
psmux send-keys -t shogun:0.1 'Start-Job -ScriptBlock { ... }'
```

#### c) AutoHotkey による自動化
```autohotkey
; キー送信の自動化
SendInput, {Text}コマンド
Send, {Enter}
```

**参照**: [AutoHotkey](https://www.autohotkey.com/)

### 3.3 その他のアプローチ

#### a) VS Code Tasks + ターミナル
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run Agent 1",
      "type": "shell",
      "command": "claude-code",
      "presentation": { "panel": "dedicated" }
    }
  ]
}
```

#### b) Windows Task Scheduler
永続的なジョブ実行に使用可能だが、対話的なエージェント制御には不向き。

---

## 4. 実現可能性評価

### 4.1 総合評価マトリクス

| 手段 | ペイン管理 | セッション永続 | send-keys | プログラム制御 | 成熟度 | 総合評価 |
|------|-----------|---------------|-----------|--------------|--------|---------|
| **Windows Terminal** | ○ | × | × | △ | ◎ | △ |
| **psmux** | ○ | ○ | ○ | ○ | △ | **◎** |
| **ConEmu/Cmder** | ○ | × | × | × | ◎ | △ |
| **WezTerm** | ○ | ○ | △ | ○ | ○ | ○ |
| **Docker** | ○ | ○ | ○ | ◎ | ◎ | **◎** |
| **PowerShell Jobs** | × | × | × | ○ | ◎ | △ |

### 4.2 推奨構成

#### 最も現実的な代替案: **Docker ベース**

```
┌─────────────────────────────────────────┐
│          Docker Desktop (Hyper-V)       │
├─────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Shogun   │ │  Karo    │ │ Ashigaru │ │
│  │Container │ │Container │ │Container │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│         │          │           │        │
│         └────┬─────┴───────────┘        │
│              │                          │
│         Volume共有                      │
│    (queue/, status/, etc.)              │
└─────────────────────────────────────────┘
```

**利点**:
- WSL2 なしで動作可能（Hyper-V バックエンド）
- 完全な分離と再現性
- `docker exec` で send-keys 相当の制御

**制限**:
- Docker Desktop のライセンス（大企業は有料）
- セットアップの複雑さ

#### 次点: **psmux**

Windows ネイティブで tmux に最も近い体験を提供。ただし新しいプロジェクトのため、安定性の確認が必要。

### 4.3 multi-agent-shogun システムへの適用

| 要件 | WSL2+tmux | Docker | psmux | Windows Terminal |
|------|-----------|--------|-------|------------------|
| 階層構造（将軍→家老→足軽） | ◎ | ◎ | ○ | △ |
| YAML通信 | ◎ | ◎ | ◎ | ◎ |
| send-keys通知 | ◎ | ○ | ○ | × |
| セッション永続 | ◎ | ◎ | ○ | × |
| 移植性 | △ | ○ | ○ | ◎ |

---

## 5. 結論

### 5.1 現状の評価

**WSL2 + tmux が最も適している理由**:
1. 成熟したセッション管理
2. send-keys による確実なエージェント間通信
3. 豊富なドキュメントとコミュニティ

### 5.2 代替案の推奨順位

1. **Docker ベース構成**（最も現実的）
   - WSL2 不要（Hyper-V 使用時）
   - 高い分離性とセキュリティ
   - セットアップスクリプトの整備が必要

2. **psmux**（将来有望）
   - Windows ネイティブ
   - tmux 互換
   - 成熟度の向上を待つ価値あり

3. **WezTerm + カスタムスクリプト**
   - Lua による柔軟な制御
   - クロスプラットフォーム対応

### 5.3 推奨事項

現時点では **WSL2 + tmux の継続使用** を推奨する。ただし、以下の場合は代替案を検討：

- WSL2 が使用できない環境 → Docker (Hyper-V)
- 軽量な代替が必要 → psmux の検証
- クロスプラットフォーム要件 → WezTerm

---

## 参考資料

- [Windows Terminal Panes | Microsoft Learn](https://learn.microsoft.com/en-us/windows/terminal/panes)
- [GitHub - marlocarlo/psmux](https://github.com/marlocarlo/psmux)
- [Slant - ConEmu vs tmux](https://www.slant.co/versus/5489/11858/~conemu_vs_tmux)
- [ConEmu Alternatives | AlternativeTo](https://alternativeto.net/software/conemu/)
- [PowerShell Parallel Execution | Microsoft Learn](https://learn.microsoft.com/en-us/powershell/scripting/dev-cross-plat/performance/parallel-execution)
- [Docker Docs - Claude Code](https://docs.docker.com/ai/sandboxes/claude-code/)
- [Simon Willison - Parallel Coding Agents](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/)
- [AutoHotkey](https://www.autohotkey.com/)
