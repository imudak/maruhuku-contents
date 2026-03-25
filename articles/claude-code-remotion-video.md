---
title: "Claude CodeでRemotionを操作してプログラム動画を作る"
emoji: "🎬"
type: "tech"
topics:
  - claudecode
  - remotion
  - react
  - ai
published: false
---

Claude Codeに「Remotionでこういうアニメーションを作って」と頼んだら、すごい勢いでコードを書き始めました。出てきたコードを見ると確かにそれらしいものです。しかし`npx remotion preview`で表示してみると——まったく動かないアニメーションが画面に出てきました。

## きっかけ

以前の記事で[Remotionの基本を書きました](https://zenn.dev/imudak/articles/remotion-video-automation-guide)。将棋の棋譜解説動画を自動生成するために使ったツールです。

Remotionはコードで動画を作るツールなので、Claude Codeとの相性は良さそうだと思っていました。React + TypeScriptで書けば良いので、Claude Codeが得意な領域です。実際に試してみることにしました。

作ってみたのは簡単なもので、テキストがフェードインしてスライドインするアニメーション動画です。

## セットアップはClaude Codeに任せた

Remotionプロジェクトの初期化は自分でやりました。

```bash
npx create-video@latest my-intro-video
cd my-intro-video
npm install
```

ここから先、コンポーネントの実装はClaude Codeに頼みました。指示は口頭で渡すだけです。

「テキストが中央からフェードインして、下からスライドアップするコンポーネントを作って。テキスト内容と表示時間はpropsで渡せるようにして」

Claude Codeはすぐにコードを書き始めました。

## 最初のコードと問題

生成されたコードはこんな感じでした。

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from "remotion";

type Props = {
  text: string;
  durationInFrames: number;
};

export const TextAnimation: React.FC<Props> = ({ text, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = 30;

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const translateY = spring({
    frame,
    fps,
    config: { damping: 80, stiffness: 200, mass: 1 },
    from: 40,
    to: 0,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a2e",
      }}
    >
      <h1
        style={{
          color: "white",
          fontSize: 64,
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {text}
      </h1>
    </AbsoluteFill>
  );
};
```

コードを見た限りでは問題なさそうです。`useCurrentFrame`でフレーム番号を取得して`interpolate`でフェード、`spring`でスライドするのは正しい使い方です。

プレビューを起動してみると、確かに動きました。ただ、動きが速すぎてほぼ見えない状態でした。

## 「見えない」問題

Remotionのプレビューはブラウザで動くので、Claude Codeには見せられません。「フェードインが速すぎる」と言葉で伝えました。

「フェードインを最初の30フレームかけてやるように変えて」

Claude Codeはすぐに修正してきました。

```tsx
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: "clamp",
});
```

これで改善しました。こういった数値調整のやり取りは数回続きました。フレーム数を変えたり、springのdampingを調整したり。Claude Codeは指示に従って正確に変更してくれます。

ただ、「どんなふうに見えているか」をテキストで伝えるのは少し面倒でした。「もう少しゆっくり」「動きが大きすぎる」という曖昧な表現だと、どのパラメータをどれだけ変えるかはClaude Code側の判断になります。

## 複数テキストを並べる

次に、複数のテキストが順番にフェードインするバージョンを頼みました。

「テキストの配列を受け取って、1つずつ順番にフェードインするコンポーネントを作って。前のテキストは少し暗くなって残る感じで」

生成されたコードです。

```tsx
type Props = {
  items: string[];
  durationPerItem: number;
};

export const SequentialText: React.FC<Props> = ({ items, durationPerItem }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 24,
        backgroundColor: "#1a1a2e",
        padding: 48,
      }}
    >
      {items.map((item, index) => {
        const startFrame = index * durationPerItem;
        const opacity = interpolate(
          frame,
          [startFrame, startFrame + 20],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const dimOpacity = index < Math.floor(frame / durationPerItem)
          ? 0.4
          : 1;

        return (
          <p
            key={index}
            style={{
              color: "white",
              fontSize: 48,
              opacity: opacity * dimOpacity,
              margin: 0,
            }}
          >
            {item}
          </p>
        );
      })}
    </AbsoluteFill>
  );
};
```

これは一発で期待通りの動きになりました。テキストが順番に現れて、次のテキストが出るとき前のテキストが薄くなります。

## Root.tsxへの登録も頼んだ

Remotionはコンポーネントを`Root.tsx`の`<Composition>`に登録しないとプレビューに出ません。この作業もClaude Codeに頼みました。

```tsx
import { Composition } from "remotion";
import { TextAnimation } from "./TextAnimation";
import { SequentialText } from "./SequentialText";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TextAnimation"
        component={TextAnimation}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          text: "Hello, World",
          durationInFrames: 90,
        }}
      />
      <Composition
        id="SequentialText"
        component={SequentialText}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          items: ["Step 1", "Step 2", "Step 3"],
          durationPerItem: 50,
        }}
      />
    </>
  );
};
```

ファイル構成も含めて正しく書いてくれました。`import`のパスも合っています。

## レンダリング

最終的なMP4生成もコマンドを教えてもらいながらやりました。

```bash
npx remotion render SequentialText out/sequential.mp4 \
  --props='{"items":["インストール","セットアップ","完了"],"durationPerItem":50}'
```

`--props`でpropsをJSONで渡せるので、コンポーネントを変えずに内容だけ差し替えられます。この部分はRemotionの設計によるもので、Claude Codeは関係ありません。

## 実際にやってみた感想

Claude Codeとの相性は良いと思いました。RemotionはReact + TypeScriptで書くので、Claude Codeが型エラーを出してくれたり、インポートを補完してくれたりします。Remotionのフレームワーク特有のAPIである`useCurrentFrame`や`interpolate`も、ドキュメントを渡さずに正しく使ってきました。

困ったのは、視覚的な調整が言葉だけになる点です。「もう少し柔らかい動きで」「もっとゆっくり」というのをフレーム数やspringパラメータに変換するのは、結局自分で試しながらやることになります。Claude Codeに「springのdampingを60にして」と言うのと「もう少し柔らかく」と言うのは、前者の方が確実に伝わります。

動画のビジュアルを調整するとき、「コードを書く」という行為と「どう見えるかを確認する」という行為はセットです。後者はClaude Codeには渡せないので、そこは自分でやることになります。

それでも、Remotionのボイラープレートや繰り返しのコードを書く手間は大幅に減りました。同じパターンのコンポーネントを量産するような作業なら、かなり楽になります。

## まとめ

Claude CodeでRemotionのコードを書く組み合わせは実用的です。

- コンポーネントの実装やRoot.tsxへの登録はスムーズ
- 数値パラメータの調整は言葉で伝えるより直接数値を指定する方が早い
- 視覚的な確認は自分でやる必要がある

Remotionで量産系の動画（データを入れ替えて同じフォーマットで出力）を作るなら、Claude Codeでテンプレートコンポーネントを作って、あとはデータだけ差し替えるという使い方が合っていると思います。
