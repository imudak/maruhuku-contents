# 記事計画: VPS vs 自宅ミニPC：常駐サーバーのコスト比較

## 記事の概要

常駐サーバー（OpenClaw + Claude Code）を運用するにあたり、VPSとミニPCのどちらが得かを比較した体験記事。

## ターゲット読者

- 自宅サーバーを検討している開発者
- VPSの月額費用を節約したい人
- ミニPCの用途を探している人

## 記事構成

### 1. はじめに
- 背景：OpenClawとClaude Codeを24時間動かしたかった
- 選択肢：VPS or 自宅ミニPC

### 2. VPSの選択肢
- ConoHa VPS（時間課金、初心者向け）
- さくらのVPS（安定性重視）
- Xserver VPS（高コスパ、2GBプラン 990円/月）

### 3. ミニPCという選択肢
- Intel N100 vs AMD Ryzen の比較
  - N100: TDP 6W、省電力特化
  - Ryzen: TDP 15W、高性能
- 実際に購入: NiPoGi Ryzen 3 4300U（約2.5〜3万円）

### 4. コスト比較（2年運用）

| 項目 | Xserver VPS (2GB) | ミニPC (Ryzen) |
|------|-------------------|----------------|
| 初期費用 | 0円 | 約25,000〜30,000円 |
| 月額費用 | 約1,000円 | 約335円（電気代） |
| 2年合計 | 約24,000円 | 約33,000円 |

→ 2年半〜3年で損益分岐点

### 5. スペック比較（参考：メインノートPCとの比較）

| 項目 | ノートPC | Mini-PC | VPS 2GB |
|------|----------|---------|---------|
| CPU | Ryzen 5 5625U | Ryzen 3 4300U | vCPU 3コア |
| コア/スレッド | 6C/12T | 4C/4T | - |
| RAM | 16GB | 16GB | 2GB |
| ストレージ | - | 256GB SSD | 50GB NVMe |

→ ミニPCはVPSの最上位プランより高スペック

### 6. まとめ
- 3年以上使うならミニPC
- 設定の手間を惜しむならVPS
- 実際に使ってみて：電気代月335円でVPS以上のスペック

## 作成ファイル

- `articles/vps-vs-minipc-server-cost.md`

## 検証方法

1. `npm run preview` で記事プレビュー確認
2. `npx textlint articles/vps-vs-minipc-server-cost.md` でLintチェック
3. `/japanese-article-proofreading` で校正
