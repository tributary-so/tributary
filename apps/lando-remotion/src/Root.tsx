import { Composition } from "remotion";
import { DemoComposition } from "./compositions/DemoComposition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Lando Demo - Complete 3-minute presentation */}
      <Composition
        id="LandoDemo"
        component={DemoComposition}
        durationInFrames={5400}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
