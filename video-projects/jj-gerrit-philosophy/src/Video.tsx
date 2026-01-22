import {Series} from 'remotion';
import React from 'react';
import {Section} from './compositions/Section';
import {articleData} from './data/article';

export const Video: React.FC = () => {
  return (
    <Series>
      {articleData.map((section, index) => (
        <Series.Sequence key={index} durationInFrames={section.duration}>
          <Section title={section.title} content={section.content} />
        </Series.Sequence>
      ))}
    </Series>
  );
};
