---
title: "Git → jj 移行 完全ガイド｜個人開発からチーム導入まで"
emoji: "🚀"
type: "tech"
topics:
  - jj
  - git
  - versioncontrol
  - チーム開発
  - 移行ガイド
published: true
price: 0
---

# Git → jj 移行 完全ガイド

## この記事について

jj (Jujutsu) は Google のエンジニアが開発した次世代バージョン管理システムです。Git と完全互換でありながら、操作性が劇的に向上します。

この記事では、**実際に Git から jj に移行した経験**をもとに、個人開発者からチーム導入までの具体的な手順・ハマりポイント・運用ノウハウを網羅的にまとめました。

**対象読者:**
- Git は使えるが jj を試してみたい方
- チームへの jj 導入を検討している方
- jj を触ったが Git との使い分けに迷っている方

:::message
筆者は jj を半年以上メインVCSとして使用し、複数プロジェクトを運用中です。無料の入門記事も公開していますが、本記事では**移行の実践ノウハウと落とし穴**に特化しています。
:::

---

## 第1章: なぜ jj に移行するのか

### Git の「当たり前」が実は非効率

Git を長年使っていると気づかない非効率があります:

| Git の当たり前 | jj での改善 |
|---|---|
| `git add` → `git commit` の2ステップ | 自動トラッキング、即座にコミット |
| ブランチ名を考える必要 | 匿名チェンジで作業開始、後から命名 |
| stash で作業退避 | 複数チェンジを自然に並行管理 |
| rebase 中のコンフリクト地獄 | コンフリクトを保持したままコミット可能 |
| `git reflog` での救出作業 | `jj op log` で全操作を完全巻き戻し |

### 移行コストは想像より低い

jj の最大の強みは **Git 互換** であることです:

- 既存の `.git` リポジトリをそのまま使える（`jj git init --colocate`）
- GitHub/GitLab のワークフローは変更不要
- チームメンバーは Git を使い続けられる（あなただけ jj を使える）
- `git` コマンドも引き続き使える

つまり、**リスクゼロで始められる**のです。

---

## 第2章: インストールと初期設定

### インストール

```bash
# macOS
brew install jj

# Linux (cargo)
cargo install --locked jj-cli

# Windows
winget install jj
# または scoop install jj
```

### 初期設定（必須）

```bash
# ユーザー情報
jj config set --user user.name "Your Name"
jj config set --user user.email "your@email.com"
```

### 推奨設定

```toml
# ~/.jjconfig.toml

[ui]
# diff表示をカラフルに
diff.format = "git"
# エディタ設定
editor = "code --wait"
# ページャー
pager = "less -FRX"

[git]
# push時に自動でブックマーク追跡
auto-local-bookmark = true
```

### Git エイリアスとの共存

移行期間中は Git エイリアスと jj を共存させることを推奨します:

```bash
# .bashrc / .zshrc
alias gs='jj st'
alias gl='jj log'
alias gd='jj diff'
# Git が必要な場面用
alias gitlog='git log --oneline -20'
```

---

## 第3章: 既存リポジトリの移行手順

### 個人リポジトリの場合

最も安全な方法は **colocate（共存）モード** です:

```bash
cd your-project

# 既存 Git リポジトリに jj を追加
jj git init --colocate

# 状態確認
jj log
```

これだけです。`.git` はそのまま残り、`.jj` ディレクトリが追加されます。

### 確認すべきこと

```bash
# 現在の変更が見えるか
jj st

# Git のリモートが認識されているか
jj git remote list

# ログが正しく表示されるか
jj log --limit 10
```

### .gitignore の調整

jj は `.gitignore` をそのまま尊重します。追加で `.jj/` を除外する必要はありません（jj が自動処理します）。

ただし、**jj 固有のファイル**が気になる場合:

```gitignore
# .gitignore に追加（任意）
.jj/
```

---

## 第4章: 日常ワークフローの変換

### Git → jj コマンド対応表

```
git status        → jj st
git add . && git commit -m "msg"  → jj commit -m "msg"
git diff          → jj diff
git log           → jj log
git branch        → jj bookmark list
git checkout -b   → (不要、自動で新チェンジ作成)
git stash         → (不要、別チェンジに移動するだけ)
git rebase -i     → jj rebase / jj squash
git push          → jj git push
git pull          → jj git fetch && jj rebase -d main
```

### 典型的な作業フロー

**Git の場合:**
```bash
git checkout -b feature/add-login
# ... 作業 ...
git add .
git commit -m "ログイン機能追加"
git push -u origin feature/add-login
```

**jj の場合:**
```bash
# ブランチ不要、そのまま作業開始
# ... 作業 ...
jj commit -m "ログイン機能追加"
jj bookmark set feature/add-login
jj git push --bookmark feature/add-login
```

### 並行作業（jj の真骨頂）

Git では stash や複数ブランチの切り替えが必要だった並行作業が、jj では自然にできます:

```bash
# 作業A を進行中...
jj describe -m "作業A: UIコンポーネント"

# 作業B に切り替え（作業A は自動保存）
jj new main
# ... 作業B ...
jj describe -m "作業B: API修正"

# 作業A に戻る
jj edit <作業AのチェンジID>
```

:::message
詳しい並行作業テクニックは[jjの並列作業ガイド](https://zenn.dev/imudak/articles/jj-parallel-work)もご参照ください。
:::

---

## 第5章: コンフリクト解決の革命

### Git のコンフリクト解決

Git では rebase 中にコンフリクトが発生すると**作業が中断**されます:

```bash
git rebase main
# CONFLICT! 手動修正が必要
# 全部直すまで rebase を完了できない
```

### jj のコンフリクト解決

jj は**コンフリクトをそのままコミットできます**:

```bash
jj rebase -d main
# コンフリクトが発生しても rebase は完了する
# コンフリクトマーカー付きのチェンジが作成される

jj st
# "This commit has conflicts" と表示される

# 好きなタイミングでコンフリクトを解決
jj resolve
# または手動でファイルを編集
```

**これが意味すること:**
- rebase 中に「途中で投げ出す」ことがない
- コンフリクトの解決を後回しにできる
- 複数のコンフリクトを好きな順序で解決できる

---

## 第6章: `jj op log` — 最強の安全ネット

### Git の reflog vs jj の op log

Git にも `reflog` がありますが、jj の `op log` ははるかに強力です:

```bash
jj op log
# 全操作の履歴が表示される
# commit, rebase, edit, merge... すべて

# 任意の時点に戻す
jj op restore <operation-id>
```

**具体例: rebase を間違えた場合**

```bash
# 間違った rebase をしてしまった
jj rebase -d wrong-branch

# op log で直前の状態を確認
jj op log --limit 5

# 1つ前の状態に完全復元
jj op restore @-
```

Git の reflog と違い、**ワーキングツリーの状態も含めて完全復元**されます。

### 「壊れない」という安心感

jj を使って半年、一度もデータを失っていません。Git 時代は年に1-2回は `reflog` での救出作業がありましたが、jj では:

- 間違った操作 → `jj op restore` で即復元
- 実験的な rebase → 失敗しても戻せるので気軽に試せる
- force push の事故 → `op log` から復元可能

---

## 第7章: チーム導入の戦略

### 段階的導入プラン

チームに jj を導入する場合、**段階的なアプローチ**を強く推奨します:

**Phase 1: パイロット（1-2週間）**
- 興味のあるメンバー1-2名が個人で試す
- colocate モードなのでチームに影響なし
- 感想・ハマりポイントを共有

**Phase 2: 部分導入（2-4週間）**
- パイロットメンバーが日常業務で使用
- Git ユーザーとの共存を確認
- チーム勉強会を開催

**Phase 3: 推奨ツール化**
- 新メンバーのオンボーディングに jj を含める
- ただし Git の使用も引き続き許容
- CI/CD は Git ベースのまま（変更不要）

### チームメンバーへの説明ポイント

jj に懐疑的なメンバーには以下を強調:

1. **Git を捨てる必要はない** — 共存できる
2. **学習コストは低い** — Git の知識がそのまま使える
3. **いつでも戻れる** — `.jj` を消すだけで元通り
4. **GitHub のワークフローは変わらない** — PR, CI, レビューはそのまま

### CI/CD との統合

jj はGitと共存するため、**CI/CDの変更は基本的に不要**です:

```yaml
# GitHub Actions — 変更なし
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# jj のブックマーク push は Git の push と同じ
# GitHub からは通常の Git push に見える
```

---

## 第8章: Windows 環境での注意点

### 既知の問題と対処法

Windows で jj を使う場合、いくつか注意点があります:

**1. 改行コード（CRLF）問題**

```toml
# ~/.jjconfig.toml
[git]
# CRLF を自動変換しない（推奨）
auto-crlf = false
```

:::message
詳細は[jj と Git の CRLF 互換性問題](https://zenn.dev/imudak/articles/jj-git-crlf-compatibility)をご覧ください。
:::

**2. NUL ファイルエラー**

Windows の予約語（NUL, CON, PRN等）がファイル名に含まれるリポジトリで問題が発生することがあります。

:::message
詳細と回避策は[jj Windows NUL ファイルエラー](https://zenn.dev/imudak/articles/jj-windows-nul-file-error)をご覧ください。
:::

**3. WSL での使用**

WSL 環境では Linux 版をそのまま使えます。Windows 側の IDE との連携も問題ありません:

```bash
# WSL 内でインストール
cargo install --locked jj-cli

# Windows の VS Code から WSL リポジトリを開く場合も正常動作
```

---

## 第9章: 高度なテクニック

### squash で履歴を綺麗に

```bash
# 現在のチェンジを親にまとめる
jj squash

# 特定のチェンジにまとめる
jj squash --into <change-id>

# メッセージを指定
jj squash -m "feature: ログイン機能"
```

### split で粒度を細かく

大きすぎるコミットを分割:

```bash
jj split
# インタラクティブにファイル/ハンクを選択
```

### rebase テクニック

```bash
# 特定のチェンジを別の場所に移動
jj rebase -r <change-id> -d <destination>

# チェンジとその子孫をまとめて移動
jj rebase -s <source> -d <destination>

# 複数の親を持つマージチェンジの作成
jj new <change-a> <change-b>
```

### テンプレートカスタマイズ

```toml
# ~/.jjconfig.toml
[template-aliases]
'format_short_id(id)' = 'id.shortest(8)'

[ui]
# ログ表示のカスタマイズ
log-default-revset = "@ | ancestors(immutable_heads().., 2) | trunk()"
```

---

## 第10章: トラブルシューティング

### よくある問題と解決策

**Q: `jj git push` が失敗する**

```bash
# ブックマークが設定されているか確認
jj bookmark list

# リモートの状態を同期
jj git fetch
jj git push --bookmark <name>
```

**Q: Git サブモジュールがあるリポジトリで問題**

jj は Git サブモジュールのサポートが限定的です。colocate モードであれば `git submodule` コマンドは引き続き使えます。

:::message
詳細は[jj と Git Submodule の gitlink 問題](https://zenn.dev/imudak/articles/jj-git-submodule-gitlink)をご覧ください。
:::

**Q: VS Code の Git 拡張と競合する？**

colocate モードなら `.git` が存在するため、VS Code の Git 拡張はそのまま動作します。ただし、jj での変更が VS Code の Git ビューに反映されるまでタイムラグがある場合があります。

**Q: merge commit の扱いは？**

```bash
# jj でマージ
jj new <branch-a> <branch-b>
jj describe -m "Merge branch-a and branch-b"

# Git の merge commit として push される
jj git push
```

---

## まとめ: 移行チェックリスト

### 個人で始める場合

- [ ] jj をインストール
- [ ] 初期設定（user.name, user.email）
- [ ] 既存リポジトリで `jj git init --colocate`
- [ ] 1週間ほど日常作業で使用
- [ ] `jj op log` での復元を一度試す

### チームで導入する場合

- [ ] パイロットメンバーを選定
- [ ] colocate モードでの共存を確認
- [ ] CI/CD に影響がないことを確認
- [ ] チーム勉強会を実施
- [ ] ドキュメント/Wiki に jj セクションを追加

### 参考リンク

- [jj 公式ドキュメント](https://martinvonz.github.io/jj/)
- [jj と Git の比較・連携ガイド](https://zenn.dev/imudak/articles/jj-vs-git-comparison)（無料）
- [jj の並列作業ガイド](https://zenn.dev/imudak/articles/jj-parallel-work)（無料）
- [jj の rebase vs merge 戦略](https://zenn.dev/imudak/articles/jj-rebase-vs-merge)（無料）

---

:::message alert
この記事が役に立ったら、ぜひ「いいね」やシェアをお願いします！jj に関する質問はコメント欄でどうぞ。
:::
