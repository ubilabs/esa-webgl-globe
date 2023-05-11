import {RenderMode} from './renderer';

export type CameraView = {
  renderMode: RenderMode;
  lng: number;
  lat: number;
  altitude: number;
  zoom: number;
};
export type LatLngAltitude = {lat: number; lng: number; altitude: number};
