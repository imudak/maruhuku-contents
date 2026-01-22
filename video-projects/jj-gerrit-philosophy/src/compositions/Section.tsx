import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import React from 'react';

interface SectionProps {
  title: string;
  content: string[];
}

export const Section: React.FC<SectionProps> = ({title, content}) => {
  const frame = useCurrentFrame();

  // タイトルのアニメーション（0-30フレーム）
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleTranslateY = interpolate(frame, [0, 30], [50, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0f172a', // ダークブルー背景
        padding: 80,
        fontFamily: 'sans-serif',
      }}
    >
      {/* タイトル */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleTranslateY}px)`,
          marginBottom: 60,
        }}
      >
        <h1
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            color: '#f1f5f9',
            margin: 0,
            lineHeight: 1.3,
            whiteSpace: 'pre-line',
          }}
        >
          {title}
        </h1>
      </div>

      {/* コンテンツリスト */}
      <div style={{marginLeft: 40}}>
        {content.map((text, index) => {
          // 各行のアニメーション（タイトル後、20フレームずつ遅延）
          const startFrame = 40 + index * 15;
          const opacity = interpolate(
            frame,
            [startFrame, startFrame + 20],
            [0, 1],
            {
              extrapolateRight: 'clamp',
              extrapolateLeft: 'clamp',
            }
          );

          const translateX = interpolate(
            frame,
            [startFrame, startFrame + 20],
            [30, 0],
            {
              extrapolateRight: 'clamp',
              extrapolateLeft: 'clamp',
            }
          );

          return (
            <div
              key={index}
              style={{
                opacity,
                transform: `translateX(${translateX}px)`,
                marginBottom: text === '' ? 20 : 24,
              }}
            >
              <p
                style={{
                  fontSize: 40,
                  color: text === '' ? 'transparent' : '#cbd5e1',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {text === '' ? '\u00A0' : `• ${text}`}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
