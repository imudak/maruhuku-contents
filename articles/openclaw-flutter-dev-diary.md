---
title: "OpenClawでFlutter開発環境を構築した日記"
emoji: 🦞
type: idea
topics:
  - OpenClaw
  - Flutter
  - AIエージェント
  - 開発環境
  - WSL
published: false
---

# OpenClawでFlutter開発環境を構築した日記

## はじめに

今日、OpenClawというAIエージェントを使って、WSL2上にFlutter開発環境を構築してみた。OpenClawはDiscordやTelegramなどのメッセージングアプリから操作できるAIエージェントで、Claude Code相当の機能をチャット経由で使える。

「Discordでチャットしながら開発環境が整う」という体験が新鮮だったので、その様子を日記風にまとめてみる。

## やりたかったこと

- WSL2（Ubuntu 24.04）上にFlutter開発環境を構築
- 既存のFlutterプロジェクトをクローンしてビルド確認
- Claude Codeも使えるようにして、AI支援開発の準備

## Discordでの会話スタート

OpenClawを起動して、Discordの専用チャンネルでメンションする。

```
@クロウ候 こんにちは
```

すると、AIが応答してくれる。最初はセットアップウィザード的なやり取りがあり、ペルソナ（名前や性格）を設定できた。銀英伝ファンなので、ラインハルト風のキャラにしてみた（完全に趣味）。

## GitHub認証

まずはGitHubリポジトリにアクセスするための認証。

```
@クロウ候 GitHub認証を設定して
```

AIがgh CLIをインストールし、認証手順を案内してくれた。

```bash
# AIが実行
mkdir -p ~/.local/bin
curl -sLO https://github.com/cli/cli/releases/...
# ...
```

Personal Access Tokenを使ってログイン。プライベートリポジトリにもアクセスできるようになった。

## Flutterインストール

次にFlutter。

```
@クロウ候 Flutterをインストールして
```

sudoが使えない環境だったので、AIは自動的にユーザーディレクトリへのインストールに切り替えてくれた。

```bash
# AIが実行
cd ~
curl -sLO https://storage.googleapis.com/flutter_infra_release/...
tar -xf flutter_linux_*.tar.xz
echo 'export PATH="$HOME/flutter/bin:$PATH"' >> ~/.bashrc
```

途中で依存パッケージ（clang, cmake, ninja-build等）が必要になり、「これを実行して」と指示された：

```bash
sudo apt-get install clang cmake ninja-build pkg-config libgtk-3-dev lld unzip
```

sudoが必要な部分は人間が実行、それ以外はAIが自動で進める分業体制。

## プロジェクトのクローンとビルド

GitHubのプライベートリポジトリをクローン。

```
@クロウ候 私のリポジトリをクローンして
```

AIがgh repo listで一覧を取得し、必要なリポジトリを順番にクローン。10個のリポジトリが数分で揃った。

```bash
# AIが実行
cd ~/projects
gh repo clone user/project1
gh repo clone user/project2
# ...
```

Flutterプロジェクトのビルドを試みると、SDKバージョンの不一致が発覚。

```
The current Dart SDK version is 3.6.2.
Because project requires SDK version ^3.10.4, version solving failed.
```

AIが「最新のFlutter 3.38.9にアップグレードが必要」と判断し、自動でアップグレード：

```bash
flutter upgrade
# 3.27.4 → 3.38.9
```

再度ビルドすると、今度は成功：

```
✓ Built build/linux/x64/release/bundle/project_name
```

## WSLgの罠

ビルドは成功したが、アプリを起動しようとすると問題が。

リモートデスクトップ（Tailscale + SSH）経由でWSLにアクセスしていたため、WSLgのグラフィック表示が動かなかった。

```
libEGL warning: failed to get driver name for fd -1
MESA: error: ZINK: failed to choose pdev
```

AIと一緒にトラブルシューティング：
- DISPLAY変数の設定を試す → ダメ
- ソフトウェアレンダリングを試す → ダメ
- シンプルなxeyesで確認 → やはり表示されない

結論：WSLgはリモートデスクトップ経由だと動作しない場合がある。物理的にPCの前にいる時に再試行することに。

## 感想

### 良かった点

1. **チャットで指示するだけ**：コマンドを調べて打つ手間が省ける
2. **エラー対応が速い**：エラーが出ても即座に原因分析と対策を提案
3. **環境差異を吸収**：sudoが使えない→ユーザーインストールに切り替え、のような判断を自動でやってくれる
4. **記録が残る**：Discordのチャット履歴がそのまま作業ログになる

### 注意点

1. **sudoが必要な操作は人間が実行**：セキュリティ上、特権操作はAIに任せられない
2. **GUI確認はローカルで**：リモート環境だとWSLgが動かない場合がある
3. **APIコスト**：会話量に応じてコストがかかる（とはいえ、開発効率を考えると十分ペイする）

## おわりに

「AIエージェントに開発環境を作ってもらう」という体験は、思っていた以上に快適だった。特に、エラーが出た時に「あとはよろしく」と任せられるのが大きい。

次は実際のコーディング作業（機能実装やテスト）をOpenClaw経由でやってみようと思う。

---

*この記事はOpenClawを使った開発体験の記録です。*
