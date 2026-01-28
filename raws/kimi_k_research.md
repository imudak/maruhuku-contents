# Kimi K 調査レポート

> **調査日**: 2026-01-29
> **調査者**: ashigaru1
> **タスクID**: subtask_002

## 概要・開発元

### Moonshot AI（月之暗面）
- **正式名称**: 北京月之暗面科技有限公司
- **設立**: 2023年3月
- **本社**: 北京, 中国
- **創業者**: Yang Zhilin（楊植麟）、Zhou Xinyu（周昕宇）、Wu Yuxin（吳育昕）― 清華大学の同窓生
- **社名の由来**: Pink Floyd のアルバム "The Dark Side of the Moon" から（楊氏のお気に入り）
- **位置付け**: 中国の「AI Tiger」企業の一角

### Kimi シリーズ
Kimiは Moonshot AI が開発する大規模言語モデル（LLM）シリーズおよびチャットボットの名称。「Open Agentic Intelligence」を標榜し、エージェント機能に特化した設計が特徴。

## モデルの特徴・性能

### モデル一覧

| モデル | リリース時期 | 総パラメータ | 有効パラメータ | 特徴 |
|--------|-------------|-------------|---------------|------|
| Kimi K2 (Instruct) | 2025年7月 | 1T | 32B | MoEベースモデル、エージェント特化 |
| Kimi K2 Thinking | 2025年11月 | 1T | 32B | 推論特化、ツール間思考 |
| Kimi K2.5 | 2026年1月 | 1T | 32B | マルチモーダル、Agent Swarm |

### Kimi K2 アーキテクチャ詳細

| 項目 | 仕様 |
|------|------|
| 方式 | Mixture-of-Experts (MoE) |
| 総パラメータ | 1兆 (1T) |
| 有効パラメータ | 320億 (32B) |
| レイヤー数 | 61（Dense層1つを含む） |
| Attention Hidden Dim | 7,168 |
| MoE Hidden Dim | 2,048 / expert |
| Attention Heads | 64 |
| エキスパート数 | 384 |
| 選択エキスパート/token | 8 |
| 共有エキスパート | 1 |
| 語彙サイズ | 160K |
| コンテキスト長 | 128K |
| Attention方式 | MLA (Multi-head Latent Attention) |
| 活性化関数 | SwiGLU |

### 学習

- **事前学習データ**: 15.5兆トークン
- **オプティマイザ**: MuonClip（Muonの改良版）
- **特筆点**: 大規模学習でも学習不安定性ゼロ（loss spikeなし）
- **K2 Thinkingの学習コスト**: 約460万ドル（CNBC報道）
- **使用GPU**: NVIDIA H800（H100の制限版）

### 主要ベンチマーク結果（K2 Instruct）

#### コーディング
| ベンチマーク | スコア | 備考 |
|------------|--------|------|
| SWE-bench Verified | 65.8% pass@1 | GPT-4.1 (54.6%) を超越 |
| SWE-bench Multilingual | 47.3% pass@1 | |
| LiveCodeBench v6 | 53.7% pass@1 | SOTA |
| MultiPL-E | 85.7% pass@1 | |

#### 数学・STEM
| ベンチマーク | スコア |
|------------|--------|
| AIME 2024 | 69.6 Avg@64 (SOTA) |
| MATH-500 | 97.4% |
| HMMT 2025 | 38.8 Avg@32 |

#### 汎用
| ベンチマーク | スコア |
|------------|--------|
| MMLU | 89.5% |
| MMLU-Redux | 92.7% |
| IFEval | 89.8% |

#### ツール使用
| ベンチマーク | スコア |
|------------|--------|
| AceBench | 76.5% (SOTA) |
| Tau2 Retail | 70.6 Avg@4 |

### Kimi K2 Thinking の特徴

- **Interleaved Thinking**: ツール呼び出しの合間に推論を行う「挟み込み思考」
- **200〜300ステップの連続ツール実行**: 従来モデルが30〜50ステップで劣化するのに対し、長期間一貫した推論を維持
- **INT4量子化**: ネイティブINT4でレイテンシとメモリ使用量を削減
- **コンテキスト長**: 256K

### Kimi K2.5 の特徴

- **ネイティブマルチモーダル**: 視覚と言語を同時処理
- **Agent Swarm**: 最大100のサブエージェントを自律管理、最大1,500ツールコール、単一エージェント比で最大4.5倍の高速化
- **PARL (Parallel-Agent Reinforcement Learning)**: 事前定義ワークフローなしでタスクを並列分解
- **4つの動作モード**: Instant / Thinking / Agent / Agent Swarm（beta）
- **K2 Thinkingからの改善**: AIオフィスベンチマークで59.3%、一般エージェントベンチマークで24.3%向上

## 他のLLMとの比較

### K2 Instruct vs 他モデル（コーディング）
| モデル | SWE-bench Verified |
|--------|-------------------|
| **Kimi K2** | **65.8%** |
| Claude Opus 4 | 同等クラス |
| GPT-4.1 | 54.6% |
| DeepSeek V3 | K2以下 |

### K2 Thinking vs 他モデル
| 観点 | Kimi K2 Thinking | GPT-5 | Claude Sonnet 4.5 |
|------|-----------------|-------|-------------------|
| HLE (Humanity's Last Exam) | SOTA | 下回る | 下回る |
| BrowseComp | SOTA | 下回る | 下回る |
| 連続ツール実行 | 200-300回 | 劣化あり | 劣化あり |
| 学習コスト | $4.6M | 非公開（桁違い） | 非公開 |

### K2.5 vs 他モデル
Moonshot AI の発表によると、K2.5は GPT-5.2、Claude 4.5 Opus、Gemini 3 Pro と比較して複数のベンチマークで最高スコアを達成。特にHLE-Fullでは業界最高スコアを記録。

### 位置付け
- **オープンソース非推論モデル**: コーディング分野で最強（K2 Instruct）
- **オープンソース推論モデル**: 複数ベンチマークでクローズドモデルを超越（K2 Thinking）
- **コストパフォーマンス**: クローズドモデルの数分の一のコストで同等以上の性能

## 利用方法・API

### API利用

**公式プラットフォーム**: https://platform.moonshot.ai/

**APIフォーマット**: OpenAI互換 / Anthropic互換
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://platform.moonshot.ai/v1",
    api_key="YOUR_API_KEY"
)

response = client.chat.completions.create(
    model="kimi-k2-instruct",
    messages=[
        {"role": "system", "content": "You are Kimi, an AI assistant created by Moonshot AI."},
        {"role": "user", "content": "Hello!"}
    ],
    temperature=0.6  # 推奨値
)
```

### 価格

| 項目 | 価格 |
|------|------|
| 入力トークン | $0.50 / 100万トークン |
| 出力トークン | $2.40 / 100万トークン |

### ローカル推論エンジン（対応済み）
- vLLM
- SGLang
- KTransformers
- TensorRT-LLM

### モデル形式
- Block-FP8

### Hugging Face
- https://huggingface.co/moonshotai/Kimi-K2-Instruct
- https://huggingface.co/moonshotai/Kimi-K2-Thinking

### ライセンス
- Modified MIT License（オープンソース）

## 最新の動向・ニュース

### 2026年1月
- **Kimi K2.5 リリース**: マルチモーダル対応、Agent Swarm機能搭載
- GPT-5.2、Claude 4.5 Opus を複数ベンチマークで上回ったと発表

### 2025年11月
- **Kimi K2 Thinking リリース**: 推論特化モデル、HLE/BrowseCompでSOTA達成

### 2025年7月
- **Kimi K2 Instruct リリース**: 1Tパラメータ MoE モデル、Modified MIT でオープンソース化
- オープンソースLLMとして大きな注目を集める

### 注目トレンド
- 中国発AIモデルの急速な進化と欧米モデルへの追い上げ
- オープンソースでクローズドモデルに匹敵するパフォーマンス
- Agent Swarm / マルチエージェント技術の先駆的実装
- MuonClipオプティマイザによる学習安定性の革新

## 関連リンク

| リソース | URL |
|----------|-----|
| Moonshot AI 公式 | https://www.moonshot.ai/ |
| Kimi チャットボット | https://www.kimi.com/ |
| API プラットフォーム | https://platform.moonshot.ai/ |
| GitHub (Kimi K2) | https://github.com/MoonshotAI/Kimi-K2 |
| HuggingFace (K2 Instruct) | https://huggingface.co/moonshotai/Kimi-K2-Instruct |
| HuggingFace (K2 Thinking) | https://huggingface.co/moonshotai/Kimi-K2-Thinking |
| K2.5 テクニカルレポート | https://www.kimi.com/blog/kimi-k2-5.html |
| Artificial Analysis | https://artificialanalysis.ai/models/kimi-k2 |

---

*調査完了*
