---
title: "Flutterアプリをストアに出すまでの全手順【Google Play & App Store】"
emoji: "🚀"
type: "tech"
topics: ["flutter", "googleplay", "appstore", "個人開発"]
published: true
price: 500
---

# はじめに

Flutterでアプリを作った。動く。嬉しい。

…で、ストアに出そうとした瞬間、地獄が始まる。

開発者アカウントの作成、署名鍵の管理、スクリーンショットのサイズ要件、プライバシーポリシーの用意、クローズドテストの20人集め。**コードを書く時間より、ストア申請の準備の方が長い**という悲劇は、個人開発者なら誰もが経験するだろう。

この記事では、Flutterアプリを **Google Play** と **App Store** に公開するまでの全手順を、実際にハマったポイントと共にまとめる。

:::message
筆者は合同会社を持っているが、**個人アカウント**でGoogle Playに申請した経験をベースに書いている。法人アカウントとの差異も適宜補足する。
:::

# 対象読者

- Flutterアプリを作ったが、ストア申請は初めて
- 何から手をつければいいかわからない
- 以前挫折したので、今度こそ最後まで出したい

# 全体の流れ

```
1. 開発者アカウント作成（Google / Apple）
2. アプリの署名設定
3. ストア掲載情報の準備
4. ビルド & アップロード
5. 審査 & 公開
```

それぞれ、やるべきことと罠を順に解説する。

---

# Part 1: Google Play 編

## 1-1. 開発者アカウントの作成

### 費用と種別

| 項目 | 個人 | 組織 |
|------|------|------|
| 登録費 | $25（一回きり） | $25（一回きり） |
| 本人確認 | 身分証明書 | D-U-N-S番号 + 身分証明書 |
| 公開表示 | 個人名 | 組織名 |

**ポイント:** 個人アカウントでも法人口座に売上を振り込める。後から組織アカウントへの**アプリ移管（Transfer）も可能**なので、まずは個人で始めるのが早い。

### 本人確認のハマりポイント

2023年11月以降、Google Playの個人アカウントには本人確認が必須になった。

- 身分証明書（パスポートまたは運転免許証）の写真が必要
- **審査に数日かかる**ことがある
- 本人確認が完了するまでアプリをアップロードできない

→ **アプリ開発と並行して、先にアカウント作成を済ませておくこと。**

## 1-2. 署名鍵の設定

### Play App Signing（推奨）

Google Playでは **Play App Signing** が推奨されている。Googleが署名鍵を管理し、開発者はアップロード鍵だけを持つ。

```bash
# アップロード鍵の生成
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -storetype JKS -keyalg RSA -keysize 2048 \
  -validity 10000 -alias upload
```

### key.properties の設定

`android/key.properties` を作成（**Gitにコミットしないこと**）：

```properties
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=upload
storeFile=/path/to/upload-keystore.jks
```

`android/app/build.gradle` で読み込み設定を追加：

```groovy
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

:::message alert
**鍵を紛失すると、そのアプリは二度と更新できない。** バックアップは必ず取ること。Play App Signingを使っていれば、アップロード鍵の紛失はリセット可能だが、手続きに時間がかかる。
:::

## 1-3. ストア掲載情報の準備

ここが一番面倒で、一番時間がかかる部分。

### 必須項目チェックリスト

- [ ] アプリ名（30文字以内）
- [ ] 簡単な説明（80文字以内）
- [ ] 詳細な説明（4000文字以内）
- [ ] アイコン（512×512 PNG）
- [ ] フィーチャーグラフィック（1024×500 PNG/JPEG）
- [ ] スクリーンショット（最低2枚、推奨4-8枚）
- [ ] プライバシーポリシーURL
- [ ] カテゴリ選択
- [ ] コンテンツレーティング質問票
- [ ] ターゲットユーザー層の設定

### スクリーンショットの罠

Google Playのスクリーンショット要件：

- **最小:** 320px
- **最大:** 3840px
- **アスペクト比:** 16:9 または 9:16
- **形式:** JPEG または 24bit PNG（アルファなし）

**よくある失敗:** エミュレータのスクリーンショットをそのまま使うと、ステータスバーやナビゲーションバーが入る。`adb shell screencap` よりも、Flutter DevToolsやエミュレータの録画機能を使う方が綺麗に撮れる。

### プライバシーポリシー

個人データを一切収集しないアプリでも、プライバシーポリシーは**必須**。

最低限の内容：
- アプリが収集するデータ（「収集しません」でもOK）
- データの使用目的
- 第三者への共有の有無
- 連絡先

GitHub PagesやNotionの公開ページでホスティングすれば無料。

## 1-4. ビルドとアップロード

### AAB形式でビルド

Google PlayはAPKではなく **AAB（Android App Bundle）** を要求する。

```bash
flutter build appbundle --release
```

出力先: `build/app/outputs/bundle/release/app-release.aab`

### バージョン管理

`pubspec.yaml` のバージョンを必ず上げること：

```yaml
version: 1.0.0+1  # バージョン名+ビルド番号
```

**ビルド番号（+以降の数字）は一度使うと再利用できない。** アップロードのたびにインクリメントすること。

### アップロード

Google Play Consoleの「製品版」または「内部テスト」トラックにAABをアップロード。

## 1-5. クローズドテストの壁

2024年11月以降、**新規の個人アカウント**では以下が必須：

> クローズドテストで **20人以上のテスター** を集め、**14日間以上** テストを実施すること。

これが個人開発者にとって最大の壁。

### テスター集めの方法

1. **知人・友人に依頼**（最も確実）
2. **SNSで募集**（Twitter/X、Reddit等）
3. **テスター交換コミュニティ**（r/betatesting等）
4. **開発者コミュニティ**（Discord等で相互テスト）

:::message
テスターには「Google Play でオプトインリンクをクリック → アプリをインストール → 14日間保持」してもらう必要がある。インストールするだけではダメで、**オプトインの手順を踏む**必要がある点に注意。
:::

## 1-6. 審査と公開

クローズドテスト要件をクリアしたら、製品版に昇格して審査に提出。

- 初回審査: 通常 **数日〜1週間**
- リジェクト理由は具体的に通知される
- 修正して再提出可能

---

# Part 2: App Store 編

## 2-1. Apple Developer Program

### 費用

- **年間 $99（約15,000円）**
- 個人 / 組織どちらでも同額
- **毎年更新が必要**（更新しないとアプリが非公開になる）

### D-U-N-S番号（組織の場合）

法人で登録する場合、D-U-N-S番号が必要。無料で取得できるが **2-3週間かかる** ことがある。

## 2-2. 証明書とプロビジョニング

iOSのコード署名は複雑で、初見では挫折しやすい。

### 必要なもの

1. **Apple Distribution Certificate** — アプリに署名する証明書
2. **Provisioning Profile** — どのデバイスでどのアプリを動かせるかの設定
3. **App ID** — アプリの一意な識別子

### Xcode自動署名（推奨）

Flutterプロジェクトの場合、Xcodeで自動署名を設定するのが最も簡単：

1. `ios/Runner.xcworkspace` をXcodeで開く
2. **Signing & Capabilities** で「Automatically manage signing」にチェック
3. Team を選択

**注意:** これにはMacが必須。WindowsやLinuxではiOSビルドができない。

## 2-3. App Store Connect の設定

### 必須項目

Google Playとほぼ同じだが、追加で以下が必要：

- [ ] サブタイトル（30文字以内）
- [ ] キーワード（100文字以内、カンマ区切り）
- [ ] サポートURL
- [ ] App Clip（任意）

### スクリーンショット要件

App Storeはデバイスごとにスクリーンショットが必要：

| デバイス | サイズ |
|---------|--------|
| iPhone 6.9" | 1320 × 2868 |
| iPhone 6.7" | 1290 × 2796 |
| iPhone 6.5" | 1284 × 2778 or 1242 × 2688 |
| iPhone 5.5" | 1242 × 2208 |
| iPad 13" | 2064 × 2752 |
| iPad 12.9" | 2048 × 2732 |

**ポイント:** iPhone 6.7" と 6.9" は共用可能な場合がある。最新のApp Store Connect のドキュメントを確認すること。

## 2-4. ビルドとアップロード

### IPA ビルド

```bash
flutter build ipa --release
```

### Xcodeからアップロード

1. Xcodeで **Archive** を作成
2. **Distribute App** → **App Store Connect** を選択
3. アップロード

または `xcrun altool` でCLIからアップロードも可能。

## 2-5. 審査

Appleの審査は Google より厳しい。

### よくあるリジェクト理由

1. **Guideline 4.2 — Minimum Functionality:** 機能が少なすぎる
2. **Guideline 2.1 — Performance:** クラッシュやバグ
3. **Guideline 5.1.1 — Data Collection:** プライバシー関連の不備
4. **Guideline 4.0 — Design:** UIがiOSのガイドラインに沿っていない

### 対策

- **審査ガイドライン**を事前に読む: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- テスト用のデモアカウントがある場合、審査メモに記載
- 初回は **1-2日** で結果が出ることが多い

---

# Part 3: 両プラットフォーム共通のTips

## CI/CDの導入

手動ビルド＆アップロードは辛い。以下のツールで自動化できる：

- **Fastlane** — iOS/Android両対応のデプロイ自動化
- **GitHub Actions** — CI/CDパイプライン
- **Codemagic** — Flutter特化のCI/CD（無料枠あり）

```yaml
# GitHub Actions の例（Android AAB ビルド）
name: Build Android
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
      - run: flutter build appbundle --release
      - uses: actions/upload-artifact@v4
        with:
          name: app-release.aab
          path: build/app/outputs/bundle/release/app-release.aab
```

## アプリのサイズ最適化

ストアのダウンロード率に直結する。

```bash
# サイズ分析
flutter build appbundle --analyze-size

# 不要なアセットの除外（pubspec.yaml）
flutter:
  assets:
    - assets/images/  # 必要なものだけ
```

**Tree Shaking:** Flutterは未使用のDartコードを自動除去するが、ネイティブライブラリは対象外。不要なプラグインは外すこと。

## ストア最適化（ASO）

公開したら終わりではない。見つけてもらう努力が必要。

- **キーワード調査:** 競合アプリがどんなキーワードで上位表示されているか確認
- **タイトル・説明文の最適化:** 主要キーワードを自然に含める
- **スクリーンショットの順序:** 最初の2枚が最も重要（スクロールされないことが多い）
- **レビュー対応:** 低評価レビューには丁寧に返信

---

# まとめ

| フェーズ | Google Play | App Store |
|---------|-------------|-----------|
| アカウント費用 | $25（一回） | $99/年 |
| ビルド形式 | AAB | IPA |
| 必要な環境 | Windows/Mac/Linux | **Macのみ** |
| 審査期間 | 数日〜1週間 | 1-2日 |
| 特有の壁 | クローズドテスト20人 | 厳しい審査基準 |

**最大の学び:** ストア申請は「やれば終わる作業」であって「難しい作業」ではない。ただし、初めてだと何が必要かわからず無駄に時間を使う。このガイドで、その無駄を省けたなら幸いだ。

次のアプリを出す時は、きっと1時間で終わる。

---

:::message
この記事が役に立ったら、ぜひ「いいね」をお願いします。質問があればコメント欄へ。
:::
