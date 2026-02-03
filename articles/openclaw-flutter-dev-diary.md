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

今日、OpenClawというAIエージェントを使って、WSL2上にFlutter開発環境を構築しました。OpenClawはDiscordやTelegramなどのメッセージングアプリから操作できるAIエージェントで、Claude Code相当の機能をチャット経由で使えます。

「Discordでチャットしながら開発環境が整う」という体験が新鮮だったので、その様子を日記風にまとめてみます。

## やりたかったこと

- WSL2（Ubuntu 24.04）上にFlutter開発環境を構築
- 既存のFlutterプロジェクトをクローンしてビルド確認
- Claude Codeも使えるようにして、AI支援開発の準備

## Discordでの会話スタート

OpenClawを起動して、Discordの専用チャンネルでメンションします。

```
@エージェント名 こんにちは
```

AIが応答し、最初はセットアップウィザード的なやり取りでペルソナ（名前や性格）を設定しました。

## GitHub認証

まずはGitHubリポジトリにアクセスするための認証です。

```
@エージェント名 GitHub認証を設定して
```

AIがgh CLIをインストールし、認証手順を案内してくれました。

```bash
# AIが実行
mkdir -p ~/.local/bin
curl -sLO https://github.com/cli/cli/releases/...
```

Personal Access Tokenを使ってログインし、プライベートリポジトリにもアクセスできるようになりました。

## Flutterインストール

次にFlutterのインストールです。

```
@エージェント名 Flutterをインストールして
```

sudoが使えない環境だったので、AIは自動的にユーザーディレクトリへのインストールに切り替えてくれました。

```bash
# AIが実行
cd ~
curl -sLO https://storage.googleapis.com/flutter_infra_release/...
tar -xf flutter_linux_*.tar.xz
echo 'export PATH="$HOME/flutter/bin:$PATH"' >> ~/.bashrc
```

途中で依存パッケージ（clang, cmake, ninja-build等）が必要になり、「これを実行して」と指示されました。

```bash
sudo apt-get install clang cmake ninja-build pkg-config libgtk-3-dev lld unzip
```

sudoが必要な部分は人間が実行し、それ以外はAIが自動で進めるという分業体制です。

## プロジェクトのクローンとビルド

GitHubのプライベートリポジトリをクローンします。

```
@エージェント名 私のリポジトリをクローンして
```

AIが`gh repo list`で一覧を取得し、必要なリポジトリを順番にクローンしてくれました。10個のリポジトリが数分で揃いました。

Flutterプロジェクトのビルドを試みると、SDKバージョンの不一致が発覚。

```
The current Dart SDK version is 3.6.2.
Because project requires SDK version ^3.10.4, version solving failed.
```

AIが「最新のFlutter 3.38.9にアップグレードが必要」と判断し、自動でアップグレードしてくれました。

```bash
flutter upgrade
# 3.27.4 → 3.38.9
```

再度ビルドすると成功です。

```
✓ Built build/linux/x64/release/bundle/project_name
```

## WSLgの罠

ビルドは成功しましたが、アプリを起動しようとすると問題が発生しました。

リモートデスクトップ経由でWSLにアクセスしていたため、WSLgのグラフィック表示が動きませんでした。

```
libEGL warning: failed to get driver name for fd -1
MESA: error: ZINK: failed to choose pdev
```

AIと一緒にトラブルシューティングを試みました。

- DISPLAY変数の設定 → 効果なし
- ソフトウェアレンダリング → 効果なし
- シンプルなxeyesで確認 → やはり表示されない

結論として、WSLgはリモートデスクトップ経由だと動作しない場合があるようです。物理的にPCの前にいる時に再試行することにしました。

## 良かった点

- **チャットで指示するだけ**でコマンドを調べて打つ手間が省ける
- **エラー対応が速い**。エラーが出ても即座に原因分析と対策を提案してくれる
- **環境差異を吸収**してくれる。sudoが使えない→ユーザーインストールに切り替え、のような判断を自動で行う
- **記録が残る**。Discordのチャット履歴がそのまま作業ログになる

## 注意点

- **sudoが必要な操作は人間が実行**。セキュリティ上、特権操作はAIに任せられない
- **GUI確認はローカルで**。リモート環境だとWSLgが動かない場合がある
- **APIコスト**がかかる。会話量に応じた従量課金だが、開発効率を考えるとペイすると感じた

## おわりに

次は実際のコーディング作業（機能実装やテスト）をOpenClaw経由でやってみようと思います。
