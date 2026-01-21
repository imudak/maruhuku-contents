---
title: Claude CodeからNotebookLMに質問できるSkillを試してみた
emoji: 📚
type: tech
topics:
  - ClaudeCode
  - NotebookLM
  - Google
  - AI
  - 開発環境
published: false
---

# Claude CodeからNotebookLMに質問できるSkillを試してみた

## NotebookLMスキルとは

Google NotebookLMは、アップロードしたドキュメントに基づいてAIが回答してくれるサービスだ。このスキルを使うと、Claude CodeからNotebookLMに直接質問を投げて、ソースに基づいた回答を得ることができる。

つまり、自分がアップロードしたマニュアルやドキュメントについて、Claude Codeの会話の中で質問できるようになる。

## インストール

SkillsMPを使って簡単にインストールできる。

```bash
bunx skills add PleasePrompto/notebooklm-skill
```

このコマンドで`.claude/skills/notebooklm/`（または`.agents/skills/notebooklm/`）にスキルがインストールされる。

## 初回セットアップ

### 1. 認証の設定

初回はGoogleアカウントでの認証が必要。Claude Codeで以下のように依頼する。

```
NotebookLMの認証をセットアップして
```

ブラウザが開くので、Googleアカウントでログインする。認証情報は保存されるので、この操作は一度だけでよい。

### 2. NotebookLMでノートブックを準備

1. [notebooklm.google.com](https://notebooklm.google.com) にアクセス
2. 新しいノートブックを作成
3. ドキュメント（PDF、テキストなど）をアップロード
4. 「共有」→「リンクを知っている全員」で共有設定を有効にする

共有設定は必須だ。プライベートのままだとスキルからアクセスできない。

### 3. ノートブックをライブラリに追加

```
Add this NotebookLM to my library: https://notebooklm.google.com/notebook/xxxxx
```

スキルが自動的にノートブックの内容を確認し、適切な名前とタグを付けてライブラリに登録してくれる。

## 使い方

ライブラリに追加したノートブックに対して、自然言語で質問できる。

```
Cyber-Gのバッテリー使用時間は？
```

するとスキルがNotebookLMにアクセスし、アップロードしたドキュメントに基づいた回答を返してくれる。

実際の回答例：

> **基本スペック：**
> - バッテリー容量：3400mAh（リチウムイオン）
> - 連続使用時間：約5時間
> - 充電時間：約2時間（5V/2A充電器使用時）
>
> **注意点：**
> - USB PD等の急速充電には非対応
> - 8分間操作がないと自動電源オフ

ドキュメントからの引用なので、ハルシネーションがなく信頼性が高い。

## 便利なコマンド

スキルは内部でPythonスクリプトを使っている。直接実行する場合は以下のコマンドが使える。

```bash
# 認証状態の確認
python scripts/run.py auth_manager.py status

# ライブラリ一覧
python scripts/run.py notebook_manager.py list

# ノートブックの検索
python scripts/run.py notebook_manager.py search --query "keyword"

# 直接質問
python scripts/run.py ask_question.py --question "質問内容" --notebook-id notebook-id
```

## 制限事項

- ローカルのClaude Codeのみ対応（Web版のClaude.aiでは使えない）
- 各質問は独立しており、前の質問の文脈を引き継がない
- NotebookLMの無料枠には1日50クエリの制限がある
- ノートブックは事前にNotebookLMにアップロードしておく必要がある

## ユースケース

- 製品マニュアルを参照しながら開発作業
- 社内ドキュメントを基にした質問応答
- 技術仕様書の内容確認
- 複数のドキュメントを横断した調査

NotebookLMにドキュメントを集約しておけば、Claude Codeから離れることなく必要な情報を取得できる。

## まとめ

NotebookLMスキルを使うと、Claude Codeの会話の中でドキュメントベースの質問応答ができる。

1. `bunx skills add PleasePrompto/notebooklm-skill` でインストール
2. 認証をセットアップ
3. NotebookLMでノートブックを作成・共有
4. ライブラリに追加して質問

ハルシネーションを防ぎたい場面や、特定のドキュメントに基づいた回答が欲しい場面で活用できる。

## 参考

- [notebooklm-skill (GitHub)](https://github.com/PleasePrompto/notebooklm-skill)
- [SkillsMP](https://skillsmp.com/)
