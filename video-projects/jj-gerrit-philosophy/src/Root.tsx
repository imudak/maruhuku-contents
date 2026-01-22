import {Composition} from 'remotion';
import {Video} from './Video';
import {totalDuration} from './data/article';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="JJGerritPhilosophy"
        component={Video}
        durationInFrames={totalDuration}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
