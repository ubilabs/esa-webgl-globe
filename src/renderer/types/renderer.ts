import {CameraView} from './camera-view';

export const enum RenderMode {
  GLOBE = 'globe',
  MAP = 'map'
}

export type FlyToAnimation = {
  from: CameraView;
  to: CameraView;
  startTime: number;
  duration: number;
  onAfterFly?: () => void;
  previousGlobeControlsEnabled: boolean;
  previousMapControlsEnabled: boolean;
};

export type RenderOptions = Partial<{
  atmosphereEnabled: boolean;
  atmosphereColor: number[];
  atmosphereStrength: number;
  shadingEnabled: boolean;
}>;
