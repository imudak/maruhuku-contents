# jj-gerrit-philosophy 動画版

記事「jjを使っていて驚いた『1つの変更を育てていく』という哲学」をRemotionで動画化したプロジェクトです。

## 動画仕様

- **解像度**: 1920x1080 (Full HD)
- **フレームレート**: 30fps
- **動画時間**: 約66秒
- **スタイル**: シンプルなテキストアニメーション
- **用途**: YouTube投稿向け

## プロジェクト構造

```
video-projects/jj-gerrit-philosophy/
├── src/
│   ├── index.ts                # エントリーポイント
│   ├── Root.tsx                # Composition定義
│   ├── Video.tsx               # メインビデオコンポーネント
│   ├── compositions/
│   │   └── Section.tsx         # セクション表示コンポーネント
│   └── data/
│       └── article.ts          # 記事データ（構造化済み）
├── remotion.config.ts          # Remotion設定
├── tsconfig.json               # TypeScript設定
└── package.json
```

## 使用方法

### 1. プレビュー

開発用のプレビューを起動します。ブラウザでリアルタイムに動画を確認・編集できます。

```bash
cd video-projects/jj-gerrit-philosophy
npm start
```

ブラウザが自動的に開き、Remotion Studioが起動します。
タイムラインをドラッグして動画の各部分を確認できます。

### 2. MP4としてレンダリング

YouTube投稿用のMP4ファイルを出力します。

```bash
cd video-projects/jj-gerrit-philosophy
npm run build JJGerritPhilosophy
```

レンダリングされた動画は `out/JJGerritPhilosophy.mp4` に保存されます。

### 3. 特定のフレームのみレンダリング（テスト用）

```bash
npx remotion render JJGerritPhilosophy out/test.mp4 --frames=0-90
```

最初の3秒分（90フレーム）だけレンダリングできます。

## カスタマイズ

### セクションの編集

記事の内容を変更したい場合は、[src/data/article.ts](src/data/article.ts:1) を編集してください。

```typescript
export const articleData: Section[] = [
  {
    title: "タイトル",
    content: [
      "ポイント1",
      "ポイント2",
      // ...
    ],
    duration: 180 // フレーム数（30fpsの場合、180 = 6秒）
  },
  // ...
];
```

### デザインの変更

色やフォントサイズを変更したい場合は、[src/compositions/Section.tsx](src/compositions/Section.tsx:1) を編集してください。

主な変更箇所：
- `backgroundColor`: 背景色
- `fontSize`: フォントサイズ
- `color`: テキスト色
- アニメーションの速度（`interpolate`の範囲）

### 動画時間の調整

各セクションの表示時間を変更するには、`article.ts`の`duration`値を調整してください。

例：
- `duration: 180` = 6秒 (30fps × 6)
- `duration: 300` = 10秒 (30fps × 10)

## レンダリング オプション

### 高品質レンダリング

```bash
npx remotion render JJGerritPhilosophy out/video.mp4 --codec=h264 --quality=100
```

### GIFとして出力

```bash
npx remotion render JJGerritPhilosophy out/video.gif --codec=gif
```

### 解像度を変更（例：4K）

Root.tsxのComposition設定を変更：
```typescript
width={3840}
height={2160}
```

## トラブルシューティング

### ブラウザが開かない場合

```bash
npm start -- --port=3000
```

手動でブラウザを開いて `http://localhost:3000` にアクセスしてください。

### レンダリングが遅い場合

並列レンダリングを有効化：
```bash
npx remotion render JJGerritPhilosophy out/video.mp4 --concurrency=4
```

## 参考リンク

- [Remotion公式ドキュメント](https://www.remotion.dev/docs)
- [Remotion Best Practices スキル](.claude/skills/remotion-best-practices)
- [元記事](../../articles/jj-gerrit-philosophy.md)
