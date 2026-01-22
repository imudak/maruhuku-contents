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
published: true
---

# Claude CodeからNotebookLMに質問できるSkillを試してみた

## NotebookLMスキルとは

Google NotebookLMは、アップロードしたドキュメントに基づいてAIが回答してくれるサービスです。今回試したスキルを使うと、Claude CodeからNotebookLMに直接質問を投げて、ソースに基づいた回答を得られます。

自分がアップロードしたマニュアルやドキュメントについて、Claude Codeの会話の中で質問できるのは便利そうだと思い、試してみることにしました。

## インストール

[PleasePrompto/notebooklm-skill](https://github.com/PleasePrompto/notebooklm-skill)をインストールしました。使用しているパッケージマネージャーに応じて、以下のいずれかのコマンドを実行します。

```bash
# npmの場合
npx skills add PleasePrompto/notebooklm-skill

# bunの場合
bunx skills add PleasePrompto/notebooklm-skill

# pnpmの場合
pnpm dlx skills add PleasePrompto/notebooklm-skill
```

コマンドを実行すると、いくつかの選択肢が表示されます。

1. **Select agents to install skills to** - インストール先のエージェントを選択します。Claude Code、Codex、Cursorなど、検出されたエージェントから選べます
2. **Installation scope** - `Project`（現在のプロジェクトのみ）か`User`（ユーザー全体）かを選択します
3. **Installation method** - `Symlink (Recommended)`か`Copy`かを選択します。Symlinkを選ぶと、スキルの更新が自動的に反映されます

今回は「Claude Code, Codex」「Project」「Symlink」を選択しました。選択が完了すると、`.claude/skills/notebooklm/`（または`.agents/skills/notebooklm/`）にスキルがインストールされます。

## 初回セットアップ

### 1. 認証の設定

初回はGoogleアカウントでの認証が必要でした。Claude Codeで以下のように依頼しました。

```
NotebookLMの認証をセットアップして
```

ブラウザが自動的に開き、Googleアカウントでログインすると認証情報が保存されます。この操作は一度だけで済みます。

### 2. NotebookLMでノートブックを準備

次に、NotebookLM側でノートブックを準備しました。

1. [notebooklm.google.com](https://notebooklm.google.com) にアクセス
2. 新しいノートブックを作成
3. ドキュメント（PDF、テキストなど）をアップロード
4. 「共有」→「リンクを知っている全員」で共有設定を有効にする

共有設定を忘れるとスキルからアクセスできないので注意が必要です。

### 3. ノートブックをライブラリに追加

```text
https://notebooklm.google.com/notebook/xxxxx
このノートブックをライブラリに追加して
```

Claude Codeに依頼すると、スキルが自動的にノートブックの内容を確認し、名前とタグを付けてライブラリに登録してくれます。

## 使い方

### 基本的な質問

ライブラリに追加したノートブックに対して、自然言語で質問できます。試しに以下のように質問してみました。

```
Cyber-Gのバッテリー使用時間は？
```

スキルがNotebookLMにアクセスし、アップロードしたドキュメントに基づいた回答を返してくれました。

実際の回答：

> **基本スペック：**
> - バッテリー容量：3400mAh（リチウムイオン）
> - 連続使用時間：約5時間
> - 充電時間：約2時間（5V/2A充電器使用時）
>
> **注意点：**
> - USB PD等の急速充電には非対応
> - 8分間操作がないと自動電源オフ

ドキュメントからの引用なので、ハルシネーションがなく信頼性が高いです。

### 複数のノートブックを管理する

複数のNotebookLMを使い分けたい場合、ライブラリ機能が便利でした。

#### ノートブックの追加

2つ目以降のノートブックも、最初と同じようにClaude Codeに依頼するだけで追加できます。

```text
https://notebooklm.google.com/notebook/xxxxx
このノートブックもライブラリに追加して
```

#### 登録したノートブックの確認

登録済みのノートブックを確認したい場合も、自然言語で依頼できます。

```text
どんなノートブックが登録されていますか
```

すると、以下のような形式で一覧が表示されます。

```text
📚 Notebook Library:

  📓 Cyber-G User Manual [ACTIVE]
     ID: cyber-g-user-manual
     Topics: guitar, music, hardware, manual, enya, cyber-g
     Uses: 0

  📓 MUSUBI SDD Framework
     ID: musubi-sdd-framework
     Topics: ai, agent, sdd, musubi, rust, framework, development, codegraph, security
     Uses: 0
```

`[ACTIVE]`マークが付いているノートブックが、質問時のデフォルトとなります。

#### 使用するノートブックの切り替え

別のノートブックに質問したい場合は、質問の中でノートブック名を指定すればよいです。

```text
MUSUBI SDD Frameworkのノートブックをアクティブにして
```

または、質問と一緒に指定することもできます。

```text
MUSUBI SDD Frameworkのノートブックで、CodeGraphの機能について教えて
```

## 便利なコマンド

スキルは内部でPythonスクリプトを使っています。直接実行する場合は以下のコマンドが使えます。

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

## トラブルシューティング

### Windows環境で文字コードエラーが発生する場合

Windows環境でスキルを実行したところ、以下のようなUnicodeEncodeErrorが発生しました。

```text
UnicodeEncodeError: 'cp932' codec can't encode character '\U0001f527' in position 0: illegal multibyte sequence
```

スクリプト内の絵文字がWindowsのデフォルト文字コード（CP932）で出力できないのが原因でした。

環境変数`PYTHONIOENCODING=utf-8`を設定してスクリプトを実行することで解決できました。

```bash
# 認証セットアップの場合
cd .claude/skills/notebooklm
PYTHONIOENCODING=utf-8 .venv/Scripts/python scripts/auth_manager.py setup

# その他のコマンドも同様
PYTHONIOENCODING=utf-8 .venv/Scripts/python scripts/auth_manager.py status
```

### 認証セットアップの詳細

認証セットアップ時は以下の流れで進みます。

1. スクリプトが自動的にブラウザを起動する
2. NotebookLMのログインページが表示される
3. 手動でGoogleアカウントにログインする
4. ログイン成功後、ブラウザの状態が自動保存される
5. 認証情報は`~/.claude/skills/notebooklm/data/browser_state/`に保存される

ブラウザウィンドウは可視状態で開く必要があります。ヘッドレスモードだと手動ログインができないためです。

認証が完了すると、以下のメッセージが表示されます。

```text
✅ Authentication setup complete!
You can now use ask_question.py to query NotebookLM
```

認証は一度行えば保存されるため、PC単位で初回のみの作業となります。

## ユースケース

- 製品マニュアルを参照しながら開発作業
- 社内ドキュメントを基にした質問応答
- 技術仕様書の内容確認
- 複数のドキュメントを横断した調査

NotebookLMにドキュメントを集約しておけば、Claude Codeから離れることなく必要な情報を取得できます。

## まとめ

NotebookLMスキルを試してみたところ、Claude Codeの会話の中でドキュメントベースの質問応答ができることが分かりました。

セットアップの流れは以下の通りです。

1. `bunx skills add PleasePrompto/notebooklm-skill` でインストール
2. 認証をセットアップ
3. NotebookLMでノートブックを作成・共有
4. ライブラリに追加して質問

ドキュメントからの引用で回答してくれるため、ハルシネーションを避けたい場面や、手元のマニュアルを参照しながら作業したい場面で使えそうです。

## 参考

- [PleasePrompto/notebooklm-skill (GitHub)](https://github.com/PleasePrompto/notebooklm-skill) - スキルのソースコードとドキュメント
- [notebooklm-skill (SkillsMP)](https://skillsmp.com/skills/pleaseprompto-notebooklm-skill-skill-md) - SkillsMarketplaceでのスキルページ
