---
title: "Remotion動画自動生成入門 — Reactで作るプログラマブル動画"
emoji: "🎬"
type: "tech"
topics: ["remotion", "react", "typescript", "video"]
published: true
price: 500
---

## はじめに

動画コンテンツの需要が爆発的に増加する中、「動画を手作業で編集する」というワークフローに限界を感じているエンジニアは多いのではないでしょうか。

**Remotion**は、Reactコンポーネントで動画を記述し、プログラマティックにMP4/WebMを生成できるフレームワークです。つまり、UIを作るのと同じ感覚で動画を作れます。

本記事では、Remotionの基礎から実践的なパターンまでを解説します。筆者が実際に開発した将棋棋譜解説動画の自動生成システム（mirushogi）での知見も交えながら、「動画をコードで生成する」世界を体験していただきます。

**この記事で得られること：**
- Remotionのセットアップから動画出力までの一連の流れ
- 再利用可能なシーン設計パターン
- アニメーションの実装テクニック
- 外部データから動画を動的生成する方法
- 実プロダクトでの実践知見とハマりどころ

## 1. Remotionとは — プログラマブル動画の概念

### 従来の動画制作との違い

従来の動画制作ツール（Premiere Pro、After Effects、DaVinci Resolveなど）はGUIベースで、1本1本を手作業で編集します。これは少数の動画には適していますが、以下のようなケースでは破綻します。

- **同じフォーマットの動画を大量生成**したい（ニュース、レポート、解説）
- **データに基づいて動的に内容が変わる**動画を作りたい
- **CI/CDパイプライン**に動画生成を組み込みたい
- **バージョン管理**したい（Gitでdiffが見える！）

Remotionはこれらの課題を解決します。

### Remotionのアーキテクチャ

Remotionの核となる考え方はシンプルです：

> **動画 = フレームごとにレンダリングされるReactコンポーネントの集合**

```
フレーム0 → Reactレンダリング → PNG → ┐
フレーム1 → Reactレンダリング → PNG → ├→ ffmpeg → MP4
フレーム2 → Reactレンダリング → PNG → ┘
...
```

各フレームはHeadless Chromium上でReactコンポーネントをレンダリングし、スクリーンショットを撮影。それらをffmpegで結合してMP4を生成します。つまり、**CSSが使える場所ならなんでも動画にできる**のです。

### Remotionの主な特徴

| 特徴 | 説明 |
|------|------|
| Reactベース | JSX/TSXで動画を記述。既存のReactスキルがそのまま活かせる |
| TypeScript対応 | 型安全な動画開発。入力パラメータも型定義可能 |
| プレビュー | ブラウザ上でリアルタイムプレビュー。シークバーで任意のフレームに移動 |
| パラメータ化 | inputPropsで動画の内容を外部から注入。同じテンプレートから異なる動画を生成 |
| Lambda対応 | AWS Lambda上での分散レンダリングで大量生成にも対応 |

## 2. セットアップ — プロジェクト作成、基本構成

### プロジェクトの作成

```bash
# Remotionプロジェクトを新規作成
npx create-video@latest my-video

# ディレクトリに移動
cd my-video

# 開発サーバー起動（Remotion Studio）
npx remotion studio
```

`npx remotion studio`を実行すると、ブラウザにRemotionのプレビュー画面（Remotion Studio）が開きます。ここでタイムラインを操作しながら、リアルタイムで動画の仕上がりを確認できます。

### プロジェクト構成

生成されるプロジェクトの基本構成は以下の通りです：

```
my-video/
├── src/
│   ├── index.ts          # エントリポイント（registerRoot）
│   ├── Root.tsx          # Compositionの登録
│   ├── MyComposition.tsx # 動画コンポーネント
│   └── ...
├── public/               # 静的アセット（画像、フォントなど）
├── remotion.config.ts    # Remotion設定ファイル
├── package.json
└── tsconfig.json
```

### エントリポイント（src/index.ts）

```typescript
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

`registerRoot()`はRemotionに対してルートコンポーネントを登録する関数です。これがプロジェクトの起点になります。

### remotion.config.ts

```typescript
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");  // 中間画像形式（jpegの方が高速）
Config.setOverwriteOutput(true);     // 出力ファイルの上書きを許可
```

## 3. 最初のコンポーネント — Composition, useCurrentFrame, useVideoConfig

### Root.tsx — 動画の登録

RemotionではすべてのComposition（動画定義）を`Root.tsx`に登録します。

```tsx
import { Composition } from "remotion";
import { MyVideo } from "./MyVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyVideo"
        component={MyVideo}
        durationInFrames={300}  // 10秒（30fps × 10）
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Hello Remotion",
        }}
      />
    </>
  );
};
```

`Composition`は動画のメタデータ（解像度、FPS、長さ）とコンポーネントを紐づける宣言です。`id`はレンダリング時に動画を指定するために使います。

### useCurrentFrame — 時間を知る

`useCurrentFrame()`は現在のフレーム番号を返すフックです。これが**Remotionにおける時間の基本単位**です。

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";

export const MyVideo: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // フレーム番号から秒数を計算
  const seconds = frame / fps;

  // フレームに応じて透明度を変化させる
  const opacity = Math.min(1, frame / 30); // 最初の1秒でフェードイン

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f0f23",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          color: "white",
          fontSize: 80,
          opacity,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {title}
      </h1>
      <p style={{ color: "#888", fontSize: 24 }}>
        {seconds.toFixed(1)}秒 / フレーム {frame} / {durationInFrames}
      </p>
    </AbsoluteFill>
  );
};
```

### useVideoConfig — 動画の設定を取得

`useVideoConfig()`はCompositionで定義したメタデータを取得するフックです。

```tsx
const { fps, durationInFrames, width, height } = useVideoConfig();
```

コンポーネント内でハードコードせず、常にこのフックから値を取得することで、解像度やFPSの変更に強い設計になります。

## 4. シーン設計パターン — IntroScene / ContentScene / OutroScene

実用的な動画は複数のシーンで構成されます。Remotionでは`<Sequence>`コンポーネントを使ってシーンを時系列に配置します。

### Sequenceによるシーン分割

```tsx
import { Sequence, AbsoluteFill } from "remotion";
import { IntroScene } from "./scenes/IntroScene";
import { ContentScene } from "./scenes/ContentScene";
import { OutroScene } from "./scenes/OutroScene";

type VideoProps = {
  title: string;
  content: string;
};

export const MainVideo: React.FC<VideoProps> = ({ title, content }) => {
  return (
    <AbsoluteFill>
      {/* 0〜89フレーム（3秒間）: イントロ */}
      <Sequence from={0} durationInFrames={90}>
        <IntroScene title={title} />
      </Sequence>

      {/* 90〜269フレーム（6秒間）: メインコンテンツ */}
      <Sequence from={90} durationInFrames={180}>
        <ContentScene content={content} />
      </Sequence>

      {/* 270〜359フレーム（3秒間）: アウトロ */}
      <Sequence from={270} durationInFrames={90}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
```

:::message
**重要:** `<Sequence>`の子コンポーネント内では、`useCurrentFrame()`は**そのSequenceの先頭を0として**フレーム番号を返します。これにより、各シーンは独立した時間軸を持ち、再利用可能になります。
:::

### シーンコンポーネントの実装例

```tsx
// scenes/IntroScene.tsx
import { useCurrentFrame, AbsoluteFill, interpolate } from "remotion";

export const IntroScene: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame(); // Sequence内なので0からスタート

  const titleY = interpolate(frame, [0, 30], [50, 0], {
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1a1a2e",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          color: "#e94560",
          fontSize: 72,
          opacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </h1>
    </AbsoluteFill>
  );
};
```

### シーン長を定数で管理する

シーンの長さが散在するとメンテナンスが大変になります。定数で一元管理しましょう。

```tsx
// constants/timing.ts
export const SCENE_DURATIONS = {
  intro: 90,     // 3秒
  content: 180,  // 6秒
  outro: 90,     // 3秒
} as const;

export const TOTAL_DURATION =
  Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);

// 使用側
import { SCENE_DURATIONS, TOTAL_DURATION } from "./constants/timing";
```

## 5. アニメーション — spring(), interpolate(), Sequence

### interpolate() — 線形補間

`interpolate()`はRemotionの最も基本的なアニメーション関数です。入力値の範囲を出力値の範囲にマッピングします。

```tsx
import { interpolate, useCurrentFrame } from "remotion";

const frame = useCurrentFrame();

// フレーム0〜30で、透明度を0→1に変化
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

// フレーム0〜30で、X座標を-100→0に変化（左からスライドイン）
const translateX = interpolate(frame, [0, 30], [-100, 0], {
  extrapolateRight: "clamp",
});
```

`extrapolateRight: "clamp"`を指定しないと、フレーム30以降も値が増え続けるので、ほぼ常に指定します。

### spring() — 物理ベースのアニメーション

`spring()`はバネの物理シミュレーションに基づくイージング関数です。自然な動きを簡単に実現できます。

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// 0から1に向かってバネアニメーション
const scale = spring({
  frame,
  fps,
  config: {
    damping: 12,    // 減衰（大きいほど早く収束）
    stiffness: 100, // 硬さ（大きいほど速い）
    mass: 0.5,      // 質量（大きいほど重い動き）
  },
});

return (
  <div style={{ transform: `scale(${scale})` }}>
    ポップイン！
  </div>
);
```

### spring()とinterpolate()の組み合わせ

`spring()`は0→1の値を返すので、`interpolate()`と組み合わせて任意の範囲にマッピングできます。

```tsx
const springValue = spring({ frame, fps });

// spring(0→1) を Y座標(-200→0)にマッピング
const translateY = interpolate(springValue, [0, 1], [-200, 0]);

// spring(0→1) を回転(90deg→0deg)にマッピング
const rotate = interpolate(springValue, [0, 1], [90, 0]);
```

### 実用的なアニメーションユーティリティ

プロジェクトが大きくなると、同じアニメーションパターンを何度も書くことになります。ユーティリティ化しておくと便利です。

```tsx
// utils/animations.ts
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type FadeDirection = "up" | "down" | "left" | "right";

export function useFadeIn(delay: number = 0, direction: FadeDirection = "up") {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const springVal = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const opacity = interpolate(springVal, [0, 1], [0, 1]);

  const directionMap: Record<FadeDirection, { x: number; y: number }> = {
    up: { x: 0, y: 30 },
    down: { x: 0, y: -30 },
    left: { x: 30, y: 0 },
    right: { x: -30, y: 0 },
  };

  const { x, y } = directionMap[direction];
  const translateX = interpolate(springVal, [0, 1], [x, 0]);
  const translateY = interpolate(springVal, [0, 1], [y, 0]);

  return {
    opacity,
    transform: `translate(${translateX}px, ${translateY}px)`,
  };
}

// 使用例
const MyComponent: React.FC = () => {
  const fadeStyle = useFadeIn(10, "up"); // 10フレーム遅延で下からフェードイン
  return <div style={fadeStyle}>アニメーション付きテキスト</div>;
};
```

## 6. 外部データ連携 — JSON/APIからの動的コンテンツ生成

Remotionの真価は**データ駆動の動画生成**にあります。同じテンプレートに異なるデータを流し込むことで、大量の動画をプログラマティックに生成できます。

### inputPropsによるデータ注入

最もシンプルな方法は、Compositionの`defaultProps`とCLIの`--props`オプションです。

```tsx
// Root.tsx
import { Composition } from "remotion";
import { NewsVideo } from "./NewsVideo";
import { newsSchema } from "./schemas";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="NewsVideo"
      component={NewsVideo}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
      schema={newsSchema}
      defaultProps={{
        headline: "サンプルニュース",
        body: "これはサンプルです。",
        author: "編集部",
        publishedAt: "2026-01-01",
      }}
    />
  );
};
```

Remotion v4以降では**Zod Schema**でpropsを型安全に定義できます。

```tsx
// schemas.ts
import { z } from "zod";

export const newsSchema = z.object({
  headline: z.string(),
  body: z.string(),
  author: z.string(),
  publishedAt: z.string(),
});

export type NewsProps = z.infer<typeof newsSchema>;
```

CLIでデータを渡してレンダリング：

```bash
npx remotion render NewsVideo out/news.mp4 \
  --props='{"headline":"速報: Remotion v4最新アップデート","body":"...","author":"Tech編集部","publishedAt":"2026-02-01"}'
```

### calculateMetadata — 動的なメタデータ

データに基づいて動画の長さを動的に変えたい場合は、`calculateMetadata`を使います。

```tsx
import { Composition, CalculateMetadataFunction } from "remotion";

type Props = {
  slides: Array<{ title: string; content: string; durationSec: number }>;
};

const calculateMetadata: CalculateMetadataFunction<Props> = async ({
  props,
}) => {
  const totalFrames = props.slides.reduce(
    (sum, slide) => sum + slide.durationSec * 30,
    0
  );

  return {
    durationInFrames: totalFrames,
    props, // propsを加工して返すことも可能
  };
};

// Compositionで指定
<Composition
  id="SlideVideo"
  component={SlideVideo}
  calculateMetadata={calculateMetadata}
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{
    slides: [
      { title: "スライド1", content: "内容1", durationSec: 5 },
      { title: "スライド2", content: "内容2", durationSec: 3 },
    ],
  }}
/>
```

### JSONファイルからの一括生成

実践では、JSONファイルにデータを用意してバッチ処理するパターンが多いです。

```json
// data/episodes.json
[
  {
    "id": "ep001",
    "headline": "AIが変える動画制作の未来",
    "body": "生成AIと自動化ツールの台頭により...",
    "author": "田中太郎"
  },
  {
    "id": "ep002",
    "headline": "Webアクセシビリティ最前線",
    "body": "WCAG 3.0の策定が進む中...",
    "author": "鈴木花子"
  }
]
```

```bash
#!/bin/bash
# render-all.sh — JSONからバッチレンダリング

EPISODES=$(cat data/episodes.json)
COUNT=$(echo "$EPISODES" | jq length)

for i in $(seq 0 $(($COUNT - 1))); do
  EPISODE=$(echo "$EPISODES" | jq -c ".[$i]")
  ID=$(echo "$EPISODE" | jq -r ".id")

  echo "Rendering $ID..."
  npx remotion render NewsVideo "out/${ID}.mp4" \
    --props="$EPISODE"
done

echo "Done! Rendered $COUNT videos."
```

## 7. レンダリング — CLIでの動画出力、バッチ処理

### 基本的なレンダリング

```bash
# MP4としてレンダリング
npx remotion render MyVideo out/video.mp4

# 特定のフレーム範囲だけレンダリング（デバッグに便利）
npx remotion render MyVideo out/clip.mp4 \
  --frames=0-90

# 解像度を変更してレンダリング
npx remotion render MyVideo out/video-720p.mp4 \
  --scale=0.667
```

### レンダリングオプション

よく使うオプションをまとめます：

```bash
npx remotion render MyVideo out/video.mp4 \
  --codec=h264          # コーデック（h264, h265, vp8, vp9, prores）
  --crf=18              # 品質（小さいほど高品質。デフォルト: コーデックによる）
  --concurrency=4       # 並列レンダリング数（CPUコア数に合わせる）
  --pixel-format=yuv420p # SNS互換のピクセルフォーマット
  --props='...'         # 入力データ
  --log=verbose         # デバッグ用ログ
```

:::message alert
**SNS投稿向けの注意:** TwitterやInstagramに投稿する場合、`--pixel-format=yuv420p`を指定しないと再生できないことがあります。また、解像度は偶数にしてください（奇数だとffmpegがエラーになる場合があります）。
:::

### Node.js APIによるプログラマティックレンダリング

CLIだけでなく、Node.js APIから直接レンダリングすることもできます。これにより、Webサーバーやバッチ処理システムに組み込めます。

```typescript
// scripts/render.ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";

async function renderVideo(props: Record<string, unknown>) {
  // Webpackバンドル
  const bundleLocation = await bundle({
    entryPoint: path.resolve("./src/index.ts"),
    webpackOverride: (config) => config,
  });

  // Compositionのメタデータを取得
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "MyVideo",
    inputProps: props,
  });

  // レンダリング実行
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: `out/${props.id}.mp4`,
    inputProps: props,
    onProgress: ({ progress }) => {
      console.log(`Progress: ${(progress * 100).toFixed(1)}%`);
    },
  });

  console.log("Render complete!");
}

// 使用例
renderVideo({
  id: "video-001",
  title: "Hello World",
  content: "This is a test video",
});
```

### GitHub Actionsでの自動生成

CI/CDパイプラインに動画生成を組み込む例です。

```yaml
# .github/workflows/render-videos.yml
name: Render Videos
on:
  push:
    paths:
      - "data/episodes.json"

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Install Chrome dependencies
        run: npx remotion browser ensure

      - name: Render videos
        run: bash render-all.sh

      - uses: actions/upload-artifact@v4
        with:
          name: videos
          path: out/*.mp4
```

## 8. 実践例: 将棋棋譜解説動画の自動生成（mirushogi事例）

ここからは、筆者が実際に開発した**mirushogi**（将棋棋譜解説動画の自動生成システム）での実践知見を紹介します。

### mirushogiの概要

mirushogiは、プロ棋戦の棋譜データを入力すると、盤面の推移・形勢グラフ・解説テキストを含む動画を自動生成するシステムです。

```
棋譜データ（KIF/CSA） → パース → シーン構築 → Remotionレンダリング → MP4
```

### データ設計

棋譜データを動画用のデータ構造に変換するところがポイントです。

```typescript
// types/shogi.ts
type Move = {
  moveNumber: number;
  player: "sente" | "gote";
  piece: string;
  to: { row: number; col: number };
  from?: { row: number; col: number };
  promotion?: boolean;
  comment?: string;
};

type GameData = {
  title: string;
  players: {
    sente: { name: string; title?: string };
    gote: { name: string; title?: string };
  };
  moves: Move[];
  evaluation?: number[];  // 各手の評価値
  result: "sente_win" | "gote_win" | "draw";
};

// Remotionに渡すprops
type VideoProps = {
  game: GameData;
  style: "full" | "highlights";  // 全手 or ハイライト
  bgm?: string;
};
```

### シーン構成

将棋動画は以下のシーンで構成しています。

```tsx
export const ShogiVideo: React.FC<VideoProps> = ({ game, style }) => {
  const scenes = useMemo(() => buildScenes(game, style), [game, style]);

  let currentFrame = 0;

  return (
    <AbsoluteFill>
      {/* タイトル画面 */}
      <Sequence from={currentFrame} durationInFrames={scenes.intro.duration}>
        <TitleScene
          title={game.title}
          sente={game.players.sente}
          gote={game.players.gote}
        />
      </Sequence>

      {/* 各手のシーン */}
      {scenes.moves.map((moveScene, i) => {
        const from = scenes.intro.duration + scenes.moves
          .slice(0, i)
          .reduce((sum, s) => sum + s.duration, 0);

        return (
          <Sequence key={i} from={from} durationInFrames={moveScene.duration}>
            <MoveScene
              move={moveScene.move}
              boardState={moveScene.boardState}
              evaluation={moveScene.evaluation}
              comment={moveScene.comment}
            />
          </Sequence>
        );
      })}

      {/* 結果画面 */}
      <Sequence
        from={scenes.totalDuration - scenes.outro.duration}
        durationInFrames={scenes.outro.duration}
      >
        <ResultScene result={game.result} players={game.players} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

### 盤面レンダリング

将棋盤のレンダリングは純粋なReactコンポーネントです。CSSグリッドで9×9マスを描画し、駒をSVGまたはフォントで配置します。

```tsx
const ShogiBoard: React.FC<{ boardState: BoardState; lastMove?: Move }> = ({
  boardState,
  lastMove,
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(9, 64px)",
        gridTemplateRows: "repeat(9, 64px)",
        border: "2px solid #8B4513",
        backgroundColor: "#DEB887",
      }}
    >
      {boardState.cells.map((row, r) =>
        row.map((cell, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              border: "1px solid #8B4513",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor:
                lastMove?.to.row === r && lastMove?.to.col === c
                  ? "#FFE4B5"  // 最終手をハイライト
                  : "transparent",
            }}
          >
            {cell && (
              <span
                style={{
                  fontSize: 36,
                  transform: cell.player === "gote" ? "rotate(180deg)" : "none",
                }}
              >
                {cell.display}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
};
```

### 形勢グラフのアニメーション

各手ごとの評価値を折れ線グラフで表示し、手が進むにつれてグラフが伸びていくアニメーションを実装しています。

```tsx
const EvaluationGraph: React.FC<{
  evaluations: number[];
  currentMove: number;
}> = ({ evaluations, currentMove }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 表示する評価値（現在の手まで）
  const visibleEvals = evaluations.slice(0, currentMove + 1);

  // SVGパスを構築
  const points = visibleEvals.map((eval_, i) => {
    const x = (i / evaluations.length) * 400;
    // 評価値を-2000〜+2000の範囲で正規化
    const y = 100 - (Math.max(-2000, Math.min(2000, eval_)) / 2000) * 100;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg width={400} height={200} style={{ backgroundColor: "#1a1a2e" }}>
      {/* 中央線（互角） */}
      <line x1={0} y1={100} x2={400} y2={100} stroke="#444" strokeWidth={1} />
      {/* 評価値の折れ線 */}
      <path d={pathD} fill="none" stroke="#00ff88" strokeWidth={2} />
    </svg>
  );
};
```

### 動的な動画長の計算

棋譜の手数によって動画の長さが変わるため、`calculateMetadata`で動的に計算します。

```tsx
const calculateShogiMetadata: CalculateMetadataFunction<VideoProps> = async ({
  props,
}) => {
  const scenes = buildScenes(props.game, props.style);

  return {
    durationInFrames: scenes.totalDuration,
    fps: 30,
    props,
  };
};
```

## 9. Tips & 落とし穴

Remotionを実プロダクトで使う中で遭遇した問題と解決策をまとめます。

### フォントの読み込み

**問題:** ローカルでは表示されるフォントが、レンダリング時に豆腐（□）になる。

**解決:** `@remotion/google-fonts`を使うか、`staticFile()`で明示的にフォントを読み込みます。

```tsx
// Google Fontsを使う場合（推奨）
import { loadFont } from "@remotion/google-fonts/NotoSansJP";

const { fontFamily } = loadFont();

// staticFileを使う場合
import { staticFile, continueRender, delayRender } from "remotion";

const waitForFont = delayRender();
const font = new FontFace("MyFont", `url(${staticFile("fonts/MyFont.woff2")})`);
font.load().then(() => {
  document.fonts.add(font);
  continueRender(waitForFont);
});
```

:::message alert
**日本語フォントは必ず明示的にロードしてください。** 環境によってシステムフォントが異なるため、ローカルとCI/Lambda環境で見た目が変わります。
:::

### delayRender / continueRender — 非同期処理の待機

画像やフォント、APIデータなど、非同期で読み込むリソースがある場合は`delayRender()`を使います。

```tsx
import { delayRender, continueRender } from "remotion";
import { useCallback, useEffect, useState } from "react";

export const DataDrivenScene: React.FC = () => {
  const [data, setData] = useState<Data | null>(null);
  const [handle] = useState(() => delayRender("Fetching data..."));

  useEffect(() => {
    fetchData()
      .then((result) => {
        setData(result);
        continueRender(handle);
      })
      .catch((err) => {
        console.error(err);
        continueRender(handle); // エラーでも必ずcontinueRenderを呼ぶ
      });
  }, [handle]);

  if (!data) return null;

  return <div>{/* dataを使ったレンダリング */}</div>;
};
```

:::message alert
**`continueRender()`を呼び忘れると、レンダリングが永久にハングします。** エラーハンドリングの中でも必ず呼ぶようにしてください。これは初心者が最もハマるポイントです。
:::

### パフォーマンス最適化

**1. 画像の事前読み込み**

```tsx
import { Img, staticFile } from "remotion";

// <Img>コンポーネントはdelayRender/continueRenderを内蔵
<Img src={staticFile("background.jpg")} />

// 通常の<img>タグだと読み込み前にレンダリングされてしまう
// ❌ <img src={staticFile("background.jpg")} />
```

**2. 重いコンポーネントのメモ化**

```tsx
import { useMemo } from "react";

// 盤面の状態計算など重い処理はメモ化
const boardState = useMemo(
  () => computeBoardState(moves, currentMoveIndex),
  [moves, currentMoveIndex]
);
```

**3. concurrencyの調整**

```bash
# CPUコア数 ÷ 2 程度が目安
# メモリ不足の場合は下げる
npx remotion render MyVideo out.mp4 --concurrency=4
```

### 音声同期

BGMや効果音を動画に含める場合は`<Audio>`コンポーネントを使います。

```tsx
import { Audio } from "@remotion/media";
import { staticFile, Sequence } from "remotion";

<Audio src={staticFile("bgm.mp3")} volume={0.3} />

{/* 特定タイミングで効果音 */}
<Sequence from={60}>
  <Audio src={staticFile("se-move.mp3")} volume={0.8} />
</Sequence>
```

:::message
**`<Audio>`のインポート元について:** Remotion v4以降、`<Audio>`は`@remotion/media`パッケージからインポートすることが推奨されています。`remotion`パッケージの`<Audio>`（現在は`<Html5Audio>`）も動作しますが、`@remotion/media`版はレンダリング時により正確な音声抽出を行います。
:::

**注意点：**
- 音声ファイルは`public/`に配置し、`staticFile()`で参照
- `volume`は0〜1で指定（フレームに応じて動的に変更可能）
- MP3またはWAV形式が安定

### よくあるエラーと対処法

| エラー | 原因 | 対処 |
|--------|------|------|
| `delayRender timed out` | `continueRender()`の呼び忘れ | catch内でも必ず呼ぶ |
| `Could not find composition` | idの不一致 | Root.tsxのid確認 |
| 豆腐文字（□） | フォント未ロード | `@remotion/google-fonts`使用 |
| 出力が真っ黒 | CSSの問題 or データ未ロード | `--frames=0-1`で1フレームだけ確認 |
| メモリ不足 | concurrencyが高すぎる | `--concurrency=2`に下げる |

## 10. まとめ — 動画自動化の可能性

本記事で解説した内容を振り返ります。

| 章 | 学んだこと |
|----|-----------|
| Remotionとは | React = 動画。フレーム単位のレンダリング |
| セットアップ | `create-video`で即座にスタート |
| 基本コンポーネント | `useCurrentFrame`で時間を、`Composition`で定義を管理 |
| シーン設計 | `Sequence`で時系列を分割、再利用可能なシーン設計 |
| アニメーション | `interpolate()`と`spring()`で宣言的アニメーション |
| データ連携 | `inputProps`とZod Schemaで型安全なデータ駆動生成 |
| レンダリング | CLI/Node.js API/GitHub Actionsでの自動化 |
| 実践例 | 将棋動画での盤面描画・形勢グラフ・動的長さ計算 |
| Tips | フォント・非同期処理・パフォーマンスの落とし穴 |

### Remotionが向いているユースケース

- **定型フォーマット動画の大量生成**（ニュース、商品紹介、レポート）
- **データビジュアライゼーション動画**（ダッシュボード、統計）
- **教育コンテンツ**（プログラミング解説、棋譜解説）
- **SNS用ショート動画の自動生成**
- **OGP動画**（ブログ記事のサムネイル動画版）

### 今後の展望

Remotionは活発に開発が続けられており、以下のような進化が期待されます。

- **Remotion Lambda**の更なる最適化（分散レンダリングのコスト削減）
- **Remotion Studio**の進化（非エンジニアでもテンプレートから動画作成。Editor Starterテンプレートも公開済み）
- **ブラウザ内レンダリング**（WebCodecs / Mediabunnyとの統合による新しいレンダリングパイプライン）
- **AI連携**（LLMで生成したスクリプトからの自動動画生成。公式のLLMシステムプロンプトも提供）

「動画をコードで書く」という概念は、まだ多くのエンジニアに届いていません。しかし、動画コンテンツの需要が増え続ける中、プログラマブルな動画生成は確実にニーズが拡大していく分野です。

ぜひRemotionで、あなただけの動画自動生成パイプラインを構築してみてください。

---

**参考リンク:**
- [Remotion公式ドキュメント](https://www.remotion.dev/docs/)
- [Remotion GitHub](https://github.com/remotion-dev/remotion)
- [Remotion テンプレート集](https://www.remotion.dev/templates)
